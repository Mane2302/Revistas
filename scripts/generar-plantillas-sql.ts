// Genera la migración que carga las plantillas predefinidas en la tabla `templates`.
// Uso: npm run plantillas:sql   (vuelve a ejecutarlo si modificas src/lib/templates)
import { writeFileSync } from "node:fs";
import path from "node:path";
import { pageSchema } from "../src/lib/document/schema";
import { builtinTemplates } from "../src/lib/templates";

const quote = (s: string) => `'${s.replace(/'/g, "''")}'`;

const rows = builtinTemplates().map((t) => {
  const page = pageSchema.parse(t.page); // nunca se publica una plantilla inválida
  const json = JSON.stringify(page);
  if (json.includes("$tpl$")) throw new Error(`La plantilla ${t.id} contiene un delimitador no permitido`);
  return `  (${[quote(t.id), quote(t.name), quote(t.description), quote(t.category), quote(t.kind), "'portrait'", `$tpl$${json}$tpl$::jsonb`, "true", String(t.sortOrder)].join(", ")})`;
});

const sql = `-- Generado por scripts/generar-plantillas-sql.ts. No editar a mano.
-- Plantillas predefinidas (portadas, artículos y páginas especiales).
insert into public.templates (id, name, description, category, kind, orientation, template_schema, is_builtin, sort_order)
values
${rows.join(",\n")}
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  kind = excluded.kind,
  template_schema = excluded.template_schema,
  is_builtin = true,
  sort_order = excluded.sort_order;
`;

const out = path.resolve("supabase/migrations/20261027000100_plantillas.sql");
writeFileSync(out, sql);
console.log(`Escritas ${rows.length} plantillas en ${path.relative(process.cwd(), out)}`);
