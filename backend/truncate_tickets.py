import os
import sys
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Asegúrate de que el path a db.session sea correcto.
# Si el script se ejecuta desde backend/, entonces db.session está en el mismo nivel.
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))
from db.session import DATABASE_URL

print(f"Connecting to database at {DATABASE_URL}")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def truncate_tickets_table():
    db = SessionLocal()
    try:
        # Truncar la tabla tickets y sus dependencias
        db.execute(text("TRUNCATE TABLE tickets RESTART IDENTITY CASCADE;"))
        # Truncar la tabla audit_logs
        db.execute(text("TRUNCATE TABLE audit_logs RESTART IDENTITY CASCADE;"))
        db.commit()
        print(
            "Successfully truncated 'tickets' and 'audit_logs' tables and restarted identities."
        )
    except Exception as e:
        db.rollback()
        print(f"Error truncating tables: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    truncate_tickets_table()
