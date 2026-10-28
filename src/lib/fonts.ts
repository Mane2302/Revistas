// Familias tipográficas disponibles. Todas usan la licencia SIL Open Font License 1.1
// (ver public/fonts/<familia>/OFL.txt) y se sirven desde el propio sitio: los mismos
// archivos TTF se usan en pantalla y se incrustan en el PDF.

export const FONT_IDS = [
  "inter",
  "roboto",
  "open-sans",
  "lato",
  "montserrat",
  "merriweather",
  "playfair-display",
  "oswald",
  "nunito",
  "source-sans-3",
  "archivo",
  "libre-baskerville",
] as const;

export type FontId = (typeof FONT_IDS)[number];

export interface FontInfo {
  id: FontId;
  label: string;
  category: "Sin serifa" | "Con serifa" | "Exhibición";
  usage: string;
  /** Las fuentes decorativas solo se recomiendan para títulos. */
  decorative: boolean;
  hasItalic: boolean;
  fallback: "sans-serif" | "serif";
}

export const FONTS: Record<FontId, FontInfo> = {
  inter: { id: "inter", label: "Inter", category: "Sin serifa", usage: "Textos y títulos", decorative: false, hasItalic: true, fallback: "sans-serif" },
  roboto: { id: "roboto", label: "Roboto", category: "Sin serifa", usage: "Textos y títulos", decorative: false, hasItalic: true, fallback: "sans-serif" },
  "open-sans": { id: "open-sans", label: "Open Sans", category: "Sin serifa", usage: "Textos largos", decorative: false, hasItalic: true, fallback: "sans-serif" },
  lato: { id: "lato", label: "Lato", category: "Sin serifa", usage: "Textos y subtítulos", decorative: false, hasItalic: true, fallback: "sans-serif" },
  montserrat: { id: "montserrat", label: "Montserrat", category: "Sin serifa", usage: "Títulos modernos", decorative: false, hasItalic: true, fallback: "sans-serif" },
  merriweather: { id: "merriweather", label: "Merriweather", category: "Con serifa", usage: "Textos de periódico", decorative: false, hasItalic: true, fallback: "serif" },
  "playfair-display": { id: "playfair-display", label: "Playfair Display", category: "Exhibición", usage: "Títulos elegantes", decorative: true, hasItalic: true, fallback: "serif" },
  oswald: { id: "oswald", label: "Oswald", category: "Exhibición", usage: "Títulos llamativos", decorative: true, hasItalic: false, fallback: "sans-serif" },
  nunito: { id: "nunito", label: "Nunito", category: "Sin serifa", usage: "Textos amigables", decorative: false, hasItalic: true, fallback: "sans-serif" },
  "source-sans-3": { id: "source-sans-3", label: "Source Sans 3", category: "Sin serifa", usage: "Textos largos", decorative: false, hasItalic: true, fallback: "sans-serif" },
  archivo: { id: "archivo", label: "Archivo", category: "Sin serifa", usage: "Títulos y datos", decorative: false, hasItalic: true, fallback: "sans-serif" },
  "libre-baskerville": { id: "libre-baskerville", label: "Libre Baskerville", category: "Con serifa", usage: "Textos clásicos", decorative: false, hasItalic: true, fallback: "serif" },
};

/**
 * Familias que se incrustan completas en el PDF. El subconjunto de pdf-lib pierde glyphs
 * de Inter (comprobado en tests/unit/pdf.test.ts); las demás funcionan con subconjunto.
 */
export const PDF_NO_SUBSET: ReadonlySet<FontId> = new Set<FontId>(["inter"]);

/** Tamaño mínimo (pt) recomendado para fuentes decorativas: por debajo dificultan la lectura. */
export const DECORATIVE_MIN_SIZE = 14;

export function fontCssFamily(id: FontId): string {
  return `"rev-${id}", ${FONTS[id].fallback}`;
}

/** El estilo efectivo: si la familia no tiene cursiva, se usa la redonda (igual en pantalla y PDF). */
export function effectiveItalic(id: FontId, italic: boolean): boolean {
  return italic && FONTS[id].hasItalic;
}

export function fontFileUrl(id: FontId, weight: 400 | 700, italic: boolean): string {
  return `/fonts/${id}/${weight}${effectiveItalic(id, italic) ? "-italic" : ""}.ttf`;
}

/** Escala tipográfica recomendada (en puntos). */
export const TYPE_SCALE = {
  title: { label: "Título principal", size: 36 },
  subtitle: { label: "Subtítulo", size: 18 },
  heading: { label: "Encabezado", size: 14 },
  body: { label: "Cuerpo del artículo", size: 10.5 },
  caption: { label: "Pie de foto", size: 8.5 },
  credits: { label: "Créditos", size: 8 },
} as const;
