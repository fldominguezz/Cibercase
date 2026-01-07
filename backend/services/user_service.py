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

    def get_birthdays_today(self, db: Session) -> List[User]:
        return user_repository.get_users_with_birthday_today(db)


user_service = UserService()
