from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Any
from datetime import timedelta
import uuid

from api import deps
from core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from core.security import create_access_token
from schemas.token import Token
from schemas.user import UserPublic
from services.user_service import user_service
from db.models import User as DBUser


router = APIRouter()


@router.post("/login", response_model=Token)
def login_for_access_token(
    db: Session = Depends(deps.get_db), form_data: OAuth2PasswordRequestForm = Depends()
) -> Any:
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    user = user_service.authenticate(
        db, email=form_data.username, password=form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Generate a new session ID and store it
    session_id = str(uuid.uuid4())
    user.session_id = session_id
    db.commit()

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    return {
        "access_token": create_access_token(
            data={"sub": user.email, "sid": session_id},
            expires_delta=access_token_expires,
        ),
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserPublic)
def read_users_me(
    current_user: DBUser = Depends(deps.get_current_user),
) -> Any:
    """
    Get current user.
    """
    return current_user


@router.get("/session-expires")
def session_expires(
    current_user: DBUser = Depends(deps.get_current_user),
) -> Any:
    """
    This endpoint is now deprecated as session expiration is handled by the JWT.
    It can be removed in the future.
    """
    raise HTTPException(
        status_code=status.HTTP_410_GONE, detail="This endpoint is deprecated."
    )
