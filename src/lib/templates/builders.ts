import { DEFAULT_TEXT_STYLE } from "@/lib/document/factory";
import type { ImageElement, Page, PageElement, PageType, ShapeElement, TextElement, TextStyle } from "@/lib/document/schema";

export interface TemplateDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  kind: "cover" | "article" | "extra";
  sortOrder: number;
  page: Page;
}

type Box = [x: number, y: number, w: number, h: number];

interface TextOpts {
  background?: string | null;
  padding?: number;
  verticalAlign?: TextElement["verticalAlign"];
}

interface ImageOpts {
  radius?: number;
  borderWidth?: number;
  borderColor?: string;
  placeholder?: string;
  fit?: ImageElement["fit"];
}

interface ShapeOpts {
  stroke?: string | null;
  strokeWidth?: number;
  radius?: number;
  opacity?: number;
}

/** Pequeño lenguaje para describir plantillas de forma legible. */
export function builder(prefix: string) {
  let n = 0;
  const id = () => `${prefix}-${++n}`;
  const elements: PageElement[] = [];

  const api = {
    text(role: string | undefined, [x, y, w, h]: Box, text: string, style: Partial<TextStyle> = {}, opts: TextOpts = {}) {
      elements.push({
        id: id(),
        type: "text",
        role,
        x,
        y,
        w,
        h,
        text,
        sample: true,
        style: { ...DEFAULT_TEXT_STYLE, ...style },
        background: opts.background ?? null,
        padding: opts.padding ?? (opts.background ? 1.5 : 0),
        verticalAlign: opts.verticalAlign ?? (opts.background ? "middle" : "top"),
      });
      return api;
    },
    image(role: string, [x, y, w, h]: Box, opts: ImageOpts = {}) {
      elements.push({
        id: id(),
        type: "image",
        role,
        x,
        y,
        w,
        h,
        assetId: null,
        fit: opts.fit ?? "cover",
        zoom: 1,
        focusX: 50,
        focusY: 50,
        borderWidth: opts.borderWidth ?? 0,
        borderColor: opts.borderColor ?? "#ffffff",
        radius: opts.radius ?? 0,
        opacity: 1,
        placeholder: opts.placeholder ?? "Fotografía",
      });
      return api;
    },
    rect([x, y, w, h]: Box, fill: string | null, opts: ShapeOpts = {}) {
      elements.push(shape("rect", id(), [x, y, w, h], fill, opts));
      return api;
    },
    ellipse([x, y, w, h]: Box, fill: string | null, opts: ShapeOpts = {}) {
      elements.push(shape("ellipse", id(), [x, y, w, h], fill, opts));
      return api;
    },
    /** Línea horizontal (o vertical si h > w) centrada en la caja. */
    line([x, y, w, h]: Box, color: string, thickness: number) {
      elements.push(shape("line", id(), [x, y, w, h], null, { stroke: color, strokeWidth: thickness }));
      return api;
    },
    page(background: string, pageType: PageType): Page {
      return {
        id: `${prefix}-page`,
        background: { color: background, assetId: null, fit: "cover", opacity: 1 },
        elements: [...elements],
        pageType,
        templateId: prefix,
      };
    },
  };
  return api;
}

function shape(kind: ShapeElement["shape"], id: string, [x, y, w, h]: Box, fill: string | null, opts: ShapeOpts): ShapeElement {
  return {
    id,
    type: "shape",
    shape: kind,
    x,
    y,
    w,
    h,
    fill,
    stroke: opts.stroke ?? null,
    strokeWidth: opts.strokeWidth ?? 0,
    radius: opts.radius ?? 0,
    opacity: opts.opacity ?? 1,
  };
}

/** Texto de ejemplo para cuerpos de artículo: explica qué escribir. */
export const SAMPLE_BODY =
  "Escribe aquí el cuerpo de tu texto. Empieza por lo más importante y después agrega los detalles: qué pasó, quién participó, cuándo y dónde ocurrió, y por qué es interesante para tus lectores.\n\nUsa párrafos cortos y revisa la ortografía antes de enviar tu trabajo.";

export const SAMPLE_BODY_2 =
  "Continúa aquí tu texto. Puedes incluir la opinión de las personas que entrevistaste, datos que hayas investigado o una conclusión.\n\nRecuerda citar tus fuentes y no copiar textos completos de internet.";
