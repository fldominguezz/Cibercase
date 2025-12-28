from sqlalchemy.orm import Session
from typing import List, Tuple

from db.base import BaseRepository
from db.models import AuditLog, User
from schemas.audit import AuditLogBase


class AuditLogRepository(BaseRepository[AuditLog, AuditLogBase, AuditLogBase]):
    def get_by_ticket_id(self, db: Session, *, ticket_id: int) -> List[AuditLog]:
        return (
            db.query(AuditLog)
            .filter(AuditLog.entidad == "Ticket", AuditLog.entidad_id == ticket_id)
            .order_by(AuditLog.timestamp.desc())
            .all()
        )

    def get_multi_with_actor_details(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[Tuple[AuditLog, str]]:
        """
        Retrieves a list of audit logs, joining with the User table to get the actor's username.
        """
        query = (
            db.query(AuditLog, User.username)
            .outerjoin(User, AuditLog.actor_id == User.id)
            .order_by(AuditLog.timestamp.desc())
            .offset(skip)
            .limit(limit)
        )

        return query.all()


audit_log_repository = AuditLogRepository(AuditLog)
