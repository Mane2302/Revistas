"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireTeacher } from "@/lib/auth/session";
import { firstZodMessage, friendlyDbError, zodFieldErrors, type ActionResult } from "@/lib/errors";
import type { ReviewDecision } from "@/types/database";

const id = z.uuid();
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres`)
    .transform((v) => (v === "" ? null : v));
const required = (label: string, max: number) => z.string().trim().min(1, `Escribe ${label}`).max(max, `Máximo ${max} caracteres`);

// ---------------- Grupos ----------------

const groupSchema = z.object({ name: required("el nombre del grupo", 80), description: text(500) });

export async function saveGroupAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  const parsed = groupSchema.safeParse({ name: formData.get("name") ?? "", description: formData.get("description") ?? "" });
  if (!parsed.success) return { ok: false, message: firstZodMessage(parsed.error), fieldErrors: zodFieldErrors(parsed.error) };
  const groupId = formData.get("id");
  const { error } =
    typeof groupId === "string" && groupId
      ? await supabase.from("groups").update(parsed.data).eq("id", groupId)
      : await supabase.from("groups").insert(parsed.data);
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos guardar el grupo.") };
  revalidatePath("/profesor/grupos");
  return { ok: true, message: groupId ? "Grupo actualizado." : "Grupo creado." };
}

export async function setGroupActiveAction(groupId: string, active: boolean): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  if (!id.safeParse(groupId).success) return { ok: false, message: "Grupo no válido." };
  const { error } = await supabase.from("groups").update({ is_active: active }).eq("id", groupId);
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos cambiar el grupo.") };
  revalidatePath("/profesor/grupos");
  return { ok: true, message: active ? "Grupo activado." : "Grupo desactivado." };
}

// ---------------- Proyectos (asignaciones) ----------------

const assignmentSchema = z.object({
  title: required("el título del proyecto", 120),
  description: text(2000),
  groupId: z.uuid("Elige un grupo"),
  magazineId: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.uuid().nullable()),
  workKind: z.enum(["", "article", "cover"]).transform((v) => (v === "" ? null : v)),
  dueDate: z
    .string()
    .transform((v) => (v === "" ? null : v))
    .pipe(z.iso.date("Fecha no válida").nullable()),
  templates: z.array(z.string().regex(/^[a-z0-9-]{3,60}$/)).max(50),
});

export async function saveAssignmentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, profile } = await requireTeacher();
  const parsed = assignmentSchema.safeParse({
    title: formData.get("title") ?? "",
    description: formData.get("description") ?? "",
    groupId: formData.get("groupId") ?? "",
    magazineId: formData.get("magazineId") ?? "",
    workKind: formData.get("workKind") ?? "",
    dueDate: formData.get("dueDate") ?? "",
    templates: formData.getAll("templates").map(String),
  });
  if (!parsed.success) return { ok: false, message: firstZodMessage(parsed.error), fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  const row = {
    title: d.title,
    description: d.description,
    group_id: d.groupId,
    magazine_id: d.magazineId,
    work_kind: d.workKind,
    due_date: d.dueDate,
    allowed_template_ids: d.templates,
  };
  const assignmentId = formData.get("id");
  const { error } =
    typeof assignmentId === "string" && assignmentId
      ? await supabase.from("assignments").update(row).eq("id", assignmentId)
      : await supabase.from("assignments").insert({ ...row, created_by: profile.id });
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos guardar el proyecto.") };
  revalidatePath("/profesor/proyectos");
  return { ok: true, message: assignmentId ? "Proyecto actualizado." : "Proyecto asignado al grupo." };
}

export async function setAssignmentActiveAction(assignmentId: string, active: boolean): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  if (!id.safeParse(assignmentId).success) return { ok: false, message: "Proyecto no válido." };
  const { error } = await supabase.from("assignments").update({ is_active: active }).eq("id", assignmentId);
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos cambiar el proyecto.") };
  revalidatePath("/profesor/proyectos");
  return { ok: true, message: active ? "Proyecto reactivado." : "Proyecto cerrado." };
}

// ---------------- Revisión editorial ----------------

const reviewSchema = z.object({
  workId: z.uuid(),
  decision: z.enum(["approved", "changes_requested", "rejected", "reopened"]),
  comment: z.string().trim().max(2000, "El comentario es demasiado largo"),
});

const REVIEW_MESSAGES: Record<ReviewDecision, string> = {
  approved: "Trabajo aprobado.",
  changes_requested: "Se solicitaron correcciones al alumno.",
  rejected: "Trabajo rechazado.",
  reopened: "El trabajo se volvió a abrir para edición.",
};

export async function reviewWorkAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  const parsed = reviewSchema.safeParse({ workId: formData.get("workId"), decision: formData.get("decision"), comment: formData.get("comment") ?? "" });
  if (!parsed.success) return { ok: false, message: firstZodMessage(parsed.error) };
  const { workId, decision, comment } = parsed.data;
  const { error } = await supabase.rpc("review_work", { p_work_id: workId, p_decision: decision, p_comment: comment || null });
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos registrar la revisión.") };
  revalidatePath("/profesor/revision");
  revalidatePath(`/profesor/revision/${workId}`);
  return { ok: true, message: REVIEW_MESSAGES[decision] };
}

// ---------------- Plantillas ----------------

export async function setTemplateActiveAction(templateId: string, active: boolean): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  if (!/^[a-z0-9-]{3,60}$/.test(templateId)) return { ok: false, message: "Plantilla no válida." };
  const { error } = await supabase.from("templates").update({ is_active: active }).eq("id", templateId);
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos cambiar la plantilla.") };
  revalidatePath("/profesor/plantillas");
  return { ok: true, message: active ? "Plantilla activada." : "Plantilla desactivada: los alumnos ya no podrán elegirla." };
}

// ---------------- Imágenes: autorización para publicar ----------------

export async function setMediaApprovalAction(ids: string[], approved: boolean): Promise<ActionResult> {
  const { supabase } = await requireTeacher();
  const valid = z.array(z.uuid()).max(200).safeParse(ids);
  if (!valid.success || valid.data.length === 0) return { ok: false, message: "Selecciona al menos una imagen." };
  const { error } = await supabase.from("media_assets").update({ publication_approved: approved }).in("id", valid.data);
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos actualizar las imágenes.") };
  revalidatePath("/profesor/almacenamiento");
  revalidatePath("/profesor/revistas", "layout");
  return { ok: true, message: approved ? "Imágenes autorizadas para publicarse." : "Autorización retirada." };
}

// ---------------- Ajustes ----------------

const settingsSchema = z.object({
  schoolName: required("el nombre de la escuela", 120),
  maxImageMb: z.coerce.number().min(1, "Mínimo 1 MB").max(10, "Máximo 10 MB (límite del bucket)"),
  userQuotaMb: z.coerce.number().int().min(10).max(2000),
  totalQuotaMb: z.coerce.number().int().min(100).max(100000),
  privacyPolicy: z.string().max(20000),
  imageNotice: z.string().trim().max(1000),
});

export async function updateSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { supabase, profile } = await requireTeacher();
  const parsed = settingsSchema.safeParse({
    schoolName: formData.get("schoolName") ?? "",
    maxImageMb: formData.get("maxImageMb"),
    userQuotaMb: formData.get("userQuotaMb"),
    totalQuotaMb: formData.get("totalQuotaMb"),
    privacyPolicy: formData.get("privacyPolicy") ?? "",
    imageNotice: formData.get("imageNotice") ?? "",
  });
  if (!parsed.success) return { ok: false, message: firstZodMessage(parsed.error), fieldErrors: zodFieldErrors(parsed.error) };
  const d = parsed.data;
  const { error } = await supabase
    .from("app_settings")
    .update({
      school_name: d.schoolName,
      max_image_mb: d.maxImageMb,
      user_quota_mb: d.userQuotaMb,
      total_quota_mb: d.totalQuotaMb,
      privacy_policy: d.privacyPolicy,
      image_notice: d.imageNotice,
      updated_by: profile.id,
    })
    .eq("id", 1);
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos guardar los ajustes.") };
  revalidatePath("/profesor/ajustes");
  revalidatePath("/privacidad");
  return { ok: true, message: "Ajustes guardados." };
}
