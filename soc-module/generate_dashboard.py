import requests
import os
from datetime import datetime, timedelta

# Configuration
API_BASE_URL = "https://10.1.9.244/api/v1"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123" # This should ideally be fetched securely, not hardcoded

def get_jwt_token(email, password):
    """Obtiene un token JWT del backend."""
    login_url = f"{API_BASE_URL}/auth/login"
    form_data = {
        "username": email,
        "password": password
    }
    try:
        response = requests.post(login_url, data=form_data, verify=False) # verify=False for self-signed certs
        response.raise_for_status()
        return response.json()["access_token"]
    except requests.exceptions.RequestException as e:
        print(f"Error al obtener el token JWT: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Respuesta del servidor: {e.response.text}")
        return None

def fetch_report_data(endpoint, token):
    """Realiza una llamada a un endpoint de reporte autenticado."""
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(f"{API_BASE_URL}{endpoint}", headers=headers, verify=False) # verify=False for self-signed certs
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"Error al obtener datos de {endpoint}: {e}")
        if hasattr(e, 'response') and e.response is not None:
            print(f"Respuesta del servidor: {e.response.text}")
        return None

def generate_bar_chart(data_dict, total_count, bar_length=30):
    """Genera un gráfico de barras ASCII para datos de conteo."""
    if not data_dict or total_count == 0:
        return "  No hay datos para mostrar."

    chart = []
    for label, count in data_dict.items():
        percentage = (count / total_count) * 100 if total_count > 0 else 0
        num_blocks = int((percentage / 100) * bar_length)
        bar = "█" * num_blocks + "▒" * (bar_length - num_blocks)
        chart.append(f"  {label.ljust(15)} {bar} {count} ({percentage:.1f}%)")
    return "\n".join(chart)

def generate_severity_chart(data_dict):
    """Genera un gráfico de severidad con emojis de color."""
    severity_map = {
        "Crítica": "🔴",
        "Alta": "🟠",
        "Media": "🟡",
        "Baja": "🟢",
        "Desconocida": "⚪"
    }
    
    chart = []
    for severity, count in data_dict.items():
        emoji = severity_map.get(severity, "⚪")
        chart.append(f"  {emoji} {severity.ljust(15)}: {count}")
    return "\n".join(chart)

def generate_ascii_donut_chart(severity_counts, total_tickets):
    """
    Genera un gráfico circular (donut chart) simulado en texto ASCII para la distribución por severidad,
    siguiendo el formato de barra segmentada dentro de un recuadro como el ejemplo del usuario.
    """
    if not severity_counts or total_tickets == 0:
        return "\n      No hay datos para el gráfico circular."

    # Define order of severities for consistent rendering
    ordered_severities = ["Crítica", "Alta", "Media", "Baja", "Desconocida"]
    severity_emojis = {
        "Crítica": "🔴",
        "Alta": "🟠",
        "Media": "🟡",
        "Baja": "🟢",
        "Desconocida": "⚪"
    }
    
    # Generate the text summary above the donut, including percentages
    summary_lines = []
    for sev_name in ordered_severities:
        count = severity_counts.get(sev_name, 0)
        percentage = (count / total_tickets * 100) if total_tickets > 0 else 0
        if count > 0: # Only show severities that have tickets
            summary_lines.append(f"      {severity_emojis[sev_name]} {sev_name.ljust(10)} {count} ({percentage:.0f}%)")
    summary_text = "\n".join(summary_lines)

    # Generate the donut visualization based on the user's example
    # Example: │   ████🟠████🟢█████🟡████🔴███   │
    # The total length of the inner bar in the example is 29 characters (including emojis)
    inner_bar_visual_length = 29 
    
    donut_bar_content = ""
    current_length = 0
    
    # Calculate proportions and fill the bar
    for sev_name in ordered_severities:
        count = severity_counts.get(sev_name, 0)
        if count == 0:
            continue

        proportion = (count / total_tickets) if total_tickets > 0 else 0
        # Each emoji takes 1 character space in the visual bar
        # We need to distribute the remaining characters (█) proportionally
        
        # Calculate how many '█' blocks this severity should get
        # Subtract 1 for the emoji itself if it's going to be placed
        num_blocks_for_severity = int(proportion * inner_bar_visual_length)
        
        # Ensure at least one block if there's a count, to show the emoji
        if num_blocks_for_severity == 0 and count > 0:
            num_blocks_for_severity = 1
        
        # Add emoji and blocks
        donut_bar_content += severity_emojis[sev_name]
        current_length += 1 # For the emoji

        # Fill with blocks, ensuring we don't exceed the total length
        blocks_to_add = min(num_blocks_for_severity -1, inner_bar_visual_length - current_length)
        donut_bar_content += "█" * blocks_to_add
        current_length += blocks_to_add
        
        if current_length >= inner_bar_visual_length:
            break # Stop if we've filled the bar

    # Pad with spaces if the bar is shorter than expected
    donut_bar_content = donut_bar_content.ljust(inner_bar_visual_length)

    # Construct the donut chart visual box
    box_width = inner_bar_visual_length + 4 # 2 for padding, 2 for borders
    
    donut_lines_visual = [
        f"      ┌{'─' * (box_width - 2)}┐",
        f"      │ {donut_bar_content} │",
        f"      │{' ' * ((box_width - len(f'Total: {total_tickets} Tickets')) // 2)}Total: {total_tickets} Tickets{' ' * ((box_width - len(f'Total: {total_tickets} Tickets')) // 2)}│",
        f"      └{'─' * (box_width - 2)}┘"
    ]
    # Adjust padding for total tickets line to be perfectly centered
    total_text = f"Total: {total_tickets} Tickets"
    padding_left = (box_width - len(total_text) - 2) // 2 # -2 for the ' │' and '│ '
    padding_right = box_width - len(total_text) - 2 - padding_left
    donut_lines_visual[2] = f"      │{' ' * padding_left}{total_text}{' ' * padding_right}│"


    return summary_text + "\n\n" + "\n".join(donut_lines_visual)


