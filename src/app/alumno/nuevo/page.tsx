import { ArrowLeft, LayoutTemplate } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { TemplatePicker } from "@/components/student/template-picker";
import { Alert, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireStudent } from "@/lib/auth/session";
import { loadTemplates } from "@/lib/data/templates";
import { textParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Elegir plantilla" };

export default async function NewWorkPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireStudent();
  const params = await searchParams;
  let kind: "article" | "cover" = textParam(params.tipo) === "cover" ? "cover" : "article";
  const projectId = textParam(params.proyecto);
  let assignment: { id: string; title: string; description: string | null; allowed_template_ids: string[]; work_kind: "article" | "cover" | null } | null = null;
  if (/^[0-9a-f-]{36}$/.test(projectId)) {
    const { data } = await supabase.from("assignments").select("id, title, description, allowed_template_ids, work_kind").eq("id", projectId).maybeSingle();
    assignment = data;
    if (assignment?.work_kind) kind = assignment.work_kind;
  }
  let templates = await loadTemplates(supabase, kind === "cover" ? ["cover"] : ["article", "extra"]);
  if (assignment && assignment.allowed_template_ids.length > 0) templates = templates.filter((t) => assignment.allowed_template_ids.includes(t.id));

  return (
    <>
      <Link href="/alumno" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-tinta-suave hover:text-tinta">
        <ArrowLeft className="size-4" /> Volver
      </Link>
      <PageHeader
        eyebrow={kind === "cover" ? "Nueva portada" : "Nuevo artículo"}
        title="Elige una plantilla"
        description="Se creará una copia solo para ti. Podrás cambiar textos, fotos, colores y tipografías, y hasta cambiar de plantilla después."
      />
      {assignment && (
        <Alert kind="info" title={`Proyecto: ${assignment.title}`} className="mb-6">
          {assignment.description}
        </Alert>
      )}
      {projectId && !assignment && (
        <Alert kind="warning" className="mb-6">
          No encontramos ese proyecto. Puedes crear un trabajo libre.
        </Alert>
      )}
      {templates.length === 0 ? (
        <EmptyState icon={LayoutTemplate} title="No hay plantillas disponibles">
          Pide a tu profesor que active alguna plantilla.
        </EmptyState>
      ) : (
        <TemplatePicker templates={templates} kind={kind} assignmentId={assignment?.id ?? null} />
      )}
    </>
  );
}
