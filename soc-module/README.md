# Módulo de Gestión de Incidentes y Tickets SOC

Este repositorio contiene el diseño e implementación de un módulo de gestión de incidentes y tickets SOC, integrado con herramientas Fortinet y cumpliendo con normas ISO/ITIL y normativa argentina de datos personales.

## Estructura del Proyecto

- `api/`: Contiene el código fuente de la API REST (Node.js, TypeScript, Express, Prisma).
- `workers/syslog/`: Worker para la ingesta de eventos Syslog.
- `workers/webhooks/`: Worker para la ingesta de eventos vía webhooks.
- `infra/caddy/`: Contiene la configuración del reverse proxy Caddy.
- `docs/`: Contiene la documentación técnica y de cumplimiento.

## Configuración y Ejecución

### Requisitos

- Docker y Docker Compose
- Node.js 20+ (para desarrollo local)
- npm o yarn

### Pasos para levantar el entorno

1.  **Clonar el repositorio:**
    ```bash
    git clone <URL_DEL_REPOSITORIO>
    cd soc-module
    ```
2.  **Configurar variables de entorno:**
    Copia `.env.example` a `.env` en la raíz del módulo y ajusta los valores según sea necesario.
    ```bash
    cp .env.example .env
    ```
    **Nota:** Asegúrate de que `DATABASE_URL`, `JWT_SECRET`, `WEBHOOK_SECRET` y otras variables estén configuradas correctamente.

3.  **Levantar servicios con Docker Compose:**
    ```bash
    docker-compose up --build -d
    ```
    Esto levantará la base de datos PostgreSQL, la API, los workers y el reverse proxy Caddy.

4.  **Inicializar la base de datos (migraciones Prisma):**
    Una vez que la API esté corriendo, puedes ejecutar las migraciones de Prisma.
    ```bash
    docker-compose exec api npx prisma migrate dev --name init
    ```
    **Nota:** Si es la primera vez, esto creará las tablas.

### Acceso

- **API:** Accesible a través de Caddy en `http://localhost/api` (o el dominio que configures en Caddy).
- **Base de datos:** Puerto 5432 (solo para desarrollo).
- **Syslog Worker:** Escuchando en UDP/TCP puerto 514.

## Desarrollo

### API

-   **Scripts:**
    -   `npm run dev`: Inicia el servidor de desarrollo.
    -   `npm run build`: Compila el código TypeScript.
    -   `npm run start`: Inicia el servidor compilado.
    -   `npx prisma studio`: Abre Prisma Studio para explorar la base de datos.

### Workers

Cada worker tiene su propio `package.json` y scripts de inicio.

## Tests

Las pruebas unitarias se ejecutarán con Vitest. (Pendiente de implementación)

## Cumplimiento Normativo

Ver la carpeta `docs/` para detalles sobre ISO/ITIL y normativa argentina.
