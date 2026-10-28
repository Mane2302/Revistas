"use client";

import { confirmUploadAction, prepareUploadAction, type MediaItem } from "@/lib/actions/media";
import type { ActionResult } from "@/lib/errors";
import { createClient } from "@/lib/supabase/client";
import { formatBytes } from "@/lib/utils";
import { ALLOWED_IMAGE_TYPES, isAllowedExtension, sniffImage, type AllowedMime } from "./sniff";

const MB = 1024 * 1024;
/** Lado máximo al que se reducen las fotos (suficiente para imprimir A4 a buena calidad). */
const MAX_SIDE = 2400;

function fail(message: string): ActionResult<MediaItem> {
  return { ok: false, message };
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Sube una imagen: valida en el navegador (extensión, tipo, firma binaria, tamaño),
 * la reduce si es muy grande, pide al servidor una URL firmada y después le pide
 * que verifique el archivo. El servidor repite todas las comprobaciones.
 */
export async function uploadImageFile(file: File, maxMb: number): Promise<ActionResult<MediaItem>> {
  if (!isAllowedExtension(file.name) || !(file.type in ALLOWED_IMAGE_TYPES)) {
    return fail(`«${file.name}» no es una imagen permitida. Usa JPG, PNG o WebP (los SVG no se admiten).`);
  }
  if (file.size > maxMb * MB * 4) {
    return fail(`«${file.name}» es demasiado grande (${formatBytes(file.size)}). El máximo es ${maxMb} MB.`);
  }
  const head = new Uint8Array(await file.slice(0, 65536).arrayBuffer());
  const sniffed = sniffImage(head);
  if (!sniffed) return fail(`«${file.name}» no es una imagen válida.`);

  let blob: Blob = file;
  let mime: AllowedMime = sniffed.mime;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return fail(`No pudimos leer «${file.name}». Prueba con otra imagen.`);
  const longest = Math.max(bitmap.width, bitmap.height);
  if (longest > MAX_SIDE || file.size > 1.5 * MB) {
    const k = Math.min(1, MAX_SIDE / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * k);
    canvas.height = Math.round(bitmap.height * k);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const targetMime: AllowedMime = sniffed.mime === "image/png" ? "image/png" : "image/jpeg";
      const reduced = await canvasToBlob(canvas, targetMime, 0.86);
      if (reduced && reduced.size < file.size) {
        blob = reduced;
        mime = targetMime;
      }
    }
  }
  bitmap.close();
  if (blob.size > maxMb * MB) {
    return fail(`«${file.name}» sigue pesando más de ${maxMb} MB después de reducirla. Elige una imagen más ligera.`);
  }

  const ext = ALLOWED_IMAGE_TYPES[mime];
  const filename = `${file.name.replace(/\.[^.]+$/, "")}.${ext}`.slice(-200);
  const prepared = await prepareUploadAction({ filename, mime, size: blob.size });
  if (!prepared.ok || !prepared.data) return fail(prepared.message || "No pudimos preparar la subida.");

  const supabase = createClient();
  const { error } = await supabase.storage.from("media").uploadToSignedUrl(prepared.data.path, prepared.data.token, blob, { contentType: mime, upsert: false });
  if (error) return fail("No pudimos subir la imagen. Revisa tu conexión e inténtalo de nuevo.");
  return confirmUploadAction({ path: prepared.data.path, originalFilename: file.name.slice(0, 200) });
}
