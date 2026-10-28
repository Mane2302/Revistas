import { z } from "zod";
import { FONT_IDS } from "@/lib/fonts";

// Coordenadas en milímetros sobre una página A4; tamaños de letra en puntos.
export const PAGE_SIZE_MM = {
  portrait: { w: 210, h: 297 },
  landscape: { w: 297, h: 210 },
} as const;

export const ORIENTATIONS = ["portrait", "landscape"] as const;
export type Orientation = (typeof ORIENTATIONS)[number];

export const LIMITS = {
  fontSize: { min: 6, max: 120 },
  lineHeight: { min: 0.8, max: 3 },
  letterSpacing: { min: -2, max: 20 },
  padding: { min: 0, max: 20 },
  borderWidth: { min: 0, max: 10 },
  radius: { min: 0, max: 150 },
  zoom: { min: 1, max: 4 },
  /** Mínimo aceptado al guardar (las líneas decorativas son finas). */
  minElementSize: 1,
  /** Mínimo al redimensionar con el ratón en el editor. */
  minResizeSize: 3,
  maxTextLength: 6000,
  maxElementsPerPage: 80,
  maxPagesPerWork: 24,
  maxPagesPerMagazine: 80,
} as const;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color no válido");
const elementId = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, "Identificador no válido");
const position = z.number().finite().min(-300).max(600);
const dimension = z.number().finite().min(LIMITS.minElementSize).max(600);
const range = (r: { min: number; max: number }) => z.number().finite().min(r.min).max(r.max);
const role = z
  .string()
  .regex(/^[a-z0-9-]{1,40}$/)
  .optional();

export const textStyleSchema = z.object({
  fontFamily: z.enum(FONT_IDS),
  fontSize: range(LIMITS.fontSize),
  color: hexColor,
  align: z.enum(["left", "center", "right", "justify"]),
  lineHeight: range(LIMITS.lineHeight),
  fontWeight: z.union([z.literal(400), z.literal(700)]),
  italic: z.boolean(),
  underline: z.boolean(),
  uppercase: z.boolean(),
  letterSpacing: range(LIMITS.letterSpacing),
});

const baseElement = {
  id: elementId,
  x: position,
  y: position,
  w: dimension,
  h: dimension,
  role,
  locked: z.boolean().optional(),
};

export const textElementSchema = z.object({
  ...baseElement,
  type: z.literal("text"),
  text: z.string().max(LIMITS.maxTextLength),
  /** Texto de ejemplo de la plantilla que aún no se ha reemplazado. */
  sample: z.boolean().optional(),
  style: textStyleSchema,
  background: hexColor.nullable(),
  padding: range(LIMITS.padding),
  verticalAlign: z.enum(["top", "middle", "bottom"]),
});

export const imageElementSchema = z.object({
  ...baseElement,
  type: z.literal("image"),
  assetId: z.uuid().nullable(),
  fit: z.enum(["cover", "contain"]),
  zoom: range(LIMITS.zoom),
  focusX: z.number().finite().min(0).max(100),
  focusY: z.number().finite().min(0).max(100),
  borderWidth: range(LIMITS.borderWidth),
  borderColor: hexColor,
  radius: range(LIMITS.radius),
  opacity: z.number().finite().min(0.1).max(1),
  placeholder: z.string().max(60).optional(),
});

export const shapeElementSchema = z.object({
  ...baseElement,
  type: z.literal("shape"),
  shape: z.enum(["rect", "ellipse", "line"]),
  fill: hexColor.nullable(),
  stroke: hexColor.nullable(),
  strokeWidth: range(LIMITS.borderWidth),
  radius: range(LIMITS.radius),
  opacity: z.number().finite().min(0).max(1),
});

export const elementSchema = z.discriminatedUnion("type", [textElementSchema, imageElementSchema, shapeElementSchema]);

export const backgroundSchema = z.object({
  color: hexColor,
  assetId: z.uuid().nullable(),
  fit: z.enum(["cover", "contain"]),
  opacity: z.number().finite().min(0).max(1),
});

export const PAGE_TYPES = ["cover", "index", "editorial", "article", "credits", "back_cover", "thanks", "custom"] as const;
export type PageType = (typeof PAGE_TYPES)[number];

export const PAGE_TYPE_LABELS: Record<PageType, string> = {
  cover: "Portada",
  index: "Índice",
  editorial: "Editorial",
  article: "Artículo",
  credits: "Créditos",
  back_cover: "Contraportada",
  thanks: "Agradecimientos",
  custom: "Página libre",
};

export const pageSchema = z
  .object({
    id: elementId,
    background: backgroundSchema,
    elements: z.array(elementSchema).max(LIMITS.maxElementsPerPage, "Demasiados elementos en una página"),
    pageType: z.enum(PAGE_TYPES).optional(),
    templateId: z
      .string()
      .regex(/^[a-z0-9-]{3,60}$/)
      .nullable()
      .optional(),
    sourceArticleId: z.uuid().nullable().optional(),
  })
  .superRefine((page, ctx) => {
    const ids = new Set<string>();
    for (const el of page.elements) {
      if (ids.has(el.id)) {
        ctx.addIssue({ code: "custom", message: "Elementos con identificador repetido" });
        return;
      }
      ids.add(el.id);
    }
  });

export const workContentSchema = z.object({
  schemaVersion: z.literal(1),
  orientation: z.enum(ORIENTATIONS),
  pages: z.array(pageSchema).min(1, "El trabajo necesita al menos una página").max(LIMITS.maxPagesPerWork),
});

export const magazinePagesSchema = z.array(pageSchema).max(LIMITS.maxPagesPerMagazine);

export type TextStyle = z.infer<typeof textStyleSchema>;
export type TextElement = z.infer<typeof textElementSchema>;
export type ImageElement = z.infer<typeof imageElementSchema>;
export type ShapeElement = z.infer<typeof shapeElementSchema>;
export type PageElement = z.infer<typeof elementSchema>;
export type Background = z.infer<typeof backgroundSchema>;
export type Page = z.infer<typeof pageSchema>;
export type WorkContent = z.infer<typeof workContentSchema>;

/** Documento que maneja el editor (trabajo de alumno o composición de revista). */
export interface EditorDocument {
  orientation: Orientation;
  pages: Page[];
}

/** Todos los identificadores de imagen que usa un conjunto de páginas. */
export function collectAssetIds(pages: Page[]): string[] {
  const ids = new Set<string>();
  for (const p of pages) {
    if (p.background.assetId) ids.add(p.background.assetId);
    for (const el of p.elements) if (el.type === "image" && el.assetId) ids.add(el.assetId);
  }
  return [...ids];
}
