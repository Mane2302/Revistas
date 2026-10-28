import { CalendarDays, FileText, MessageSquareText, Newspaper, Palette, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, WorkStatusBadge } from "@/components/ui/misc";
import { requireStudent } from "@/lib/auth/session";
import { EDITABLE_STATUSES, WORK_KIND_LABEL, workProgress } from "@/lib/status";
import { cn, daysUntil, formatDate, formatDateTime } from "@/lib/utils";
import type { WorkStatus } from "@/types/database";

export const metadata: Metadata = { title: "Mis trabajos" };

interface WorkRow {
  id: string;
  title: string;
  kind: "article" | "cover";
  status: WorkStatus;
  updated_at: string;
  assignment_id: string | null;
}

function WorkCard({ work, comment }: { work: WorkRow; comment?: string | null }) {
  const editable = EDITABLE_STATUSES.includes(work.status);
  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold text-tinta-suave uppercase">{WORK_KIND_LABEL[work.kind]}</p>
        <WorkStatusBadge status={work.status} />
      </div>
      <h3 className="mt-1 font-display leading-tight font-bold">{work.title}</h3>
      <p className="mt-1 text-xs text-tinta-suave">Actualizado {formatDateTime(work.updated_at)}</p>
      {comment && (
        <p className="mt-2 flex gap-1.5 rounded-lg bg-sol-claro p-2 text-sm text-[#5c3a00]">
          <MessageSquareText className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className="line-clamp-3">{comment}</span>
        </p>
      )}
      <div className="mt-auto flex gap-2 pt-3">
        {editable ? (
          <ButtonLink href={`/editor/trabajo/${work.id}`} size="sm" icon={<PenLine className="size-4" />}>
            Continuar
          </ButtonLink>
        ) : null}
        <ButtonLink href={`/alumno/trabajos/${work.id}`} size="sm" variant="secondary">
          Ver detalles
        </ButtonLink>
      </div>
    </Card>
  );
}

function Section({ title, works, comments, tone }: { title: string; works: WorkRow[]; comments: Map<string, string | null>; tone?: string }) {
  if (works.length === 0) return null;
  return (
    <section className="mb-8">
      <h2 className={cn("mb-3 font-display text-lg font-bold", tone)}>
        {title} <span className="text-tinta-suave">({works.length})</span>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {works.map((w) => (
          <WorkCard key={w.id} work={w} comment={comments.get(w.id)} />
        ))}
      </div>
    </section>
  );
}

