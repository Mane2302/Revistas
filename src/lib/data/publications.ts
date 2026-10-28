import "server-only";
import { z } from "zod";
import type { AssetMap } from "@/lib/document/assets";
import { collectAssetIds, magazinePagesSchema, ORIENTATIONS, type Page } from "@/lib/document/schema";
import { logServerError } from "@/lib/errors";
import { buildAssetMap } from "@/lib/storage/assets";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServerSupabase } from "@/lib/supabase/server";

const snapshotSchema = z.object({
  title: z.string(),
  description: z.string().nullable().optional(),
  editionLabel: z.string().nullable().optional(),
  schoolCycle: z.string().nullable().optional(),
  orientation: z.enum(ORIENTATIONS),
  pages: magazinePagesSchema,
});

export interface PublicMagazine {
  publicId: string;
  title: string;
  description: string | null;
  editionLabel: string | null;
  schoolCycle: string | null;
  orientation: "portrait" | "landscape";
  allowPdf: boolean;
  visibility: "public" | "private";
  publishedAt: string;
  version: number;
  pages: Page[];
}

/**
 * Publicación vigente por su identificador público. La consulta usa la sesión del
 * visitante: RLS solo devuelve publicaciones vigentes (públicas, o privadas si hay sesión).
 * Nunca se leen borradores ni la composición en edición.
 */
export async function getPublication(supabase: ServerSupabase, publicId: string): Promise<PublicMagazine | null> {
  if (!/^[0-9a-f]{20}$/.test(publicId)) return null;
  const { data } = await supabase
    .from("magazine_publications")
    .select("public_id, title, visibility, allow_pdf_download, orientation, snapshot, published_at, version_number, is_current")
    .eq("public_id", publicId)
    .eq("is_current", true)
    .maybeSingle();
  if (!data || !data.is_current) return null;
  const snapshot = snapshotSchema.safeParse(data.snapshot);
  if (!snapshot.success) return null;
  return {
    publicId: data.public_id,
    title: data.title,
    description: snapshot.data.description ?? null,
    editionLabel: snapshot.data.editionLabel ?? null,
    schoolCycle: snapshot.data.schoolCycle ?? null,
    orientation: data.orientation,
    allowPdf: data.allow_pdf_download,
    visibility: data.visibility,
    publishedAt: data.published_at,
    version: data.version_number,
    pages: snapshot.data.pages,
  };
}

/**
 * URLs firmadas (1 h) solo para imágenes de una publicación ya verificada y
 * autorizadas por el profesor. Las imágenes no autorizadas simplemente no se muestran.
 */
export async function publicationAssets(pages: Page[]): Promise<AssetMap> {
  const ids = collectAssetIds(pages);
  if (ids.length === 0) return {};
  try {
    return await buildAssetMap(createAdminClient(), ids, { onlyApproved: true });
  } catch (error) {
    logServerError("publication-assets", error);
    return {};
  }
}
