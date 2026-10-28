import { Newspaper } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageView } from "@/components/magazine/page-view";
import { NewMagazineButton } from "@/components/teacher/forms";
import { Badge, Card, EmptyState, MagazineStatusBadge, PageHeader } from "@/components/ui/misc";
import { requireTeacher } from "@/lib/auth/session";
import { pageSchema } from "@/lib/document/schema";
import { buildAssetMap } from "@/lib/storage/assets";
import { formatDate, textParam } from "@/lib/utils";

export const metadata: Metadata = { title: "Revistas" };

export default async function MagazinesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireTeacher();
  const group = textParam((await searchParams).grupo);
  let query = supabase.from("magazines").select("id, title, status, visibility, orientation, edition_label, updated_at, published_at, group_id").order("updated_at", { ascending: false }).limit(60);
  if (/^[0-9a-f-]{36}$/.test(group)) query = query.eq("group_id", group);
  const [{ data: magazines }, { data: groups }, { data: templates }] = await Promise.all([
    query,
    supabase.from("groups").select("id, name").eq("is_active", true).order("name"),
    supabase.from("templates").select("id, name, kind, template_schema").eq("is_active", true).in("kind", ["cover", "extra"]).order("sort_order"),
  ]);
  const ids = (magazines ?? []).map((m) => m.id);
  const { data: covers } = ids.length ? await supabase.from("magazine_pages").select("magazine_id, content_json").in("magazine_id", ids).eq("page_order", 0) : { data: [] };
  const coverByMag = new Map((covers ?? []).flatMap((c) => {
    const p = pageSchema.safeParse(c.content_json);
    return p.success ? [[c.magazine_id, p.data] as const] : [];
  }));
  const assets = await buildAssetMap(supabase, [...coverByMag.values()].flatMap((p) => p.elements.flatMap((e) => (e.type === "image" && e.assetId ? [e.assetId] : []))));
  const groupName = new Map((groups ?? []).map((g) => [g.id, g.name]));
  const templateOptions = (templates ?? []).map((t) => ({ id: t.id, name: t.name, kind: t.kind, pageType: pageSchema.safeParse(t.template_schema).data?.pageType }));

  return (
    <>
      <PageHeader
        title="Revistas"
        description="Reúne los trabajos aprobados, compón la revista, revísala completa y publícala."
        actions={<NewMagazineButton groups={(groups ?? []).map((g) => ({ id: g.id, name: g.name }))} templates={templateOptions} />}
      />
      {(magazines ?? []).length === 0 ? (
        <EmptyState icon={Newspaper} title="Todavía no hay revistas">
          Crea la primera revista y empieza a incorporar los trabajos aprobados de tus alumnos.
        </EmptyState>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {(magazines ?? []).map((m) => {
            const cover = coverByMag.get(m.id);
            return (
              <Link key={m.id} href={`/profesor/revistas/${m.id}`} className="group block rounded-2xl">
                <Card className="overflow-hidden transition group-hover:-translate-y-1 group-hover:shadow-flotante">
                  <div className="grid h-56 place-items-center bg-[#ece8e0]">
                    {cover ? (
                      <PageView page={cover} orientation={m.orientation} width={m.orientation === "portrait" ? 140 : 200} assets={assets} className="shadow-md" />
                    ) : (
                      <Newspaper className="size-10 text-tinta-suave" aria-hidden />
                    )}
                  </div>
                  <div className="space-y-1.5 p-4">
                    <h2 className="font-display leading-tight font-bold">{m.title}</h2>
                    <p className="text-xs text-tinta-suave">
                      {m.group_id ? groupName.get(m.group_id) : "Varios grupos"} · {m.edition_label ?? "Sin número"} · actualizada {formatDate(m.updated_at)}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <MagazineStatusBadge status={m.status} />
                      <Badge tone={m.visibility === "public" ? "violet" : "gray"}>{m.visibility === "public" ? "Pública" : "Privada"}</Badge>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
