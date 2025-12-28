import os
from datetime import datetime, timedelta
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


def revert_ticket_timestamps():
    db = SessionLocal()
    try:
        tickets_to_process = db.query(Ticket).all()
        print(f"Found {len(tickets_to_process)} tickets to process for reversion.")

        reverted_count = 0
        for ticket in tickets_to_process:
            original_creado_en = ticket.creado_en
            original_actualizado_en = ticket.actualizado_en

            # Explicitly subtract 3 hours from naive datetimes
            if original_creado_en:
                ticket.creado_en = original_creado_en - timedelta(hours=3)

            if original_actualizado_en:
                ticket.actualizado_en = original_actualizado_en - timedelta(hours=3)

            if (original_creado_en and original_creado_en != ticket.creado_en) or (
                original_actualizado_en
                and original_actualizado_en != ticket.actualizado_en
            ):
                reverted_count += 1
                print(
                    f"Ticket ID {ticket.id}: Creado_en reverted from {original_creado_en} to {ticket.creado_en}, Actualizado_en reverted from {original_actualizado_en} to {ticket.actualizado_en}"
                )

        db.commit()
        print(f"Successfully reverted {reverted_count} ticket timestamps.")
    except Exception as e:
        db.rollback()
        print(f"An error occurred: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting timestamp reversion script...")
    revert_ticket_timestamps()
    print("Timestamp reversion script finished.")
