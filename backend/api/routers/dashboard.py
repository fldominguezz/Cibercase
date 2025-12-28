from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any

from api.deps import get_db, get_current_user
from schemas.user import User
from repositories import report_repository, user_repository

import logging

router = APIRouter()

logger = logging.getLogger(__name__)


@router.get("/stats", response_model=Dict[str, Any])
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get all consolidated dashboard statistics in a single endpoint.
    """
    try:
        total_tickets = report_repository.get_total_tickets_count(db)
        my_assigned_tickets = report_repository.get_my_assigned_tickets_count(
            db, user_id=current_user.id
        )

        # These repository functions return lists of tuples, need to convert to dict
        status_counts_tuples = report_repository.get_ticket_counts_by_status(db)
        by_status = {status: count for status, count in status_counts_tuples}

        severity_counts_tuples = report_repository.get_ticket_counts_by_severity(db)
        by_severity = {severity: count for severity, count in severity_counts_tuples}

        category_counts_tuples = report_repository.get_ticket_counts_by_category(db)
        by_category = {category: count for category, count in category_counts_tuples}

        monthly_evolution = report_repository.get_monthly_ticket_evolution(db)

        avg_resolution_time_hours = report_repository.get_avg_resolution_time(db)
        avg_response_time_hours = report_repository.get_avg_response_time(db)

        # Convert hours to a more readable format (e.g., "Xh Ym")
        def format_hours(hours):
            if hours is None:
                return "N/A"
            h = int(hours)
            m = int((hours - h) * 60)
            return f"{h}h {m}m"

        avg_resolution_time = {"time": format_hours(avg_resolution_time_hours)}
        avg_response_time = {"time": format_hours(avg_response_time_hours)}

        top_recurring = report_repository.get_top_recurring(db)
        all_users = user_repository.get_multi(db, skip=0, limit=1000)
        birthday_users = user_repository.get_users_with_birthday_today(db)

        return {
            "totalTickets": total_tickets,
            "myAssignedTicketsCount": my_assigned_tickets,
            "ticketsByStatus": by_status,
            "ticketsBySeverity": by_severity,
            "ticketsByCategory": by_category,
            "monthlyTicketEvolution": monthly_evolution,
            "avgResolutionTime": avg_resolution_time,
            "avgResponseTime": avg_response_time,
            "topRecurring": top_recurring,
            "allUsers": [User.from_orm(u).dict() for u in all_users],
            "currentUser": User.from_orm(current_user).dict(),
            "birthdayUsers": [User.from_orm(u).dict() for u in birthday_users],
        }
    except Exception as e:
        logger.error(f"Error fetching dashboard statistics: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="An error occurred while fetching dashboard statistics.",
        )
