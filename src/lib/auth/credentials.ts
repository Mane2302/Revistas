import { z } from "zod";

// Reglas de nombres de usuario y contraseñas. Se usan en el navegador (ayuda inmediata)
// y en el servidor (validación definitiva).

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,31}$/;

/** Convierte "José Pérez" en "jose.perez": minúsculas, sin acentos ni espacios. */
export function normalizeUsername(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");
}

export const usernameSchema = z
  .string()
  .transform(normalizeUsername)
  .pipe(
    z
      .string()
      .regex(USERNAME_PATTERN, "Usa de 3 a 32 caracteres: letras sin acentos, números, punto, guion o guion bajo, empezando por letra o número."),
  );

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Escribe el nombre visible")
  .max(80, "El nombre es demasiado largo");

export const editorialNameSchema = z
  .string()
  .trim()
  .max(60, "El nombre editorial es demasiado largo")
  .transform((v) => (v === "" ? null : v));

export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(72, "La contraseña es demasiado larga")
  .regex(/[A-Za-zÁÉÍÓÚáéíóúÑñ]/, "Incluye al menos una letra")
  .regex(/[0-9]/, "Incluye al menos un número");

/** Correo interno que nunca recibe mensajes (ver docs/ARQUITECTURA.md §4). */
export function usernameToEmail(username: string, domain: string): string {
  if (!USERNAME_PATTERN.test(username)) throw new Error("Nombre de usuario no válido");
  return `${username}@${domain}`;
}

// Sin caracteres que se confunden (0/O, 1/l/I) para que se dicten y copien fácilmente.
const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Contraseña temporal aleatoria (criptográficamente segura), p. ej. "kP7m-x3Qh-9wFa". */
export function generateTemporaryPassword(): string {
  const groups: string[] = [];
  const bytes = new Uint32Array(12);
  for (;;) {
    crypto.getRandomValues(bytes);
    const chars = [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join("");
    groups.length = 0;
    for (let i = 0; i < 12; i += 4) groups.push(chars.slice(i, i + 4));
    const candidate = groups.join("-");
    if (passwordSchema.safeParse(candidate).success) return candidate;
  }
}
