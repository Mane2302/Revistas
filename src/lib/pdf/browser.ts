"use client";

import type { AssetMap } from "@/lib/document/assets";
import { computeImageLayout } from "@/lib/document/geometry";
import type { Page } from "@/lib/document/schema";
import { fontFileUrl } from "@/lib/fonts";
import type { FontFace, FontProvider, ImageProvider, ImageRequest, PdfIssue, PreparedImage } from "./render-pdf";

/** Fuentes servidas desde /public/fonts (las mismas que ve el alumno en pantalla). */
export function browserFontProvider(): FontProvider {
  const cache = new Map<string, Promise<Uint8Array>>();
  return {
    load(face: FontFace) {
      const url = fontFileUrl(face.family, face.weight, face.italic);
      let p = cache.get(url);
      if (!p) {
        p = fetch(url).then(async (res) => {
          if (!res.ok) throw new Error(`No se pudo cargar la fuente ${face.family}`);
          return new Uint8Array(await res.arrayBuffer());
        });
        cache.set(url, p);
      }
      return p;
    },
  };
}

/** Resolución objetivo de las fotografías en el PDF. */
const TARGET_DPI = 200;
const MAX_CANVAS_SIDE = 3000;

function canvasToBytes(canvas: HTMLCanvasElement, type: "image/png" | "image/jpeg"): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("No se pudo procesar la imagen"));
        blob.arrayBuffer().then((b) => resolve(new Uint8Array(b)), reject);
      },
      type,
      0.9,
    );
  });
}

/**
 * Recorta cada imagen exactamente como en el editor (misma función computeImageLayout)
 * a ~200 ppp. Convierte WebP a JPG/PNG, que son los formatos que admite el PDF.
 */
export function browserImageProvider(assets: AssetMap): ImageProvider {
  const bitmaps = new Map<string, Promise<ImageBitmap | null>>();

  function bitmap(assetId: string): Promise<ImageBitmap | null> {
    let p = bitmaps.get(assetId);
    if (!p) {
      const info = assets[assetId];
      p = info
        ? fetch(info.url, { mode: "cors", credentials: "omit" })
            .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
            .then((blob) => createImageBitmap(blob))
            .catch(() => null)
        : Promise.resolve(null);
      bitmaps.set(assetId, p);
    }
    return p;
  }

  return {
    async prepare(req: ImageRequest): Promise<PreparedImage | null> {
      const bmp = await bitmap(req.assetId);
      if (!bmp) return null;
      const layout = computeImageLayout(bmp.width, bmp.height, req.frameW, req.frameH, req.fit, req.zoom, req.focusX, req.focusY);
      // No se amplía más allá de la resolución real de la foto.
      const sourcePxPerMm = bmp.width / layout.width;
      let pxPerMm = Math.min(TARGET_DPI / 25.4, Math.max(sourcePxPerMm, 72 / 25.4));
      pxPerMm = Math.min(pxPerMm, MAX_CANVAS_SIDE / Math.max(req.frameW, req.frameH));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(req.frameW * pxPerMm));
      canvas.height = Math.max(1, Math.round(req.frameH * pxPerMm));
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      const needsAlpha = req.radius > 0 || req.fit === "contain" || assets[req.assetId]?.mime === "image/png";
      if (req.radius > 0) {
        ctx.beginPath();
        ctx.roundRect(0, 0, canvas.width, canvas.height, req.radius * pxPerMm);
        ctx.clip();
      }
      ctx.drawImage(bmp, layout.left * pxPerMm, layout.top * pxPerMm, layout.width * pxPerMm, layout.height * pxPerMm);
      const format = needsAlpha ? "png" : "jpg";
      const bytes = await canvasToBytes(canvas, needsAlpha ? "image/png" : "image/jpeg");
      return { bytes, format };
    },
  };
}

/** Revisión previa (sin generar el PDF): imágenes sin cargar y páginas vacías. */
export function preflight(pages: Page[], assets: AssetMap): PdfIssue[] {
  const issues: PdfIssue[] = [];
  pages.forEach((p, i) => {
    const page = i + 1;
    if (p.elements.length === 0 && !p.background.assetId) issues.push({ page, severity: "warning", message: "La página está en blanco." });
    if (p.background.assetId && !assets[p.background.assetId]) issues.push({ page, severity: "error", message: "La imagen de fondo no está disponible." });
    for (const el of p.elements) {
      if (el.type === "image" && el.assetId && !assets[el.assetId]) issues.push({ page, severity: "error", message: "Una imagen no está disponible o no se cargó." });
      if (el.type === "image" && !el.assetId) issues.push({ page, severity: "warning", message: "Hay un marco de imagen vacío (no aparecerá en el PDF)." });
    }
  });
  return issues;
}

export function downloadBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function pdfFileName(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  return `${base || "revista"}.pdf`;
}
