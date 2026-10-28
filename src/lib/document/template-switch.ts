import { clonePage } from "./factory";
import { pageSize, scaleElement } from "./geometry";
import type { Orientation, Page, PageElement } from "./schema";

export interface LostItem {
  id: string;
  kind: "texto" | "imagen" | "forma";
  preview: string;
}

export interface TemplateSwitchPlan {
  /** Página resultante con el contenido trasladado a la nueva plantilla. */
  result: Page;
  /** Página resultante si además se conservan los elementos que no encajan. */
  resultWithExtras: Page;
  /** Roles cuyo contenido se trasladó. */
  moved: string[];
  /** Contenido del alumno que no tiene un lugar equivalente en la nueva plantilla. */
  unmatched: LostItem[];
}

function hasUserContent(el: PageElement): boolean {
  if (el.type === "text") return !el.sample && el.text.trim().length > 0;
  if (el.type === "image") return el.assetId !== null;
  return false;
}

function describe(el: PageElement): LostItem {
  if (el.type === "text") return { id: el.id, kind: "texto", preview: el.text.slice(0, 80) };
  if (el.type === "image") return { id: el.id, kind: "imagen", preview: "Imagen subida" };
  return { id: el.id, kind: "forma", preview: "Forma decorativa" };
}

/**
 * Prepara el cambio de plantilla de una página conservando el contenido del alumno.
 * El texto y las imágenes pasan al elemento con el mismo rol; el estilo es el de la
 * nueva plantilla. Nunca modifica la plantilla original (se trabaja sobre una copia).
 */
export function planTemplateSwitch(current: Page, template: Page): TemplateSwitchPlan {
  const target = clonePage(template);
  const byRole = new Map<string, PageElement>();
  for (const el of current.elements) if (el.role && !byRole.has(el.role)) byRole.set(el.role, el);

  const used = new Set<string>();
  const moved: string[] = [];
  target.elements = target.elements.map((el) => {
    if (!el.role) return el;
    const source = byRole.get(el.role);
    if (!source || source.type !== el.type || !hasUserContent(source)) return el;
    used.add(source.id);
    moved.push(el.role);
    if (el.type === "text" && source.type === "text") {
      return { ...el, text: source.text, sample: false };
    }
    if (el.type === "image" && source.type === "image") {
      return { ...el, assetId: source.assetId, fit: source.fit, zoom: source.zoom, focusX: source.focusX, focusY: source.focusY };
    }
    return el;
  });

  // El fondo con imagen subida por el alumno se conserva.
  if (current.background.assetId) {
    target.background = { ...target.background, assetId: current.background.assetId, fit: current.background.fit, opacity: current.background.opacity };
  }
  target.pageType = current.pageType ?? template.pageType;
  target.sourceArticleId = current.sourceArticleId ?? null;

  const leftovers = current.elements.filter((el) => !used.has(el.id) && hasUserContent(el));
  return {
    result: target,
    resultWithExtras: { ...target, elements: [...target.elements, ...leftovers.map((el) => ({ ...el }))] },
    moved,
    unmatched: leftovers.map(describe),
  };
}

/** Adapta una página diseñada para una orientación a otra, escalando la geometría. */
export function adaptPageOrientation(page: Page, from: Orientation, to: Orientation): Page {
  if (from === to) return page;
  const a = pageSize(from);
  const b = pageSize(to);
  const sx = b.w / a.w;
  const sy = b.h / a.h;
  return { ...page, elements: page.elements.map((el) => scaleElement(el, sx, sy)) };
}
