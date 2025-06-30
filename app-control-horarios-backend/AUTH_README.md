# Sistema de Autenticación y Autorización

Este documento describe brevemente el sistema de autenticación y autorización implementado en el backend de la aplicación "Control de Horarios".

## Tecnologías Utilizadas

*   **Flask-Security-Too**: Extensión de Flask que maneja la autenticación, autorización, registro de usuarios, hashing de contraseñas y tokens.
*   **JWT (JSON Web Tokens)**: Se utilizan tokens JWT para la autenticación de API sin estado.
*   **bcrypt**: Algoritmo utilizado para el hashing seguro de las contraseñas de los usuarios.

## Configuración Principal

La configuración de Flask-Security-Too se encuentra en `src/main.py`. Aspectos clave:

*   **Modelos**: `User` y `Role` definidos en `src/models/employee.py`.
*   **Hashing**: Contraseñas hasheadas con bcrypt.
*   **Tokens JWT**:
    *   Se esperan en la cabecera `Authorization` con el prefijo `Bearer ` (ej. `Authorization: Bearer <tu_jwt_token>`).
    *   Firmados con el algoritmo `HS256` utilizando la `SECRET_KEY` de la aplicación.
    *   Tiempo de expiración por defecto: 1 día (configurable).
*   **Variables de Entorno Requeridas**:
    *   `SECRET_KEY`: Clave secreta para firmar tokens y otras operaciones criptográficas.
    *   `SECURITY_PASSWORD_SALT`: Salt para el hashing de contraseñas.
    *   `DATABASE_URL`: URL de conexión a la base de datos.
    *   `FRONTEND_URL`: URL del frontend (para configuración de CORS).

## Endpoints de Autenticación

Los siguientes endpoints son gestionados por Flask-Security-Too y tienen el prefijo `/api/auth`:

*   **`POST /api/auth/login`**:
    *   Permite a un usuario iniciar sesión.
    *   **Request Body (JSON)**:
        ```json
        {
          "email": "usuario@example.com",
          "password": "supassword"
        }
        ```
    *   **Respuesta Exitosa (JSON)**: Devuelve un token JWT y la información del usuario. La estructura exacta puede variar, pero comúnmente es:
        ```json
        {
          "response": {
            "user": {
              "id": "fs_uniquifier_del_usuario",
              "email": "usuario@example.com",
              "roles": ["rol1", "rol2"]
            },
            "token": "el_jwt_token_aqui"
            // o "access_token": "el_jwt_token_aqui"
          }
        }
        ```
        *Nota: El campo exacto que contiene el token (`token` o `access_token`) y la estructura de `user` puede depender de la configuración de Flask-Security-Too y si `SECURITY_RETURN_GENERIC_RESPONSES` está habilitado.*
    *   **Respuesta de Error**: Código 400 o 401 con detalles del error.

*   **`POST /api/auth/register`**:
    *   Permite registrar un nuevo usuario.
    *   **Request Body (JSON)**:
        ```json
        {
          "email": "nuevo_usuario@example.com",
          "password": "supassword",
          "fs_uniquifier": "un_uuid_v4_aqui" // Opcional si el backend lo puede generar
        }
        ```
        *Nota: `fs_uniquifier` es requerido por Flask-Security-Too. Si el cliente no lo envía, el backend debería generarlo. La implementación actual requiere que el cliente lo envíe o que se modifique el endpoint de registro para generarlo.*
        *Actualmente, el endpoint por defecto de Flask-Security-Too no espera `fs_uniquifier` en el JSON, lo genera internamente.*
        *Para asignar roles en el registro, se necesitaría personalizar el endpoint de registro o hacerlo posteriormente.*
    *   **Respuesta Exitosa (JSON)**: Devuelve información del usuario creado (sin token; el usuario debe loguearse después).
    *   **Respuesta de Error**: Código 400 con detalles del error (ej. email ya existe, contraseña no cumple requisitos).

*   **`POST /api/auth/logout`**:
    *   Invalida la sesión del usuario si se usan sesiones del lado del servidor.
    *   Con JWT puros, este endpoint tiene un efecto limitado en el backend (a menos que se use blacklisting de tokens). El cliente es responsable de destruir el token.
    *   **Respuesta Exitosa**: Usualmente un 200 OK o 204 No Content.

## Protección de Endpoints de la API

Todos los demás endpoints de la API (ej. `/api/employees`, `/api/calendar/...`) están protegidos y requieren un token JWT válido:

*   El token debe enviarse en la cabecera `Authorization: Bearer <token>`.
*   Si el token es inválido, está expirado o no se proporciona, la API devolverá un error `401 Unauthorized`.

## Roles y Permisos

*   Se han definido dos roles básicos: `admin` y `user`.
*   **Creación Inicial**: Al iniciar la aplicación, si no existen, se crean estos roles y un usuario `admin@example.com` con contraseña `password` y roles `admin, user`. **Esto es solo para desarrollo y debe cambiarse/deshabilitarse en producción.**
*   **Endpoints Restringidos por Rol**:
    *   Las operaciones de Crear, Actualizar y Eliminar empleados (`POST /api/employees`, `PUT /api/employees/<id>`, `DELETE /api/employees/<id>`) requieren que el usuario autenticado tenga el rol `admin`.
    *   Esto se implementa con el decorador `@roles_required('admin')`.
    *   Si un usuario autenticado intenta acceder a estos endpoints sin el rol 'admin', recibirá un error `403 Forbidden`.

## Flujo de Autenticación (Frontend)

1.  El usuario introduce email y contraseña en la página de login del frontend.
2.  El frontend envía una petición `POST` a `/api/auth/login` con las credenciales.
3.  Si el login es exitoso, el backend devuelve un token JWT.
4.  El frontend almacena este token de forma segura (ej. `localStorage`).
5.  Para las peticiones subsiguientes a endpoints protegidos de la API, el frontend incluye el token en la cabecera `Authorization: Bearer <token>`.
6.  Al hacer logout, el frontend elimina el token almacenado y opcionalmente llama a `/api/auth/logout`.

## Consideraciones de Seguridad Adicionales (Producción)

*   **HTTPS**: Toda la comunicación debe ser sobre HTTPS.
*   **Claves Seguras**: `SECRET_KEY` y `SECURITY_PASSWORD_SALT` deben ser valores largos, aleatorios y únicos, gestionados como secretos.
*   **Usuario Admin Inicial**: El método de creación del usuario admin inicial debe ser seguro (ej. script CLI único, no hardcodeado en la app).
*   **Manejo de `fs_uniquifier`**: Asegurar que se genere de forma segura y única para cada usuario. Flask-Security-Too lo maneja si no se provee explícitamente al crear el usuario por código.
*   **Expiración y Refresco de Tokens**: Considerar estrategias de refresco de tokens para mejorar la seguridad y la experiencia de usuario si los tokens tienen una vida corta.
*   **Blacklisting de Tokens**: Para invalidar tokens JWT antes de su expiración (ej. al cambiar contraseña o logout forzado), se puede implementar un sistema de blacklisting (Flask-Security-Too tiene soporte para esto con `SECURITY_BLACKLIST_ENABLED`).
```
