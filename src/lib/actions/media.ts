"use server";

import { createHash, randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth/session";
import type { AssetMap } from "@/lib/document/assets";
import { friendlyDbError, logServerError, type ActionResult } from "@/lib/errors";
import { buildAssetMap, getSettings, MEDIA_BUCKET } from "@/lib/storage/assets";
import { ALLOWED_IMAGE_TYPES, fileExtension, isAllowedExtension, sniffImage, type AllowedMime } from "@/lib/storage/sniff";
import { createAdminClient } from "@/lib/supabase/admin";

const MB = 1024 * 1024;

export interface MediaItem {
  id: string;
  url: string;
  width: number;
  height: number;
  mime: string;
  sizeBytes: number;
  originalFilename: string;
  creditAuthor: string | null;
  creditSource: string | null;
  creditLicense: string | null;
  description: string | null;
  createdAt: string;
}

const prepareSchema = z.object({
  filename: z.string().min(1).max(200),
  mime: z.enum(Object.keys(ALLOWED_IMAGE_TYPES) as [AllowedMime, ...AllowedMime[]]),
  size: z.number().int().positive(),
});

/** Paso 1: el servidor valida tipo, tamaño y cuotas, y DECIDE la ruta del archivo. */
export async function prepareUploadAction(input: { filename: string; mime: string; size: number }): Promise<ActionResult<{ path: string; token: string }>> {
  const { supabase, profile } = await requireUser();
  const parsed = prepareSchema.safeParse(input);
  if (!parsed.success || !isAllowedExtension(input.filename)) {
    return { ok: false, message: "Solo se permiten imágenes JPG, PNG o WebP." };
  }
  const settings = await getSettings(supabase);
  const limit = Number(settings.max_image_mb) * MB;
  if (parsed.data.size > limit) return { ok: false, message: `La imagen pesa más de ${settings.max_image_mb} MB. Elige una más ligera.` };

  const { data: usage } = await supabase.rpc("storage_usage");
  const used = usage?.[0];
  if (used && Number(used.user_bytes) + parsed.data.size > settings.user_quota_mb * MB) {
    return { ok: false, message: "Llegaste al límite de espacio para tus imágenes. Borra las que ya no uses o pide ayuda a tu profesor." };
  }
  if (used && Number(used.total_bytes) + parsed.data.size > settings.total_quota_mb * MB) {
    return { ok: false, message: "La escuela alcanzó el límite de almacenamiento configurado. Avisa a tu profesor." };
  }

  const ext = ALLOWED_IMAGE_TYPES[parsed.data.mime];
  const path = `${profile.id}/${randomUUID()}.${ext}`;
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
    if (error || !data) throw error ?? new Error("sin datos");
    return { ok: true, data: { path: data.path, token: data.token } };
  } catch (error) {
    logServerError("prepare-upload", error);
    return { ok: false, message: "No pudimos preparar la subida. Inténtalo de nuevo." };
  }
}

const confirmSchema = z.object({
  path: z.string(),
  originalFilename: z.string().trim().min(1).max(200),
  creditAuthor: z.string().trim().max(120).optional(),
  creditSource: z.string().trim().max(300).optional(),
  creditLicense: z.string().trim().max(120).optional(),
  description: z.string().trim().max(300).optional(),
});

