import { TYPE_SCALE, type FontId } from "@/lib/fonts";
import { pageSize } from "./geometry";
import type {
  EditorDocument,
  ImageElement,
  Orientation,
  Page,
  PageElement,
  ShapeElement,
  TextElement,
  TextStyle,
  WorkContent,
} from "./schema";

export function newId(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 12);
}

export const DEFAULT_TEXT_STYLE: TextStyle = {
  fontFamily: "inter",
  fontSize: TYPE_SCALE.body.size,
  color: "#1f2937",
  align: "left",
  lineHeight: 1.4,
  fontWeight: 400,
  italic: false,
  underline: false,
  uppercase: false,
  letterSpacing: 0,
};

export function createBlankPage(color = "#ffffff"): Page {
  return { id: newId(), background: { color, assetId: null, fit: "cover", opacity: 1 }, elements: [] };
}

export function createEmptyWork(orientation: Orientation): WorkContent {
  return { schemaVersion: 1, orientation, pages: [createBlankPage()] };
}

export type TextPreset = "title" | "subtitle" | "heading" | "body" | "caption" | "credits" | "quote" | "label";

export const TEXT_PRESETS: Record<TextPreset, { label: string; text: string; w: number; h: number; style: Partial<TextStyle>; background?: string }> = {
  title: { label: "Título", text: "Escribe un título", w: 170, h: 22, style: { fontSize: TYPE_SCALE.title.size, fontWeight: 700, fontFamily: "montserrat", lineHeight: 1.1 } },
  subtitle: { label: "Subtítulo", text: "Escribe un subtítulo", w: 160, h: 14, style: { fontSize: TYPE_SCALE.subtitle.size, fontFamily: "lato", color: "#4b5563", lineHeight: 1.2 } },
  heading: { label: "Encabezado", text: "Encabezado de sección", w: 120, h: 9, style: { fontSize: TYPE_SCALE.heading.size, fontWeight: 700, color: "#1d4ed8" } },
  body: { label: "Párrafo", text: "Escribe aquí tu texto. Puedes cambiar la tipografía, el tamaño y el color en el panel de la derecha.", w: 85, h: 50, style: { fontSize: TYPE_SCALE.body.size, align: "justify", lineHeight: 1.45 } },
  caption: { label: "Pie de foto", text: "Pie de foto: describe la imagen y su autor.", w: 90, h: 7, style: { fontSize: TYPE_SCALE.caption.size, italic: true, color: "#6b7280" } },
  credits: { label: "Créditos", text: "Texto: nombre editorial · Fotografía: autor", w: 120, h: 6, style: { fontSize: TYPE_SCALE.credits.size, color: "#6b7280" } },
  quote: { label: "Cita destacada", text: "“Una frase importante para destacar”", w: 110, h: 22, style: { fontSize: 15, fontFamily: "playfair-display", italic: true, color: "#9d174d", lineHeight: 1.25 } },
  label: { label: "Etiqueta", text: "ETIQUETA", w: 36, h: 8, style: { fontSize: 8.5, fontWeight: 700, color: "#ffffff", uppercase: true, letterSpacing: 1 }, background: "#e63946" },
};

export function createTextElement(preset: TextPreset, orientation: Orientation, overrides?: { fontFamily?: FontId }): TextElement {
  const p = TEXT_PRESETS[preset];
  const { w: pw, h: ph } = pageSize(orientation);
  return {
    id: newId(),
    type: "text",
    x: Math.round((pw - p.w) / 2),
    y: Math.round(ph / 3),
    w: p.w,
    h: p.h,
    text: p.text,
    style: { ...DEFAULT_TEXT_STYLE, ...p.style, ...(overrides?.fontFamily ? { fontFamily: overrides.fontFamily } : {}) },
    background: p.background ?? null,
    padding: p.background ? 1.5 : 0,
    verticalAlign: p.background ? "middle" : "top",
  };
}

export function createImageElement(orientation: Orientation, assetId: string | null = null, aspect = 4 / 3): ImageElement {
  const { w: pw, h: ph } = pageSize(orientation);
  const w = 100;
  const h = Math.round(Math.min(140, w / aspect));
  return {
    id: newId(),
    type: "image",
    x: Math.round((pw - w) / 2),
    y: Math.round((ph - h) / 2),
    w,
    h,
    assetId,
    fit: "cover",
    zoom: 1,
    focusX: 50,
    focusY: 50,
    borderWidth: 0,
    borderColor: "#ffffff",
    radius: 0,
    opacity: 1,
  };
}

export type ShapePreset = "rect" | "rounded" | "ellipse" | "line" | "vline" | "frame" | "box" | "band";

export const SHAPE_PRESETS: Record<ShapePreset, { label: string; make: () => Omit<ShapeElement, "id" | "x" | "y"> }> = {
  rect: { label: "Rectángulo", make: () => ({ type: "shape", shape: "rect", w: 60, h: 40, fill: "#fde68a", stroke: null, strokeWidth: 0, radius: 0, opacity: 1 }) },
  rounded: { label: "Recuadro redondeado", make: () => ({ type: "shape", shape: "rect", w: 70, h: 45, fill: "#dbeafe", stroke: null, strokeWidth: 0, radius: 4, opacity: 1 }) },
  ellipse: { label: "Círculo", make: () => ({ type: "shape", shape: "ellipse", w: 40, h: 40, fill: "#fbcfe8", stroke: null, strokeWidth: 0, radius: 0, opacity: 1 }) },
  line: { label: "Línea separadora", make: () => ({ type: "shape", shape: "line", w: 120, h: 4, fill: null, stroke: "#1f2937", strokeWidth: 0.6, radius: 0, opacity: 1 }) },
  vline: { label: "Línea vertical", make: () => ({ type: "shape", shape: "line", w: 4, h: 80, fill: null, stroke: "#9ca3af", strokeWidth: 0.4, radius: 0, opacity: 1 }) },
  frame: { label: "Marco para foto", make: () => ({ type: "shape", shape: "rect", w: 90, h: 70, fill: null, stroke: "#b08d57", strokeWidth: 1.5, radius: 0, opacity: 1 }) },
  box: { label: "Recuadro de datos", make: () => ({ type: "shape", shape: "rect", w: 70, h: 60, fill: "#ecfdf5", stroke: "#10b981", strokeWidth: 0.4, radius: 3, opacity: 1 }) },
  band: { label: "Franja de color", make: () => ({ type: "shape", shape: "rect", w: 210, h: 30, fill: "#3d5afe", stroke: null, strokeWidth: 0, radius: 0, opacity: 1 }) },
};

export function createShapeElement(preset: ShapePreset, orientation: Orientation): ShapeElement {
  const base = SHAPE_PRESETS[preset].make();
  const { w: pw, h: ph } = pageSize(orientation);
  const w = preset === "band" ? pw : base.w;
  return { ...base, w, id: newId(), x: preset === "band" ? 0 : Math.round((pw - w) / 2), y: Math.round((ph - base.h) / 2) };
}

/** Copia profunda con identificadores nuevos (para duplicar o usar plantillas). */
export function cloneElement<T extends PageElement>(el: T): T {
  return { ...structuredClone(el), id: newId() };
}

export function clonePage(page: Page): Page {
  return { ...structuredClone(page), id: newId(), elements: page.elements.map(cloneElement) };
}

export function cloneDocument(doc: EditorDocument): EditorDocument {
  return structuredClone(doc);
}
