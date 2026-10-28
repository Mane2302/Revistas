import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

export type Profile = Tables<"profiles">;

/**
 * Usuario y perfil actuales, verificados con el servidor de Auth (getUser valida el JWT).
 * Se memoriza durante una petición para no repetir consultas.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (!profile) return null;
  return { user, profile, supabase };
});

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

export async function requireUser(opts: { allowPasswordChange?: boolean } = {}): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/ingresar");
  if (!session.profile.is_active) redirect("/ingresar?motivo=inactiva");
  if (session.profile.must_change_password && !opts.allowPasswordChange) redirect("/cambiar-contrasena");
  return session;
}

export async function requireTeacher(): Promise<Session> {
  const session = await requireUser();
  if (session.profile.role !== "teacher") redirect("/alumno");
  return session;
}

export async function requireStudent(): Promise<Session> {
  const session = await requireUser();
  if (session.profile.role !== "student") redirect("/profesor");
  return session;
}

export function homeFor(profile: Pick<Profile, "role">): string {
  return profile.role === "teacher" ? "/profesor" : "/alumno";
}