/** Paso 2: el servidor descarga el archivo, comprueba su contenido real y lo registra. */
export async function confirmUploadAction(input: z.input<typeof confirmSchema>): Promise<ActionResult<MediaItem>> {
  const { supabase, profile } = await requireUser();
  const parsed = confirmSchema.safeParse(input);
  const pathPattern = new RegExp(`^${profile.id}/[0-9a-f-]{36}\\.(jpg|png|webp)$`);
  if (!parsed.success || !pathPattern.test(parsed.data.path)) return { ok: false, message: "La subida no es válida." };
  const d = parsed.data;
  const admin = createAdminClient();
  const discard = () => admin.storage.from(MEDIA_BUCKET).remove([d.path]);

  try {
    const { data: blob, error } = await admin.storage.from(MEDIA_BUCKET).download(d.path);
    if (error || !blob) return { ok: false, message: "No encontramos la imagen subida. Inténtalo de nuevo." };
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const settings = await getSettings(supabase);
    if (bytes.length > Number(settings.max_image_mb) * MB) {
      await discard();
      return { ok: false, message: `La imagen pesa más de ${settings.max_image_mb} MB.` };
    }
    const sniffed = sniffImage(bytes);
    if (!sniffed || sniffed.ext !== fileExtension(d.path)) {
      await discard();
      return { ok: false, message: "El archivo no es una imagen JPG, PNG o WebP válida." };
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");

    // Evita duplicados: si ya subió la misma foto, se reutiliza.
    const { data: existing } = await admin.from("media_assets").select("id").eq("owner_id", profile.id).eq("sha256", sha256).maybeSingle();
    let assetId = existing?.id;
    if (existing) {
      await discard();
    } else {
      const { data: row, error: insertError } = await admin
        .from("media_assets")
        .insert({
          owner_id: profile.id,
          storage_path: d.path,
          original_filename: d.originalFilename,
          mime_type: sniffed.mime,
          size_bytes: bytes.length,
          width: sniffed.width,
          height: sniffed.height,
          sha256,
          credit_author: d.creditAuthor || null,
          credit_source: d.creditSource || null,
          credit_license: d.creditLicense || null,
          description: d.description || null,
        })
        .select("id")
        .single();
      if (insertError || !row) {
        await discard();
        return { ok: false, message: friendlyDbError(insertError, "No pudimos registrar la imagen.") };
      }
      assetId = row.id;
    }
    const items = await listMedia([assetId!]);
    const item = items[0];
    if (!item) return { ok: false, message: "No pudimos mostrar la imagen." };
    return { ok: true, message: existing ? "Ya tenías esta imagen; la reutilizamos." : "Imagen subida.", data: item };
  } catch (error) {
    logServerError("confirm-upload", error);
    await discard();
    return { ok: false, message: "No pudimos procesar la imagen. Inténtalo de nuevo." };
  }
}

async function listMedia(ids?: string[]): Promise<MediaItem[]> {
  const { supabase, profile } = await requireUser();
  let query = supabase
    .from("media_assets")
    .select("id, storage_path, width, height, mime_type, size_bytes, original_filename, credit_author, credit_source, credit_license, description, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  query = ids ? query.in("id", ids) : query.eq("owner_id", profile.id);
  const { data: rows } = await query;
  if (!rows || rows.length === 0) return [];
  const map = await buildAssetMap(supabase, rows.map((r) => r.id));
  return rows
    .filter((r) => map[r.id])
    .map((r) => ({
      id: r.id,
      url: map[r.id]!.url,
      width: r.width ?? 1000,
      height: r.height ?? 750,
      mime: r.mime_type,
      sizeBytes: r.size_bytes,
      originalFilename: r.original_filename,
      creditAuthor: r.credit_author,
      creditSource: r.credit_source,
      creditLicense: r.credit_license,
      description: r.description,
      createdAt: r.created_at,
    }));
}

/** Biblioteca de imágenes del usuario actual. */
export async function listMyMediaAction(): Promise<MediaItem[]> {
  return listMedia();
}

/** URLs firmadas para las imágenes que el usuario puede ver (RLS lo decide). */
export async function getAssetMapAction(ids: string[]): Promise<AssetMap> {
  const { supabase } = await requireUser();
  const valid = z.array(z.uuid()).max(500).safeParse(ids);
  if (!valid.success) return {};
  return buildAssetMap(supabase, valid.data);
}

const creditsSchema = z.object({
  id: z.uuid(),
  creditAuthor: z.string().trim().max(120),
  creditSource: z.string().trim().max(300),
  creditLicense: z.string().trim().max(120),
  description: z.string().trim().max(300),
});

export async function updateMediaCreditsAction(input: z.input<typeof creditsSchema>): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const parsed = creditsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revisa los créditos de la imagen." };
  const d = parsed.data;
  const { data, error } = await supabase
    .from("media_assets")
    .update({ credit_author: d.creditAuthor || null, credit_source: d.creditSource || null, credit_license: d.creditLicense || null, description: d.description || null })
    .eq("id", d.id)
    .select("id");
  if (error || !data?.length) return { ok: false, message: friendlyDbError(error, "No pudimos guardar los créditos.") };
  return { ok: true, message: "Créditos guardados." };
}

/** Borra una imagen solo si ningún trabajo, revista o publicación la usa. */
export async function deleteMediaAction(assetId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  if (!z.uuid().safeParse(assetId).success) return { ok: false, message: "Imagen no válida." };
  const { data: asset } = await supabase.from("media_assets").select("id, storage_path").eq("id", assetId).maybeSingle();
  if (!asset) return { ok: false, message: "No encontramos la imagen." };
  const { data: refs, error: refError } = await supabase.rpc("asset_reference_count", { p_asset_id: assetId });
  if (refError) return { ok: false, message: friendlyDbError(refError, "No pudimos comprobar si la imagen se usa.") };
  if ((refs ?? 0) > 0) {
    return { ok: false, message: `Esta imagen se usa en ${refs} documento(s) (trabajos, versiones o revistas). Quítala de ellos antes de borrarla.` };
  }
  try {
    const admin = createAdminClient();
    await admin.storage.from(MEDIA_BUCKET).remove([asset.storage_path]);
    await admin.from("media_assets").delete().eq("id", assetId);
    revalidatePath("/alumno/imagenes");
    revalidatePath("/profesor/almacenamiento");
    return { ok: true, message: "Imagen eliminada." };
  } catch (error) {
    logServerError("delete-media", error);
    return { ok: false, message: "No pudimos eliminar la imagen." };
  }
}