export default async function StudentHome() {
  const { supabase, profile } = await requireStudent();
  const [{ data: assignments }, { data: works }] = await Promise.all([
    supabase.from("assignments").select("id, title, description, due_date, work_kind").order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("articles").select("id, title, kind, status, updated_at, assignment_id").eq("author_id", profile.id).order("updated_at", { ascending: false }).limit(100),
  ]);
  const list = (works ?? []) as WorkRow[];
  const reviewed = list.filter((w) => ["changes_requested", "rejected", "approved", "published", "draft"].includes(w.status)).map((w) => w.id);
  const { data: reviews } = reviewed.length
    ? await supabase.from("article_reviews").select("article_id, comments, created_at").in("article_id", reviewed).order("created_at", { ascending: false })
    : { data: [] };
  const comments = new Map<string, string | null>();
  for (const r of reviews ?? []) if (!comments.has(r.article_id)) comments.set(r.article_id, r.comments);

  const by = (statuses: WorkStatus[]) => list.filter((w) => statuses.includes(w.status));
  const firstName = profile.display_name.split(" ")[0];

  return (
    <>
      <section className="mb-10 flex flex-col gap-6 rounded-3xl bg-tinta p-6 text-white sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="font-bold text-sol">¡Hola, {firstName}!</p>
          <h1 className="mt-1 font-display text-2xl font-bold sm:text-3xl">¿Qué vas a crear hoy?</h1>
          <p className="mt-1 text-white/75">Elige una plantilla, escribe, agrega tus fotos y envíaselo a tu profesor.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/alumno/nuevo?tipo=article" size="lg" variant="accent" icon={<FileText className="size-5" />}>
            Crear mi artículo
          </ButtonLink>
          <ButtonLink href="/alumno/nuevo?tipo=cover" size="lg" variant="secondary" icon={<Palette className="size-5" />}>
            Diseñar una portada
          </ButtonLink>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="mb-3 font-display text-xl font-bold">Proyectos asignados</h2>
        {(assignments ?? []).length === 0 ? (
          <EmptyState icon={Newspaper} title="Tu profesor aún no ha asignado proyectos">
            Mientras tanto puedes practicar creando un artículo o una portada libre.
          </EmptyState>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(assignments ?? []).map((a) => {
              const mine = list.filter((w) => w.assignment_id === a.id);
              const best = mine.reduce((max, w) => Math.max(max, workProgress(w.status)), 0);
              const days = daysUntil(a.due_date);
              const kind = a.work_kind ?? "article";
              const status = mine[0]?.status;
              return (
                <Card key={a.id} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-display text-lg font-bold">{a.title}</h3>
                    {status ? <WorkStatusBadge status={status} /> : <span className="text-xs font-bold text-tinta-suave">Sin empezar</span>}
                  </div>
                  {a.description && <p className="mt-1 line-clamp-3 text-sm text-tinta-suave">{a.description}</p>}
                  <p className={cn("mt-3 flex items-center gap-1.5 text-sm font-bold", days !== null && days < 0 ? "text-red-700" : days !== null && days <= 3 ? "text-[#8a5300]" : "")}>
                    <CalendarDays className="size-4" aria-hidden />
                    {a.due_date ? `Entrega: ${formatDate(a.due_date)}${days !== null ? (days < 0 ? " (vencido)" : days === 0 ? " (¡hoy!)" : ` (faltan ${days} días)`) : ""}` : "Sin fecha de entrega"}
                  </p>
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-xs font-bold text-tinta-suave">
                      <span>Progreso</span>
                      <span>{best} %</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-papel" role="progressbar" aria-valuenow={best} aria-valuemin={0} aria-valuemax={100} aria-label={`Progreso de ${a.title}`}>
                      <div className="h-full rounded-full bg-menta transition-all" style={{ width: `${best}%` }} />
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {mine[0] && EDITABLE_STATUSES.includes(mine[0].status) ? (
                      <ButtonLink href={`/editor/trabajo/${mine[0].id}`} size="sm">
                        Continuar
                      </ButtonLink>
                    ) : !mine[0] ? (
                      <ButtonLink href={`/alumno/nuevo?tipo=${kind}&proyecto=${a.id}`} size="sm">
                        Empezar
                      </ButtonLink>
                    ) : (
                      <ButtonLink href={`/alumno/trabajos/${mine[0].id}`} size="sm" variant="secondary">
                        Ver mi entrega
                      </ButtonLink>
                    )}
                    {!a.work_kind && mine.length > 0 && (
                      <Link href={`/alumno/nuevo?tipo=article&proyecto=${a.id}`} className="rounded-lg px-3 py-2 text-sm font-bold text-cielo-oscuro hover:bg-cielo-claro">
                        Otro trabajo para este proyecto
                      </Link>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {list.length === 0 ? (
        <EmptyState icon={FileText} title="Aún no tienes trabajos">
          Pulsa «Crear mi artículo» o «Diseñar una portada» para empezar.
        </EmptyState>
      ) : (
        <>
          <Section title="El profesor solicitó correcciones" works={by(["changes_requested"])} comments={comments} tone="text-[#8a5300]" />
          <Section title="Borradores" works={by(["draft"])} comments={comments} />
          <Section title="Enviados al profesor" works={by(["submitted"])} comments={comments} />
          <Section title="Aprobados y publicados" works={by(["approved", "published"])} comments={comments} tone="text-[#0b6b49]" />
          <Section title="Rechazados" works={by(["rejected"])} comments={comments} />
        </>
      )}
    </>
  );
}
