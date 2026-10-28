import "server-only";
import type { TemplateOption } from "@/components/editor/editor-context";
import { pageSchema } from "@/lib/document/schema";
import type { ServerSupabase } from "@/lib/supabase/server";
import type { TemplateKind } from "@/types/database";

/** Plantillas visibles para el usuario (RLS: activas para alumnos, todas para el profesor). */
export async function loadTemplates(supabase: ServerSupabase, kinds?: TemplateKind[], opts: { onlyActive?: boolean; ids?: string[] } = {}): Promise<TemplateOption[]> {
  let query = supabase.from("templates").select("id, name, description, category, kind, template_schema, is_active").order("sort_order");
  if (kinds) query = query.in("kind", kinds);
  if (opts.onlyActive !== false) query = query.eq("is_active", true);
  if (opts.ids && opts.ids.length > 0) query = query.in("id", opts.ids);
  const { data } = await query;
  return (data ?? []).flatMap((t) => {
    const page = pageSchema.safeParse(t.template_schema);
    return page.success ? [{ id: t.id, name: t.name, description: t.description, category: t.category, kind: t.kind, page: page.data }] : [];
  });
}
