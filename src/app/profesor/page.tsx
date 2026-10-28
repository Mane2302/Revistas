import { BookOpenCheck, CheckCircle2, FolderKanban, Newspaper, Users, UsersRound } from "lucide-react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, StatCard, WorkStatusBadge } from "@/components/ui/misc";
import { requireTeacher } from "@/lib/auth/session";
import { WORK_KIND_LABEL } from "@/lib/status";
import { formatDateTime } from "@/lib/utils";

export default async function TeacherHome() {
  const { supabase, profile } = await requireTeacher();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;

  const [groups, students, magazines, pending, approved, projects, recent] = await Promise.all([
    count(supabase.from("groups").select("id", { count: "exact", head: true }).eq("is_active", true)),
    count(supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student").eq("is_active", true)),
    count(supabase.from("magazines").select("id", { count: "exact", head: true })),
    count(supabase.from("articles").select("id", { count: "exact", head: true }).eq("status", "submitted")),
    count(supabase.from("articles").select("id", { count: "exact", head: true }).in("status", ["approved", "published"])),
    count(supabase.from("assignments").select("id", { count: "exact", head: true }).eq("is_active", true)),
    supabase
      .from("articles")
      .select("id, title, kind, status, submitted_at, profiles!articles_author_id_fkey(display_name), groups(name)")
      .eq("status", "submitted")
      .order("submitted_at", { ascending: true })
      .limit(6),
  ]);

  return (
    <>
      <PageHeader eyebrow="Panel del profesor" title={`Hola, ${profile.display_name}`} description="Resumen de la actividad de tus grupos." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Grupos activos" value={groups} icon={UsersRound} tone="blue" href="/profesor/grupos" />
        <StatCard label="Alumnos activos" value={students} icon={Users} tone="violet" href="/profesor/alumnos" />
        <StatCard label="Revistas creadas" value={magazines} icon={Newspaper} tone="gray" href="/profesor/revistas" />
        <StatCard label="Pendientes de revisión" value={pending} icon={BookOpenCheck} tone="amber" href="/profesor/revision" />
        <StatCard label="Artículos aprobados" value={approved} icon={CheckCircle2} tone="green" href="/profesor/revision?estado=approved" />
        <StatCard label="Proyectos en proceso" value={projects} icon={FolderKanban} tone="red" href="/profesor/proyectos" />
      </div>

      <section className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">Esperando tu revisión</h2>
          <Link href="/profesor/revision" className="text-sm font-bold text-cielo-oscuro hover:underline">
            Ver todo
          </Link>
        </div>
        {(recent.data ?? []).length === 0 ? (
          <EmptyState icon={BookOpenCheck} title="No hay trabajos pendientes">
            Cuando un alumno envíe un artículo o una portada, aparecerá aquí.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-linea">
            {(recent.data ?? []).map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{w.title}</p>
                  <p className="text-sm text-tinta-suave">
                    {WORK_KIND_LABEL[w.kind]} · {w.profiles?.display_name ?? "—"} · {w.groups?.name ?? "Sin grupo"} · enviado {formatDateTime(w.submitted_at)}
                  </p>
                </div>
                <WorkStatusBadge status={w.status} />
                <ButtonLink href={`/profesor/revision/${w.id}`} size="sm" variant="secondary">
                  Revisar
                </ButtonLink>
              </div>
            ))}
          </Card>
        )}
      </section>
    </>
  );
}
