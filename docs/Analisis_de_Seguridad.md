# Análisis y Consideraciones de Seguridad en CiberCase

Este documento describe las medidas de seguridad implementadas y las consideraciones clave para garantizar la protección de la aplicación CiberCase y los datos que maneja. Una seguridad robusta es fundamental para una aplicación de Gestión de Incidentes de Seguridad.

## 1. Autenticación y Autorización

*   **JSON Web Tokens (JWT):**
    *   **Autenticación:** CiberCase utiliza JWTs para la autenticación de usuarios. Tras un inicio de sesión exitoso, se emite un token que el cliente debe incluir en las cabeceras de `Authorization` (como `Bearer <token>`) para acceder a recursos protegidos.
    *   **Naturaleza Sin Estado (Stateless):** Los JWTs son autocontenidos, lo que significa que el servidor no necesita mantener el estado de la sesión, facilitando la escalabilidad.
    *   **Expiración de Tokens:** Los tokens tienen un tiempo de vida limitado (`ACCESS_TOKEN_EXPIRE_MINUTES`) para reducir la ventana de oportunidad de un atacante en caso de compromiso del token.

*   **Control de Acceso Basado en Roles (RBAC):**
    *   El sistema implementa un modelo de roles (`Analista`, `Lider`, `Auditor`, `Admin`) para definir los permisos de los usuarios.
    *   Los endpoints de la API están protegidos y restringen el acceso basándose en el rol del usuario autenticado (ej. solo 'Admin' puede crear usuarios o revertir logs de auditoría).
    *   Los endpoints de `admin` utilizan `get_current_active_admin` o `get_current_admin_or_lider_user` para asegurar que solo usuarios con los roles adecuados puedan acceder.

*   **Gestión de Sesiones:**
    *   Se utiliza un `session_id` asociado al usuario en la base de datos y en el JWT para permitir la revocación de sesiones, incluso si el JWT en sí es válido. Si el `session_id` del token no coincide con el de la DB, la sesión se considera inválida.

## 2. Gestión de Credenciales y Secretos

*   **Variables de Entorno (.env):**
    *   Todas las credenciales sensibles (ej. `POSTGRES_PASSWORD`, `DATABASE_URL`, `SECRET_KEY`, `VIRUSTOTAL_API_KEY` - si se implementara) se almacenan en el archivo `.env`.
    *   **Crítico:** El archivo `.env` está excluido del control de versiones (`.gitignore`) para prevenir la exposición accidental de secretos.
*   **Hashing Seguro de Contraseñas:**
    *   Las contraseñas de los usuarios nunca se almacenan en texto plano en la base de datos. Se utiliza una función de hashing criptográficamente segura (ej. `get_password_hash` en `core.security`) para almacenar los hashes de las contraseñas.
    *   Se recomienda el uso de algoritmos como bcrypt o Argon2, que son resistentes a ataques de fuerza bruta y rainbows.
*   **Generación de `SECRET_KEY`:**
    *   La `SECRET_KEY` utilizada para firmar los JWTs debe ser una cadena aleatoria, larga y única, generada con una herramienta segura (ej. `openssl rand -hex 32`).

## 3. Validación de Entradas y Protección contra Vulnerabilidades Comunes

*   **Validación de Esquemas (Pydantic):**
    *   FastAPI, al usar Pydantic para la definición de modelos de datos, valida automáticamente todos los datos de entrada (cuerpos de solicitud, parámetros de consulta, parámetros de ruta). Esto mitiga una amplia gama de vulnerabilidades de inyección y manipulación de datos.
    *   **Inyección de SQL:** El uso de SQLAlchemy ORM (Object-Relational Mapper) protege inherentemente contra la mayoría de los ataques de inyección de SQL al parametrizar las consultas a la base de datos.
    *   **Cross-Site Scripting (XSS):** Aunque Pydantic valida tipos de datos, se recomienda la sanitización adicional de entradas de usuario que puedan contener HTML (ej. descripciones de tickets, comentarios) en el frontend antes de renderizarlas, o en el backend si se almacena HTML crudo.
    *   **Cross-Site Request Forgery (CSRF):** Al ser una API que utiliza JWTs en las cabeceras `Authorization`, la aplicación es inherentemente menos vulnerable a CSRF que las aplicaciones basadas en cookies de sesión. Sin embargo, medidas adicionales como la validación del encabezado `Origin` pueden reforzar la protección.

