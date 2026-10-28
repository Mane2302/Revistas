import fontkit from "@pdf-lib/fontkit";
import {
  clip,
  endPath,
  PDFDocument,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  rgb,
  setCharacterSpacing,
  type PDFFont,
  type PDFImage,
  type PDFPage,
  type RGB,
} from "pdf-lib";
import { pageSize, PT_PER_MM } from "@/lib/document/geometry";
import type { Background, ImageElement, Orientation, Page, ShapeElement, TextElement } from "@/lib/document/schema";
import { applyTextTransform, layoutText } from "@/lib/document/text-layout";
import { effectiveItalic, PDF_NO_SUBSET, type FontId } from "@/lib/fonts";

// Genera el PDF dibujando el documento JSON (no una captura de pantalla):
// texto vectorial con las fuentes TTF incrustadas, imágenes recortadas y formas.
// No depende del navegador: las fuentes y las imágenes llegan a través de proveedores.

export interface FontFace {
  family: FontId;
  weight: 400 | 700;
  italic: boolean;
}

export interface FontProvider {
  load(face: FontFace): Promise<Uint8Array>;
}

export interface ImageRequest {
  assetId: string;
  frameW: number;
  frameH: number;
  fit: "cover" | "contain";
  zoom: number;
  focusX: number;
  focusY: number;
  radius: number;
}

export interface PreparedImage {
  bytes: Uint8Array;
  format: "png" | "jpg";
}

export interface ImageProvider {
  /** Devuelve la imagen ya recortada al marco, o null si no se pudo cargar. */
  prepare(req: ImageRequest): Promise<PreparedImage | null>;
}

export interface PdfIssue {
  page: number;
  severity: "error" | "warning";
  message: string;
}

export interface BuildPdfOptions {
  title: string;
  orientation: Orientation;
  fonts: FontProvider;
  images: ImageProvider;
  onProgress?: (done: number, total: number) => void;
}

export class PdfImageError extends Error {}

interface FontMetrics {
  ascent: number;
  descent: number;
  unitsPerEm: number;
  underlinePosition: number;
  underlineThickness: number;
}

interface LoadedFont {
  pdf: PDFFont;
  metrics: FontMetrics;
}

const mm = (v: number) => v * PT_PER_MM;

