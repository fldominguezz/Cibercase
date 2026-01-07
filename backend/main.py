from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
import os
import logging
from datetime import datetime

from api.routers import (
    auth,
    tickets,
    reports,
    admin,
    status,
    notifications,
    forms,
    users,
    fortisiem,
    websockets,
    eml,
    dashboard,
)
from db.session import SessionLocal
from db.base import Base
from db.session import engine
from db.models import User, Role, Permission
from core.security import get_password_hash


# Configure logging
logging.basicConfig(
    level=logging.DEBUG, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Create all tables
if os.getenv("TESTING") != "True":
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CiberCase API",
    description="API for the CiberCase application.",
    version="1.0.0",
)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Request validation error: {exc.errors()} for URL: {request.url}")
    return JSONResponse(
        status_code=422, content={"detail": exc.errors(), "body": exc.body}
    )


# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(tickets.router, prefix="/api/v1/tickets", tags=["tickets"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(status.router, prefix="/api/v1", tags=["status"])
app.include_router(
    notifications.router, prefix="/api/v1/notifications", tags=["notifications"]
)
app.include_router(forms.router, prefix="/api/v1/forms", tags=["forms"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(fortisiem.router, prefix="/api/v1", tags=["fortisiem"])
app.include_router(websockets.router, prefix="/api/v1/ws", tags=["websockets"])
app.include_router(eml.router, prefix="/api/v1/eml", tags=["eml"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["dashboard"])


def create_initial_data(db: SessionLocal):
    # Create Permissions
    permissions = [
        # Ticket Permissions
        Permission(name="view_tickets", description="Can view tickets"),
        Permission(name="create_ticket", description="Can create tickets"),
        Permission(name="edit_ticket", description="Can edit tickets"),
        Permission(name="delete_ticket", description="Can delete tickets"),
        Permission(name="assign_ticket", description="Can assign tickets"),
        Permission(name="change_ticket_status", description="Can change ticket status"),
        
        # User Permissions
        Permission(name="view_users", description="Can view users"),
        Permission(name="create_user", description="Can create users"),
        Permission(name="edit_user", description="Can edit users"),
        Permission(name="delete_user", description="Can delete users"),

        # Role & Permission Management
        Permission(name="manage_roles", description="Can manage roles and permissions"),

        # Admin & System
        Permission(name="access_admin_panel", description="Can access the admin panel"),
        Permission(name="view_audit_log", description="Can view the audit log"),
    ]

    for perm_data in permissions:
        perm = db.query(Permission).filter(Permission.name == perm_data.name).first()
        if not perm:
            db.add(perm_data)
    db.commit()

    all_permissions = db.query(Permission).all()

    # Create Roles
    roles = {
        "Admin": "Superuser with all permissions",
        "Lider": "Team lead with management capabilities",
        "Analista": "Analyst with ticket handling capabilities",
        "Auditor": "Auditor with view-only capabilities",
    }
    
    for role_name, role_desc in roles.items():
        role = db.query(Role).filter(Role.name == role_name).first()
        if not role:
            role = Role(name=role_name, description=role_desc)
            if role.name == "Admin":
                role.permissions.extend(all_permissions)
            # You can assign specific permissions to other roles here if needed
            db.add(role)
    db.commit()

    # Create initial admin user
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")
    
    admin_user = db.query(User).filter(User.email == admin_email).first()
    if not admin_user:
        admin_role = db.query(Role).filter(Role.name == "Admin").first()
        hashed_password = get_password_hash(admin_password)
        new_admin = User(
            username="admin",
            first_name="Admin",
            last_name="User",
            email=admin_email,
            password_hash=hashed_password,
            is_active=True,
            role=admin_role,  # Assign the Role object
            date_of_birth=datetime.strptime("1990-01-01", "%Y-%m-%d").date()
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"Initial admin user '{admin_email}' created successfully.")
    else:
        print(f"Admin user '{admin_email}' already exists.")


# CORS Middleware Configuration
origins = [
    "http://localhost:3000",
    "http://10.1.9.244:3000",
    "https://10.1.9.244",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files directory
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Mount static files for avatars
os.makedirs("static/avatars", exist_ok=True)
app.mount("/api/static", StaticFiles(directory="static"), name="static")


@app.get("/")
async def read_root():
    return {"message": "Hello World"}


@app.on_event("startup")
async def startup_event():
    print(f"DEBUG (main.py): Current UTC time on startup: {datetime.utcnow()}")
    if os.getenv("TESTING") != "True":
        db = SessionLocal()
        try:
            # Here you could add initial data creation
            create_initial_data(db)
            print("Application startup complete.")
        finally:
            db.close()
