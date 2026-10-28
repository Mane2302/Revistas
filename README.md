# Revista Escolar Digital

**«Imagina, escribe, diseña y publica».**

Aplicación web para que estudiantes de primer grado de secundaria (asignatura de Tecnología) creen revistas escolares: eligen plantillas, diseñan portadas, redactan artículos, suben fotografías y las envían a su profesor, que revisa, aprueba, compone la revista y la publica.

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript estricto, Tailwind CSS 4
- **Backend:** Supabase (PostgreSQL con Row Level Security, Auth, Storage)
- **Despliegue:** Vercel + Supabase (planes gratuitos)
- **PDF:** generado en el navegador con pdf-lib (texto vectorial y fuentes incrustadas)

## Funciones principales

| Profesor | Alumno | Lector público |
|---|---|---|
| Grupos, alumnos sin correo (individual o CSV), contraseñas temporales, desactivar cuentas | Panel con proyectos y estado de sus trabajos | Catálogo de revistas públicas |
| Proyectos con fecha, instrucciones y plantillas permitidas | «Crear mi artículo» / «Diseñar una portada» desde 21 plantillas | Lector página a página |
| Bandeja de revisión: aprobar, rechazar, pedir correcciones, reabrir, ver versiones | Editor visual: textos, 12 tipografías, colores, formas, fondos, fotos con recorte | Descarga de PDF si el profesor lo permite |
| Composición de la revista con copias de los trabajos aprobados | Guardado automático, copia local sin conexión, deshacer/rehacer | |
| Autorización de imágenes, publicar/retirar con historial de versiones | Envío al profesor y lectura de comentarios | |
| Cuotas de almacenamiento, aviso de privacidad, registro de cambios | Biblioteca de imágenes con créditos | |

## Puesta en marcha rápida (local)

Requisitos: Node.js 20.9 o superior y un proyecto de Supabase (gratuito).

```bash
npm install
cp .env.example .env.local      # completa las claves de TU proyecto Supabase
# aplica las migraciones de supabase/migrations (ver docs/DESPLIEGUE.md)
npm run crear-profesor          # crea la primera cuenta de profesor
npm run dev                     # http://localhost:3000
```

La guía completa paso a paso (Supabase, Vercel, límites gratuitos) está en **[docs/DESPLIEGUE.md](docs/DESPLIEGUE.md)**.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` / `npm start` | Compilación y servidor de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emitir |
| `npm test` | Pruebas: seguridad de la base de datos (PGlite), PDF, plantillas, editor, CSV, imágenes |
| `npm run verificar` | Todo lo anterior seguido |
| `npm run crear-profesor` | Crea una cuenta de profesor (requiere la clave secreta en `.env.local`) |
| `npm run plantillas:sql` | Regenera la migración de plantillas si cambias `src/lib/templates` |

## Documentación

- [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md): decisiones técnicas, modelo de datos, flujo editorial, riesgos
- [docs/DESPLIEGUE.md](docs/DESPLIEGUE.md): instalación, configuración de Supabase y Vercel, límites
- [docs/SEGURIDAD-Y-PRIVACIDAD.md](docs/SEGURIDAD-Y-PRIVACIDAD.md): permisos, RLS, privacidad de menores, responsabilidades de la escuela
- [docs/PROGRESO.md](docs/PROGRESO.md): lista de tareas, pruebas ejecutadas y limitaciones conocidas

## Estructura

```
src/
  app/             rutas (profesor/, alumno/, editor/, revistas/, ingresar/…)
  components/      ui/, editor/, magazine/, teacher/, student/, layout/
  lib/
    actions/       Server Actions (validación con Zod + permisos)
    auth/          sesión, credenciales, límite de intentos
    document/      modelo de páginas, geometría, ajuste de texto, cambio de plantilla
    pdf/           generación del PDF
    storage/       verificación de imágenes, subida, URLs firmadas
    supabase/      clientes de navegador, servidor y admin (solo servidor)
    templates/     las 21 plantillas
supabase/migrations/   esquema, RLS, funciones, bucket y plantillas
tests/                 pruebas de Vitest (incluye RLS sobre Postgres real en PGlite)
public/fonts/          12 familias tipográficas (licencia SIL OFL 1.1)
```

## Licencias de terceros

Las tipografías de `public/fonts` usan la licencia SIL Open Font License 1.1 (cada carpeta incluye su `OFL.txt`). Los iconos son de Lucide (ISC). Las ilustraciones de la aplicación son originales.
