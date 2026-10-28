export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}

const dateFormatter = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "short", year: "numeric" });
const dateTimeFormatter = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  // Las fechas sin hora (YYYY-MM-DD) se interpretan en la zona local para no mostrar el día anterior.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00`) : new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateFormatter.format(d);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : dateTimeFormatter.format(d);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const target = new Date(`${date}T23:59:59`);
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000);
}

/** Lee un número entero positivo de los parámetros de búsqueda (paginación). */
export function pageParam(value: string | string[] | undefined): number {
  const n = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(n) && n > 0 ? n : 1;
}

export function textParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim().slice(0, 100) ?? "";
}

/** Escapa los comodines de PostgREST (`%`, `_`, `,`, `(`, `)`) en búsquedas con ilike. */
export function escapeSearch(value: string): string {
  return value.replace(/[%_,()\\]/g, (c) => `\\${c}`);
}
