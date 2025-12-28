from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
    WebSocket,
    WebSocketDisconnect,
)
from sqlalchemy.orm import Session
from typing import List
from jose import JWTError, jwt

from api import deps
from db.models import User, Notification
from schemas.notification import Notification as NotificationSchema
from core.config import SECRET_KEY, ALGORITHM

router = APIRouter()


@router.get("/me", response_model=List[NotificationSchema])
def get_my_notifications(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[NotificationSchema]:
    """
    Retrieve all notifications for the current user.
    """
    notifications = (
        db.query(Notification)
        .filter(Notification.user_id == current_user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return [NotificationSchema.from_orm(n) for n in notifications]


@router.get("/me/unread_count", response_model=int)
def get_my_unread_notifications_count(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> int:
    """
    Retrieve the count of unread notifications for the current user.
    """
    unread_count = (
        db.query(Notification)
        .filter(
            Notification.user_id == current_user.id, Notification.is_read.is_(False)
        )
        .count()
    )
    return unread_count


@router.put("/{notification_id}/read", response_model=NotificationSchema)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> NotificationSchema:
    """
    Mark a specific notification as read.
    """
    notification = (
        db.query(Notification)
        .filter(
            Notification.id == notification_id, Notification.user_id == current_user.id
        )
        .first()
    )

    if not notification:
        raise HTTPException(
            status_code=404, detail="Notification not found or not authorized"
        )

    notification.is_read = True
    db.add(notification)
    db.commit()
    db.refresh(notification)
    return notification


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str):
    await websocket.accept()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise WebSocketDisconnect("Could not validate credentials")

        # In a real application, you would fetch the user from the DB here
        # and associate the websocket connection with the user.
        # For now, we just keep the connection open.
        while True:
            # Keep connection alive, or handle messages
            await websocket.receive_text()
    except JWTError:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
