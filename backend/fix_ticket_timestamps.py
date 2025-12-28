import os
from datetime import datetime
import pytz
from sqlalchemy import create_engine, Column, Integer, DateTime
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base

# Database configuration from environment variables
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://user:password@db:5432/mydatabase"
)

# Define Argentina timezone
ARGENTINA_TIMEZONE = pytz.timezone("America/Argentina/Buenos_Aires")
UTC_TIMEZONE = pytz.utc

# SQLAlchemy setup
Base = declarative_base()


class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(Integer, primary_key=True, index=True)
    creado_en = Column(DateTime, default=datetime.utcnow)
    actualizado_en = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    # Add other columns as they exist in your Ticket model if needed for context,
    # but for this script, we only care about id, creado_en, actualizado_en


# Create engine and session
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def fix_ticket_timestamps():
    db = SessionLocal()
    try:
        tickets_to_process = db.query(Ticket).all()
        print(f"Found {len(tickets_to_process)} tickets to process.")

        updated_count = 0
        for ticket in tickets_to_process:
            original_creado_en = ticket.creado_en
            original_actualizado_en = ticket.actualizado_en

            # Convert creado_en
            if (
                original_creado_en and original_creado_en.tzinfo is None
            ):  # Only process naive datetimes
                # Assume the stored datetime is naive Argentina time
                localized_dt_arg = ARGENTINA_TIMEZONE.localize(original_creado_en)
                utc_dt = localized_dt_arg.astimezone(UTC_TIMEZONE)
                ticket.creado_en = utc_dt

            # Convert actualizado_en
            if (
                original_actualizado_en and original_actualizado_en.tzinfo is None
            ):  # Only process naive datetimes
                # Assume the stored datetime is naive Argentina time
                localized_dt_arg = ARGENTINA_TIMEZONE.localize(original_actualizado_en)
                utc_dt = localized_dt_arg.astimezone(UTC_TIMEZONE)
                ticket.actualizado_en = utc_dt

            if (
                original_creado_en
                and original_creado_en.tzinfo is None
                and original_creado_en != ticket.creado_en
            ) or (
                original_actualizado_en
                and original_actualizado_en.tzinfo is None
                and original_actualizado_en != ticket.actualizado_en
            ):
                updated_count += 1
                print(
                    f"Ticket ID {ticket.id}: Creado_en changed from {original_creado_en} to {ticket.creado_en}, Actualizado_en changed from {original_actualizado_en} to {ticket.actualizado_en}"
                )

        db.commit()
        print(f"Successfully updated {updated_count} ticket timestamps.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting timestamp correction script...")
    fix_ticket_timestamps()
    print("Timestamp correction script finished.")
