import psycopg2
import os

db_name = os.environ.get("POSTGRES_DB")
db_user = os.environ.get("POSTGRES_USER")
db_password = os.environ.get("POSTGRES_PASSWORD")
db_host = "db"
db_port = "5432"

try:
    conn = psycopg2.connect(
        dbname=db_name, user=db_user, password=db_password, host=db_host, port=db_port
    )
    cur = conn.cursor()
    cur.execute(
        "SELECT id, resumen, categoria, platform, severidad, estado FROM tickets WHERE id = 3"
    )
    ticket = cur.fetchone()
    if ticket:
        print(f"Ticket found: {ticket}")
        # Expected: (3, 'Test Malware Rule', 'Malware', 'FortiSIEM', 'Alta', 'Nuevo')
        if ticket[2] == "Malware" and ticket[3] == "FortiSIEM":
            print("Verification successful: Category and Platform are correct.")
        else:
            print(
                f"Verification failed: Category is '{ticket[2]}' (expected 'Malware'), Platform is '{ticket[3]}' (expected 'FortiSIEM')."
            )
    else:
        print("Ticket with ID 3 not found.")
    cur.close()
    conn.close()
except Exception as e:
    print(f"An error occurred: {e}")
