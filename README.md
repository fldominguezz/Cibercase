# Gestor Inteligente de Tickets para SOC (CiberCase)

**Versión:** v2.1

![Dashboard Screenshot](https://i.imgur.com/7geTkY5.jpeg)

Este proyecto es una solución de software avanzada, diseñada para optimizar y automatizar la gestión de incidentes de seguridad en un Centro de Operaciones de Seguridad (SOC). Centraliza, enriquece y gestiona de forma inteligente las alertas de seguridad, transformándolas en tickets accionables y contextualizados a través de una interfaz moderna y en tiempo real.

## ✨ Características Principales

*   **Integración con SIEM:** Recibe y procesa automáticamente alertas de **FortiSIEM**.
*   **Dashboard en Tiempo Real:** Visualización 360° con KPIs, gráficos interactivos y actualizaciones instantáneas vía **WebSockets**.
*   **Analizador de EML:** Herramienta forense para analizar archivos `.eml`, extraer IOCs (hashes, dominios, URLs) e integrarse con **VirusTotal**.
*   **Gestión Avanzada de Tickets:** Ciclo de vida completo de tickets, edición en línea, asignación y trazabilidad.
*   **Arquitectura Moderna:** Construido con una pila de tecnologías moderna y escalable.

## 🛠️ Pilar

*   **Backend:** **Python 3.10** con **FastAPI**
*   **Frontend:** **React.js** (Create React App)
*   **Base de Datos:** **PostgreSQL**
*   **Servidor Web / Proxy Inverso:** **Nginx**
*   **Contenerización:** **Docker** y **Docker Compose**

## 🚀 Cómo Empezar

Siga estas instrucciones para configurar y ejecutar el proyecto en un entorno de desarrollo local.

### Requisitos Previos

*   **Docker**
*   **Docker Compose**
*   **Git**

### 1. Clonar el Repositorio

```bash
git clone https://github.com/fldominguezz/Cibercase.git
cd Cibercase
```

### 2. Configurar Variables de Entorno

Cree un archivo llamado `.env` en la raíz del proyecto. Puede copiar el siguiente contenido como punto de partida.

```env
# Archivo: .env

# --- Configuración de la Base de Datos ---
POSTGRES_USER=admin
POSTGRES_PASSWORD=admin
POSTGRES_DB=ticketing_db
DATABASE_URL=postgresql://admin:admin@db:5432/ticketing_db

# --- Configuración de la Aplicación ---
# IMPORTANTE: Genere una clave segura y única con: openssl rand -hex 32
SECRET_KEY=un_secreto_muy_largo_y_dificil_de_adivinar
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

# --- Credenciales del Administrador Inicial ---
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

### 3. Levantar la Aplicación

Una vez configurado el archivo `.env`, puede levantar toda la pila de la aplicación con un solo comando:

```bash
docker-compose up --build
```

*   `--build`: Fuerza la reconstrucción de las imágenes de Docker. Úselo la primera vez o después de cambios en el código fuente o `Dockerfile`.
*   Para ejecutar en segundo plano, añada el flag `-d`: `docker-compose up --build -d`.

### 4. Acceder a la Aplicación

Una vez que los contenedores estén en funcionamiento, la aplicación estará disponible en:

*   **URL:** [http://localhost:3000](http://localhost:3000)

El usuario administrador por defecto se creará con las credenciales que especificó en el archivo `.env`.

### 5. Detener la Aplicación

Para detener todos los contenedores de la aplicación, ejecute:

```bash
docker-compose down
```

## 🤝 Contribuciones

Las contribuciones son bienvenidas.
