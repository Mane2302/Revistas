import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ConfigurationError, publicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/**
 * Cliente con la clave secreta. IGNORA las políticas RLS: úsalo solo en el servidor,
 * después de comprobar el rol del usuario, para operaciones que lo requieren
 * (Supabase Auth admin, URLs firmadas de subida, verificación de archivos, límites de acceso).
 * El import de "server-only" hace fallar la compilación si se importa desde el navegador.
 */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) {
    throw new ConfigurationError("Falta SUPABASE_SECRET_KEY en las variables de entorno del servidor.");
  }
  const { url } = publicSupabaseEnv();
  return createClient<Database>(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export type AdminSupabase = ReturnType<typeof createAdminClient>;

export function studentEmailDomain(): string {
  const domain = (process.env.STUDENT_EMAIL_DOMAIN ?? "alumnos.revista-escolar.invalid").trim().toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    throw new ConfigurationError("STUDENT_EMAIL_DOMAIN no es un dominio válido.");
  }
  return domain;
}
