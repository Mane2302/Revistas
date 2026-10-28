# Instalación y despliegue

Tiempo estimado: 30–45 minutos. No se necesita tarjeta de crédito si te mantienes en los planes gratuitos.

## 1. Crear el proyecto de Supabase

1. Entra a <https://supabase.com>, crea una cuenta y pulsa **New project**.
2. Elige un nombre (por ejemplo `revista-escolar`), una contraseña de base de datos (guárdala en un gestor de contraseñas; no la pongas en el código) y la región más cercana a la escuela.
3. Espera a que el proyecto termine de crearse.

## 2. Configurar la autenticación (importante)

En **Authentication → Sign In / Providers**:

- **Email**: activado (las cuentas usan un correo interno ficticio; ver `docs/ARQUITECTURA.md` §4).
- **Allow new users to sign up**: **desactivado**. Así nadie puede registrarse desde fuera: solo el profesor crea cuentas.

En **Authentication → Rate Limits**:

- Un aula entera suele compartir la misma IP pública. Aumenta el límite de inicios de sesión por IP (por ejemplo a 150 cada 5 minutos) para que no se bloquee una clase completa. La aplicación tiene además su propio límite por usuario (5 fallos en 15 minutos).

No hace falta configurar SMTP: la aplicación no envía correos.

## 3. Crear las tablas, políticas y el bucket

Las migraciones están en `supabase/migrations/` y deben aplicarse **en orden**:

1. `20261027000000_esquema_inicial.sql` — tablas, RLS, funciones, bucket `media`
2. `20261027000100_plantillas.sql` — las 21 plantillas
3. `20261027000200_almacenamiento.sql` — cuotas y referencias de imágenes

**Opción A (sin instalar nada):** en Supabase abre **SQL Editor**, pega el contenido de cada archivo y pulsa **Run**, uno tras otro.

**Opción B (CLI):**

```bash
npx supabase login
npx supabase init            # solo la primera vez, si no existe supabase/config.toml
npx supabase link --project-ref TU_REF   # el "Reference ID" de Project Settings
npx supabase db push
```

Comprueba en **Storage** que existe el bucket `media`, **privado**, con límite de 10 MB y tipos `image/jpeg, image/png, image/webp`. Las políticas de seguridad (RLS) se crean con la migración: no hay que activarlas a mano. Puedes verlas en **Authentication → Policies**.

## 4. Variables de entorno locales

```bash
cp .env.example .env.local
```

Complétalo con los datos de **Project Settings → API Keys**:

| Variable | Dónde se obtiene | ¿Pública? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | Sí (diseñada para el navegador) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (o la *anon key* en proyectos antiguos) | Sí |
| `SUPABASE_SECRET_KEY` | Secret key (o *service_role* en proyectos antiguos) | **No. Solo servidor** |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` en local; tu dominio en producción | Sí |
| `STUDENT_EMAIL_DOMAIN` | Déjalo en `alumnos.revista-escolar.invalid` | No |
| `LOGIN_HASH_SALT` | `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` | No |

> Si Supabase rechazara el dominio `.invalid` al crear cuentas, usa un subdominio que controle la escuela y que no tenga servidor de correo (por ejemplo `alumnos.miescuela.edu.mx`). Cambiar el dominio después invalida los inicios de sesión de las cuentas existentes.

`.env.local` está en `.gitignore`: nunca lo subas a GitHub.

## 5. Crear la primera cuenta de profesor

```bash
npm install
npm run crear-profesor
```

El script pide nombre y usuario, crea la cuenta con una contraseña temporal y la muestra **una sola vez**. Solo funciona con la clave secreta, por lo que nadie puede convertirse en administrador desde el navegador. Los demás profesores se crean desde **Panel → Profesores**.

## 6. Probar en local

```bash
npm run dev
```

Abre <http://localhost:3000>, entra con la cuenta de profesor, cambia la contraseña y sigue este recorrido: crear grupo → registrar alumno → asignar proyecto → (en otra ventana privada) entrar como alumno → crear artículo → subir foto → enviar → (profesor) aprobar → crear revista → insertar el trabajo → autorizar la imagen → publicar → abrir el enlace público.

## 7. Desplegar en Vercel

1. Sube el repositorio a GitHub (sin `.env.local`).
2. En <https://vercel.com> pulsa **Add New → Project** e importa el repositorio. Vercel detecta Next.js automáticamente.
3. En **Settings → Environment Variables** añade las mismas variables del paso 4, con `NEXT_PUBLIC_SITE_URL` igual a la URL de Vercel (por ejemplo `https://revista-escolar.vercel.app`). Marca `SUPABASE_SECRET_KEY` y `LOGIN_HASH_SALT` como **Sensitive** y **nunca** les pongas el prefijo `NEXT_PUBLIC_`.
4. Pulsa **Deploy**.
5. En Supabase, **Authentication → URL Configuration**, pon la URL de Vercel como *Site URL*.

## 8. Límites que debes revisar antes de usarla con alumnos

Los valores cambian con el tiempo; confírmalos en <https://supabase.com/pricing> y <https://vercel.com/pricing>.

- **Supabase (plan gratuito):** espacio de base de datos y de Storage limitados (del orden de 500 MB y 1 GB), transferencia mensual limitada, y los proyectos inactivos durante una semana se **pausan** (se reactivan desde el panel). La aplicación reduce las fotos a 2400 px, evita duplicados y tiene cuotas configurables en **Ajustes**.
- **Vercel (plan Hobby):** pensado para uso personal y no comercial; la escuela debe confirmar que su uso encaja en las condiciones o usar un plan adecuado. Hay límites de tiempo y memoria por función: por eso el PDF se genera en el navegador del usuario y no en el servidor.
- **Tamaño de las revistas:** hasta 80 páginas por revista y 24 por trabajo. Una revista con muchas fotos tarda más en exportarse; el diálogo muestra el progreso.

## 9. Mantenimiento

- `npm run verificar` antes de cada despliegue (lint, tipos, pruebas y compilación).
- Si cambias el esquema, crea una migración nueva en `supabase/migrations/` (no edites las ya aplicadas) y actualiza `src/types/database.ts` (puedes generarlo con `npx supabase gen types typescript --project-id TU_REF`).
- Al terminar el ciclo escolar, el profesor puede eliminar cuentas desde **Alumnos** (borra trabajos e imágenes; las revistas publicadas conservan su copia).
