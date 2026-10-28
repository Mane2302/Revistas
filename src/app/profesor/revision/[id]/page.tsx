import { ArrowLeft, History, MessageSquareText } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PagesGallery } from "@/components/magazine/pages-gallery";
import { ReviewForm } from "@/components/teacher/forms";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge, Card, WorkStatusBadge } from "@/components/ui/misc";
import { requireTeacher } from "@/lib/auth/session";
import { collectAssetIds, workContentSchema } from "@/lib/document/schema";
import { WORK_KIND_LABEL } from "@/lib/status";
import { buildAssetMap } from "@/lib/storage/assets";
import { cn, formatDate, formatDateTime, textParam } from "@/lib/utils";
import type { ReviewDecision } from "@/types/database";

export const metadata: Metadata = { title: "Revisar trabajo" };

const DECISION_LABEL: Record<ReviewDecision, { label: string; tone: "green" | "amber" | "red" | "blue" }> = {
  approved: { label: "Aprobado", tone: "green" },
  changes_requested: { label: "Correcciones solicitadas", tone: "amber" },
  rejected: { label: "Rechazado", tone: "red" },
  reopened: { label: "Reabierto", tone: "blue" },
};

export default async function ReviewDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireTeacher();
  const { id } = await params;
  const versionId = textParam((await searchParams).version);
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const { data: work } = await supabase
    .from("articles")
    .select("*, profiles!articles_author_id_fkey(display_name, username, editorial_name), groups(name), assignments(title, due_date, description)")
    .eq("id", id)
    .maybeSingle();
  if (!work) notFound();

  const [{ data: reviews }, { data: versions }] = await Promise.all([
    supabase.from("article_reviews").select("id, decision, comments, article_version, created_at, profiles!article_reviews_reviewer_id_fkey(display_name)").eq("article_id", id).order("created_at", { ascending: false }),
    supabase.from("article_versions").select("id, version, title, reason, created_at, content_json").eq("article_id", id).order("created_at", { ascending: false }),
  ]);

  const shown = versionId ? versions?.find((v) => v.id === versionId) : undefined;
  const content = workContentSchema.safeParse(shown ? shown.content_json : work.content_json);
  const pages = content.success ? content.data.pages : [];
  const orientation = content.success ? content.data.orientation : "portrait";
  const assets = await buildAssetMap(supabase, collectAssetIds(pages));

  return (
    <>
      <Link href="/profesor/revision" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-tinta-suave hover:text-tinta">
        <ArrowLeft className="size-4" /> Volver a la bandeja
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-coral-oscuro uppercase">{WORK_KIND_LABEL[work.kind]}</p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{work.title}</h1>
          <p className="mt-1 text-tinta-suave">
            {work.profiles?.display_name} ({work.profiles?.username}){work.profiles?.editorial_name && ` · Nombre editorial: ${work.profiles.editorial_name}`} · {work.groups?.name ?? "Sin grupo"}
          </p>
          {work.assignments && (
            <p className="text-sm text-tinta-suave">
              Proyecto: {work.assignments.title} · Entrega {formatDate(work.assignments.due_date)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <WorkStatusBadge status={work.status} />
          <ButtonLink href={`/editor/trabajo/${work.id}`} size="sm" variant="secondary">
            Abrir en el editor
          </ButtonLink>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_24rem]">
        <Card className="p-4 sm:p-6">
          {shown && (
            <Alert kind="info" className="mb-4">
              Estás viendo la versión {shown.version} ({shown.reason === "submitted" ? "enviada" : "antes de reabrir"}) del {formatDateTime(shown.created_at)}.{" "}
              <Link href={`/profesor/revision/${id}`} className="font-bold underline">
                Ver la versión actual
              </Link>
            </Alert>
          )}
          {content.success ? <PagesGallery pages={pages} orientation={orientation} assets={assets} width={460} /> : <Alert kind="error">El contenido de este trabajo no es válido.</Alert>}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Tu revisión</h2>
            <ReviewForm workId={work.id} status={work.status} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <MessageSquareText className="size-5" /> Historial de revisiones
            </h2>
            {(reviews ?? []).length === 0 ? (
              <p className="text-sm text-tinta-suave">Todavía no hay revisiones.</p>
            ) : (
              <ol className="space-y-3">
                {(reviews ?? []).map((r) => (
                  <li key={r.id} className="rounded-xl bg-papel p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={DECISION_LABEL[r.decision].tone}>{DECISION_LABEL[r.decision].label}</Badge>
                      <span className="text-xs text-tinta-suave">
                        {formatDateTime(r.created_at)} · {r.profiles?.display_name ?? "Profesor"} · versión {r.article_version}
                      </span>
                    </div>
                    {r.comments && <p className="mt-1.5 text-sm whitespace-pre-wrap">{r.comments}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
              <History className="size-5" /> Versiones anteriores
            </h2>
            {(versions ?? []).length === 0 ? (
              <p className="text-sm text-tinta-suave">Se guarda una versión cada vez que el alumno envía el trabajo.</p>
            ) : (
              <ul className="space-y-1">
                {(versions ?? []).map((v) => (
                  <li key={v.id}>
                    <Link href={`/profesor/revision/${id}?version=${v.id}`} className={cn("flex justify-between rounded-lg px-3 py-2 text-sm hover:bg-papel", v.id === versionId && "bg-cielo-claro font-bold")}>
                      <span>
                        Versión {v.version} · {v.reason === "submitted" ? "enviada" : "antes de reabrir"}
                      </span>
                      <span className="text-tinta-suave">{formatDate(v.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
