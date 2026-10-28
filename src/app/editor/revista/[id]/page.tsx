import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Editor } from "@/components/editor/editor";
import { requireTeacher } from "@/lib/auth/session";
import { loadTemplates } from "@/lib/data/templates";
import { createBlankPage } from "@/lib/document/factory";
import { collectAssetIds, pageSchema, type Page } from "@/lib/document/schema";
import { buildAssetMap, getSettings } from "@/lib/storage/assets";

export const metadata: Metadata = { title: "Composición de la revista" };

export default async function MagazineEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await requireTeacher();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: magazine } = await supabase.from("magazines").select("id, title, orientation, content_version").eq("id", id).maybeSingle();
  if (!magazine) notFound();
  const { data: rows } = await supabase.from("magazine_pages").select("content_json, page_type, source_article_id, template_id").eq("magazine_id", id).order("page_order");

  // Los metadatos de cada página viven en columnas; se combinan con su contenido JSON.
  const pages: Page[] = (rows ?? []).flatMap((r) => {
    const p = pageSchema.safeParse(r.content_json);
    return p.success ? [{ ...p.data, pageType: r.page_type, sourceArticleId: r.source_article_id, templateId: r.template_id }] : [];
  });
  const initialPages = pages.length > 0 ? pages : [{ ...createBlankPage(), pageType: "cover" as const }];
  const [templates, assets, settings] = await Promise.all([loadTemplates(supabase), buildAssetMap(supabase, collectAssetIds(initialPages)), getSettings(supabase)]);

  return (
    <Editor
      mode="magazine"
      id={magazine.id}
      workKind={null}
      initialTitle={magazine.title}
      initialDoc={{ orientation: magazine.orientation, pages: initialPages }}
      initialVersion={magazine.content_version}
      initialAssets={assets}
      templates={templates}
      readOnly={false}
      backHref={`/profesor/revistas/${magazine.id}`}
      imageNotice={settings.image_notice}
      maxImageMb={Number(settings.max_image_mb)}
      canSubmit={false}
    />
  );
}
