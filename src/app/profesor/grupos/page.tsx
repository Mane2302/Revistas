import { FolderKanban, Users, UsersRound } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { GroupDialogButton } from "@/components/teacher/groups";
import { ActionButton } from "@/components/ui/action-button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { setGroupActiveAction } from "@/lib/actions/teacher";
import { requireTeacher } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Grupos" };

export default async function GroupsPage() {
  const { supabase } = await requireTeacher();
  const [{ data: groups }, { data: members }, { data: magazines }] = await Promise.all([
    supabase.from("groups").select("id, name, description, is_active").order("is_active", { ascending: false }).order("name"),
    supabase.from("profiles").select("group_id").eq("role", "student").eq("is_active", true),
    supabase.from("magazines").select("group_id"),
  ]);
  const countBy = (rows: Array<{ group_id: string | null }> | null) => {
    const m = new Map<string, number>();
    for (const r of rows ?? []) if (r.group_id) m.set(r.group_id, (m.get(r.group_id) ?? 0) + 1);
    return m;
  };
  const memberCount = countBy(members);
  const magazineCount = countBy(magazines);

  return (
    <>
      <PageHeader title="Grupos" description="Organiza a tus alumnos por grupo para asignarles proyectos y revistas." actions={<GroupDialogButton />} />
      {(groups ?? []).length === 0 ? (
        <EmptyState icon={UsersRound} title="Todavía no hay grupos" action={<GroupDialogButton />}>
          Crea el primer grupo (por ejemplo «1.° A») y después registra a sus alumnos.
        </EmptyState>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(groups ?? []).map((g) => (
            <Card key={g.id} className={g.is_active ? "p-5" : "p-5 opacity-70"}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-lg font-bold">{g.name}</h2>
                  {g.description && <p className="mt-0.5 text-sm text-tinta-suave">{g.description}</p>}
                </div>
                {!g.is_active && <Badge>Desactivado</Badge>}
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm">
                <Link href={`/profesor/alumnos?grupo=${g.id}`} className="flex items-center gap-1.5 rounded-lg bg-papel px-2.5 py-1.5 font-bold hover:bg-cielo-claro">
                  <Users className="size-4" /> {memberCount.get(g.id) ?? 0} integrantes
                </Link>
                <Link href={`/profesor/proyectos?grupo=${g.id}`} className="flex items-center gap-1.5 rounded-lg bg-papel px-2.5 py-1.5 font-bold hover:bg-cielo-claro">
                  <FolderKanban className="size-4" /> Proyectos
                </Link>
                <Link href={`/profesor/revistas?grupo=${g.id}`} className="flex items-center gap-1.5 rounded-lg bg-papel px-2.5 py-1.5 font-bold hover:bg-cielo-claro">
                  {magazineCount.get(g.id) ?? 0} revistas
                </Link>
              </div>
              <div className="mt-4 flex gap-2 border-t border-linea pt-3">
                <GroupDialogButton group={g} />
                <ActionButton
                  action={setGroupActiveAction.bind(null, g.id, !g.is_active)}
                  variant="ghost"
                  confirm={
                    g.is_active
                      ? { title: `¿Desactivar ${g.name}?`, message: "No se borrará nada. El grupo dejará de aparecer al registrar alumnos o importar un CSV.", confirmLabel: "Desactivar" }
                      : undefined
                  }
                >
                  {g.is_active ? "Desactivar" : "Activar"}
                </ActionButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
