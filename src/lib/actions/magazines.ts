"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth/session";
import { clonePage } from "@/lib/document/factory";
import type { SavePayload, SaveResult } from "@/lib/document/save";
import { magazinePagesSchema, pageSchema, workContentSchema, type Page } from "@/lib/document/schema";
import { adaptPageOrientation } from "@/lib/document/template-switch";
import { firstZodMessage, friendlyDbError, zodFieldErrors, type ActionResult } from "@/lib/errors";
import type { Json } from "@/types/database";

const optional = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v));

const magazineSchema = z.object({
  title: z.string().trim().min(1, "Escribe el título de la revista").max(120, "Máximo 120 caracteres"),
  description: optional(1000),
  groupId: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid().nullable()),
  visibility: z.enum(["private", "public"]),
  allowPdf: z.boolean(),
  editionLabel: optional(60),
  schoolCycle: optional(60),
});

function readMagazineForm(formData: FormData) {
  return magazineSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    groupId: formData.get("groupId") ?? "",
    visibility: formData.get("visibility") === "public" ? "public" : "private",
    allowPdf: formData.get("allowPdf") === "on",
    editionLabel: formData.get("editionLabel") ?? "",
    schoolCycle: formData.get("schoolCycle") ?? "",
  });
}

export async function createMagazineAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, profile } = await requireTeacher();
  const parsed = readMagazineForm(formData);
  if (!parsed.success) return { ok: false, message: firstZodMessage(parsed.error), fieldErrors: zodFieldErrors(parsed.error) };
  const orientation = formData.get("orientation") === "landscape" ? "landscape" : "portrait";
  const d = parsed.data;
  const { data: magazine, error } = await supabase
    .from("magazines")
    .insert({
      title: d.title,
      description: d.description,
      group_id: d.groupId,
      owner_id: profile.id,
      visibility: d.visibility,
      allow_pdf_download: d.allowPdf,
      edition_label: d.editionLabel,
      school_cycle: d.schoolCycle,
      orientation,
    })
    .select("id")
    .single();
  if (error || !magazine) return { ok: false, message: friendlyDbError(error, "No pudimos crear la revista.") };

  // Composición inicial con las plantillas elegidas (portada, índice, editorial, créditos, contraportada).
  const chosen = ["coverTemplate", "indexTemplate", "editorialTemplate", "creditsTemplate", "backTemplate"]
    .map((k) => formData.get(k))
    .filter((v): v is string => typeof v === "string" && /^[a-z0-9-]{3,60}$/.test(v));
  if (chosen.length > 0) {
    const { data: templates } = await supabase.from("templates").select("id, template_schema").in("id", chosen);
    const pages: Page[] = [];
    for (const id of chosen) {
      const parsedPage = pageSchema.safeParse(templates?.find((t) => t.id === id)?.template_schema);
      if (parsedPage.success) pages.push(adaptPageOrientation({ ...clonePage(parsedPage.data), templateId: id }, "portrait", orientation));
    }
    if (pages.length > 0) {
      // Las páginas finales (créditos, contraportada) se añaden después de los artículos desde el editor.
      await supabase.rpc("save_magazine_pages", { p_magazine_id: magazine.id, p_expected_version: 1, p_pages: pages as unknown as Json });
    }
  }
  revalidatePath("/profesor/revistas");
  redirect(`/profesor/revistas/${magazine.id}`);
}

export async function updateMagazineAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  const magazineId = z.uuid().safeParse(formData.get("id"));
  const parsed = readMagazineForm(formData);
  if (!magazineId.success) return { ok: false, message: "Revista no válida." };
  if (!parsed.success) return { ok: false, message: firstZodMessage(parsed.error), fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  const { error } = await supabase
    .from("magazines")
    .update({
      title: d.title,
      description: d.description,
      group_id: d.groupId,
      visibility: d.visibility,
      allow_pdf_download: d.allowPdf,
      edition_label: d.editionLabel,
      school_cycle: d.schoolCycle,
    })
    .eq("id", magazineId.data);
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos guardar la revista.") };
  revalidatePath(`/profesor/revistas/${magazineId.data}`);
  return { ok: true, message: "Datos de la revista guardados. Vuelve a publicarla para que los cambios lleguen a la versión pública." };
}

