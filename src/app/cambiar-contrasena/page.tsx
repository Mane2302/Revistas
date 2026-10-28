import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { Card } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Cambiar contraseña" };

export default async function ChangePasswordPage() {
  const { profile } = await requireUser({ allowPasswordChange: true });
  const first = profile.must_change_password;
  return (
    <main id="contenido" className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md animate-aparecer">
        <div className="mb-6 flex justify-center">
          <Logo href={profile.role === "teacher" ? "/profesor" : "/alumno"} />
        </div>
        <Card className="p-6 sm:p-8">
          <h1 className="font-display text-2xl font-bold">{first ? `¡Bienvenido, ${profile.display_name}!` : "Cambiar contraseña"}</h1>
          <p className="mt-1 mb-6 text-tinta-suave">
            {first
              ? "Antes de empezar, crea una contraseña nueva que solo tú conozcas. La contraseña temporal dejará de funcionar."
              : "Escribe tu contraseña actual y elige una nueva."}
          </p>
          <PasswordForm askCurrent={!first} />
        </Card>
      </div>
    </main>
  );
}
