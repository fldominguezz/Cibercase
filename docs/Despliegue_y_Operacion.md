# Guía de Despliegue y Operación para CiberCase

Este documento proporciona instrucciones para el despliegue y la operación de la aplicación CiberCase en un entorno de producción o staging, utilizando Docker y Docker Compose.

## 1. Requisitos del Servidor

Para un despliegue en producción, se recomienda un servidor Linux (Ubuntu Server, CentOS, etc.) con:

*   **Recursos:** Mínimo 2GB de RAM, 2 vCPUs y 20GB de espacio en disco (ajustar según el volumen esperado de datos y tráfico).
*   **Software:**
    *   **Docker:** Versión reciente.
    *   **Docker Compose:** Versión reciente.
    *   **Git:** Para clonar el repositorio.

## 2. Despliegue Inicial

Siga estos pasos para realizar el despliegue inicial de la aplicación.

### 2.1. Preparar el Servidor

1.  **Conéctese a su servidor:**
    ```bash
    ssh usuario@tu_servidor_ip
    ```
2.  **Instale Docker y Docker Compose:**
    Siga las instrucciones oficiales de Docker para su sistema operativo.

### 2.2. Clonar el Repositorio

En el directorio donde desea desplegar la aplicación (ej. `/opt/cibercase`):

```bash
git clone https://github.com/fldominguezz/CiberCase.git
cd CiberCase
```

### 2.3. Configurar Variables de Entorno

Cree un archivo `.env` en la raíz del proyecto. Este archivo es **crítico** para la configuración de la base de datos, claves de seguridad y credenciales del administrador. **Nunca suba este archivo a su repositorio Git.**

```env
# --- Configuración de la Base de Datos ---
POSTGRES_USER=admin_prod
POSTGRES_PASSWORD=una_contraseña_segura_para_prod
POSTGRES_DB=cibercase_prod_db
DATABASE_URL=postgresql://admin_prod:una_contraseña_segura_para_prod@db:5432/cibercase_prod_db

# --- Configuración de la Aplicación ---
# IMPORTANTE: Genere una clave segura y única con: openssl rand -hex 32
# Ejemplo: openssl rand -hex 32 -> d8e0f7a...
SECRET_KEY=su_clave_secreta_de_produccion_generada_con_openssl
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=120

# --- Credenciales del Administrador Inicial ---
# Estas credenciales se usarán para crear el usuario administrador la primera vez que se inicie el backend.
ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=una_contraseña_admin_muy_segura
```

**Asegúrese de:**
*   Utilizar contraseñas **fuertes y únicas** para la base de datos y el administrador.
*   Generar una `SECRET_KEY` **realmente aleatoria y larga** para producción.

### 2.4. Levantar la Aplicación

Una vez configurado el archivo `.env`, puede levantar toda la pila de la aplicación:

```bash
docker-compose up --build -d
```

*   `--build`: Fuerza la reconstrucción de las imágenes de Docker. Úselo la primera vez y después de cualquier cambio en el código fuente de backend/frontend o en los `Dockerfile`.
*   `-d`: Ejecuta los contenedores en modo 'detached' (en segundo plano).

### 2.5. Acceder a la Aplicación

Por defecto, la aplicación estará disponible en `http://tu_servidor_ip:3000`.

**Configuración HTTPS:**
Para un entorno de producción, es **imperativo** configurar HTTPS. Esto generalmente implica:
1.  Obtener un certificado SSL/TLS (ej. con Let's Encrypt).
2.  Configurar Nginx para usar este certificado y redirigir todo el tráfico HTTP a HTTPS. La configuración actual de Nginx en `nginx/nginx.conf` es básica y necesitará ser extendida para esto.

## 3. Actualizaciones y Mantenimiento

Para actualizar la aplicación con los últimos cambios del repositorio:

1.  **Detenga los servicios actuales:**
    ```bash
    docker-compose down
    ```
2.  **Obtenga los últimos cambios:**
    ```bash
git pull origin master
```
3.  **Reconstruya y levante los servicios:**
    ```bash
docker-compose up --build -d
```
    El `--build` es crucial para que los cambios en el código sean tomados por los contenedores.

## 4. Monitoreo

Es esencial monitorear la salud y el rendimiento de la aplicación en producción.

### 4.1. Logs de Contenedores

Puede ver los logs de todos los servicios (o de un servicio específico) con Docker Compose:

*   **Todos los logs:**
    ```bash
    docker-compose logs -f
    ```
*   **Logs del Backend:**
    ```bash
    docker-compose logs -f backend
    ```
*   **Logs del Frontend:**
    ```bash
    docker-compose logs -f frontend
    ```
*   **Logs de Nginx:**
    ```bash
    docker-compose logs -f nginx
    ```

### 4.2. Uso de Recursos

Para ver el uso de CPU, memoria, E/S de disco y red de sus contenedores:

```bash
docker stats
```

### 4.3. Herramientas de Monitoreo Externas

Considere integrar herramientas de monitoreo más avanzadas (ej. Prometheus + Grafana, ELK Stack para logs, Sentry para errores) para una visibilidad completa del sistema.

## 5. Copias de Seguridad de la Base de Datos

La base de datos PostgreSQL contiene toda la información crítica del sistema. Implemente una estrategia robusta de copias de seguridad.

*   **Ejemplo de copia de seguridad manual (desde el host del Docker Compose):**
    ```bash
    docker-compose exec db pg_dump -U admin_prod cibercase_prod_db > backup_cibercase_$(date +%F).sql
    ```
    Asegúrese de mover estos backups a un almacenamiento externo y seguro.

## 6. Consideraciones de Seguridad

*   **HTTPS:** Como se mencionó, configure SSL/TLS para cifrar el tráfico.
*   **Firewall:** Configure el firewall del servidor para permitir solo el tráfico necesario (puertos 80/443 para Nginx, y posiblemente SSH para administración).
*   **Credenciales:** Nunca exponga las credenciales en el código fuente ni en logs públicos. Utilice siempre el archivo `.env` y asegúrese de que no se suba a Git.
*   **Actualizaciones:** Mantenga Docker, Docker Compose y el sistema operativo del host actualizados.

## 7. Escalabilidad Básica

Docker Compose es ideal para el desarrollo y despliegues pequeños. Para escalar servicios a un nivel básico:

*   **Aumentar instancias:** Puede escalar un servicio (ej. `backend`) con `docker-compose up --scale backend=3 -d`. Sin embargo, esto requiere que su aplicación esté diseñada para manejar múltiples instancias (ej. sesiones sin estado).

Para una escalabilidad y orquestación avanzadas en producción (tolerancia a fallos, autoescalado), se recomienda utilizar un orquestador de contenedores como **Kubernetes** o **Docker Swarm**.
