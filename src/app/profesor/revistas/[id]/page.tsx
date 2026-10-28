import { ArrowLeft, ExternalLink, ImageIcon, LayoutPanelTop, Rocket, Undo2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PagesGallery } from "@/components/magazine/pages-gallery";
import { CopyLinkButton, MagazineSettingsForm } from "@/components/teacher/forms";
import { ActionButton } from "@/components/ui/action-button";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge, Card, MagazineStatusBadge } from "@/components/ui/misc";
import { deleteMagazineAction, publishMagazineAction, unpublishMagazineAction } from "@/lib/actions/magazines";
import { setMediaApprovalAction } from "@/lib/actions/teacher";
import { requireTeacher } from "@/lib/auth/session";
import { collectAssetIds, pageSchema, type Page } from "@/lib/document/schema";
import { buildAssetMap } from "@/lib/storage/assets";
import { formatBytes, formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Revista" };

export default async function MagazineDetail({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireTeacher();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: magazine } = await supabase.from("magazines").select("*").eq("id", id).maybeSingle();
  if (!magazine) notFound();

  const [{ data: rows }, { data: publications }, { data: groups }] = await Promise.all([
    supabase.from("magazine_pages").select("content_json, page_order").eq("magazine_id", id).order("page_order"),
    supabase.from("magazine_publications").select("id, version_number, published_at, unpublished_at, is_current, visibility").eq("magazine_id", id).order("version_number", { ascending: false }),
    supabase.from("groups").select("id, name").eq("is_active", true).order("name"),
  ]);
  const pages: Page[] = (rows ?? []).flatMap((r) => {
    const p = pageSchema.safeParse(r.content_json);
    return p.success ? [p.data] : [];
  });
  const assetIds = collectAssetIds(pages);
  const assets = await buildAssetMap(supabase, assetIds);
  const { data: media } = assetIds.length
    ? await supabase.from("media_assets").select("id, publication_approved, original_filename, size_bytes, credit_author, credit_source, credit_license, owner_id, profiles!media_assets_owner_id_fkey(display_name)").in("id", assetIds)
    : { data: [] };
  const pendingImages = (media ?? []).filter((m) => !m.publication_approved);
  const current = (publications ?? []).find((p) => p.is_current);
  const publicPath = `/revistas/${magazine.public_id}`;

  return (
    <>
      <Link href="/profesor/revistas" className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-tinta-suave hover:text-tinta">
        <ArrowLeft className="size-4" /> Todas las revistas
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{magazine.title}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <MagazineStatusBadge status={magazine.status} />
            <Badge tone={magazine.visibility === "public" ? "violet" : "gray"}>{magazine.visibility === "public" ? "Pública" : "Privada"}</Badge>
            <Badge>{magazine.orientation === "portrait" ? "A4 vertical" : "A4 horizontal"}</Badge>
            <Badge>{pages.length} páginas</Badge>
          </div>
        </div>
        <ButtonLink href={`/editor/revista/${magazine.id}`} icon={<LayoutPanelTop className="size-5" />}>
          Editar composición
        </ButtonLink>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_26rem]">
        <Card className="p-4 sm:p-6">
          <h2 className="mb-4 font-display text-lg font-bold">Vista previa completa</h2>
          {pages.length > 0 ? (
            <PagesGallery pages={pages} orientation={magazine.orientation} assets={assets} />
          ) : (
            <Alert kind="info">La revista aún no tiene páginas. Ábrela en el editor para añadir portada, artículos aprobados y páginas especiales.</Alert>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="space-y-4 p-5">
            <h2 className="font-display text-lg font-bold">Publicación</h2>
            {current ? (
              <>
                <Alert kind="success" title={`Publicada (versión ${current.version_number})`}>
                  Desde el {formatDateTime(current.published_at)}. {current.visibility === "public" ? "Cualquiera con el enlace puede leerla." : "Solo usuarios con sesión pueden leerla."}
                </Alert>
                <div className="flex flex-wrap gap-2">
                  <ButtonLink href={publicPath} size="sm" variant="secondary" target="_blank" icon={<ExternalLink className="size-4" />}>
                    Ver publicada
                  </ButtonLink>
                  <CopyLinkButton path={publicPath} />
                </div>
              </>
            ) : (
              <p className="text-sm text-tinta-suave">Al publicar se crea una copia de solo lectura con un enlace difícil de adivinar. Los comentarios de revisión nunca se publican.</p>
            )}
            {pendingImages.length > 0 && (
              <Alert kind="warning" title={`${pendingImages.length} imagen(es) sin autorizar`}>
                Revisa las imágenes abajo antes de publicar.
              </Alert>
            )}
            <div className="flex flex-wrap gap-2">
              <ActionButton
                action={publishMagazineAction.bind(null, magazine.id)}
                variant="primary"
                size="md"
                icon={<Rocket className="size-4" />}
                confirm={{
                  title: current ? "¿Publicar una nueva versión?" : "¿Publicar la revista?",
                  message: current ? "La versión pública se reemplazará por la composición actual. La anterior queda en el historial." : "La revista quedará disponible para sus lectores según su visibilidad.",
                  confirmLabel: "Publicar",
                }}
              >
                {current ? "Publicar nueva versión" : "Publicar"}
              </ActionButton>
              {current && (
                <ActionButton
                  action={unpublishMagazineAction.bind(null, magazine.id)}
                  size="md"
                  icon={<Undo2 className="size-4" />}
                  confirm={{ title: "¿Retirar la publicación?", message: "El enlace público dejará de funcionar. Podrás volver a publicarla cuando quieras.", confirmLabel: "Retirar", danger: true }}
                >
                  Retirar
                </ActionButton>
              )}
            </div>
            {(publications ?? []).length > 0 && (
              <details className="text-sm">
                <summary className="cursor-pointer font-bold">Historial de versiones ({publications?.length})</summary>
                <ul className="mt-2 space-y-1">
                  {(publications ?? []).map((p) => (
                    <li key={p.id} className="flex justify-between gap-2">
                      <span>Versión {p.version_number}</span>
                      <span className="text-tinta-suave">
                        {formatDateTime(p.published_at)}
                        {p.is_current ? " · vigente" : p.unpublished_at ? ` · retirada ${formatDateTime(p.unpublished_at)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold">
                <ImageIcon className="size-5" /> Imágenes de la revista
              </h2>
              {pendingImages.length > 1 && (
                <ActionButton action={setMediaApprovalAction.bind(null, pendingImages.map((m) => m.id), true)} variant="secondary">
                  Autorizar todas
                </ActionButton>
              )}
            </div>
            <p className="mb-3 text-sm text-tinta-suave">Las fotografías no se publican automáticamente: revisa que no muestren datos personales y que tengan permiso de uso.</p>
            {(media ?? []).length === 0 ? (
              <p className="text-sm text-tinta-suave">La revista no usa imágenes.</p>
            ) : (
              <ul className="space-y-2">
                {(media ?? []).map((m) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-xl border border-linea p-2">
                    {assets[m.id] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal
                      <img src={assets[m.id]!.url} alt="" className="size-14 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="size-14 shrink-0 rounded-lg bg-papel" />
                    )}
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="truncate text-sm font-bold">{m.original_filename}</p>
                      <p className="text-tinta-suave">
                        {m.profiles?.display_name ?? "—"} · {formatBytes(m.size_bytes)}
                      </p>
                      <p className="truncate text-tinta-suave">Créditos: {[m.credit_author, m.credit_source, m.credit_license].filter(Boolean).join(" · ") || "sin registrar"}</p>
                    </div>
                    {m.publication_approved ? (
                      <ActionButton action={setMediaApprovalAction.bind(null, [m.id], false)} variant="ghost">
                        Retirar autorización
                      </ActionButton>
                    ) : (
                      <ActionButton action={setMediaApprovalAction.bind(null, [m.id], true)} variant="primary">
                        Autorizar
                      </ActionButton>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <h2 className="mb-3 font-display text-lg font-bold">Datos de la revista</h2>
            <MagazineSettingsForm magazine={magazine} groups={(groups ?? []).map((g) => ({ id: g.id, name: g.name }))} />
          </Card>

          {(publications ?? []).length === 0 && (
            <ActionButton
              action={deleteMagazineAction.bind(null, magazine.id)}
              variant="danger"
              confirm={{ title: "¿Eliminar esta revista?", message: "Se borrará su composición. Los trabajos originales de los alumnos no se modifican.", confirmLabel: "Eliminar revista", danger: true }}
            >
              Eliminar revista
            </ActionButton>
          )}
        </div>
      </div>
    </>
  );
}
