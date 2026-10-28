# Progreso del proyecto

Última actualización: 27 de octubre de 2026.

## Etapas

| Etapa | Estado | Notas |
|---|---|---|
| 1. Planificación | Hecha | `docs/ARQUITECTURA.md` |
| 2. Estructura inicial | Hecha | Next.js 16, TypeScript estricto, Tailwind 4, clientes de Supabase, `proxy.ts` |
| 3. Autenticación y permisos | Hecha | Usuarios sin correo, RLS, disparadores, funciones; probado en PGlite |
| 4. Paneles | Hecha | Profesor (12 secciones) y alumno |
| 5. Plantillas | Hecha | 6 portadas, 10 artículos, 5 páginas especiales; activación por el profesor |
| 6. Editor | Hecha | Lienzo con mover/redimensionar/editar, propiedades, páginas, atajos |
| 7. Persistencia | Hecha | Guardado automático con versión, copia local, conflictos, imágenes |
| 8. Revisión editorial | Hecha | Estados, comentarios, versiones, publicación con historial |
| 9. Exportación PDF | Hecha | pdf-lib en el navegador; verificada en Node y en Edge |
| 10. Despliegue | Preparado | Falta conectar un proyecto Supabase real (ver «Pendiente») |

## Pruebas ejecutadas (resultados reales)

| Prueba | Resultado |
|---|---|
| `tests/db/seguridad.test.ts` — RLS, roles, flujo editorial y publicación sobre PostgreSQL (PGlite) con las migraciones reales | 35/35 |
| `tests/unit/pdf.test.ts` — PDF A4 de 5 páginas con fotos, 12 familias, acentos; texto extraíble; páginas renderizadas y revisadas visualmente | 3/3 |
| `tests/unit/documento.test.ts` — esquema, límites, plantillas, recorte de imágenes, ajuste de líneas, cambio de plantilla | 22/22 |
| `tests/unit/editor-estado.test.ts` — deshacer/rehacer, duplicar, reordenar, páginas | 7/7 |
| `tests/unit/archivos.test.ts` — CSV y verificación de firma binaria (rechazo de SVG/HTML/PDF disfrazados) | 6/6 |
| `tests/unit/credenciales.test.ts` — usuarios, correo interno, contraseñas temporales | 5/5 |
| **Total Vitest** | **78/78** |
| ESLint | Sin errores |
| TypeScript (`tsc --noEmit`) | Sin errores |
| `next build` | Compila (27 rutas) |
| Navegador (Edge, Playwright) | Portada (escritorio y móvil), login, editor: selección, edición en el lienzo, arrastre, deshacer, cambio de plantilla con vista previa, pestañas de herramientas, exportación PDF descargada; sin errores de hidratación |

## Pendiente (requiere un proyecto Supabase real)

Estas pruebas **no se han ejecutado** porque necesitan Supabase Auth y Storage reales:

- Inicio y cierre de sesión con el correo interno; cambio de contraseña; límite de intentos.
- Creación de cuentas desde el panel y por CSV; restablecer, desactivar y eliminar.
- Subida de imágenes con URL firmada y verificación en el servidor; borrado con control de referencias.
- Guardado automático contra la base real y conflicto entre dos pestañas.
- Recorrido completo profesor → alumno → revisión → revista → publicación → lector público.
- Pruebas de extremo a extremo automatizadas sobre ese entorno.

Opciones: (a) Supabase local con Docker (`npx supabase start`), o (b) un proyecto en supabase.com con sus claves en `.env.local`.

## Limitaciones conocidas de esta versión

- El estilo de texto se aplica a todo el cuadro (no a palabras sueltas) para garantizar que el PDF coincida con la pantalla.
- Los elementos no se pueden rotar.
- Pueden existir pequeñas diferencias de ajuste de línea entre navegador y PDF en casos límite; el editor marca en rojo los textos que no caben y el PDF avisa.
- Inter se incrusta completa en el PDF (el subconjunto de pdf-lib pierde glyphs de esa fuente); las demás familias se incrustan como subconjunto.
- Las plantillas están diseñadas en vertical; en revistas horizontales se adaptan escalando.
- Los números de página del índice y los nombres de los créditos se escriben a mano.
- Si una subida se interrumpe entre la URL firmada y la confirmación, el archivo puede quedar sin registrar en Storage (el servidor intenta borrarlo en todos los errores que detecta).
- La detección de conflictos evita sobrescrituras, pero no es edición colaborativa en tiempo real.
- ESLint 9 está marcado como versión sin soporte; se mantiene porque los complementos de `eslint-config-next` 16.3 aún no garantizan compatibilidad con ESLint 10.

## Fallos encontrados y corregidos durante las pruebas

- `asset_reference_count`: la excepción de «contexto privilegiado» no sirve dentro de una función `SECURITY DEFINER` (allí `current_user` es siempre el propietario) y permitía a un alumno consultar imágenes ajenas. Corregido y cubierto por prueba.
- Glyphs perdidos de Inter al incrustarla como subconjunto en el PDF. Ahora se incrusta completa.
- Desajuste de hidratación por los identificadores de accesibilidad de dnd-kit. Corregido con un `id` estable.