## 4. Protección de Endpoints y Configuración de Red

*   **CORS (Cross-Origin Resource Sharing):**
    *   Configurado en el backend (FastAPI) para permitir solicitudes solo desde orígenes frontend de confianza, previniendo solicitudes maliciosas desde otros dominios.
*   **Rate Limiting:**
    *   Aunque no está explícitamente implementado en todos los endpoints, es una recomendación clave para endpoints sensibles (ej. `/login`, endpoints de creación de recursos) para prevenir ataques de fuerza bruta o Denegación de Servicio (DoS).
*   **HTTPS:**
    *   **Obligatorio en Producción:** Todo el tráfico entre clientes y el servidor (y entre los microservicios si fuera necesario) debe estar cifrado utilizando HTTPS/SSL/TLS. Nginx está configurado como proxy inverso para manejar la terminación SSL.
*   **Configuración de Firewall:**
    *   El servidor anfitrión debe tener un firewall configurado para permitir solo el tráfico esencial (ej. puertos 80/443 para Nginx, SSH para administración).

## 5. Logging y Auditoría

*   **Registros de Auditoría (`AuditLog`):**
    *   El sistema registra las acciones críticas de los usuarios (ej. creación, actualización, eliminación de usuarios y tickets) en la tabla `audit_logs`.
    *   Estos registros incluyen la entidad afectada, el actor, la acción realizada y detalles adicionales, lo que proporciona un rastro inmutable para la investigación forense y el cumplimiento normativo.
*   **Logging de Aplicación:**
    *   El backend utiliza el módulo `logging` de Python para registrar eventos importantes, errores y advertencias, ayudando a la detección temprana de problemas de seguridad o anomalías.

## 6. Gestión Segura de Archivos

*   **Validación de Cargas:**
    *   Para funcionalidades como la subida de avatares o evidencias, se valida el tipo de archivo (`file.content_type`) para asegurar que solo se acepten formatos seguros (ej. imágenes JPG/PNG) y prevenir la subida de ejecutables o scripts maliciosos.
*   **Almacenamiento:**
    *   Los archivos cargados se almacenan en directorios dedicados (`static/avatars`, etc.) y no deben ser accesibles directamente desde el navegador sin un control de acceso adecuado, a menos que sean archivos estáticos seguros.

## 7. Integraciones Externas

*   **FortiSIEM:**
    *   La integración para la recepción de incidentes debe ser segura. Se recomienda el uso de HTTPS y, si es posible, restringir las IPs de origen que pueden enviar datos a este endpoint.
*   **VirusTotal:**
    *   Las llamadas a la API de VirusTotal deben realizarse desde el backend para evitar exponer la `VIRUSTOTAL_API_KEY` en el frontend.
    *   Se deben manejar los límites de llamadas a la API y los errores de manera robusta.

## 8. Actualizaciones y Parches

*   **Gestión de Dependencias:** Mantener todas las dependencias del proyecto (bibliotecas Python, paquetes npm, imágenes base de Docker) actualizadas a sus últimas versiones estables para mitigar vulnerabilidades conocidas.
*   **Sistema Operativo del Servidor:** Asegurar que el sistema operativo del servidor subyacente esté parcheado y actualizado regularmente.

Estas consideraciones son un punto de partida para una postura de seguridad robusta. La seguridad es un proceso continuo que requiere monitoreo constante, auditorías y adaptación a nuevas amenazas.
