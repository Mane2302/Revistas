import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Editor } from "@/components/editor/editor";
import { Alert } from "@/components/ui/misc";
import { requireUser } from "@/lib/auth/session";
import { loadTemplates } from "@/lib/data/templates";
import { collectAssetIds, workContentSchema } from "@/lib/document/schema";
import { EDITABLE_STATUSES } from "@/lib/status";
import { buildAssetMap, getSettings } from "@/lib/storage/assets";

export const metadata: Metadata = { title: "Editor" };

const LOCK_REASON = {
  submitted: "Tu trabajo está en revisión. Podrás editarlo de nuevo si el profesor solicita correcciones.",
  approved: "Este trabajo ya fue aprobado y no se puede modificar.",
  published: "Este trabajo forma parte de una revista publicada y no se puede modificar.",
  rejected: "Este trabajo fue rechazado. Lee los comentarios del profesor.",
} as const;

export default async function WorkEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase, profile } = await requireUser();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  // RLS: el alumno solo obtiene sus propios trabajos; el profesor, todos.
  const { data: work } = await supabase.from("articles").select("id, title, kind, status, version, author_id, content_json, assignments(allowed_template_ids)").eq("id", id).maybeSingle();
  if (!work) notFound();

  const content = workContentSchema.safeParse(work.content_json);
  if (!content.success) {
    return (
      <main className="mx-auto max-w-xl p-8">
        <Alert kind="error" title="No pudimos abrir este trabajo">
          Su contenido no tiene el formato esperado. Avisa a tu profesor.
        </Alert>
      </main>
    );
  }

  const isOwner = work.author_id === profile.id;
  const editable = isOwner && EDITABLE_STATUSES.includes(work.status);
  const reason = !isOwner ? "Vista del profesor: los trabajos de los alumnos no se modifican desde aquí. Usa «Revisión» para comentar o aprobar." : work.status in LOCK_REASON ? LOCK_REASON[work.status as keyof typeof LOCK_REASON] : undefined;

  const allowed = work.assignments?.allowed_template_ids ?? [];
  let templates = editable ? await loadTemplates(supabase, work.kind === "cover" ? ["cover"] : ["article", "extra"]) : [];
  if (allowed.length > 0) templates = templates.filter((t) => allowed.includes(t.id));
  const [assets, settings] = await Promise.all([buildAssetMap(supabase, collectAssetIds(content.data.pages)), getSettings(supabase)]);

  return (
    <Editor
      mode="work"
      id={work.id}
      workKind={work.kind}
      status={work.status}
      initialTitle={work.title}
      initialDoc={{ orientation: content.data.orientation, pages: content.data.pages }}
      initialVersion={work.version}
      initialAssets={assets}
      templates={templates}
      readOnly={!editable}
      readOnlyReason={reason}
      backHref={profile.role === "teacher" ? `/profesor/revision/${work.id}` : "/alumno"}
      imageNotice={settings.image_notice}
      maxImageMb={Number(settings.max_image_mb)}
      canSubmit={editable}
    />
  );
}
