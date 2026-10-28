import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/brand";
import { Alert, Card } from "@/components/ui/misc";
import { getSession, homeFor } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  if (configured) {
    const session = await getSession();
    if (session?.profile.is_active) redirect(session.profile.must_change_password ? "/cambiar-contrasena" : homeFor(session.profile));
  }
  const next = typeof params.siguiente === "string" ? params.siguiente : "";

  return (
    <main id="contenido" className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-aparecer">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <Card className="p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold">¡Hola de nuevo!</h1>
          <p className="mt-1 mb-6 text-tinta-suave">Escribe el usuario y la contraseña que te dio tu profesor.</p>
          {params.motivo === "inactiva" && (
            <Alert kind="warning" className="mb-4">
              Tu cuenta está desactivada. Habla con tu profesor.
            </Alert>
          )}
          {configured ? (
            <LoginForm next={next} />
          ) : (
            <Alert kind="error" title="La aplicación aún no está configurada">
              Falta conectar Supabase. Consulta la guía <code>docs/DESPLIEGUE.md</code>.
            </Alert>
          )}
        </Card>
        <p className="mt-6 text-center text-sm text-tinta-suave">¿Olvidaste tu contraseña? Tu profesor puede restablecerla desde su panel.</p>
      </div>
    </main>
  );
}
