from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import ValidationError
import os
import logging # Import logging
from datetime import datetime # ADDED THIS LINE

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__) # Use logger

from api.routers import auth, tickets, reports, admin, status, notifications, forms, users, fortisiem, websockets, eml
from db.session import SessionLocal
from db.base import Base
from db.session import engine
import db.models # Import all models to be discovered by Base.metadata.create_all

# Create all tables
if os.getenv("TESTING") != "True":
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
        status_code=422,
        content={"detail": exc.errors(), "body": exc.body}
    )

# Include routers
app.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(tickets.router, prefix="/api/v1/tickets", tags=["tickets"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["reports"])
app.include_router(admin.router, prefix="/api/v1/admin", tags=["admin"])
app.include_router(status.router, prefix="/api/v1", tags=["status"])
app.include_router(notifications.router, prefix="/api/v1/notifications", tags=["notifications"])
app.include_router(forms.router, prefix="/api/v1/forms", tags=["forms"])
app.include_router(users.router, prefix="/api/v1/users", tags=["users"])
app.include_router(fortisiem.router, prefix="/api/v1", tags=["fortisiem"])
app.include_router(websockets.router, prefix="/api/v1/ws", tags=["websockets"])
app.include_router(eml.router, prefix="/api/v1/eml", tags=["eml"])

from db.models import User
from db.session import SessionLocal
from core.security import get_password_hash

def create_initial_admin_user(db: SessionLocal):
    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com")
    admin_password = os.getenv("ADMIN_PASSWORD", "admin123")

    admin_user = db.query(User).filter(User.email == admin_email).first()
    if not admin_user:
        hashed_password = get_password_hash(admin_password)
        new_admin = User(
            username="admin",
            first_name="Admin",
            last_name="User",
            email=admin_email,
            role="Admin",
            password_hash=hashed_password,
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)
        print(f"Usuario administrador inicial '{admin_email}' creado.")
    else:
        print(f"Usuario administrador '{admin_email}' ya existe.")

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
from fastapi.staticfiles import StaticFiles
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
            create_initial_admin_user(db)
            print("Application startup complete.")
        finally:
            db.close()