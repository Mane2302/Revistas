import type { MagazineStatus, WorkKind, WorkStatus } from "@/types/database";

export type Tone = "gray" | "blue" | "amber" | "green" | "red" | "violet";

export const WORK_STATUS: Record<WorkStatus, { label: string; tone: Tone; help: string }> = {
  draft: { label: "Borrador", tone: "gray", help: "Puedes seguir editando y enviarlo cuando esté listo." },
  submitted: { label: "En revisión", tone: "blue", help: "Tu profesor lo está revisando. Mientras tanto no se puede editar." },
  changes_requested: { label: "Requiere correcciones", tone: "amber", help: "El profesor solicitó algunas correcciones." },
  approved: { label: "Aprobado", tone: "green", help: "¡Felicidades! Tu trabajo fue aprobado." },
  rejected: { label: "Rechazado", tone: "red", help: "El trabajo no fue aceptado. Lee los comentarios del profesor." },
  published: { label: "Publicado", tone: "violet", help: "Tu trabajo forma parte de una revista publicada." },
};

export const MAGAZINE_STATUS: Record<MagazineStatus, { label: string; tone: Tone }> = {
  draft: { label: "En preparación", tone: "gray" },
  published: { label: "Publicada", tone: "green" },
  unpublished: { label: "Retirada", tone: "amber" },
};

export const WORK_KIND_LABEL: Record<WorkKind, string> = { article: "Artículo", cover: "Portada" };

export const EDITABLE_STATUSES: WorkStatus[] = ["draft", "changes_requested"];

/** Progreso aproximado de un trabajo para las tarjetas del alumno. */
export function workProgress(status: WorkStatus): number {
  return { draft: 30, changes_requested: 60, submitted: 75, rejected: 75, approved: 100, published: 100 }[status];
}
