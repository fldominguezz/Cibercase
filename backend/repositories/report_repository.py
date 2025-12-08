import logging
from sqlalchemy.orm import Session
from sqlalchemy import func, case, extract, and_
from datetime import datetime, timedelta
from typing import Dict, List, Any

from db.models import Ticket, Alert

logger = logging.getLogger(__name__)

class ReportRepository:
    def get_ticket_counts_by_status(self, db: Session):
        return db.query(Ticket.estado, func.count(Ticket.id)).group_by(Ticket.estado).all()

    def get_ticket_counts_by_severity(self, db: Session):
        return db.query(Ticket.severidad, func.count(Ticket.id)).group_by(Ticket.severidad).all()

    def get_weekly_ticket_evolution(self, db: Session):
        today = datetime.utcnow().date()
        weekly_data = []
        for i in range(8): # Last 8 weeks
            end_of_week = today - timedelta(weeks=i)
            # Start of the week (Monday)
            start_of_week = end_of_week - timedelta(days=end_of_week.weekday())
            
            count = db.query(Ticket).filter(
                func.date(Ticket.creado_en) >= start_of_week,
                func.date(Ticket.creado_en) <= end_of_week + timedelta(days=6) # End of the week (Sunday)
            ).count()
            weekly_data.append({"week": f"Semana {8-i}", "tickets": count})
        return list(reversed(weekly_data))

    def get_monthly_ticket_evolution(self, db: Session):
        today = datetime.utcnow().date()
        monthly_data = []
        for i in range(12): # Last 12 months
            # Calculate the first day of the month 'i' months ago
            current_month_start = today.replace(day=1)
            month_start = (current_month_start - timedelta(days=1)).replace(day=1) if i > 0 else current_month_start
            for _ in range(i):
                month_start = (month_start - timedelta(days=1)).replace(day=1)
            
            # Calculate the last day of that month
            next_month_start = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1)
            month_end = next_month_start - timedelta(days=1)

            count = db.query(Ticket).filter(
                func.date(Ticket.creado_en) >= month_start,
                func.date(Ticket.creado_en) <= month_end
            ).count()
            
            # Format month name for display
            month_name = month_start.strftime("%b %Y") # e.g., "Jan 2025"
            monthly_data.append({"month": month_name, "tickets": count})
        return list(reversed(monthly_data))

    def get_total_tickets_count(self, db: Session) -> int:
        return db.query(Ticket).count()

    def get_my_assigned_tickets_count(self, db: Session, user_id: int) -> int:
        return db.query(Ticket).filter(Ticket.asignado_a_id == user_id, Ticket.estado != "Cerrado").count()

    def get_ticket_counts_by_category(self, db: Session):
        counts = db.query(Ticket.categoria, func.count(Ticket.id)).group_by(Ticket.categoria).all()
        logger.info(f"DEBUG: Raw counts from get_ticket_counts_by_category in repository: {counts}")
        return counts

    def get_avg_response_time(self, db: Session) -> float:
        # Assuming response time is from creation to first update if assigned
        # This is a simplification, a real system would have a 'first_response_at' timestamp
        avg_time = db.query(
            func.avg(
                extract('epoch', Ticket.actualizado_en - Ticket.creado_en)
            )
        ).filter(
            Ticket.asignado_a_id.isnot(None),
            Ticket.actualizado_en.isnot(None)
        ).scalar()
        return avg_time / 3600 if avg_time else 0.0 # Convert seconds to hours

    def get_avg_resolution_time(self, db: Session) -> float:
        # Resolution time is from creation to closure
        avg_time = db.query(
            func.avg(
                extract('epoch', Ticket.cerrado_en - Ticket.creado_en)
            )
        ).filter(
            Ticket.cerrado_en.isnot(None)
        ).scalar()
        return avg_time / 3600 if avg_time else 0.0 # Convert seconds to hours

    def get_top_recurring(self, db: Session, limit: int = 5) -> List[Dict[str, Any]]:
        # Top recurring based on rule_name from alerts
        # This assumes alerts are linked to tickets and have a rule_name
        recurring_alerts = db.query(
            Ticket.rule_name,
            func.count(Alert.id).label("count")
        ).join(
            Ticket, Alert.ticket_id == Ticket.id
        ).filter(
            Ticket.rule_name.isnot(None)
        ).group_by(
            Ticket.rule_name
        ).order_by(
            func.count(Alert.id).desc()
        ).limit(limit).all()
        return [{"name": item.rule_name, "count": item.count} for item in recurring_alerts]


report_repository = ReportRepository()