def main():
    token = get_jwt_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        print("No se pudo obtener el token JWT. Saliendo.")
        return

    # 1. Resumen general
    total_tickets = fetch_report_data("/reports/total_tickets_count", token)
    closed_tickets = fetch_report_data("/reports/closed_tickets_count", token)
    tickets_today = fetch_report_data("/reports/tickets_created_today", token)
    tickets_this_week = fetch_report_data("/reports/tickets_created_this_week", token)
    tickets_this_month = fetch_report_data("/reports/tickets_created_this_month", token)
    
    if total_tickets is None or closed_tickets is None or tickets_today is None or tickets_this_week is None or tickets_this_month is None:
        print("No se pudieron obtener todos los datos del resumen general. Saliendo.")
        return

    resolution_percentage = (closed_tickets / total_tickets) * 100 if total_tickets > 0 else 0

    print("```")
    print("###################################################")
    print("#        DASHBOARD DE TICKETS SOC (TEXTO)         #")
    print("###################################################")
    print("\n### 1. Resumen General ###")
    print(f"  Total de Tickets: {total_tickets}")
    print(f"  Tickets Creados Hoy: {tickets_today}")
    print(f"  Tickets Creados Esta Semana: {tickets_this_week}")
    print(f"  Tickets Creados Este Mes: {tickets_this_month}")
    print(f"  Tickets Cerrados: {closed_tickets}")
    print(f"  Porcentaje de Resolución: {resolution_percentage:.1f}%")

    # 2. Tickets por estado
    tickets_by_status = fetch_report_data("/reports/ticket_counts_by_status", token)
    if tickets_by_status is None:
        print("\n### 2. Tickets por Estado ###")
        print("  No se pudieron obtener los datos de tickets por estado.")
    else:
        print("\n### 2. Tickets por Estado ###")
        print(generate_bar_chart(tickets_by_status, total_tickets))

    # 3. Tickets por severidad
    tickets_by_severity = fetch_report_data("/reports/ticket_counts_by_severity", token)
    if tickets_by_severity is None:
        print("\n### 3. Tickets por Severidad ###")
        print("  No se pudieron obtener los datos de tickets por severidad.")
    else:
        print("\n### 3. Tickets por Severidad ###")
        print("🎯 **Distribución por Severidad**")
        print(f"\n(Total: {total_tickets} tickets)\n")
        print(generate_severity_chart(tickets_by_severity))
        print(generate_ascii_donut_chart(tickets_by_severity, total_tickets))

    # 4. Tickets por asignación (Top 5)
    tickets_by_assignee = fetch_report_data("/reports/ticket_counts_by_assignee", token)
    if tickets_by_assignee is None:
        print("\n### 4. Tickets por Asignación (Top 5) ###")
        print("  No se pudieron obtener los datos de tickets por asignación.")
    else:
        print("\n### 4. Tickets por Asignación (Top 5) ###")
        # Sort assignees by count in descending order and take top 5
        sorted_assignees = sorted(tickets_by_assignee.items(), key=lambda item: item[1], reverse=True)[:5]
        for assignee, count in sorted_assignees:
            print(f"  - {assignee.ljust(20)}: {count}")
    print("```")

if __name__ == "__main__":
    main()