export async function saveMagazineAction(payload: SavePayload): Promise<SaveResult> {
  const { supabase } = await requireTeacher();
  const idOk = z.uuid().safeParse(payload.id);
  const pages = magazinePagesSchema.safeParse(payload.doc?.pages);
  if (!idOk.success) return { ok: false, conflict: false, message: "Revista no válida." };
  if (!pages.success) return { ok: false, conflict: false, message: `La revista tiene datos no válidos: ${pages.error.issues[0]?.message ?? ""}` };
  const title = z.string().trim().min(1).max(120).safeParse(payload.title);
  const { data, error } = await supabase.rpc("save_magazine_pages", {
    p_magazine_id: payload.id,
    p_expected_version: payload.expectedVersion,
    p_pages: pages.data as unknown as Json,
  });
  if (error) {
    if (error.code === "PT409") {
      const { data: m } = await supabase.from("magazines").select("content_version").eq("id", payload.id).maybeSingle();
      return { ok: false, conflict: true, currentVersion: m?.content_version ?? payload.expectedVersion, message: "La revista se modificó en otra pestaña." };
    }
    return { ok: false, conflict: false, message: friendlyDbError(error, "No pudimos guardar la revista.") };
  }
  if (title.success) await supabase.from("magazines").update({ title: title.data }).eq("id", payload.id);
  return { ok: true, version: data ?? payload.expectedVersion + 1 };
}

export interface ApprovedWork {
  id: string;
  title: string;
  kind: "article" | "cover";
  status: string;
  author: string;
  pages: Page[];
}

/** Trabajos aprobados que pueden incorporarse a la revista (se copian, no se mueven). */
export async function listApprovedWorksAction(): Promise<ApprovedWork[]> {
  const { supabase } = await requireTeacher();
  const { data } = await supabase
    .from("articles")
    .select("id, title, kind, status, content_json, profiles!articles_author_id_fkey(display_name, editorial_name)")
    .in("status", ["approved", "published"])
    .order("approved_at", { ascending: false })
    .limit(100);
  return (data ?? []).flatMap((w) => {
    const content = workContentSchema.safeParse(w.content_json);
    if (!content.success) return [];
    const author = w.profiles?.editorial_name ?? w.profiles?.display_name ?? "";
    return [{ id: w.id, title: w.title, kind: w.kind, status: w.status, author, pages: content.data.pages }];
  });
}

export async function publishMagazineAction(magazineId: string): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  if (!z.uuid().safeParse(magazineId).success) return { ok: false, message: "Revista no válida." };
  const { error } = await supabase.rpc("publish_magazine", { p_magazine_id: magazineId });
  if (error) {
    const unapproved = /UNAPPROVED_IMAGES:(\d+)/.exec(error.message ?? "");
    if (unapproved) return { ok: false, message: `Hay ${unapproved[1]} imagen(es) sin autorizar. Revísalas en la sección «Imágenes de la revista» antes de publicar.` };
    return { ok: false, message: friendlyDbError(error, "No pudimos publicar la revista.") };
  }
  revalidatePath(`/profesor/revistas/${magazineId}`);
  revalidatePath("/profesor/publicaciones");
  revalidatePath("/revistas");
  return { ok: true, message: "La revista se publicó correctamente." };
}

export async function unpublishMagazineAction(magazineId: string): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  if (!z.uuid().safeParse(magazineId).success) return { ok: false, message: "Revista no válida." };
  const { error } = await supabase.rpc("unpublish_magazine", { p_magazine_id: magazineId });
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos retirar la publicación.") };
  revalidatePath(`/profesor/revistas/${magazineId}`);
  revalidatePath("/profesor/publicaciones");
  revalidatePath("/revistas");
  return { ok: true, message: "Publicación retirada. El historial de versiones se conserva." };
}

export async function deleteMagazineAction(magazineId: string): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  if (!z.uuid().safeParse(magazineId).success) return { ok: false, message: "Revista no válida." };
  const { count } = await supabase.from("magazine_publications").select("id", { count: "exact", head: true }).eq("magazine_id", magazineId);
  if ((count ?? 0) > 0) return { ok: false, message: "Esta revista ya se publicó alguna vez; para conservar el historial no se puede eliminar. Puedes retirarla." };
  const { error } = await supabase.from("magazines").delete().eq("id", magazineId);
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos eliminar la revista.") };
  revalidatePath("/profesor/revistas");
  redirect("/profesor/revistas");
}
