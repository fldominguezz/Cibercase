from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from core.config import SECRET_KEY, ALGORITHM
from core.security import oauth2_scheme
from db.models import User
from db.session import SessionLocal
from schemas.token import TokenData
from schemas.user import UserRole  # Import UserRole Enum
from services.user_service import user_service


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        session_id: str = payload.get("sid") # Re-added this line
        if email is None or session_id is None: # Reverted condition
            raise credentials_exception
        token_data = TokenData(email=email)
    except JWTError:
        raise credentials_exception

    user = user_service.get_by_email(db, email=token_data.email)

    if user is None:
        raise credentials_exception

    if user.session_id != session_id: # Re-added this block
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    if current_user.force_password_change: # Check for forced password change
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="PASSWORD_CHANGE_REQUIRED", # Specific detail for frontend
        )
    return current_user


def get_current_admin_or_lider_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.role or current_user.role.name not in [UserRole.admin, UserRole.lider]:  # Use UserRole Enum
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción",
        )
    return current_user


def get_current_active_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.role or current_user.role.name != UserRole.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges",
        )
    return current_user
