import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, publicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database";

const PROTECTED_PREFIXES = ["/alumno", "/profesor", "/editor", "/cambiar-contrasena"];

/**
 * Renueva la sesión de Supabase en cada petición y redirige a /ingresar a quien no
 * tenga sesión en rutas privadas. La comprobación del ROL se hace en el servidor
 * (layouts, páginas y Server Actions) y en la base de datos (RLS).
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!isSupabaseConfigured()) return response;

  const { url, key } = publicSupabaseEnv();
  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // No ejecutar código entre createServerClient y getUser (recomendación de @supabase/ssr).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (!user && PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/ingresar";
    redirectUrl.search = "";
    redirectUrl.searchParams.set("siguiente", path);
    return NextResponse.redirect(redirectUrl);
  }
  return response;
}
