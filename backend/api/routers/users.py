from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response
from sqlalchemy.orm import Session
from typing import List
import json
import shutil
from pathlib import Path

from api import deps
from db.models import User
from schemas.user import User as UserSchema, UserCreate, UserPasswordChange
from schemas.audit import AuditLogBase
from services.user_service import user_service
from repositories.audit_log_repository import audit_log_repository
from core.security import get_password_hash

router = APIRouter()

@router.post("/", response_model=UserSchema, status_code=status.HTTP_201_CREATED)
def create_user(
    *,
    db: Session = Depends(deps.get_db),
    user_in: UserCreate,
    current_user: User = Depends(deps.get_current_active_admin),
):
    """
    Create new user.
    """
    user = user_service.get_by_email(db, email=user_in.email)
    if user:
        raise HTTPException(
            status_code=400,
            detail="The user with this email already exists in the system.",
        )
    user = user_service.create_user(db, user_in=user_in)

    # Create audit log
    audit_log_repository.create(db, obj_in=AuditLogBase(
        entidad="User",
        entidad_id=user.id,
        actor_id=current_user.id,
        accion="Creación de Usuario",
        detalle=json.dumps({
            "new_user_email": user.email,
            "new_user_role": user.role
        })
    ))

    return user

@router.get("/", response_model=List[UserSchema])
def get_all_users(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[UserSchema]:
    """
    Retrieve all users.
    """
    # This endpoint might need role-based access control in a real application
    # For now, any authenticated user can list all users.
    users = db.query(User).all()
    return users

@router.get("/birthdays/today", response_model=List[UserSchema])
def get_birthdays_today(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Retrieve users whose birthday is today.
    """
    users = user_service.get_birthdays_today(db)
    return users

@router.post("/me/password", status_code=status.HTTP_204_NO_CONTENT)
def change_current_user_password(
    password_data: UserPasswordChange,
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Change current user's password.
    """
    # Authenticate user with their old password
    user = user_service.authenticate(db, email=current_user.email, password=password_data.old_password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect old password.",
        )
    
    # Hash the new password and update the user
    hashed_password = get_password_hash(password_data.new_password)
    current_user.password_hash = hashed_password
    db.add(current_user)
    db.commit()

    # Create audit log for password change
    try:
        audit_log_repository.create(db, obj_in=AuditLogBase(
            entidad="User",
            entidad_id=current_user.id,
            actor_id=current_user.id,
            accion="Cambio de Contraseña",
            detalle="El usuario ha cambiado su contraseña."
        ))
    except Exception as e:
        print(f"Failed to create audit log for password change: {e}")

    return Response(status_code=status.HTTP_204_NO_CONTENT)

@router.post("/me/avatar", response_model=UserSchema)
async def upload_avatar(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
    file: UploadFile = File(...),
):
    """
    Upload a new user avatar.
    """
    # Validate file type
    if file.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image type. Please upload a JPG or PNG.",
        )

    # Create a unique filename
    extension = Path(file.filename).suffix
    filename = f"user_{current_user.id}{extension}"
    file_path = Path("static/avatars") / filename

    # Save the file
    try:
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {e}",
        )

    # Update user's avatar_url in the database
    # The URL needs to be prefixed for the API gateway
    avatar_url = f"/api/static/avatars/{filename}"
    current_user.avatar_url = avatar_url
    db.commit()
    db.refresh(current_user)

    # Create audit log for avatar upload
    try:
        audit_log_repository.create(db, obj_in=AuditLogBase(
            entidad="User",
            entidad_id=current_user.id,
            actor_id=current_user.id,
            accion="Subida de Avatar",
            detalle=f"El usuario ha subido un nuevo avatar: {filename}"
        ))
    except Exception as e:
        print(f"Failed to create audit log for avatar upload: {e}")

    return current_user

@router.delete("/me/avatar", status_code=status.HTTP_204_NO_CONTENT)
async def delete_avatar(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_active_user),
):
    """
    Delete the current user's avatar.
    """
    if not current_user.avatar_url:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    # Path to the file to be deleted
    # The URL from the DB is /api/static/avatars/..., so we need to strip the /api part
    file_path_str = current_user.avatar_url.replace("/api/", "", 1)
    file_path = Path(file_path_str)
    filename = file_path.name

    # Delete the file from the filesystem
    if file_path.exists():
        try:
            file_path.unlink()
        except Exception as e:
            # Log the error, but don't prevent the DB update
            print(f"Error deleting avatar file {file_path}: {e}")

    # Update user's avatar_url to None in the database
    current_user.avatar_url = None
    db.commit()

    # Create audit log for avatar deletion
    try:
        audit_log_repository.create(db, obj_in=AuditLogBase(
            entidad="User",
            entidad_id=current_user.id,
            actor_id=current_user.id,
            accion="Eliminación de Avatar",
            detalle=f"El usuario ha eliminado su avatar: {filename}"
        ))
    except Exception as e:
        print(f"Failed to create audit log for avatar deletion: {e}")

    return Response(status_code=status.HTTP_204_NO_CONTENT)
