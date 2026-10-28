# Arquitectura — Revista Escolar Digital

## 1. Visión general

```
Navegador (Next.js / React)
  │  - Editor visual (estado local + historial deshacer/rehacer)
  │  - Generación del PDF (pdf-lib + fontkit, en el navegador)
  │  - Subida de imágenes a URL firmada de Storage
  ▼
Next.js en Vercel (App Router)
  │  - Server Components: lectura de datos con la sesión del usuario (RLS aplica)
  │  - Server Actions: validación con Zod y operaciones de escritura
  │  - Cliente "admin" (clave secreta) SOLO en el servidor para:
  │      crear/editar cuentas en Supabase Auth, firmar subidas,
  │      verificar archivos, borrar objetos, límites de acceso
  ▼
Supabase
  - Auth: cuentas con correo sintético interno (ver §4)
  - PostgreSQL: tablas con RLS en todas, funciones RPC SECURITY DEFINER
    para transiciones de estado (enviar, revisar, publicar)
  - Storage: bucket privado `media` (JPG/PNG/WebP, límite de tamaño)
```

Principio rector: **el navegador nunca decide permisos**. Cada operación se valida
(1) en la Server Action, (2) en las políticas RLS / funciones SQL, y (3) en el bucket
de Storage. Ocultar botones es solo una ayuda visual.

## 2. Decisiones técnicas

| Necesidad | Elección | Motivo |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 + TypeScript estricto | Requerido; Server Actions simplifican la validación en servidor |
| Estilos | Tailwind CSS 4 | Requerido |
| Datos/Auth | `@supabase/ssr` + `@supabase/supabase-js` | Cliente oficial; sesión en cookies |
| Validación | Zod 4 | Mismo esquema en cliente y servidor |
| Iconos | lucide-react | Licencia ISC, árbol de dependencias pequeño |
| Reordenar páginas | @dnd-kit (core + sortable) | Accesible (teclado), compatible con React 19 |
| Mover/redimensionar en el lienzo | Implementación propia con Pointer Events | Evita una dependencia; control total del sistema de coordenadas en mm |
| PDF | **pdf-lib + @pdf-lib/fontkit** en el navegador | Ver §6 |
| Formularios | `useActionState` de React + Zod | React Hook Form no aporta lo suficiente para formularios cortos; una dependencia menos |
| Tipografías | 12 familias OFL, archivos TTF alojados en `public/fonts` | Mismos archivos para pantalla y PDF; sin API externa |

## 3. Modelo de documento

Todas las páginas (artículos, portadas y revistas) usan el mismo formato JSON,
validado con Zod en el servidor antes de guardarse:

```ts
Page = { id, background: { color, assetId, fit, opacity }, elements: Element[] }
Element = Text | Image | Shape   // el orden del arreglo es el orden de superposición
// Coordenadas en milímetros sobre A4 (210×297 o 297×210). Tamaños de letra en puntos.
```

Cada elemento puede llevar un `role` (por ejemplo `title`, `body`, `image-main`).
Los roles permiten **cambiar de plantilla conservando el contenido**: el texto y las
imágenes se trasladan al elemento con el mismo rol en la nueva plantilla; lo que no
encaje se muestra en una advertencia con vista previa antes de aplicar el cambio.

Las imágenes del documento solo guardan `assetId` (UUID de `media_assets`); nunca
Base64 ni URLs. Las URLs firmadas se generan al mostrar o exportar.

## 4. Cuentas sin correo electrónico personal

Supabase Auth no tiene inicio de sesión nativo por «nombre de usuario». Estrategia:

1. El profesor registra `usuario` + `nombre visible` + `grupo`.
2. El servidor crea la cuenta con la API de administración
   (`auth.admin.createUser`) usando un **correo sintético interno**:
   `usuario@<STUDENT_EMAIL_DOMAIN>` (por defecto `alumnos.revista-escolar.invalid`).
   - `.invalid` es un dominio reservado (RFC 2606): ningún mensaje puede llegar a
     una persona real.
   - Se crea con `email_confirm: true`, por lo que Supabase no envía correos.
   - El nombre de usuario es único (restricción en `profiles` y en el correo
     derivado), en minúsculas y con caracteres limitados: no hay colisiones.
   - Implicación: la recuperación de contraseña por correo no existe; la hace el
     profesor desde su panel.
3. Al iniciar sesión, el servidor convierte el usuario en el correo sintético y llama
   a `signInWithPassword`. El alumno nunca ve ese correo.
4. La contraseña temporal se genera con `crypto.randomBytes`, se muestra **una sola
   vez** al profesor y nunca se guarda. `must_change_password` obliga a cambiarla.
5. Registro público desactivado en Supabase (*Allow new users to sign up = off*).
6. Límite de intentos propio (`login_attempts`, con IP cifrada con hash) además del
   límite de Supabase. Mensaje genérico: «Usuario o contraseña incorrectos».
7. Desactivar una cuenta = `profiles.is_active = false` + *ban* en Supabase Auth
   (invalida el inicio de sesión y la renovación de sesión).

## 5. Roles y permisos

- `teacher` (profesor/administrador) y `student` (alumno) en `profiles.role`.
- Lector público = visitante sin sesión: solo ve `magazine_publications` vigentes y
  públicas, a través del servidor.
- El rol nunca procede del navegador: `profiles` no tiene política de UPDATE para
  alumnos y las altas solo se hacen con la clave secreta en el servidor.