function hexToRgb(hex: string): RGB {
  const n = Number.parseInt(hex.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

function preview(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length > 40 ? `${t.slice(0, 40)}…` : t;
}

/** Trazado SVG de un rectángulo redondeado con origen en su esquina superior izquierda. */
function roundedRectPath(w: number, h: number, r: number): string {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  if (rr === 0) return `M0,0 H${w} V${h} H0 Z`;
  return `M${rr},0 H${w - rr} A${rr},${rr} 0 0 1 ${w},${rr} V${h - rr} A${rr},${rr} 0 0 1 ${w - rr},${h} H${rr} A${rr},${rr} 0 0 1 0,${h - rr} V${rr} A${rr},${rr} 0 0 1 ${rr},0 Z`;
}

export async function buildPdf(pages: Page[], opts: BuildPdfOptions): Promise<{ bytes: Uint8Array; issues: PdfIssue[] }> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(opts.title);
  pdf.setCreator("Revista Escolar Digital");
  pdf.setProducer("Revista Escolar Digital (pdf-lib)");
  pdf.setLanguage("es-MX");

  const issues: PdfIssue[] = [];
  const fontCache = new Map<string, Promise<LoadedFont>>();
  const imageCache = new Map<string, Promise<PDFImage | null>>();
  const { w: pageW, h: pageH } = pageSize(opts.orientation);
  const PW = mm(pageW);
  const PH = mm(pageH);

  function font(face: FontFace): Promise<LoadedFont> {
    const normalized: FontFace = { ...face, italic: effectiveItalic(face.family, face.italic) };
    const key = `${normalized.family}-${normalized.weight}-${normalized.italic}`;
    let p = fontCache.get(key);
    if (!p) {
      p = (async () => {
        const bytes = await opts.fonts.load(normalized);
        const parsed = fontkit.create(bytes);
        const embedded = await pdf.embedFont(bytes, { subset: !PDF_NO_SUBSET.has(normalized.family) });
        return {
          pdf: embedded,
          metrics: {
            ascent: parsed.ascent,
            descent: parsed.descent,
            unitsPerEm: parsed.unitsPerEm,
            underlinePosition: parsed.underlinePosition,
            underlineThickness: parsed.underlineThickness,
          },
        };
      })();
      fontCache.set(key, p);
    }
    return p;
  }

  function image(req: ImageRequest): Promise<PDFImage | null> {
    const key = JSON.stringify(req);
    let p = imageCache.get(key);
    if (!p) {
      p = (async () => {
        const prepared = await opts.images.prepare(req);
        if (!prepared) return null;
        return prepared.format === "png" ? pdf.embedPng(prepared.bytes) : pdf.embedJpg(prepared.bytes);
      })();
      imageCache.set(key, p);
    }
    return p;
  }

  const clipTo = (page: PDFPage, x: number, yTop: number, w: number, h: number) => {
    page.pushOperators(pushGraphicsState(), rectangle(mm(x), PH - mm(yTop + h), mm(w), mm(h)), clip(), endPath());
  };

  async function drawBackground(page: PDFPage, bg: Background, pageNumber: number) {
    page.drawRectangle({ x: 0, y: 0, width: PW, height: PH, color: hexToRgb(bg.color) });
    if (!bg.assetId) return;
    const img = await image({ assetId: bg.assetId, frameW: pageW, frameH: pageH, fit: bg.fit, zoom: 1, focusX: 50, focusY: 50, radius: 0 });
    if (!img) throw new PdfImageError(`Página ${pageNumber}: no se pudo cargar la imagen de fondo.`);
    page.drawImage(img, { x: 0, y: 0, width: PW, height: PH, opacity: bg.opacity });
  }

  async function drawImageElement(page: PDFPage, el: ImageElement, pageNumber: number) {
    if (!el.assetId) {
      issues.push({ page: pageNumber, severity: "warning", message: "Hay un marco de imagen vacío (no aparecerá en el PDF)." });
      return;
    }
    const radius = Math.min(el.radius, el.w / 2, el.h / 2);
    const img = await image({ assetId: el.assetId, frameW: el.w, frameH: el.h, fit: el.fit, zoom: el.zoom, focusX: el.focusX, focusY: el.focusY, radius });
    if (!img) throw new PdfImageError(`Página ${pageNumber}: no se pudo cargar una imagen.`);
    page.drawImage(img, { x: mm(el.x), y: PH - mm(el.y + el.h), width: mm(el.w), height: mm(el.h), opacity: el.opacity });
    if (el.borderWidth > 0) {
      const bw = el.borderWidth;
      page.drawSvgPath(roundedRectPath(mm(el.w - bw), mm(el.h - bw), mm(Math.max(0, radius - bw / 2))), {
        x: mm(el.x + bw / 2),
        y: PH - mm(el.y + bw / 2),
        borderColor: hexToRgb(el.borderColor),
        borderWidth: mm(bw),
        borderOpacity: el.opacity,
      });
    }
  }

  function drawShape(page: PDFPage, el: ShapeElement) {
    if (el.shape === "line") {
      const color = hexToRgb(el.stroke ?? el.fill ?? "#000000");
      const t = mm(Math.max(el.strokeWidth, 0.1));
      const horizontal = el.w >= el.h;
      const start = horizontal ? { x: mm(el.x), y: PH - mm(el.y + el.h / 2) } : { x: mm(el.x + el.w / 2), y: PH - mm(el.y) };
      const end = horizontal ? { x: mm(el.x + el.w), y: start.y } : { x: start.x, y: PH - mm(el.y + el.h) };
      page.drawLine({ start, end, thickness: t, color, opacity: el.opacity });
      return;
    }
    const sw = el.stroke && el.strokeWidth > 0 ? el.strokeWidth : 0;
    const fill = el.fill ? hexToRgb(el.fill) : undefined;
    const stroke = sw > 0 && el.stroke ? hexToRgb(el.stroke) : undefined;
    if (!fill && !stroke) return;
    if (el.shape === "ellipse") {
      page.drawEllipse({
        x: mm(el.x + el.w / 2),
        y: PH - mm(el.y + el.h / 2),
        xScale: mm((el.w - sw) / 2),
        yScale: mm((el.h - sw) / 2),
        color: fill,
        borderColor: stroke,
        borderWidth: mm(sw),
        opacity: el.opacity,
        borderOpacity: el.opacity,
      });
      return;
    }
    const r = Math.min(el.radius, el.w / 2, el.h / 2);
    page.drawSvgPath(roundedRectPath(mm(el.w - sw), mm(el.h - sw), mm(Math.max(0, r - sw / 2))), {
      x: mm(el.x + sw / 2),
      y: PH - mm(el.y + sw / 2),
      color: fill,
      borderColor: stroke,
      borderWidth: stroke ? mm(sw) : 0,
      opacity: el.opacity,
      borderOpacity: el.opacity,
    });
  }

  async function drawText(page: PDFPage, el: TextElement, pageNumber: number) {
    const s = el.style;
    if (el.background) {
      page.drawRectangle({ x: mm(el.x), y: PH - mm(el.y + el.h), width: mm(el.w), height: mm(el.h), color: hexToRgb(el.background) });
    }
    const text = applyTextTransform(el.text, s.uppercase);
    if (!text.trim()) return;
    if (el.sample) {
      issues.push({ page: pageNumber, severity: "warning", message: `Hay un texto de ejemplo sin reemplazar: «${preview(text)}».` });
    }
    const { pdf: f, metrics } = await font({ family: s.fontFamily, weight: s.fontWeight, italic: s.italic });
    const size = s.fontSize;
    const spacing = s.letterSpacing;
    const pad = mm(el.padding);
    const contentX = mm(el.x) + pad;
    const contentTop = mm(el.y) + pad;
    const contentW = Math.max(1, mm(el.w) - 2 * pad);
    const contentH = Math.max(1, mm(el.h) - 2 * pad);
    const measure = (str: string) => f.widthOfTextAtSize(str, size);
    const lines = layoutText(text, contentW, measure, spacing);
    const lineH = size * s.lineHeight;
    const blockH = lines.length * lineH;
    if (blockH > contentH + 1) {
      issues.push({ page: pageNumber, severity: "warning", message: `El texto «${preview(text)}» no cabe completo en su cuadro.` });
    }
    const offset = el.verticalAlign === "middle" ? (contentH - blockH) / 2 : el.verticalAlign === "bottom" ? contentH - blockH : 0;
    const ascent = (metrics.ascent / metrics.unitsPerEm) * size;
    const descent = (-metrics.descent / metrics.unitsPerEm) * size;
    const halfLeading = (lineH - (ascent + descent)) / 2;
    const color = hexToRgb(s.color);

    clipTo(page, el.x, el.y, el.w, el.h);
    if (spacing !== 0) page.pushOperators(setCharacterSpacing(spacing));
    lines.forEach((line, i) => {
      if (!line.text) return;
      const baseline = contentTop + offset + i * lineH + halfLeading + ascent;
      const y = PH - baseline;
      let x = contentX;
      if (s.align === "center") x += (contentW - line.width) / 2;
      else if (s.align === "right") x += contentW - line.width;

      const words = line.text.split(" ");
      if (s.align === "justify" && line.justifiable && words.length > 1) {
        const wordsW = words.reduce((acc, w) => acc + measure(w) + spacing * [...w].length, 0);
        const gap = (contentW - wordsW) / (words.length - 1);
        let cx = x;
        for (const w of words) {
          if (w) page.drawText(w, { x: cx, y, size, font: f, color });
          cx += measure(w) + spacing * [...w].length + gap;
        }
      } else {
        page.drawText(line.text, { x, y, size, font: f, color });
      }
      if (s.underline) {
        const uy = y + (metrics.underlinePosition / metrics.unitsPerEm) * size;
        const thickness = Math.max(0.4, (metrics.underlineThickness / metrics.unitsPerEm) * size);
        const width = s.align === "justify" && line.justifiable ? contentW : line.width;
        page.drawLine({ start: { x, y: uy }, end: { x: x + width, y: uy }, thickness, color });
      }
    });
    if (spacing !== 0) page.pushOperators(setCharacterSpacing(0));
    page.pushOperators(popGraphicsState());
  }

  const total = pages.length;
  for (const [index, p] of pages.entries()) {
    const pageNumber = index + 1;
    const page = pdf.addPage([PW, PH]);
    await drawBackground(page, p.background, pageNumber);
    if (p.elements.length === 0 && !p.background.assetId) {
      issues.push({ page: pageNumber, severity: "warning", message: "La página está en blanco." });
    }
    for (const el of p.elements) {
      if (el.type === "text") await drawText(page, el, pageNumber);
      else if (el.type === "image") await drawImageElement(page, el, pageNumber);
      else drawShape(page, el);
    }
    opts.onProgress?.(pageNumber, total);
    // Cede el control para que la interfaz muestre el progreso.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  const bytes = await pdf.save();
  return { bytes, issues };
}
