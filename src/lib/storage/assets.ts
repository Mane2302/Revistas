import "server-only";
import type { AssetMap } from "@/lib/document/assets";
import type { AdminSupabase } from "@/lib/supabase/admin";
import type { ServerSupabase } from "@/lib/supabase/server";

export const MEDIA_BUCKET = "media";
/** Vigencia de las URLs firmadas (segundos). */
export const SIGNED_URL_TTL = 60 * 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Genera URLs firmadas temporales para las imágenes indicadas.
 * Con el cliente del usuario, RLS decide qué imágenes puede ver; con el cliente admin
 * (lector público) se exige `onlyApproved` para no exponer fotos no autorizadas.
 */
export async function buildAssetMap(
  client: ServerSupabase | AdminSupabase,
  ids: string[],
  opts: { onlyApproved?: boolean } = {},
): Promise<AssetMap> {
  const valid = [...new Set(ids)].filter((id) => UUID.test(id)).slice(0, 500);
  if (valid.length === 0) return {};
  let query = client.from("media_assets").select("id, storage_path, width, height, mime_type, publication_approved").in("id", valid);
  if (opts.onlyApproved) query = query.eq("publication_approved", true);
  const { data: rows, error } = await query;
  if (error || !rows || rows.length === 0) return {};
  const { data: signed } = await client.storage.from(MEDIA_BUCKET).createSignedUrls(
    rows.map((r) => r.storage_path),
    SIGNED_URL_TTL,
  );
  const byPath = new Map((signed ?? []).filter((s) => s.signedUrl && !s.error).map((s) => [s.path, s.signedUrl]));
  const map: AssetMap = {};
  for (const r of rows) {
    const url = byPath.get(r.storage_path);
    if (url) map[r.id] = { url, width: r.width ?? 1000, height: r.height ?? 750, mime: r.mime_type };
  }
  return map;
}

export async function getSettings(client: ServerSupabase | AdminSupabase) {
  const { data } = await client.from("app_settings").select("*").eq("id", 1).maybeSingle();
  return (
    data ?? {
      id: 1,
      school_name: "Mi escuela",
      max_image_mb: 5,
      user_quota_mb: 100,
      total_quota_mb: 900,
      privacy_policy: "",
      image_notice: "",
      updated_by: null,
      updated_at: new Date().toISOString(),
    }
  );
}
