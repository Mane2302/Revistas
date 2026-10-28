"use server";

import { createClient as createPlainClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeUsername, passwordSchema, USERNAME_PATTERN, usernameToEmail } from "@/lib/auth/credentials";
import { clientIp, hashIp, isLoginAllowed, recordLoginAttempt } from "@/lib/auth/rate-limit";
import { homeFor, requireUser } from "@/lib/auth/session";
import { publicSupabaseEnv } from "@/lib/env";
import { logServerError, type ActionResult } from "@/lib/errors";
import { createAdminClient, studentEmailDomain } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const GENERIC_LOGIN_ERROR = "Usuario o contraseña incorrectos. Revisa los datos o pide ayuda a tu profesor.";

function safeNext(value: FormDataEntryValue | null): string | null {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") && !v.includes("\\") ? v : null;
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!username || !password) {
    return { ok: false, message: "Escribe tu usuario y tu contraseña." };
  }

  let target: string;
  try {
    const admin = createAdminClient();
    const ipHash = hashIp(clientIp(await headers()));
    if (!(await isLoginAllowed(admin, username, ipHash))) {
      return { ok: false, message: "Demasiados intentos. Espera 15 minutos e inténtalo de nuevo." };
    }
    // Con un usuario mal escrito se responde igual que con una contraseña incorrecta.
    if (!USERNAME_PATTERN.test(username)) {
      await recordLoginAttempt(admin, username.slice(0, 40), ipHash, false);
      return { ok: false, message: GENERIC_LOGIN_ERROR };
    }
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username, studentEmailDomain()), password });
    if (error || !data.user) {
      await recordLoginAttempt(admin, username, ipHash, false);
      return { ok: false, message: GENERIC_LOGIN_ERROR };
    }
    const { data: profile } = await admin.from("profiles").select("role, is_active, must_change_password").eq("id", data.user.id).maybeSingle();
    if (!profile || !profile.is_active) {
      await supabase.auth.signOut();
      await recordLoginAttempt(admin, username, ipHash, false);
      return { ok: false, message: GENERIC_LOGIN_ERROR };
    }
    await recordLoginAttempt(admin, username, ipHash, true);
    target = profile.must_change_password ? "/cambiar-contrasena" : (safeNext(formData.get("next")) ?? homeFor(profile));
  } catch (error) {
    logServerError("login", error);
    return { ok: false, message: "No pudimos iniciar sesión en este momento. Inténtalo de nuevo en unos minutos." };
  }
  redirect(target);
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

const changeSchema = z
  .object({
    current: z.string().optional(),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "Las contraseñas no coinciden", path: ["confirm"] });

export async function changePasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const session = await requireUser({ allowPasswordChange: true });
  const parsed = changeSchema.safeParse({
    current: formData.get("current") ?? undefined,
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, message: issue?.message ?? "Revisa la contraseña.", fieldErrors: { [String(issue?.path[0] ?? "password")]: issue?.message ?? "" } };
  }
  const { current, password } = parsed.data;

  try {
    // Fuera del primer acceso, se confirma la contraseña actual sin tocar la sesión.
    if (!session.profile.must_change_password) {
      if (!current) return { ok: false, message: "Escribe tu contraseña actual.", fieldErrors: { current: "Escribe tu contraseña actual." } };
      const { url, key } = publicSupabaseEnv();
      const verifier = createPlainClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error } = await verifier.auth.signInWithPassword({ email: session.user.email ?? "", password: current });
      if (error) return { ok: false, message: "La contraseña actual no es correcta.", fieldErrors: { current: "La contraseña actual no es correcta." } };
      await verifier.auth.signOut();
    }
    const { error } = await session.supabase.auth.updateUser({ password });
    if (error) {
      const same = /different|same/i.test(error.message);
      return { ok: false, message: same ? "La nueva contraseña debe ser distinta de la anterior." : "No pudimos cambiar la contraseña. Inténtalo de nuevo." };
    }
    const admin = createAdminClient();
    await admin.from("profiles").update({ must_change_password: false }).eq("id", session.user.id);
    await admin.from("audit_logs").insert({ actor_id: session.user.id, action: "account.password_changed", entity_type: "profile", entity_id: session.user.id });
  } catch (error) {
    logServerError("change-password", error);
    return { ok: false, message: "No pudimos cambiar la contraseña. Inténtalo de nuevo." };
  }
  redirect(homeFor(session.profile));
}
