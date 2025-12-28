from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime

from db.base import BaseRepository
from db.models import Ticket, User, Alert, Evidence
from schemas.ticket import TicketCreate, TicketUpdate

from sqlalchemy import or_  # Import or_ for search functionality


class TicketRepository(BaseRepository[Ticket, TicketCreate, TicketUpdate]):
    def create_with_owner(
        self,
        db: Session,
        *,
        obj_in: TicketCreate,
        current_user_id: Optional[int] = None,
    ) -> Ticket:
        ticket_uid = f"TCK-{datetime.utcnow().strftime('%Y')}-{db.query(self.model).count() + 1:06d}"

        ticket_data_dict = obj_in.dict(exclude_unset=True)

        db_obj = self.model(**ticket_data_dict, ticket_uid=ticket_uid)
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_tickets_with_details(
        self,
        db: Session,
        skip: int = 0,
        limit: int = 100,
        status: Optional[str] = None,
        assigned_to_me_id: Optional[int] = None,
        severity: Optional[str] = None,
        created_by_me_id: Optional[int] = None,
        category: Optional[str] = None,
        search: Optional[str] = None,
        reportado_por_id: Optional[int] = None,
        sort_by: Optional[str] = "creado_en",
        sort_order: Optional[str] = "desc",
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ):
        query = db.query(self.model)

        if status:
            query = query.filter(self.model.estado == status)

        if assigned_to_me_id is not None:
            query = query.filter(self.model.asignado_a_id == assigned_to_me_id)

        if severity:
            query = query.filter(self.model.severidad == severity)

        if created_by_me_id is not None:
            query = query.filter(self.model.reportado_por_id == created_by_me_id)

        if category:
            query = query.filter(self.model.categoria == category)

        if search:
            query = query.filter(
                or_(
                    self.model.resumen.ilike(f"%{search}%"),
                    self.model.descripcion.ilike(f"%{search}%"),
                    self.model.ticket_uid.ilike(f"%{search}%"),
                    self.model.rule_name.ilike(f"%{search}%"),
                    self.model.rule_description.ilike(f"%{search}%"),
                    self.model.rule_remediation.ilike(f"%{search}%"),
                    self.model.raw_logs.ilike(f"%{search}%"),
                )
            )

        if reportado_por_id is not None:
            query = query.filter(self.model.reportado_por_id == reportado_por_id)

        if start_date:
            query = query.filter(self.model.creado_en >= start_date)

        if end_date:
            query = query.filter(self.model.creado_en <= end_date)

        total_count = query.count()

        # Dynamic sorting
        if sort_by:
            if hasattr(self.model, sort_by):
                sort_column = getattr(self.model, sort_by)
                if sort_order == "desc":
                    query = query.order_by(sort_column.desc())
                else:
                    query = query.order_by(sort_column.asc())
            else:
                # Fallback to default sorting if sort_by is invalid
                query = query.order_by(self.model.id.desc())
        else:
            query = query.order_by(self.model.id.desc())

        final_query = (
            query.join(User, self.model.reportado_por_id == User.id, isouter=True)
            .add_columns(User.first_name, User.last_name, self.model.raw_logs)
            .offset(skip)
            .limit(limit)
        )

        return final_query.all(), total_count

    def get_ticket_with_details(self, db: Session, ticket_id: int):
        return (
            db.query(self.model, User.first_name, User.last_name)
            .outerjoin(User, self.model.reportado_por_id == User.id)
            .filter(self.model.id == ticket_id)
            .first()
        )

    def get_evidence_for_ticket(self, db: Session, ticket_id: int) -> List[Evidence]:
        return db.query(Evidence).filter(Evidence.ticket_id == ticket_id).all()

    def get_alert_for_ticket(self, db: Session, ticket_id: int) -> Optional[Alert]:
        return db.query(Alert).filter(Alert.ticket_id == ticket_id).first()


ticket_repository = TicketRepository(Ticket)
