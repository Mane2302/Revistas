import { ExternalLink, FileClock } from "lucide-react";
import type { Metadata } from "next";
import { CopyLinkButton } from "@/components/teacher/forms";
import { ActionButton } from "@/components/ui/action-button";
import { ButtonLink } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/misc";
import { publishMagazineAction, unpublishMagazineAction } from "@/lib/actions/magazines";
import { requireTeacher } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Publicaciones" };

export default async function PublicationsPage() {
  const { supabase } = await requireTeacher();
  const { data: magazines } = await supabase
    .from("magazines")
    .select("id, title, public_id, status, magazine_publications(version_number, published_at, unpublished_at, is_current, visibility, allow_pdf_download)")
    .in("status", ["published", "unpublished"])
    .order("published_at", { ascending: false });

  return (
    <>
      <PageHeader title="Publicaciones" description="Revistas publicadas y retiradas. Cada publicación conserva su historial de versiones." />
      {(magazines ?? []).length === 0 ? (
        <EmptyState icon={FileClock} title="Aún no has publicado revistas">
          Cuando publiques una revista aparecerá aquí con su enlace para compartir.
        </EmptyState>
      ) : (
        <Card className="divide-y divide-linea">
          {(magazines ?? []).map((m) => {
            const pubs = [...(m.magazine_publications ?? [])].sort((a, b) => b.version_number - a.version_number);
            const current = pubs.find((p) => p.is_current);
            const path = `/revistas/${m.public_id}`;
            return (
              <div key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{m.title}</p>
                  <p className="text-sm text-tinta-suave">
                    {current
                      ? `Versión ${current.version_number} publicada el ${formatDateTime(current.published_at)}`
                      : `Retirada${pubs[0]?.unpublished_at ? ` el ${formatDateTime(pubs[0].unpublished_at)}` : ""} · ${pubs.length} versión(es) en el historial`}
                  </p>
                  <div className="mt-1 flex gap-1.5">
                    {current ? <Badge tone="green">Publicada</Badge> : <Badge tone="amber">Retirada</Badge>}
                    {current && <Badge tone={current.visibility === "public" ? "violet" : "gray"}>{current.visibility === "public" ? "Pública" : "Privada"}</Badge>}
                    {current?.allow_pdf_download && <Badge>PDF descargable</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {current && (
                    <>
                      <ButtonLink href={path} target="_blank" size="sm" variant="secondary" icon={<ExternalLink className="size-4" />}>
                        Consultar
                      </ButtonLink>
                      <ButtonLink href={`${path}?pdf=1`} target="_blank" size="sm" variant="secondary">
                        Descargar PDF
                      </ButtonLink>
                      <CopyLinkButton path={path} />
                      <ActionButton
                        action={unpublishMagazineAction.bind(null, m.id)}
                        confirm={{ title: "¿Retirar la publicación?", message: "El enlace dejará de funcionar hasta que vuelvas a publicarla.", confirmLabel: "Retirar", danger: true }}
                      >
                        Retirar
                      </ActionButton>
                    </>
                  )}
                  {!current && (
                    <ActionButton action={publishMagazineAction.bind(null, m.id)} variant="primary" confirm={{ title: "¿Volver a publicar?", message: "Se publicará la composición actual como una versión nueva.", confirmLabel: "Publicar" }}>
                      Volver a publicar
                    </ActionButton>
                  )}
                  <ButtonLink href={`/profesor/revistas/${m.id}`} size="sm" variant="ghost">
                    Gestionar
                  </ButtonLink>
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </>
  );
}
