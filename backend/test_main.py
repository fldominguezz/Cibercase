import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
import os

# Set TESTING environment variable to True before importing app and db.session
os.environ["TESTING"] = "True"

from main import app
from db.base import Base
from db.session import SessionLocal, engine # Import SessionLocal and engine from db.session
from api.routers.fortisiem import get_db # Correct import for get_db
from db.models import User
from core.security import get_password_hash

# Override the get_db dependency for testing
@pytest.fixture()
def override_get_db():
    Base.metadata.create_all(bind=engine) # Create tables for the test database
    db = SessionLocal() # Use SessionLocal from db.session
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine) # Drop tables after tests
        os.environ.pop("TESTING", None) # Clean up environment variable

app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)

def test_read_main():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {"message": "Hello World"}

def test_read_tickets_unauthenticated():
    response = client.get("/api/v1/tickets")
    assert response.status_code == 401 # Expect 401 Unauthorized for unauthenticated access

@pytest.fixture(name="test_client_with_admin")
def test_client_with_admin_fixture(override_get_db):
    """
    Fixture to provide a test client with an authenticated admin user.
    """
    db = override_get_db # Get the test database session directly


    # Create an admin user
    admin_email = "testadmin@example.com"
    admin_password = "testpassword"
    hashed_password = get_password_hash(admin_password)
    admin_user = User(
        username="testadmin",
        first_name="Test",
        last_name="Admin",
        email=admin_email,
        role="Admin",
        password_hash=hashed_password,
        is_active=True
    )
    db.add(admin_user)
    db.commit()
    db.refresh(admin_user)

    # Log in the admin user to get a token
    login_data = {"username": admin_email, "password": admin_password}
    response = client.post("/api/v1/auth/login", data=login_data)
    assert response.status_code == 200
    token = response.json()["access_token"]

    # Return the client and the token
    yield client, token

    # Clean up (tables are dropped by override_get_db fixture)

def test_create_ticket_authenticated(test_client_with_admin):
    client, token = test_client_with_admin
    headers = {"Authorization": f"Bearer {token}"}

    ticket_data = {
        "resumen": "Test Ticket Summary",
        "descripcion": "This is a test ticket description.",
        "estado": "Abierto",
        "severidad": "Media",
        "categoria": "Incidente",
        "impacto": "Alto",
        "causa_raiz": "Unknown",
        "resolucion": "Pending",
    }    
    
    response = client.post("/api/v1/tickets/", data=ticket_data, headers=headers)
    assert response.status_code == 200
    created_ticket = response.json()
    assert created_ticket["resumen"] == "Test Ticket Summary"
    assert created_ticket["estado"] == "Abierto"
    assert created_ticket["reportado_por_nombre"] == "Test Admin" # Check reporter name
    assert "id" in created_ticket

    # Verify the ticket can be read
    read_response = client.get(f"/api/v1/tickets/{created_ticket['id']}", headers=headers)
    assert read_response.status_code == 200
    read_ticket = read_response.json()
    assert read_ticket["resumen"] == "Test Ticket Summary"
    assert read_ticket["id"] == created_ticket["id"]


def test_read_tickets_search(test_client_with_admin):
    client, token = test_client_with_admin
    headers = {"Authorization": f"Bearer {token}"}

    # Create a ticket to search for
    ticket_data = {
        "resumen": "Unique Search Term Ticket",
        "descripcion": "This ticket has a very specific description for search testing.",
        "estado": "Nuevo",
        "severidad": "Baja",
        "categoria": "General",
    }
    create_response = client.post("/api/v1/tickets/", data=ticket_data, headers=headers)
    assert create_response.status_code == 200
    created_ticket = create_response.json()

    # Search by resumen
    search_response = client.get(f"/api/v1/tickets?search=Unique Search Term", headers=headers)
    assert search_response.status_code == 200
    search_results = search_response.json()["tickets"]
    assert len(search_results) >= 1
    assert any(t["id"] == created_ticket["id"] for t in search_results)

    # Search by descripcion
    search_response_desc = client.get(f"/api/v1/tickets?search=search testing", headers=headers)
    assert search_response_desc.status_code == 200
    search_results_desc = search_response_desc.json()["tickets"]
    assert len(search_results_desc) >= 1
    assert any(t["id"] == created_ticket["id"] for t in search_results_desc)

    # Search for something that doesn't exist
    no_results_response = client.get(f"/api/v1/tickets?search=nonexistentticket123", headers=headers)
    assert no_results_response.status_code == 200
    no_results = no_results_response.json()["tickets"]
    assert len(no_results) == 0