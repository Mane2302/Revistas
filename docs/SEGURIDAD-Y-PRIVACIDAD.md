# Seguridad y privacidad

## Capas de protección

| Capa | Qué protege |
|---|---|
| Server Actions | Validan con Zod y comprueban la sesión y el rol (`requireTeacher`, `requireStudent`) antes de cada operación |
| Row Level Security | Todas las tablas tienen RLS. Aunque alguien llame directamente a la API de Supabase con su sesión, solo ve y modifica lo permitido |
| Disparadores | Impiden que un cliente cambie columnas protegidas (rol, estado, autor, grupo, versión, autorización de imágenes) |
| Funciones SQL | Las transiciones de estado (enviar, revisar, publicar, retirar) solo existen como funciones que verifican rol y estado |
| Storage | Bucket privado; sin permisos de escritura para clientes; subidas con URL firmada cuya ruta decide el servidor |
| Cabeceras HTTP | CSP restrictiva, `X-Frame-Options: DENY`, `nosniff`, sin permisos de cámara/micrófono/ubicación |

## Matriz de permisos (resumen)

| Recurso | Alumno | Profesor | Sin sesión |
|---|---|---|---|
| Perfiles | Solo el suyo (lectura) | Todos; edita nombres y grupo | — |
| Rol, cuenta activa | Nunca | Solo vía servidor (clave secreta) | — |
| Trabajos | Los suyos; edita en borrador o con correcciones | Leer todos; revisar vía función | — |
| Imágenes | Las suyas; edita créditos | Todas; autoriza publicación | Solo las autorizadas de una revista publicada, por URL temporal |
| Revistas y composición | — | Todo | — |
| Publicaciones | Vigentes | Todas | Vigentes y públicas (sin saber quién publicó) |
| Auditoría | — | Lectura | — |
| Intentos de acceso | — | — | — (solo servidor) |

Estas reglas están comprobadas por `tests/db/seguridad.test.ts` (35 pruebas que ejecutan las migraciones reales en PostgreSQL/PGlite e intentan accesos indebidos).

## Contraseñas

- Supabase Auth guarda las contraseñas con hash (bcrypt); la aplicación nunca las almacena.
- Las temporales se generan con un generador criptográfico, se muestran una sola vez y deben cambiarse en el primer acceso.
- Nadie puede consultar la contraseña actual de un alumno; el profesor solo puede restablecerla.
- Mensajes de error genéricos para no revelar si una cuenta existe; límite de 5 fallos por usuario y 60 por IP cada 15 minutos (la IP se guarda cifrada con hash y los registros se borran tras un día).

## Claves

- En el navegador solo existen `NEXT_PUBLIC_SUPABASE_URL` y la clave publicable, diseñadas para ser públicas.
- La clave secreta solo se usa en `src/lib/supabase/admin.ts`, que importa `server-only`: si se importara desde un componente de navegador la compilación fallaría.

## Privacidad de los estudiantes (menores de edad)

- **Minimización:** solo se piden nombre visible, usuario y grupo. Sin correo, teléfono ni fecha de nacimiento.
- **Seudónimos:** cada alumno puede tener un «nombre editorial» para los créditos públicos.
- **Nada se publica automáticamente:** la revista la publica el profesor y cada fotografía debe autorizarse una por una. Las fotos no autorizadas no se muestran al público.
- **Comentarios privados:** las observaciones de revisión nunca forman parte de la publicación.
- **Publicación = copia:** se publica una instantánea; los borradores y la composición en curso nunca son públicos. El enlace usa un identificador aleatorio y, además, el servidor verifica en cada visita que la revista siga publicada.
- **Sin publicidad ni seguimiento:** no hay analítica de terceros ni cookies de publicidad. Las fuentes se sirven desde el propio sitio (no se contacta a Google Fonts).
- **Eliminación:** el profesor puede borrar cuentas con sus trabajos e imágenes.

## Responsabilidades de la escuela

La aplicación ofrece controles técnicos, pero **no garantiza por sí sola el cumplimiento de la normativa** de protección de datos aplicable (por ejemplo, la legislación mexicana de datos personales o la de cada país). La escuela y el profesor administrador deben:

1. Revisar y adaptar el aviso de privacidad (**Ajustes**) y comunicarlo a las familias.
2. Obtener las autorizaciones necesarias antes de publicar imágenes en las que aparezcan personas.
3. Decidir quién tiene cuentas de profesor y proteger la clave secreta de Supabase.
4. Definir cuánto tiempo se conservan los trabajos y borrarlos al final del ciclo.
5. Revisar los términos de servicio y la región de datos de Supabase y Vercel.
