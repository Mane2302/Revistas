import type { Metadata } from "next";
import { Card, PageHeader, Pagination } from "@/components/ui/misc";
import { requireTeacher } from "@/lib/auth/session";
import { formatDateTime, pageParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Registro de cambios" };

const PAGE_SIZE = 50;

const ACTIONS: Record<string, string> = {
  "work.submitted": "Envió un trabajo a revisión",
  "work.approved": "Aprobó un trabajo",
  "work.changes_requested": "Solicitó correcciones",
  "work.rejected": "Rechazó un trabajo",
  "work.reopened": "Reabrió un trabajo",
  "magazine.published": "Publicó una revista",
  "magazine.unpublished": "Retiró una publicación",
  "account.created.student": "Registró un alumno",
  "account.created.teacher": "Creó una cuenta de profesor",
  "account.password_reset": "Restableció una contraseña",
  "account.password_changed": "Cambió su contraseña",
  "account.activated": "Activó una cuenta",
  "account.deactivated": "Desactivó una cuenta",
  "account.updated": "Editó los datos de una cuenta",
  "account.deleted": "Eliminó una cuenta",
  "account.role.teacher": "Dio permisos de profesor",
  "account.role.student": "Quitó permisos de profesor",
  "groups.insert": "Creó un grupo",
  "groups.update": "Modificó un grupo",
  "groups.delete": "Eliminó un grupo",
  "assignments.insert": "Asignó un proyecto",
  "assignments.update": "Modificó un proyecto",
  "assignments.delete": "Eliminó un proyecto",
  "magazines.insert": "Creó una revista",
  "magazines.delete": "Eliminó una revista",
  "templates.update": "Cambió una plantilla",
};

export default async function AuditPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireTeacher();
  const page = pageParam((await searchParams).pagina);
  const { data: logs, count } = await supabase
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, created_at, profiles!audit_logs_actor_id_fkey(display_name, username)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <>
      <PageHeader title="Registro de cambios" description="Quién hizo cada cambio importante y cuándo. Este registro no se puede modificar desde la aplicación." />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="border-b border-linea bg-papel/60 text-xs tracking-wide text-tinta-suave uppercase">
            <tr>
              <th scope="col" className="px-4 py-3">Fecha</th>
              <th scope="col" className="px-4 py-3">Persona</th>
              <th scope="col" className="px-4 py-3">Acción</th>
              <th scope="col" className="px-4 py-3">Elemento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-linea">
            {(logs ?? []).map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5 whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                <td className="px-4 py-2.5">{l.profiles ? `${l.profiles.display_name} (${l.profiles.username})` : "Sistema"}</td>
                <td className="px-4 py-2.5">{ACTIONS[l.action] ?? l.action}</td>
                <td className="px-4 py-2.5 font-mono text-xs text-tinta-suave">
                  {l.entity_type} {l.entity_id?.slice(0, 8)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(logs ?? []).length === 0 && <p className="p-5 text-tinta-suave">Aún no hay registros.</p>}
      </Card>
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={(p) => `/profesor/auditoria?pagina=${p}`} />
    </>
  );
}
