import { CalendarDays, FolderKanban } from "lucide-react";
import type { Metadata } from "next";
import { AssignmentDialogButton } from "@/components/teacher/forms";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { setAssignmentActiveAction } from "@/lib/actions/teacher";
import { requireTeacher } from "@/lib/auth/session";
import { WORK_STATUS } from "@/lib/status";
import { daysUntil, formatDate, textParam } from "@/lib/utils";
import type { WorkStatus } from "@/types/database";

export const metadata: Metadata = { title: "Proyectos" };

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireTeacher();
  const group = textParam((await searchParams).grupo);
  let query = supabase.from("assignments").select("*").order("is_active", { ascending: false }).order("due_date", { ascending: true, nullsFirst: false });
  if (/^[0-9a-f-]{36}$/.test(group)) query = query.eq("group_id", group);
  const [{ data: assignments }, { data: groups }, { data: magazines }, { data: templates }] = await Promise.all([
    query,
    supabase.from("groups").select("id, name").eq("is_active", true).order("name"),
    supabase.from("magazines").select("id, title").order("created_at", { ascending: false }),
    supabase.from("templates").select("id, name, kind").in("kind", ["cover", "article"]).order("sort_order"),
  ]);
  const ids = (assignments ?? []).map((a) => a.id);
  const { data: works } = ids.length ? await supabase.from("articles").select("assignment_id, status").in("assignment_id", ids) : { data: [] };
  const progress = new Map<string, Partial<Record<WorkStatus, number>>>();
  for (const w of works ?? []) {
    if (!w.assignment_id) continue;
    const p = progress.get(w.assignment_id) ?? {};
    p[w.status] = (p[w.status] ?? 0) + 1;
    progress.set(w.assignment_id, p);
  }
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const groupOptions = (groups ?? []).map((g) => ({ id: g.id, name: g.name }));
  const magazineOptions = (magazines ?? []).map((m) => ({ id: m.id, name: m.title }));
  const templateOptions = (templates ?? []).map((t) => ({ id: t.id, name: t.name, kind: t.kind }));

  return (
    <>
      <PageHeader
        title="Proyectos"
        description="Asigna trabajos a un grupo con instrucciones, fecha de entrega y plantillas permitidas."
        actions={<AssignmentDialogButton groups={groupOptions} magazines={magazineOptions} templates={templateOptions} />}
      />
      {(assignments ?? []).length === 0 ? (
        <EmptyState icon={FolderKanban} title="No hay proyectos asignados">
          {groupOptions.length === 0 ? "Primero crea un grupo." : "Asigna el primer proyecto a uno de tus grupos."}
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {(assignments ?? []).map((a) => {
            const p = progress.get(a.id) ?? {};
            const total = Object.values(p).reduce((s, n) => s + (n ?? 0), 0);
            const days = daysUntil(a.due_date);
            return (
              <Card key={a.id} className={a.is_active ? "p-5" : "p-5 opacity-70"}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-lg font-bold">{a.title}</h2>
                    <p className="text-sm text-tinta-suave">{groupName.get(a.group_id) ?? "Grupo inactivo"}</p>
                  </div>
                  {!a.is_active ? <Badge>Cerrado</Badge> : days !== null && days < 0 ? <Badge tone="red">Vencido</Badge> : days !== null && days <= 3 ? <Badge tone="amber">Vence pronto</Badge> : null}
                </div>
                {a.description && <p className="mt-2 line-clamp-3 text-sm">{a.description}</p>}
                <p className="mt-3 flex items-center gap-1.5 text-sm font-bold">
                  <CalendarDays className="size-4" aria-hidden /> Entrega: {formatDate(a.due_date)}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {total === 0 ? (
                    <span className="text-sm text-tinta-suave">Aún no hay trabajos.</span>
                  ) : (
                    (Object.keys(p) as WorkStatus[]).map((s) => (
                      <Badge key={s} tone={WORK_STATUS[s].tone}>
                        {WORK_STATUS[s].label}: {p[s]}
                      </Badge>
                    ))
                  )}
                </div>
                <div className="mt-4 flex gap-2 border-t border-linea pt-3">
                  <AssignmentDialogButton assignment={a} groups={groupOptions} magazines={magazineOptions} templates={templateOptions} />
                  <ActionButton action={setAssignmentActiveAction.bind(null, a.id, !a.is_active)} variant="ghost">
                    {a.is_active ? "Cerrar proyecto" : "Reabrir"}
                  </ActionButton>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
