import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from db.base import Base

# Database configuration (should match main.py)
DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://user:password@db:5432/ticketing_db"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def reset_database_data():
    db = SessionLocal()
    try:
        print("Iniciando la eliminación de todas las tablas...")
        Base.metadata.drop_all(bind=engine)
        print("Tablas eliminadas.")

        print("Creando todas las tablas...")
        Base.metadata.create_all(bind=engine)
        print("Tablas creadas.")

        from main import create_initial_admin_user

        create_initial_admin_user(db)

        print("Operación de reinicio de base de datos completada exitosamente.")

    except Exception as e:
        db.rollback()
        print(f"Error durante el reinicio de la base de datos: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    reset_database_data()
