import os
from secrets import token_hex
import pytz

# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("No DATABASE_URL set for the application")

# Security settings
# If SECRET_KEY is not in the environment, generate a new random one for this session.
# This will invalidate all JWTs from previous sessions upon restart.
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    print(
        "WARNING: SECRET_KEY not found in environment. Generating a temporary one. All user sessions will be invalidated on restart."
    )
    SECRET_KEY = token_hex(32)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 120

# Define Argentina timezone
ARGENTINA_TIMEZONE = pytz.timezone("America/Argentina/Buenos_Aires")
