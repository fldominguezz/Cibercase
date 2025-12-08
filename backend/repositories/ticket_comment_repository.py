from typing import List, Optional
from sqlalchemy.orm import Session
import json # Import json
from datetime import datetime # Import datetime

from db.base import BaseRepository
from db.models import TicketComment, User # Import User to fetch user details
import schemas.ticket_comment # Import the schemas module
from schemas.audit import AuditLogBase # Import AuditLogBase
from repositories.audit_log_repository import audit_log_repository # Import audit_log_repository

class TicketCommentRepository(BaseRepository[TicketComment, schemas.ticket_comment.TicketCommentCreate, None]):
    def __init__(self):
        super().__init__(TicketComment)

    def create_comment(self, db: Session, obj_in: schemas.ticket_comment.TicketCommentCreate, user_id: int, ticket_id: int) -> schemas.ticket_comment.TicketComment:
        db_obj = TicketComment(
            content=obj_in.content,
            user_id=user_id,
            ticket_id=ticket_id
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        # Create an audit log entry for the comment creation
        try:
            audit_log_data = AuditLogBase(
                entidad="TicketComment",
                entidad_id=db_obj.id,
                actor_id=user_id,
                accion="Creación de Comentario",
                detalle=json.dumps({"ticket_id": ticket_id, "content_preview": obj_in.content[:50]}) # Log first 50 chars of content
            )
            audit_log_repository.create(db, obj_in=audit_log_data)
        except Exception as e:
            # Optionally re-raise or handle the error more gracefully
            print(f"Failed to create audit log for comment creation: {e}")


        return schemas.ticket_comment.TicketComment.from_orm(db_obj)

    def get_comments_by_ticket_id(self, db: Session, ticket_id: int) -> List[TicketComment]:
        return db.query(TicketComment).filter(TicketComment.ticket_id == ticket_id).order_by(TicketComment.created_at).all()

# Instantiate the repository
ticket_comment_repository = TicketCommentRepository()
