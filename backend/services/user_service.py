from sqlalchemy.orm import Session
from typing import Optional, List

from repositories.user_repository import user_repository
from core.security import verify_password, get_password_hash
from db.models import User
from schemas.user import UserCreate
from schemas.audit import AuditLogBase
from repositories.audit_log_repository import audit_log_repository


class UserService:
    def authenticate(self, db: Session, *, email: str, password: str) -> Optional[User]:
        user = user_repository.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None

        # Create audit log for successful login
        try:
            audit_log_repository.create(
                db,
                obj_in=AuditLogBase(
                    entidad="User",
                    entidad_id=user.id,
                    actor_id=user.id,
                    accion="Inicio de Sesión",
                    detalle="El usuario ha iniciado sesión exitosamente.",
                ),
            )
        except Exception as e:
            # Log error if audit log creation fails, but don't block login
            print(f"Failed to create audit log for login: {e}")

        return user

    def get_by_email(self, db: Session, *, email: str) -> Optional[User]:
        return user_repository.get_by_email(db, email=email)

    def create_user(self, db: Session, *, user_in: UserCreate) -> User:
        db_obj = User(
            username=user_in.username,
            first_name=user_in.first_name,
            last_name=user_in.last_name,
            email=user_in.email,
            password_hash=get_password_hash(user_in.password),
            role=user_in.role,
            is_active=user_in.is_active,
            avatar_url=user_in.avatar_url,
            date_of_birth=user_in.date_of_birth,
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_birthdays_today(self, db: Session) -> List[User]:
        return user_repository.get_users_with_birthday_today(db)


user_service = UserService()
