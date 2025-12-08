from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, List, Any

from api import deps
from db.models import User
from schemas.report import WeeklyEvolutionData, MonthlyEvolutionData
from services.report_service import report_service

router = APIRouter()

@router.get("/total_tickets_count", response_model=int)
def get_total_tickets_count(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> int:
    """
    Get the total count of all tickets.
    """
    return report_service.get_total_tickets_count(db)

@router.get("/my_assigned_tickets_count", response_model=int)
def get_my_assigned_tickets_count(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> int:
    """
    Get the count of tickets assigned to the current user.
    """
    return report_service.get_my_assigned_tickets_count(db, current_user.id)

@router.get("/ticket_counts_by_status", response_model=Dict[str, int])
def get_ticket_counts_by_status(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get the count of tickets grouped by status.
    """
    return report_service.get_ticket_counts_by_status(db)

@router.get("/ticket_counts_by_severity", response_model=Dict[str, int])
def get_ticket_counts_by_severity(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get the count of tickets grouped by severity.
    """
    return report_service.get_ticket_counts_by_severity(db)

@router.get("/ticket_counts_by_category", response_model=Dict[str, int])
def get_ticket_counts_by_category(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> Dict[str, int]:
    """
    Get the count of tickets grouped by category.
    """
    return report_service.get_ticket_counts_by_category(db)

@router.get("/weekly_ticket_evolution", response_model=List[WeeklyEvolutionData])
def get_weekly_ticket_evolution(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get the number of tickets created per week for the last 8 weeks.
    """
    return report_service.get_weekly_ticket_evolution(db)

@router.get("/monthly_ticket_evolution", response_model=List[MonthlyEvolutionData])
def get_monthly_ticket_evolution(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
):
    """
    Get the number of tickets created per month for the last 12 months.
    """
    return report_service.get_monthly_ticket_evolution(db)

@router.get("/avg_response_time", response_model=float)
def get_avg_response_time(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> float:
    """
    Get the average response time for tickets in hours.
    """
    return report_service.get_avg_response_time(db)

@router.get("/avg_resolution_time", response_model=float)
def get_avg_resolution_time(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> float:
    """
    Get the average resolution time for tickets in hours.
    """
    return report_service.get_avg_resolution_time(db)

@router.get("/top_recurring", response_model=List[Dict[str, Any]])
def get_top_recurring(
    db: Session = Depends(deps.get_db),
    current_user: User = Depends(deps.get_current_user),
) -> List[Dict[str, Any]]:
    """
    Get the top recurring alerts/tickets.
    """
    return report_service.get_top_recurring(db)
