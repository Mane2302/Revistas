// Crea la PRIMERA cuenta de profesor (administrador) de forma segura.
// Solo puede ejecutarlo quien tenga la clave secreta de Supabase en .env.local,
// es decir, quien administra el proyecto. Nadie puede registrarse como profesor desde la web.
//
// Uso:  npm run crear-profesor
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv(".env.local");
loadEnv(".env");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const secret = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
const domain = (process.env.STUDENT_EMAIL_DOMAIN ?? "alumnos.revista-escolar.invalid").toLowerCase();
if (!url || !secret) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local");
  process.exit(1);
}

const normalize = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, ".").replace(/[^a-z0-9._-]/g, "");

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function tempPassword() {
  for (;;) {
    const raw = Array.from({ length: 12 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
    const p = `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8)}`;
    if (/[A-Za-z]/.test(p) && /[0-9]/.test(p)) return p;
  }
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
const displayName = (await rl.question("Nombre visible del profesor: ")).trim();
const username = normalize(await rl.question("Nombre de usuario (sin correo, p. ej. profe.lopez): "));
rl.close();

if (!displayName || !/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username)) {
  console.error("Nombre o usuario no válidos. El usuario debe tener de 3 a 32 caracteres: letras, números, punto, guion.");
  process.exit(1);
}

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: existing } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
if (existing) {
  console.error(`El usuario «${username}» ya existe.`);
  process.exit(1);
}

const password = tempPassword();
const { data, error } = await admin.auth.admin.createUser({ email: `${username}@${domain}`, password, email_confirm: true });
if (error || !data.user) {
  console.error("No se pudo crear la cuenta en Supabase Auth:", error?.message);
  process.exit(1);
}
const { error: profileError } = await admin.from("profiles").insert({
  id: data.user.id,
  username,
  display_name: displayName,
  role: "teacher",
  must_change_password: true,
});
if (profileError) {
  await admin.auth.admin.deleteUser(data.user.id);
  console.error("No se pudo crear el perfil:", profileError.message);
  process.exit(1);
}
await admin.from("audit_logs").insert({ actor_id: data.user.id, action: "account.created.teacher", entity_type: "profile", entity_id: data.user.id });

console.log("\nCuenta de profesor creada.");
console.log(`  Usuario:              ${username}`);
console.log(`  Contraseña temporal:  ${password}`);
console.log("\nAnótala ahora: no se guarda en ningún lado. Al entrar por primera vez se pedirá cambiarla.");
