import { articleTemplates } from "./articles";
import type { TemplateDefinition } from "./builders";
import { coverTemplates } from "./covers";
import { extraTemplates } from "./extras";

export type { TemplateDefinition } from "./builders";

/**
 * Plantillas predefinidas. Son la fuente de la migración
 * `supabase/migrations/*_plantillas.sql` (npm run plantillas:sql);
 * en la aplicación se leen desde la tabla `templates`, donde el profesor
 * puede activarlas o desactivarlas.
 */
export function builtinTemplates(): TemplateDefinition[] {
  return [...coverTemplates(), ...articleTemplates(), ...extraTemplates()];
}

export const TEMPLATE_KIND_LABELS: Record<TemplateDefinition["kind"], string> = {
  cover: "Portadas",
  article: "Artículos",
  extra: "Páginas especiales",
};
