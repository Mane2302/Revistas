"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStudent, requireUser } from "@/lib/auth/session";
import { clonePage } from "@/lib/document/factory";
import type { SavePayload, SaveResult } from "@/lib/document/save";
import { collectAssetIds, pageSchema, workContentSchema, type WorkContent } from "@/lib/document/schema";
import { friendlyDbError, logServerError, type ActionResult } from "@/lib/errors";
import { EDITABLE_STATUSES } from "@/lib/status";
import type { Json, WorkKind } from "@/types/database";

const createSchema = z.object({
  kind: z.enum(["article", "cover"]),
  templateId: z.string().regex(/^[a-z0-9-]{3,60}$/),
  assignmentId: z.uuid().nullable(),
});

/** Crea un trabajo a partir de una COPIA de la plantilla (la original no se modifica). */
export async function createWorkAction(input: { kind: WorkKind; templateId: string; assignmentId: string | null }): Promise<ActionResult> {
  const { supabase, profile } = await requireStudent();
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Elige una plantilla válida." };
  const { kind, templateId, assignmentId } = parsed.data;

  const { data: template } = await supabase.from("templates").select("id, name, kind, template_schema").eq("id", templateId).eq("is_active", true).maybeSingle();
  if (!template) return { ok: false, message: "Esta plantilla ya no está disponible." };
  if ((kind === "cover") !== (template.kind === "cover")) return { ok: false, message: "Esta plantilla no corresponde al tipo de trabajo." };

  if (assignmentId) {
    const { data: assignment } = await supabase.from("assignments").select("id, work_kind, allowed_template_ids").eq("id", assignmentId).maybeSingle();
    if (!assignment) return { ok: false, message: "No encontramos el proyecto asignado." };
    if (assignment.work_kind && assignment.work_kind !== kind) return { ok: false, message: "Este proyecto pide otro tipo de trabajo." };
    if (assignment.allowed_template_ids.length > 0 && !assignment.allowed_template_ids.includes(templateId)) {
      return { ok: false, message: "Tu profesor no habilitó esta plantilla para el proyecto." };
    }
  }

  const page = pageSchema.safeParse(template.template_schema);
  if (!page.success) return { ok: false, message: "La plantilla está dañada. Avisa a tu profesor." };
  const content: WorkContent = { schemaVersion: 1, orientation: "portrait", pages: [{ ...clonePage(page.data), templateId }] };

  const { data, error } = await supabase
    .from("articles")
    .insert({
      kind,
      title: kind === "cover" ? "Mi portada" : `Mi ${template.name.toLowerCase()}`.slice(0, 150),
      author_id: profile.id,
      assignment_id: assignmentId,
      template_id: templateId,
      content_json: content as unknown as Json,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, message: friendlyDbError(error, "No pudimos crear tu trabajo.") };
  revalidatePath("/alumno");
  redirect(`/editor/trabajo/${data.id}`);
}

const saveSchema = z.object({
  id: z.uuid(),
  title: z.string().trim().min(1, "El título no puede quedar vacío").max(150, "El título es demasiado largo"),
  expectedVersion: z.number().int().min(1),
});

/** Guarda con control de versión: nunca sobrescribe cambios más recientes de otra pestaña. */
export async function saveWorkAction(payload: SavePayload): Promise<SaveResult> {
  const { supabase } = await requireUser();
  const meta = saveSchema.safeParse(payload);
  if (!meta.success) return { ok: false, conflict: false, message: meta.error.issues[0]?.message ?? "Datos no válidos." };
  const content = workContentSchema.safeParse({ schemaVersion: 1, orientation: payload.doc?.orientation, pages: payload.doc?.pages });
  if (!content.success) {
    return { ok: false, conflict: false, message: `El trabajo tiene datos no válidos: ${content.error.issues[0]?.message ?? "revisa los elementos"}.` };
  }

  // Solo se pueden usar imágenes propias (RLS devuelve únicamente las visibles para el usuario).
  const assetIds = collectAssetIds(content.data.pages);
  if (assetIds.length > 0) {
    const { data: visible } = await supabase.from("media_assets").select("id").in("id", assetIds);
    if ((visible ?? []).length !== assetIds.length) return { ok: false, conflict: false, message: "Una de las imágenes ya no está disponible. Quítala y vuelve a guardar." };
  }

  const { id, title, expectedVersion } = meta.data;
  try {
    const { data, error } = await supabase
      .from("articles")
      .update({ title, content_json: content.data as unknown as Json })
      .eq("id", id)
      .eq("version", expectedVersion)
      .select("version")
      .maybeSingle();
    if (error) return { ok: false, conflict: false, message: friendlyDbError(error, "No pudimos guardar el trabajo.") };
    if (data) return { ok: true, version: data.version };

    const { data: current } = await supabase.from("articles").select("status, version").eq("id", id).maybeSingle();
    if (!current) return { ok: false, conflict: false, message: "No encontramos este trabajo." };
    if (!EDITABLE_STATUSES.includes(current.status)) {
      return { ok: false, conflict: false, locked: true, message: "Este trabajo está en revisión o ya fue aprobado, por eso no se puede editar." };
    }
    return { ok: false, conflict: true, currentVersion: current.version, message: "Este trabajo se guardó desde otra pestaña o dispositivo." };
  } catch (error) {
    logServerError("save-work", error);
    return { ok: false, conflict: false, message: "No pudimos guardar el trabajo. Tus cambios locales se conservarán mientras sea posible." };
  }
}

export async function submitWorkAction(workId: string): Promise<ActionResult> {
  const { supabase } = await requireStudent();
  if (!z.uuid().safeParse(workId).success) return { ok: false, message: "Trabajo no válido." };
  const { error } = await supabase.rpc("submit_work", { p_work_id: workId });
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos enviar tu trabajo.") };
  revalidatePath("/alumno");
  revalidatePath(`/alumno/trabajos/${workId}`);
  return { ok: true, message: "Tu artículo fue enviado al profesor." };
}

export async function deleteWorkAction(workId: string): Promise<ActionResult> {
  const { supabase } = await requireStudent();
  if (!z.uuid().safeParse(workId).success) return { ok: false, message: "Trabajo no válido." };
  const { data, error } = await supabase.from("articles").delete().eq("id", workId).select("id");
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos borrar el trabajo.") };
  if (!data || data.length === 0) return { ok: false, message: "Solo puedes borrar borradores propios." };
  revalidatePath("/alumno");
  return { ok: true, message: "Borrador eliminado." };
}
