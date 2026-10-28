import "server-only";
import { createHash } from "node:crypto";
import type { AdminSupabase } from "@/lib/supabase/admin";

const WINDOW_MINUTES = 15;
/** Fallos permitidos por nombre de usuario en la ventana. */
const MAX_FAILURES_PER_USER = 5;
/** Fallos permitidos por IP (un aula entera comparte IP, por eso es alto). */
const MAX_FAILURES_PER_IP = 60;

export function hashIp(ip: string | null): string | null {
  if (!ip) return null;
  const salt = process.env.LOGIN_HASH_SALT ?? "revista-escolar";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}

export function clientIp(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || null;
  return headers.get("x-real-ip");
}

/** Devuelve false si hay demasiados intentos fallidos recientes. */
export async function isLoginAllowed(admin: AdminSupabase, username: string, ipHash: string | null): Promise<boolean> {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
  const byUser = await admin
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("username", username)
    .eq("success", false)
    .gte("created_at", since);
  if ((byUser.count ?? 0) >= MAX_FAILURES_PER_USER) return false;
  if (ipHash) {
    const byIp = await admin
      .from("login_attempts")
      .select("id", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .eq("success", false)
      .gte("created_at", since);
    if ((byIp.count ?? 0) >= MAX_FAILURES_PER_IP) return false;
  }
  return true;
}

export async function recordLoginAttempt(admin: AdminSupabase, username: string, ipHash: string | null, success: boolean) {
  await admin.from("login_attempts").insert({ username, ip_hash: ipHash, success });
  if (success) {
    // Minimización de datos: se borran los intentos de más de un día.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    await admin.from("login_attempts").delete().lt("created_at", dayAgo);
  }
}
