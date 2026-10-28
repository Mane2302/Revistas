import { LIMITS, PAGE_SIZE_MM, type Orientation, type PageElement } from "./schema";

export const MM_PER_PT = 25.4 / 72;
export const PT_PER_MM = 72 / 25.4;

export function pageSize(orientation: Orientation): { w: number; h: number } {
  return PAGE_SIZE_MM[orientation];
}

export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
}

export function round(value: number, decimals = 2): number {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
}

export interface ImageLayout {
  /** Posición y tamaño de la imagen completa relativos al marco (mismas unidades que el marco). */
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Calcula dónde se dibuja una imagen dentro de su marco. La usan el editor (CSS)
 * y el exportador PDF (canvas), de modo que el recorte es idéntico en ambos.
 *  - cover: la imagen rellena el marco (se recorta lo que sobra)
 *  - contain: la imagen cabe completa
 *  - zoom ≥ 1 amplía; focusX/focusY (0–100) eligen qué parte queda visible.
 */
export function computeImageLayout(
  naturalW: number,
  naturalH: number,
  frameW: number,
  frameH: number,
  fit: "cover" | "contain",
  zoom: number,
  focusX: number,
  focusY: number,
): ImageLayout {
  if (naturalW <= 0 || naturalH <= 0 || frameW <= 0 || frameH <= 0) {
    return { left: 0, top: 0, width: frameW, height: frameH };
  }
  const base = fit === "cover" ? Math.max(frameW / naturalW, frameH / naturalH) : Math.min(frameW / naturalW, frameH / naturalH);
  const scale = base * clamp(zoom, LIMITS.zoom.min, LIMITS.zoom.max);
  const width = naturalW * scale;
  const height = naturalH * scale;
  return {
    left: (frameW - width) * (clamp(focusX, 0, 100) / 100),
    top: (frameH - height) * (clamp(focusY, 0, 100) / 100),
    width,
    height,
  };
}

/** Mantiene un elemento con un tamaño mínimo y al menos 5 mm dentro de la página. */
export function constrainToPage<T extends PageElement>(el: T, orientation: Orientation): T {
  const { w: pw, h: ph } = pageSize(orientation);
  const min = LIMITS.minResizeSize;
  const w = clamp(el.w, min, pw * 2);
  const h = clamp(el.h, min, ph * 2);
  const keep = 5;
  return {
    ...el,
    w: round(w),
    h: round(h),
    x: round(clamp(el.x, keep - w, pw - keep)),
    y: round(clamp(el.y, keep - h, ph - keep)),
  };
}

/** Escala la geometría de un elemento al cambiar la orientación de la página. */
export function scaleElement<T extends PageElement>(el: T, sx: number, sy: number): T {
  return { ...el, x: round(el.x * sx), y: round(el.y * sy), w: round(el.w * sx), h: round(el.h * sy) };
}
