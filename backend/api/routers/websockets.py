from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    HTTPException,
    status,
)
from typing import Dict
from sqlalchemy.orm import Session
from api.deps import get_db  # Only need get_db now
from jose import JWTError, jwt  # Import jwt and JWTError
from core.config import SECRET_KEY, ALGORITHM  # Import SECRET_KEY and ALGORITHM
from services.user_service import user_service  # Import user_service

import logging

router = APIRouter()

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        # Store connections as a dictionary mapping user_id to the WebSocket object
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        logger.info(f"User {user_id} connected via WebSocket.")

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]
            logger.info(f"User {user_id} disconnected.")

    async def send_to_user(self, message: str, user_id: int):
        websocket = self.active_connections.get(user_id)
        if websocket:
            await websocket.send_text(message)
            logger.info(f"Sent message to user {user_id}.")

    async def broadcast(self, message: str):
        logger.info(f"Broadcasting message to {len(self.active_connections)} clients.")
        for user_id, websocket in self.active_connections.items():
            try:
                await websocket.send_text(message)
            except Exception as e:
                logger.error(f"Error broadcasting to user {user_id}: {e}")


manager = ConnectionManager()


@router.websocket("/tickets")
async def websocket_endpoint(
    websocket: WebSocket, db: Session = Depends(get_db)  # Get database session
):
    # Explicitly get token from query parameters
    token = websocket.query_params.get("token")

    user_id = None  # Initialize user_id to None

    if not token:
        logger.error("WebSocket connection attempt without token.")
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason="Token not provided"
        )
        return

    try:
        logger.info("Attempting to decode token for WebSocket connection.")
        # Manually decode and validate the token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        session_id: str = payload.get("sid")

        if email is None or session_id is None:
            logger.error(
                "WebSocket: Token payload missing 'sub' or 'sid'. Payload: %s", payload
            )
            raise JWTError("Invalid token payload")

        user = user_service.get_by_email(db, email=email)

        if user is None:
            logger.error("WebSocket: User not found for email '%s'.", email)
            raise JWTError("User not found")

        logger.debug(
            "WebSocket: Comparing session IDs for user '%s'. Token SID: %s, DB SID: %s",
            email,
            session_id,
            user.session_id,
        )
        if user.session_id != session_id:
            logger.error(
                "WebSocket: Session ID mismatch for user '%s'. Token SID: %s, DB SID: %s",
                email,
                session_id,
                user.session_id,
            )
            raise JWTError("Session expired or invalid")

        user_id = user.id  # Store user_id for connect/disconnect

    except (JWTError, HTTPException) as e:
        logger.error("WebSocket authentication failed: %s", e)
        await websocket.close(
            code=status.WS_1008_POLICY_VIOLATION, reason=f"Authentication failed: {e}"
        )
        return

    # If authentication is successful, proceed with connection
    logger.info(f"Attempting to connect WebSocket for user {user_id}")
    await manager.connect(websocket, user_id)
    try:
        while True:
            # Keep the connection alive, or handle incoming messages if needed
            await websocket.receive_text()
    except WebSocketDisconnect:
        if user_id:
            manager.disconnect(user_id)
