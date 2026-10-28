import type { Metadata } from "next";
import { PageView } from "@/components/magazine/page-view";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, Card, PageHeader } from "@/components/ui/misc";
import { setTemplateActiveAction } from "@/lib/actions/teacher";
import { requireTeacher } from "@/lib/auth/session";
import { loadTemplates } from "@/lib/data/templates";
import { TEMPLATE_KIND_LABELS } from "@/lib/templates";

export const metadata: Metadata = { title: "Plantillas" };

export default async function TemplatesPage() {
  const { supabase } = await requireTeacher();
  const [templates, { data: states }] = await Promise.all([loadTemplates(supabase, undefined, { onlyActive: false }), supabase.from("templates").select("id, is_active")]);
  const active = new Map((states ?? []).map((s) => [s.id, s.is_active]));
  const kinds = ["cover", "article", "extra"] as const;
  return (
    <>
      <PageHeader title="Plantillas" description="Activa o desactiva los diseños que pueden elegir tus alumnos. Usar una plantilla crea una copia: el diseño original nunca se modifica." />
      {kinds.map((kind) => (
        <section key={kind} className="mb-10">
          <h2 className="mb-3 font-display text-xl font-bold">{TEMPLATE_KIND_LABELS[kind]}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {templates
              .filter((t) => t.kind === kind)
              .map((t) => {
                const on = active.get(t.id) ?? false;
                return (
                  <Card key={t.id} className={on ? "overflow-hidden" : "overflow-hidden opacity-60"}>
                    <div className="grid place-items-center bg-[#ece8e0] py-4">
                      <PageView page={t.page} orientation="portrait" width={150} assets={{}} className="shadow-md" label={`Vista previa de ${t.name}`} />
                    </div>
                    <div className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="leading-tight font-bold">{t.name}</h3>
                        <Badge tone={on ? "green" : "gray"}>{on ? "Activa" : "Inactiva"}</Badge>
                      </div>
                      <p className="text-xs text-tinta-suave">
                        {t.category} · Vertical · {t.page.elements.filter((e) => e.role).length} elementos editables
                      </p>
                      <p className="text-sm">{t.description}</p>
                      <ActionButton action={setTemplateActiveAction.bind(null, t.id, !on)} variant={on ? "ghost" : "primary"}>
                        {on ? "Desactivar" : "Activar"}
                      </ActionButton>
                    </div>
                  </Card>
                );
              })}
          </div>
        </section>
      ))}
    </>
  );
}
