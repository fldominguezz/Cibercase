from sqlalchemy.orm import Session
from typing import Dict, List, Any
import time  # Import time for timestamp

from repositories.report_repository import report_repository
from schemas.report import WeeklyEvolutionData, MonthlyEvolutionData


class ReportService:
    _cache = {}
    _cache_ttl = {}
    _CACHE_TTL_SECONDS = 60  # Cache for 60 seconds

    def get_ticket_counts_by_status(self, db: Session) -> Dict[str, int]:
        counts = report_repository.get_ticket_counts_by_status(db)
        return {status: count for status, count in counts}

    def get_ticket_counts_by_severity(self, db: Session) -> Dict[str, int]:
        counts = report_repository.get_ticket_counts_by_severity(db)
        return {severity: count for severity, count in counts}

    def get_weekly_ticket_evolution(self, db: Session) -> List[WeeklyEvolutionData]:
        data = report_repository.get_weekly_ticket_evolution(db)
        return [WeeklyEvolutionData(**item) for item in data]

    def get_monthly_ticket_evolution(self, db: Session) -> List[MonthlyEvolutionData]:
        data = report_repository.get_monthly_ticket_evolution(db)
        return [MonthlyEvolutionData(**item) for item in data]

    def get_total_tickets_count(self, db: Session) -> int:
        cache_key = "total_tickets_count"

        # Check cache
        if cache_key in self._cache and self._cache_ttl[cache_key] > time.time():
            return self._cache[cache_key]

        # Fetch from repository if not in cache or expired
        count = report_repository.get_total_tickets_count(db)

        # Store in cache
        self._cache[cache_key] = count
        self._cache_ttl[cache_key] = time.time() + self._CACHE_TTL_SECONDS

        return count

    def get_my_assigned_tickets_count(self, db: Session, user_id: int) -> int:
        # This count is user-specific, so direct caching here needs a user_id key.
        # For simplicity, not caching this for now.
        return report_repository.get_my_assigned_tickets_count(db, user_id)

    def get_ticket_counts_by_category(self, db: Session) -> Dict[str, int]:
        counts = report_repository.get_ticket_counts_by_category(db)
        return {item[0] if item[0] else "Sin Categoría": item[1] for item in counts}

    def get_avg_response_time(self, db: Session) -> float:
        return report_repository.get_avg_response_time(db)

    def get_avg_resolution_time(self, db: Session) -> float:
        return report_repository.get_avg_resolution_time(db)

    def get_top_recurring(self, db: Session) -> List[Dict[str, Any]]:
        return report_repository.get_top_recurring(db)


report_service = ReportService()
