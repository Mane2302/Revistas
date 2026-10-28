import type { z } from "zod";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string>; data?: T };

export const INITIAL_ACTION_STATE = { ok: false, message: "" } as ActionResult;

interface DbErrorLike {
  code?: string;
  message?: string;
}

/** Convierte errores de la base de datos en mensajes comprensibles (sin detalles técnicos). */
export function friendlyDbError(error: DbErrorLike | null | undefined, fallback: string): string {
  if (!error) return fallback;
  switch (error.code) {
    case "23505":
      return "Ya existe un registro con ese nombre. Elige otro.";
    case "42501":
      return "No tienes permiso para realizar esta acción.";
    case "23503":
      return "Este elemento está relacionado con otros datos y no se puede completar la acción.";
    case "23514":
      return "Algún dato no cumple las reglas permitidas. Revisa el formulario.";
    // Errores propios lanzados por nuestras funciones SQL, ya redactados en español.
    case "PT409":
    case "PT422":
    case "P0002":
    case "22023":
    case "22001":
      return error.message ?? fallback;
    default:
      return fallback;
  }
}

/** Registra un error en los registros del servidor sin datos personales ni secretos. */
export function logServerError(context: string, error: unknown): void {
  const info =
    error && typeof error === "object"
      ? { code: (error as DbErrorLike).code, message: (error as DbErrorLike).message?.slice(0, 300) }
      : { message: String(error).slice(0, 300) };
  console.error(`[revista] ${context}`, info);
}

/** Primer mensaje de error de cada campo de un resultado de Zod. */
export function zodFieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export function firstZodMessage(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos del formulario.";
}
