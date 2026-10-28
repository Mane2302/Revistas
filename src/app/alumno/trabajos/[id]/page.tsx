import { ArrowLeft, MessageSquareText, PenLine, Send, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PagesGallery } from "@/components/magazine/pages-gallery";
import { ActionButton } from "@/components/ui/action-button";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, WorkStatusBadge } from "@/components/ui/misc";
import { deleteWorkAction, submitWorkAction } from "@/lib/actions/works";
import { requireStudent } from "@/lib/auth/session";
import { collectAssetIds, workContentSchema } from "@/lib/document/schema";
import { EDITABLE_STATUSES, WORK_KIND_LABEL, WORK_STATUS } from "@/lib/status";
import { buildAssetMap } from "@/lib/storage/assets";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Mi trabajo" };

const DECISIONS = { approved: "Aprobado", changes_requested: "Correcciones solicitadas", rejected: "Rechazado", reopened: "Reabierto para edición" } as const;

export default async function StudentWorkPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireStudent();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  // RLS: solo devuelve el trabajo si pertenece al alumno.
  const { data: work } = await supabase.from("articles").select("id, title, kind, status, content_json, submitted_at, updated_at, assignments(title)").eq("id", id).maybeSingle();
  if (!work) notFound();
  const { data: reviews } = await supabase.from("article_reviews").select("id, decision, comments, created_at").eq("article_id", id).order("created_at", { ascending: false });
  const content = workContentSchema.safeParse(work.content_json);
  const assets = content.success ? await buildAssetMap(supabase, collectAssetIds(content.data.pages)) : {};
  const editable = EDITABLE_STATUSES.includes(work.status);

  return (
    <>
      <Link href="/alumno" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-tinta-suave hover:text-tinta">
        <ArrowLeft className="size-4" /> Mis trabajos
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-coral-oscuro uppercase">{WORK_KIND_LABEL[work.kind]}</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{work.title}</h1>
          {work.assignments && <p className="text-tinta-suave">Proyecto: {work.assignments.title}</p>}
        </div>
        <WorkStatusBadge status={work.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card className="p-4 sm:p-6">{content.success ? <PagesGallery pages={content.data.pages} orientation={content.data.orientation} assets={assets} /> : <Alert kind="error">No pudimos mostrar este trabajo.</Alert>}</Card>
        <div className="space-y-6">
          <Card className="space-y-3 p-5">
            <p className="text-sm">{WORK_STATUS[work.status].help}</p>
            {work.submitted_at && <p className="text-xs text-tinta-suave">Enviado el {formatDateTime(work.submitted_at)}</p>}
            {editable && (
              <div className="flex flex-wrap gap-2">
                <ButtonLink href={`/editor/trabajo/${work.id}`} icon={<PenLine className="size-4" />}>
                  Abrir editor
                </ButtonLink>
                <ActionButton
                  action={submitWorkAction.bind(null, work.id)}
                  variant="accent"
                  size="md"
                  icon={<Send className="size-4" />}
                  confirm={{ title: "¿Enviar tu trabajo al profesor?", message: "Mientras lo revisa no podrás editarlo.", confirmLabel: "Sí, enviar" }}
                >
                  Enviar al profesor
                </ActionButton>
              </div>
            )}
            {!editable && (
              <ButtonLink href={`/editor/trabajo/${work.id}`} variant="secondary">
                Ver en el editor (solo lectura)
              </ButtonLink>
            )}
            {work.status === "draft" && (
              <ActionButton
                action={deleteWorkAction.bind(null, work.id)}
                variant="ghost"
                icon={<Trash2 className="size-4" />}
                confirm={{ title: "¿Borrar este borrador?", message: "Se eliminará para siempre. Tus imágenes seguirán en tu biblioteca.", confirmLabel: "Borrar", danger: true }}
              >
                Borrar borrador
              </ActionButton>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <MessageSquareText className="size-5" /> Comentarios del profesor
            </h2>
            {(reviews ?? []).length === 0 ? (
              <p className="text-sm text-tinta-suave">Todavía no hay comentarios.</p>
            ) : (
              <ol className="space-y-3">
                {(reviews ?? []).map((r) => (
                  <li key={r.id} className="rounded-xl bg-papel p-3">
                    <p className="text-sm font-bold">{DECISIONS[r.decision]}</p>
                    <p className="text-xs text-tinta-suave">{formatDateTime(r.created_at)}</p>
                    {r.comments && <p className="mt-1.5 text-sm whitespace-pre-wrap">{r.comments}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
