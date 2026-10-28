"use client";

import { createBrowserClient } from "@supabase/ssr";
import { publicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Cliente del navegador: usa la clave publicable y la sesión del usuario (RLS aplica siempre). */
export function createClient() {
  if (!browserClient) {
    const { url, key } = publicSupabaseEnv();
    browserClient = createBrowserClient<Database>(url, key);
  }
  return browserClient;
}
