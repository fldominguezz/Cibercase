import os
import sys
from datetime import timedelta
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.exc import OperationalError

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.models import Ticket
from core.config import DATABASE_URL


def add_3_hours_to_timestamps():
    """
    Connects to the database and adds 3 hours to the 'creado_en'
    timestamp for all tickets to correct a previous miscalculation.
    """
    try:
        engine = create_engine(DATABASE_URL)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        db = SessionLocal()
    except OperationalError as e:
        print(f"Error de conexión a la base de datos: {e}")
        return

    try:
        tickets_to_update = db.query(Ticket).all()
        if not tickets_to_update:
            print("No se encontraron tickets para actualizar.")
            return

        print(
            f"Se encontraron {len(tickets_to_update)} tickets. Agregando 3 horas a los timestamps..."
        )

        for ticket in tickets_to_update:
            if ticket.creado_en:
                original_time = ticket.creado_en
                ticket.creado_en = ticket.creado_en + timedelta(hours=3)
                print(
                    f"Ticket ID {ticket.id}: 'creado_en' cambiado de {original_time} a {ticket.creado_en}"
                )

        db.commit()
        print(
            f"¡Éxito! Se actualizaron los timestamps de {len(tickets_to_update)} tickets."
        )

    except Exception as e:
        print(f"Ocurrió un error durante la actualización: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    add_3_hours_to_timestamps()
