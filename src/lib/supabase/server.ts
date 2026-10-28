import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

/** Cliente de servidor con la sesión del usuario (cookies). Las políticas RLS se aplican. */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = publicSupabaseEnv();
  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // En un Server Component no se pueden escribir cookies; el proxy renueva la sesión.
        }
      },
    },
  });
}

export type ServerSupabase = Awaited<ReturnType<typeof createClient>>;
