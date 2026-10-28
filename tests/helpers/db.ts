import { PGlite, type Transaction } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");

/** Crea una base de datos Postgres en memoria con todas las migraciones aplicadas. */
export async function createTestDb(): Promise<PGlite> {
  const db = new PGlite();
  await db.exec(readFileSync(path.join(__dirname, "supabase-stub.sql"), "utf8"));
  const dir = path.join(ROOT, "supabase", "migrations");
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(path.join(dir, file), "utf8"));
  }
  return db;
}

export type Tx = Transaction;

/**
 * Ejecuta `fn` como lo haría PostgREST: con el rol `authenticated` y el JWT del usuario,
 * o con el rol `anon` cuando `uid` es null. Si `fn` lanza un error, la transacción se revierte.
 */
export async function asUser<T>(db: PGlite, uid: string | null, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec(`set local role ${uid ? "authenticated" : "anon"}`);
    await tx.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify({ sub: uid ?? "", role: uid ? "authenticated" : "anon" }),
    ]);
    return fn(tx);
  });
}

/** Igual que asUser pero con la clave secreta del servidor (rol service_role). */
export async function asService<T>(db: PGlite, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.exec("set local role service_role");
    return fn(tx);
  });
}

export async function createUser(
  db: PGlite,
  opts: { id: string; username: string; role: "teacher" | "student"; groupId?: string | null; active?: boolean },
): Promise<void> {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [opts.id, `${opts.username}@test.invalid`]);
  await db.query(
    `insert into public.profiles (id, username, display_name, role, group_id, is_active, must_change_password)
     values ($1, $2, $3, $4, $5, $6, false)`,
    [opts.id, opts.username, opts.username, opts.role, opts.groupId ?? null, opts.active ?? true],
  );
}

export function uuid(n: number): string {
  return `00000000-0000-4000-8000-${n.toString().padStart(12, "0")}`;
}
