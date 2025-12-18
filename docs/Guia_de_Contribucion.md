# Guía de Contribución para CiberCase

¡Agradecemos tu interés en contribuir a CiberCase! Sigue esta guía para entender cómo configurar tu entorno de desarrollo, seguir las convenciones del proyecto y realizar tus aportaciones de manera efectiva.

## 1. Clonar el Repositorio

Si aún no lo has hecho, clona el repositorio del proyecto:

```bash
git clone https://github.com/fldominguezz/CiberCase.git
cd CiberCase
```

## 2. Configurar el Entorno de Desarrollo

CiberCase utiliza Docker y Docker Compose para gestionar su entorno de desarrollo, asegurando consistencia entre diferentes máquinas.

### Requisitos Previos

Asegúrate de tener instalados los siguientes programas en tu máquina local:

*   **Docker:** Para la contenerización de las aplicaciones.
*   **Docker Compose:** Para la orquestación de los contenedores.
*   **Git:** Para el control de versiones.

### Configuración Inicial

1.  **Variables de Entorno:**
    Crea un archivo `.env` en la raíz del proyecto. Este archivo contendrá las variables de configuración para los servicios del backend y la base de datos. Puedes usar el ejemplo del `README.md` como base.

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

2.  **Levantar los Servicios:**
    Desde la raíz del proyecto, ejecuta Docker Compose para construir y levantar todos los servicios:

    ```bash
    docker-compose up --build
    ```
    El flag `--build` es importante para asegurar que se construyan las imágenes más recientes, especialmente después de realizar cambios en el código o en los `Dockerfile`.

3.  **Acceder a la Aplicación:**
    Una vez que los contenedores estén en funcionamiento, la aplicación estará disponible en `http://localhost:3000`.

## 3. Estructura del Proyecto

El proyecto está organizado en los siguientes directorios principales:

*   `backend/`: Contiene la aplicación FastAPI (Python), incluyendo la lógica de negocio, los modelos de base de datos, los servicios y los routers API.
*   `frontend/`: Contiene la aplicación React.js, incluyendo los componentes de la interfaz de usuario, los servicios API y los estilos.
*   `nginx/`: Configuración del servidor Nginx, que actúa como proxy inverso para el backend y sirve el contenido estático del frontend.
*   `db/`: (Dentro de `backend/`) Contiene la configuración de la base de datos y las definiciones de los modelos.
*   `docs/`: Documentación adicional del proyecto (como este archivo).
*   `docker-compose.yml`: Define los servicios de Docker Compose y su configuración.
*   `README.md`: Descripción general del proyecto.
*   `CHANGELOG.md`: Historial de cambios y mejoras.

## 4. Estándares de Código y Estilo

Para mantener la coherencia y legibilidad del código:

*   **Python (Backend):**
    *   Sigue las directrices de estilo **PEP 8**.
    *   Utiliza tipos para las funciones y variables cuando sea posible.
    *   Escribe docstrings claros para funciones y clases.
*   **JavaScript/React (Frontend):**
    *   Sigue las convenciones de React y JavaScript moderno.
    *   Utiliza camelCase para nombres de variables y funciones.
    *   Escribe comentarios claros para lógica compleja.
*   **Formato General:** Se recomienda el uso de herramientas de formato de código (como `Black` para Python y `Prettier` para JavaScript/React) antes de cada commit. Aunque no están estrictamente configurados en el CI, el respeto por el estilo mejora la colaboración.

## 5. Proceso de Desarrollo y Pull Requests

1.  **Crear una Rama (Branch):**
    Para cada nueva característica o corrección de error, crea una nueva rama desde `master`:
    ```bash
    git checkout master
    git pull origin master
    git checkout -b feature/nombre-de-tu-rama
    ```
    Usa prefijos como `feature/`, `bugfix/`, `docs/`, `refactor/` según corresponda.

2.  **Realizar Cambios:**
    Implementa tus cambios. Asegúrate de que tu código sea limpio, modular y esté bien comentado.

3.  **Ejecutar Tests:**
    Antes de hacer un commit, ejecuta las pruebas para asegurarte de que tus cambios no introducen regresiones y que la funcionalidad existente sigue funcionando correctamente.

    *   **Tests de Backend (Python):** (Añadir comando si hay tests unitarios con `pytest`)
    *   **Tests de Frontend (React):**
        ```bash
        cd frontend
        npm test
        # Asegúrate de que todos los tests pasen.
        # En este momento, Login.test.js ha sido temporalmente deshabilitado.
        ```

4.  **Commit y Push:**
    Añade tus cambios al staging area y haz un commit con un mensaje claro y conciso que describa lo que has hecho.
    ```bash
    git add .
    git commit -m "feat: Descripción concisa de la nueva característica"
    git push origin feature/nombre-de-tu-rama
    ```
    Sigue las convenciones de mensajes de commit (ej. `feat:`, `fix:`, `docs:`, `chore:`).

5.  **Abrir un Pull Request (PR):**
    Una vez que tus cambios estén en tu rama remota, abre un Pull Request en GitHub hacia la rama `master` del repositorio principal.
    *   Proporciona una descripción clara del PR, explicando el problema que resuelve o la característica que implementa.
    *   Si el PR resuelve un issue, haz referencia a él (ej. `Closes #123`).
    *   Asegúrate de que el CI/CD pase para tu PR.

## 6. Ejecución de Tests

*   **Tests de Frontend:** Para ejecutar los tests del frontend, navega a la carpeta `frontend` y ejecuta:
    ```bash
    cd frontend
    npm test
    ```
    Actualmente, `Login.test.js` ha sido deshabilitado temporalmente debido a problemas de entorno. Asegúrate de que el resto de los tests pasen.

*   **Tests de Backend:** Si existen tests unitarios o de integración en el backend (ej. usando `pytest`), ejecuta los siguientes comandos desde la carpeta `backend`:
    ```bash
    # (Comando de pytest si está configurado)
    ```

¡Gracias por tu colaboración!
