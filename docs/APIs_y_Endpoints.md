---

## 10. Módulo: `users` (`/api/v1/users`)

Endpoints para la gestión de usuarios, incluyendo creación (por administradores), recuperación de información, cambio de contraseña y gestión de avatares.

### 10.1. `POST /api/v1/users/`
*   **Resumen:** Crear nuevo usuario.
*   **Descripción:** Permite a un usuario con rol de administrador crear una nueva cuenta de usuario en el sistema.
*   **Método:** `POST`
*   **Autenticación:** Sí (requiere usuario administrador activo).
*   **Parámetros (Request Body):**
    *   `user_in` (`UserCreate` schema, **Obligatorio**): Datos para la creación del nuevo usuario (email, contraseña, nombre, etc.).
*   **Respuesta Exitosa (201 Created):** `UserSchema` (objeto del usuario creado).
*   **Errores (400 Bad Request):** Si el email proporcionado ya está registrado.

### 10.2. `GET /api/v1/users/`
*   **Resumen:** Recuperar todos los usuarios.
*   **Descripción:** Retorna una lista de todos los usuarios registrados en el sistema. Nota: En un entorno de producción, este endpoint debería tener un control de acceso basado en roles más estricto.
*   **Método:** `GET`
*   **Autenticación:** Sí (requiere usuario autenticado).
*   **Parámetros:** Ninguno.
*   **Respuesta Exitosa (200 OK):** Lista de `UserSchema` (objetos de usuario).

### 10.3. `GET /api/v1/users/birthdays/today`
*   **Resumen:** Recuperar usuarios con cumpleaños hoy.
*   **Descripción:** Retorna una lista de los usuarios registrados cuyo cumpleaños coincide con la fecha actual.
*   **Método:** `GET`
*   **Autenticación:** Sí (requiere usuario autenticado).
*   **Parámetros:** Ninguno.
*   **Respuesta Exitosa (200 OK):** Lista de `UserSchema` (objetos de usuario).

### 10.4. `POST /api/v1/users/me/password`
*   **Resumen:** Cambiar contraseña del usuario actual.
*   **Descripción:** Permite al usuario actualmente autenticado cambiar su propia contraseña. Requiere la verificación de la contraseña antigua para proceder.
*   **Método:** `POST`
*   **Autenticación:** Sí (requiere usuario activo y autenticado).
*   **Parámetros (Request Body):**
    *   `password_data` (`UserPasswordChange` schema, **Obligatorio**): Objeto que contiene la `old_password` y `new_password`.
*   **Respuesta Exitosa (204 No Content):** No devuelve contenido.
*   **Errores (400 Bad Request):** Si la contraseña antigua es incorrecta.

### 10.5. `POST /api/v1/users/me/avatar`
*   **Resumen:** Subir un nuevo avatar de usuario.
*   **Descripción:** Permite al usuario autenticado subir una imagen (JPG o PNG) para usarla como su avatar. La imagen se guarda y la URL del avatar del usuario se actualiza en la base de datos.
*   **Método:** `POST`
*   **Autenticación:** Sí (requiere usuario activo y autenticado).
*   **Parámetros (Form Data):**
    *   `file` (`UploadFile`, **Obligatorio**): El archivo de imagen a subir.
*   **Respuesta Exitosa (200 OK):** `UserSchema` (objeto del usuario con la URL del nuevo avatar).
*   **Errores (400 Bad Request):** Si el tipo de archivo no es JPG o PNG.
*   **Errores (500 Internal Server Error):** Si ocurre un error al guardar el archivo.

### 10.6. `DELETE /api/v1/users/me/avatar`
*   **Resumen:** Eliminar el avatar del usuario actual.
*   **Descripción:** Elimina el avatar del usuario autenticado. Esto incluye eliminar el archivo de imagen del sistema de archivos y actualizar el registro del usuario en la base de datos.
*   **Método:** `DELETE`
*   **Autenticación:** Sí (requiere usuario activo y autenticado).
*   **Parámetros:** Ninguno.
*   **Respuesta Exitosa (204 No Content):** No devuelve contenido.