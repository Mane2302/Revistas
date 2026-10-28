// Variables públicas: Next.js las incrusta en el código del navegador.
// Aquí NUNCA debe aparecer la clave secreta (ver src/lib/supabase/admin.ts).

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export class ConfigurationError extends Error {}

export function publicSupabaseEnv(): { url: string; key: string } {
  if (!url || !key) {
    throw new ConfigurationError(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Copia .env.example como .env.local y complétalo.",
    );
  }
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return Boolean(url && key);
}
