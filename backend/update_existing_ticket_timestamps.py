import os
import sys
from datetime import datetime, timedelta, timezone
import re
import logging

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.models import Ticket # Asegúrate de que la ruta de importación sea correcta

# Configuración de logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Configuración de la base de datos
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@db:5432/mydatabase")
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def parse_datetime_from_raw_log(raw_log_content: str):
    """
    Extrae la fecha y hora de un raw_log de FortiSIEM.
    Asume que la fecha y hora en el raw_log están en GMT-3.
    """
    event_date = None
    event_time = None
    date_match = re.search(r'date="(\d{4}-\d{2}-\d{2})"', raw_log_content)
    time_match = re.search(r'time="(\d{2}:\d{2}:\d{2})"', raw_log_content)

    if date_match:
        event_date = date_match.group(1)
    if time_match:
        event_time = time_match.group(1)

    if event_date and event_time:
        try:
            combined_datetime_str = f"{event_date} {event_time}"
            naive_dt = datetime.strptime(combined_datetime_str, "%Y-%m-%d %H:%M:%S")
            
            # Convertir de GMT-3 a UTC sumando 3 horas
            utc_dt = naive_dt + timedelta(hours=3)
            return utc_dt.replace(tzinfo=timezone.utc)
        except ValueError as e:
            logger.warning(f"Error al parsear fecha/hora '{combined_datetime_str}' del raw log: {e}")
            return None
    return None

def update_existing_ticket_timestamps():
    """
    Actualiza el campo 'creado_en' de los tickets existentes
    basándose en la fecha y hora extraídas de sus raw_logs.
    """
    db = SessionLocal()
    updated_count = 0
    try:
        tickets_to_update = db.query(Ticket).filter(Ticket.raw_logs.isnot(None)).all()
        logger.info(f"Encontrados {len(tickets_to_update)} tickets con raw_logs para procesar.")

        for ticket in tickets_to_update:
            new_created_at = parse_datetime_from_raw_log(ticket.raw_logs)
            if new_created_at:
                if ticket.creado_en != new_created_at:
                    logger.info(f"Actualizando ticket {ticket.id} (UID: {ticket.ticket_uid}): creado_en de {ticket.creado_en} a {new_created_at}")
                    ticket.creado_en = new_created_at
                    updated_count += 1
                else:
                    logger.info(f"Ticket {ticket.id} (UID: {ticket.ticket_uid}) ya tiene la fecha correcta.")
            else:
                logger.warning(f"No se pudo extraer fecha/hora del raw_log para el ticket {ticket.id} (UID: {ticket.ticket_uid}).")
        
        db.commit()
        logger.info(f"Proceso completado. {updated_count} tickets actualizados.")

    except Exception as e:
        db.rollback()
        logger.error(f"Error durante la actualización de timestamps: {e}", exc_info=True)
    finally:
        db.close()

if __name__ == "__main__":
    logger.info("Iniciando script de actualización de timestamps de tickets...")
    update_existing_ticket_timestamps()
    logger.info("Script de actualización de timestamps de tickets finalizado.")
