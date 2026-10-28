import type { Metadata } from "next";
import { NewAccountButton } from "@/components/teacher/students";
import { ActionButton } from "@/components/ui/action-button";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/misc";
import { setRoleAction } from "@/lib/actions/accounts";
import { requireTeacher } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Profesores" };

export default async function TeamPage() {
  const { supabase, profile } = await requireTeacher();
  const { data: teachers } = await supabase.from("profiles").select("id, username, display_name, is_active, created_at").eq("role", "teacher").order("display_name");
  return (
    <>
      <PageHeader title="Profesores" description="Cuentas con permisos de administración. Solo un profesor puede crear otras cuentas de profesor." actions={<NewAccountButton groups={[]} role="teacher" />} />
      <Alert kind="warning" className="mb-4">
        Un profesor puede ver todos los trabajos, aprobar y publicar. Crea estas cuentas solo para personas de confianza de la escuela.
      </Alert>
      <Card className="divide-y divide-linea">
        {(teachers ?? []).map((t) => (
          <div key={t.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
            <div className="min-w-0 flex-1">
              <p className="font-bold">
                {t.display_name} {t.id === profile.id && <Badge tone="blue">Tú</Badge>}
              </p>
              <p className="text-sm text-tinta-suave">
                {t.username} · desde {formatDate(t.created_at)}
              </p>
            </div>
            {!t.is_active && <Badge tone="red">Desactivada</Badge>}
            {t.id !== profile.id && (
              <ActionButton
                action={setRoleAction.bind(null, t.id, "student")}
                confirm={{ title: "¿Quitar permisos de profesor?", message: `${t.display_name} pasará a ser una cuenta de alumno sin acceso al panel administrativo.`, confirmLabel: "Quitar permisos", danger: true }}
              >
                Quitar permisos
              </ActionButton>
            )}
          </div>
        ))}
      </Card>
    </>
  );
}
