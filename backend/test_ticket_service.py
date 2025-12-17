import pytest
from unittest.mock import MagicMock, patch
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from services.ticket_service import TicketService
from repositories.ticket_repository import ticket_repository
from schemas.ticket import TicketInDB, TicketCreate, TicketUpdate
from db.models import Ticket, User # Import Ticket and User models

# Initialize the service
ticket_service = TicketService()

@pytest.fixture
def mock_db_session():
    """Fixture to provide a mock database session."""
    return MagicMock(spec=Session)

@pytest.fixture
def mock_ticket_repository():
    """Fixture to provide a mock ticket repository."""
    return MagicMock(spec=ticket_repository)

@patch('services.ticket_service.ticket_repository')
def test_get_ticket_found(mock_repo, mock_db_session):
    """
    Test case for get_ticket when a ticket is found.
    """
    # Mock the return value of get_ticket_with_details
    mock_ticket_obj = MagicMock(spec=Ticket)
    mock_ticket_obj.id = 1
    mock_ticket_obj.resumen = "Test Ticket Summary"
    mock_ticket_obj.estado = "Abierto"
    mock_ticket_obj.prioridad = "Media"
    mock_ticket_obj.severidad = "Media"
    mock_ticket_obj.categoria = "Incidente"
    mock_ticket_obj.creado_en = datetime.now(timezone.utc)
    mock_ticket_obj.actualizado_en = datetime.now(timezone.utc)
    mock_ticket_obj.reportado_por_id = 1
    mock_ticket_obj.asignado_a_id = None
    mock_ticket_obj.rule_name = "Test Rule"
    mock_ticket_obj.rule_description = "Test Description"
    mock_ticket_obj.rule_remediation = "Test Remediation"
    mock_ticket_obj.descripcion = "Test Description" # Added missing attribute
    mock_ticket_obj.impacto = "Alto" # Added missing attribute
    mock_ticket_obj.causa_raiz = "Test Root Cause" # Added missing attribute
    mock_ticket_obj.resolucion = "Test Resolution" # Added missing attribute
    mock_ticket_obj.raw_logs = "Test Raw Logs" # Added missing attribute
    mock_ticket_obj.ticket_uid = "test-uid-123" # Added missing attribute
    mock_ticket_obj.platform = "Test Platform"
    mock_reporter_first_name = "John"
    mock_reporter_last_name = "Doe"

    mock_repo.get_ticket_with_details.return_value = (
        mock_ticket_obj,
        mock_reporter_first_name,
        mock_reporter_last_name,
    )
    mock_repo.get_evidence_for_ticket.return_value = []
    mock_repo.get_alert_for_ticket.return_value = None

    ticket_id = 1
    result = ticket_service.get_ticket(mock_db_session, ticket_id, current_user_id=1)

    # Assertions
    assert result is not None
    assert result.id == ticket_id
    assert result.resumen == "Test Ticket Summary"
    assert result.reportado_por_nombre == "John Doe"
    mock_repo.get_ticket_with_details.assert_called_once_with(mock_db_session, ticket_id=ticket_id)
    mock_repo.get_evidence_for_ticket.assert_called_once_with(mock_db_session, ticket_id=ticket_id)

@patch('services.ticket_service.ticket_repository')
def test_get_ticket_not_found(mock_repo, mock_db_session):
    """
    Test case for get_ticket when no ticket is found.
    """
    mock_repo.get_ticket_with_details.return_value = None

    ticket_id = 999 # A non-existent ticket ID
    result = ticket_service.get_ticket(mock_db_session, ticket_id, current_user_id=1)

    # Assertions
    assert result is None
    mock_repo.get_ticket_with_details.assert_called_once_with(mock_db_session, ticket_id=ticket_id)
    mock_repo.get_evidence_for_ticket.assert_not_called()
    mock_repo.get_alert_for_ticket.assert_not_called()