- El primer profesor se crea con `npm run crear-profesor` (requiere la clave secreta
  en `.env.local`, es decir, acceso de administrador al proyecto).

## 6. Exportación a PDF: por qué en el navegador y con pdf-lib

Opciones evaluadas:

| Opción | Problema |
|---|---|
| html2canvas / captura de pantalla + jsPDF | Texto rasterizado (no seleccionable, borroso al imprimir), páginas pesadas |
| Chrome sin interfaz en Vercel (Puppeteer) | Supera con facilidad los límites de memoria/tiempo del plan gratuito; binario de ~50 MB |
| Imprimir del navegador | No es una descarga directa; resultados distintos según navegador |
| **pdf-lib + fontkit** | Texto vectorial, fuentes TTF incrustadas (subconjunto), imágenes JPG/PNG, varias páginas, sin servidor |

Como el documento ya está en coordenadas absolutas (mm), el PDF se **dibuja desde el
JSON**, no desde una captura. Las imágenes se recortan en un `<canvas>` con la misma
función matemática que usa el editor (`computeImageLayout`), a ~200 ppp, y se
incrustan como JPG/PNG. El texto se ajusta con las métricas reales de la fuente.

Antes de exportar se verifica que todas las imágenes carguen y se avisa de textos que
no caben en su cuadro, para no producir páginas incompletas sin aviso.

## 7. Imágenes

1. El navegador valida tipo, extensión, tamaño y la firma binaria; reduce imágenes
   mayores de 2400 px.
2. Server Action `prepareUpload`: valida otra vez, comprueba cuotas y **decide la
   ruta** (`<id_usuario>/<uuid>.<ext>`); devuelve una URL firmada de subida.
3. El navegador sube el archivo a esa URL.
4. Server Action `confirmUpload`: descarga el objeto, verifica la firma binaria real
   (JPG/PNG/WebP), lee sus dimensiones, calcula SHA-256 (evita duplicados) y crea el
   registro en `media_assets`. Si algo falla, borra el objeto.
5. El bucket es privado y además limita tipo MIME y tamaño. Los clientes no tienen
   permisos de INSERT/UPDATE/DELETE en `storage.objects`.
6. Antes de borrar una imagen se buscan referencias en artículos, páginas de revista
   y publicaciones.
7. En publicaciones, el servidor solo firma URLs (1 h) para imágenes con
   `publication_approved = true`, tras comprobar que la revista está publicada.

## 8. Guardado y conflictos

- Debounce de 1,2 s; botón «Guardar» manual; estados *Cambios pendientes / Guardando /
  Guardado / Error / Sin conexión / Conflicto*.
- Cada trabajo tiene `version`. El guardado es `UPDATE … WHERE version = esperada`;
  si otra pestaña guardó antes, no se sobrescribe: aparece un diálogo de conflicto.
- Copia local en `localStorage` mientras haya cambios sin confirmar; al reabrir se
  ofrece recuperarla.
- Al enviar a revisión se guarda una instantánea en `article_versions`.
- Cada publicación crea una versión nueva en `magazine_publications`; las anteriores
  se conservan.

## 9. Estados de los artículos

```
borrador ──enviar──► en revisión ──aprobar──► aprobado ──publicar revista──► publicado
   ▲                     │  │
   │                     │  └──rechazar──► rechazado
   │                     └──solicitar correcciones──► requiere correcciones ──enviar──► en revisión
   └──────────── reabrir (profesor, desde cualquier estado) ──────────────
```

Las transiciones solo ocurren dentro de funciones SQL (`submit_work`, `review_work`,
`publish_magazine`, `unpublish_magazine`) que comprueban rol y estado actual. Un
disparador impide que un alumno cambie columnas protegidas (estado, autor, grupo…).

## 10. Rutas

| Ruta | Acceso |
|---|---|
| `/` | Pública: portada de la aplicación |
| `/revistas`, `/revistas/[publicId]` | Pública (revistas publicadas) |
| `/privacidad` | Pública |
| `/ingresar` | Pública |
| `/cambiar-contrasena` | Con sesión |
| `/alumno`, `/alumno/nuevo` | Alumno |
| `/editor/trabajo/[id]` | Autor del trabajo (o profesor en solo lectura) |
| `/profesor/...` | Profesor: inicio, grupos, alumnos, proyectos, revistas, revisión, publicaciones, plantillas, almacenamiento, ajustes, auditoría |
| `/editor/revista/[id]` | Profesor |

## 11. Riesgos técnicos identificados

1. **Correo sintético rechazado por Supabase** si en el futuro valida dominios: el
   dominio es configurable (`STUDENT_EMAIL_DOMAIN`); puede usarse un subdominio de la
   escuela sin registros MX.
2. **Límite de inicio de sesión por IP** de Supabase (un aula comparte IP): hay que
   ampliarlo en *Authentication → Rate Limits* (ver guía de despliegue).
3. **Ajuste de líneas** entre navegador y PDF puede diferir en casos límite; el editor
   marca los textos desbordados y el PDF usa las mismas fuentes.
4. **Cuotas del plan gratuito** (1 GB de Storage, ancho de banda): se reducen
   imágenes, se deduplican y hay cuotas configurables con avisos.
5. **Subidas huérfanas** (firma pedida pero sin confirmar): se listan en
   «Almacenamiento» para limpiarlas.
6. **Texto enriquecido**: en esta versión el estilo se aplica a todo el cuadro de
   texto (no a palabras sueltas), para garantizar la fidelidad en el PDF.
