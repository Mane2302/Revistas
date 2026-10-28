import { HardDrive } from "lucide-react";
import type { Metadata } from "next";
import { ActionButton } from "@/components/ui/action-button";
import { Alert, Badge, Card, PageHeader, Pagination } from "@/components/ui/misc";
import { deleteMediaAction } from "@/lib/actions/media";
import { setMediaApprovalAction } from "@/lib/actions/teacher";
import { requireTeacher } from "@/lib/auth/session";
import { buildAssetMap, getSettings } from "@/lib/storage/assets";
import { cn, formatBytes, formatDate, pageParam, textParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Imágenes y espacio" };

const PAGE_SIZE = 24;
const MB = 1024 * 1024;

export default async function StoragePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireTeacher();
  const params = await searchParams;
  const filter = textParam(params.filtro) || "pendientes";
  const page = pageParam(params.pagina);

  let query = supabase
    .from("media_assets")
    .select("id, original_filename, size_bytes, width, height, publication_approved, created_at, credit_author, credit_source, credit_license, profiles!media_assets_owner_id_fkey(display_name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  if (filter === "pendientes") query = query.eq("publication_approved", false);
  if (filter === "autorizadas") query = query.eq("publication_approved", true);

  const [settings, { data: usage }, { data: byUser }, { data: images, count }, { data: people }] = await Promise.all([
    getSettings(supabase),
    supabase.rpc("storage_usage"),
    supabase.rpc("storage_usage_by_user"),
    query,
    supabase.from("profiles").select("id, display_name, username"),
  ]);
  const assets = await buildAssetMap(supabase, (images ?? []).map((i) => i.id));
  const total = Number(usage?.[0]?.total_bytes ?? 0);
  const quota = settings.total_quota_mb * MB;
  const pct = Math.min(100, (total / quota) * 100);
  const names = new Map((people ?? []).map((p) => [p.id, `${p.display_name} (${p.username})`]));

  return (
    <>
      <PageHeader title="Imágenes y espacio" description="Controla el almacenamiento, autoriza qué fotografías pueden publicarse y elimina las que no se usen." />

      <div className="mb-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Card className="p-5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <HardDrive className="size-5" /> Espacio usado
          </h2>
          <p className="text-3xl font-bold tabular-nums">
            {formatBytes(total)} <span className="text-base font-semibold text-tinta-suave">de {formatBytes(quota)}</span>
          </p>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-papel" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Espacio usado">
            <div className={cn("h-full rounded-full", pct > 90 ? "bg-red-500" : pct > 75 ? "bg-sol" : "bg-menta")} style={{ width: `${pct}%` }} />
          </div>
          {pct > 75 && (
            <Alert kind={pct > 90 ? "error" : "warning"} className="mt-3">
              Te acercas a la cuota configurada. Elimina imágenes que no se usen o revisa el plan de Supabase antes de ampliar la cuota.
            </Alert>
          )}
          <p className="mt-3 text-xs text-tinta-suave">
            Límite por imagen: {settings.max_image_mb} MB · por usuario: {settings.user_quota_mb} MB. Puedes cambiarlos en Ajustes.
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-bold">Quién usa más espacio</h2>
          <ul className="max-h-56 space-y-1.5 overflow-y-auto text-sm">
            {(byUser ?? []).slice(0, 20).map((u) => (
              <li key={u.owner_id} className="flex justify-between gap-3">
                <span className="truncate">{names.get(u.owner_id) ?? "Cuenta eliminada"}</span>
                <span className="shrink-0 font-bold tabular-nums">
                  {formatBytes(Number(u.bytes))} · {u.files} img.
                </span>
              </li>
            ))}
            {(byUser ?? []).length === 0 && <li className="text-tinta-suave">Todavía no se han subido imágenes.</li>}
          </ul>
        </Card>
      </div>

      <nav className="mb-4 flex flex-wrap gap-1.5" aria-label="Filtrar imágenes">
        {[
          ["pendientes", "Sin autorizar"],
          ["autorizadas", "Autorizadas para publicar"],
          ["todas", "Todas"],
        ].map(([id, label]) => (
          <a key={id} href={`/profesor/almacenamiento?filtro=${id}`} aria-current={filter === id ? "page" : undefined} className={cn("rounded-full px-3.5 py-1.5 text-sm font-bold", filter === id ? "bg-tinta text-white" : "bg-white text-tinta-suave ring-1 ring-linea")}>
            {label}
          </a>
        ))}
      </nav>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {(images ?? []).map((img) => (
          <Card key={img.id} className="overflow-hidden">
            {assets[img.id] ? (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal
              <img src={assets[img.id]!.url} alt={img.original_filename} className="aspect-[4/3] w-full bg-papel object-cover" loading="lazy" />
            ) : (
              <div className="aspect-[4/3] bg-papel" />
            )}
            <div className="space-y-1.5 p-3 text-xs">
              <p className="truncate text-sm font-bold">{img.original_filename}</p>
              <p className="text-tinta-suave">
                {img.profiles?.display_name ?? "—"} · {formatBytes(img.size_bytes)} · {img.width}×{img.height} · {formatDate(img.created_at)}
              </p>
              <p className="truncate text-tinta-suave">Créditos: {[img.credit_author, img.credit_source, img.credit_license].filter(Boolean).join(" · ") || "sin registrar"}</p>
              <Badge tone={img.publication_approved ? "green" : "amber"}>{img.publication_approved ? "Autorizada" : "Sin autorizar"}</Badge>
              <div className="flex flex-wrap gap-1.5 pt-1">
                <ActionButton action={setMediaApprovalAction.bind(null, [img.id], !img.publication_approved)} variant={img.publication_approved ? "ghost" : "primary"}>
                  {img.publication_approved ? "Retirar autorización" : "Autorizar"}
                </ActionButton>
                <ActionButton
                  action={deleteMediaAction.bind(null, img.id)}
                  variant="ghost"
                  confirm={{ title: "¿Eliminar la imagen?", message: "Solo se eliminará si ningún trabajo, versión o revista la usa.", confirmLabel: "Eliminar", danger: true }}
                >
                  Eliminar
                </ActionButton>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {(images ?? []).length === 0 && <p className="text-tinta-suave">No hay imágenes en esta vista.</p>}
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={(p) => `/profesor/almacenamiento?filtro=${filter}&pagina=${p}`} />
    </>
  );
}
