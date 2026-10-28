import type { Metadata } from "next";
import { Logo } from "@/components/brand";
import { Card } from "@/components/ui/misc";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Aviso de privacidad" };
export const dynamic = "force-dynamic";

const DEFAULT_TEXT = `Este aviso es una plantilla. La escuela debe revisarlo y adaptarlo antes de usar la aplicación con alumnos.

Qué datos se guardan
• Nombre visible, nombre de usuario, grupo y, si el profesor lo decide, un nombre editorial o seudónimo.
• Los trabajos (textos y diseños) y las imágenes que suben los alumnos.
• Un registro de acciones (quién y cuándo) para la revisión editorial y la seguridad.
No se solicitan correo electrónico, teléfono ni fecha de nacimiento.

Para qué se usan
Únicamente para elaborar, revisar y publicar revistas escolares en la asignatura de Tecnología.

Quién puede verlos
Los trabajos y fotografías son privados: solo el alumno autor y sus profesores pueden verlos. Una revista se publica solo cuando el profesor la autoriza, y las fotografías deben ser autorizadas una por una. Los comentarios de revisión nunca se publican.

Sin publicidad ni seguimiento
La aplicación no muestra publicidad ni usa herramientas de seguimiento o analítica de terceros.

Conservación y eliminación
El profesor puede eliminar cuentas, trabajos e imágenes (por ejemplo, al final del ciclo escolar). Las familias pueden solicitarlo a la escuela.

Responsables
La escuela y el profesor administrador son responsables del tratamiento de estos datos y de cumplir la normativa aplicable de protección de datos de menores.`;

export default async function PrivacyPage() {
  let text = "";
  let school = "";
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { data } = await supabase.from("app_settings").select("school_name, privacy_policy").eq("id", 1).maybeSingle();
    text = data?.privacy_policy ?? "";
    school = data?.school_name ?? "";
  }
  return (
    <div className="min-h-dvh">
      <header className="mx-auto max-w-3xl px-4 py-5 sm:px-6">
        <Logo />
      </header>
      <main id="contenido" className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
        <h1 className="mb-1 font-display text-3xl font-bold">Aviso de privacidad</h1>
        {school && <p className="mb-6 text-tinta-suave">{school}</p>}
        <Card className="p-6 sm:p-8">
          <div className="leading-relaxed whitespace-pre-wrap">{text.trim() || DEFAULT_TEXT}</div>
        </Card>
      </main>
    </div>
  );
}
