"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { displayNameSchema, editorialNameSchema, generateTemporaryPassword, usernameSchema, usernameToEmail } from "@/lib/auth/credentials";
import { requireTeacher } from "@/lib/auth/session";
import { parseCsv } from "@/lib/csv";
import { firstZodMessage, friendlyDbError, logServerError, zodFieldErrors, type ActionResult } from "@/lib/errors";
import { createAdminClient, studentEmailDomain, type AdminSupabase } from "@/lib/supabase/admin";
import { MEDIA_BUCKET } from "@/lib/storage/assets";
import type { AppRole } from "@/types/database";

export interface IssuedCredential {
  displayName: string;
  username: string;
  password: string;
}

const uuid = z.uuid();
const optionalUuid = z
  .string()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.uuid().nullable());

/** Crea la cuenta en Supabase Auth y su perfil. Si falla el perfil, se borra la cuenta. */
async function createAccount(
  admin: AdminSupabase,
  input: { username: string; displayName: string; editorialName: string | null; role: AppRole; groupId: string | null },
  createdBy: string,
): Promise<{ ok: true; id: string; password: string } | { ok: false; message: string }> {
  const password = generateTemporaryPassword();
  const { data, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(input.username, studentEmailDomain()),
    password,
    email_confirm: true, // no se envía ningún correo
  });
  if (error || !data.user) {
    if (/already|registered|exists/i.test(error?.message ?? "")) return { ok: false, message: `El usuario «${input.username}» ya existe.` };
    logServerError("create-user", error);
    return { ok: false, message: "No pudimos crear la cuenta. Inténtalo de nuevo." };
  }
  const { error: profileError } = await admin.from("profiles").insert({
    id: data.user.id,
    username: input.username,
    display_name: input.displayName,
    editorial_name: input.editorialName,
    role: input.role,
    group_id: input.groupId,
    must_change_password: true,
    created_by: createdBy,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    return { ok: false, message: friendlyDbError(profileError, "No pudimos crear el perfil.") };
  }
  await admin.from("audit_logs").insert({ actor_id: createdBy, action: `account.created.${input.role}`, entity_type: "profile", entity_id: data.user.id });
  return { ok: true, id: data.user.id, password };
}

const studentSchema = z.object({
  displayName: displayNameSchema,
  username: usernameSchema,
  groupId: optionalUuid,
  editorialName: editorialNameSchema,
});

export async function createStudentAction(_prev: ActionResult<IssuedCredential>, formData: FormData): Promise<ActionResult<IssuedCredential>> {
  const { profile } = await requireTeacher();
  const parsed = studentSchema.safeParse({
    displayName: formData.get("displayName") ?? "",
    username: formData.get("username") ?? "",
    groupId: formData.get("groupId") ?? "",
    editorialName: formData.get("editorialName") ?? "",
  });
  if (!parsed.success) return { ok: false, message: firstZodMessage(parsed.error), fieldErrors: zodFieldErrors(parsed.error) };
  const role: AppRole = formData.get("role") === "teacher" ? "teacher" : "student";
  try {
    const result = await createAccount(createAdminClient(), { ...parsed.data, role, groupId: role === "teacher" ? null : parsed.data.groupId }, profile.id);
    if (!result.ok) return { ok: false, message: result.message, fieldErrors: { username: result.message } };
    revalidatePath("/profesor/alumnos");
    revalidatePath("/profesor/equipo");
    return {
      ok: true,
      message: role === "teacher" ? "Cuenta de profesor creada." : "Alumno registrado. Anota su contraseña temporal.",
      data: { displayName: parsed.data.displayName, username: parsed.data.username, password: result.password },
    };
  } catch (error) {
    logServerError("create-student", error);
    return { ok: false, message: "No pudimos registrar la cuenta. Revisa la configuración del servidor." };
  }
}

export interface CsvRowError {
  row: number;
  message: string;
}

const MAX_CSV_ROWS = 200;

/** Alta masiva: primero se valida TODO el archivo; si hay errores no se registra nadie. */
export async function importStudentsAction(
  _prev: ActionResult<{ created?: IssuedCredential[]; errors?: CsvRowError[] }>,
  formData: FormData,
): Promise<ActionResult<{ created?: IssuedCredential[]; errors?: CsvRowError[] }>> {
  const { profile, supabase } = await requireTeacher();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Selecciona un archivo CSV." };
  if (file.size > 200_000) return { ok: false, message: "El archivo es demasiado grande (máximo 200 KB)." };

  const rows = parseCsv(await file.text());
  const header = (rows[0] ?? []).map((h) => h.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""));
  const col = (names: string[]) => header.findIndex((h) => names.includes(h));
  const iName = col(["nombre", "nombre visible", "nombre_visible"]);
  const iUser = col(["usuario", "nombre de usuario", "username"]);
  const iGroup = col(["grupo"]);
  const iEditorial = col(["nombre_editorial", "nombre editorial", "seudonimo"]);
  if (iName < 0 || iUser < 0 || iGroup < 0) {
    return { ok: false, message: "La primera fila debe tener las columnas: nombre, usuario, grupo (y opcionalmente nombre_editorial)." };
  }
  const body = rows.slice(1);
  if (body.length === 0) return { ok: false, message: "El archivo no tiene alumnos." };
  if (body.length > MAX_CSV_ROWS) return { ok: false, message: `Máximo ${MAX_CSV_ROWS} alumnos por archivo.` };

  const { data: groups } = await supabase.from("groups").select("id, name").eq("is_active", true);
  const groupByName = new Map((groups ?? []).map((g) => [g.name.trim().toLowerCase(), g.id]));
  const errors: CsvRowError[] = [];
  const valid: Array<{ displayName: string; username: string; groupId: string; editorialName: string | null }> = [];
  const seen = new Set<string>();

  body.forEach((cells, i) => {
    const rowNumber = i + 2;
    const parsed = studentSchema.safeParse({
      displayName: cells[iName] ?? "",
      username: cells[iUser] ?? "",
      groupId: "",
      editorialName: iEditorial >= 0 ? (cells[iEditorial] ?? "") : "",
    });
    if (!parsed.success) return errors.push({ row: rowNumber, message: firstZodMessage(parsed.error) });
    const groupId = groupByName.get((cells[iGroup] ?? "").trim().toLowerCase());
    if (!groupId) return errors.push({ row: rowNumber, message: `El grupo «${cells[iGroup] ?? ""}» no existe o está desactivado.` });
    if (seen.has(parsed.data.username)) return errors.push({ row: rowNumber, message: `El usuario «${parsed.data.username}» está repetido en el archivo.` });
    seen.add(parsed.data.username);
    valid.push({ ...parsed.data, groupId });
  });

  if (valid.length > 0) {
    const { data: existing } = await supabase.from("profiles").select("username").in("username", valid.map((v) => v.username));
    for (const e of existing ?? []) {
      const idx = body.findIndex((cells) => usernameSchema.safeParse(cells[iUser] ?? "").data === e.username);
      errors.push({ row: idx + 2, message: `El usuario «${e.username}» ya está registrado.` });
    }
  }
  if (errors.length > 0) {
    return { ok: false, message: `El archivo tiene ${errors.length} error(es). No se registró a nadie.`, data: { errors: errors.sort((a, b) => a.row - b.row) } };
  }

  const admin = createAdminClient();
  const created: IssuedCredential[] = [];
  const createdIds: string[] = [];
  for (const v of valid) {
    const res = await createAccount(admin, { ...v, role: "student" }, profile.id);
    if (!res.ok) {
      // Se deshace todo para no dejar el grupo a medias.
      for (const id of createdIds) await admin.auth.admin.deleteUser(id);
      return { ok: false, message: `Se detuvo el registro en «${v.username}»: ${res.message} No se registró a nadie.` };
    }
    createdIds.push(res.id);
    created.push({ displayName: v.displayName, username: v.username, password: res.password });
  }
  revalidatePath("/profesor/alumnos");
  return { ok: true, message: `Se registraron ${created.length} alumnos. Descarga sus contraseñas temporales.`, data: { created } };
}

export async function resetPasswordAction(userId: string): Promise<ActionResult<IssuedCredential>> {
  const { profile, supabase } = await requireTeacher();
  if (!uuid.safeParse(userId).success) return { ok: false, message: "Cuenta no válida." };
  if (userId === profile.id) return { ok: false, message: "Para tu propia cuenta usa «Cambiar contraseña»." };
  const { data: target } = await supabase.from("profiles").select("id, username, display_name").eq("id", userId).maybeSingle();
  if (!target) return { ok: false, message: "No encontramos la cuenta." };
  try {
    const admin = createAdminClient();
    const password = generateTemporaryPassword();
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) throw error;
    await admin.from("profiles").update({ must_change_password: true }).eq("id", userId);
    await admin.from("audit_logs").insert({ actor_id: profile.id, action: "account.password_reset", entity_type: "profile", entity_id: userId });
    return { ok: true, message: "Contraseña restablecida.", data: { displayName: target.display_name, username: target.username, password } };
  } catch (error) {
    logServerError("reset-password", error);
    return { ok: false, message: "No pudimos restablecer la contraseña." };
  }
}

export async function setAccountActiveAction(userId: string, active: boolean): Promise<ActionResult> {
  const { profile } = await requireTeacher();
  if (!uuid.safeParse(userId).success) return { ok: false, message: "Cuenta no válida." };
  if (userId === profile.id) return { ok: false, message: "No puedes desactivar tu propia cuenta." };
  try {
    const admin = createAdminClient();
    // El "ban" de Supabase impide iniciar sesión y renovar sesiones abiertas.
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : "876000h" });
    if (error) throw error;
    await admin.from("profiles").update({ is_active: active }).eq("id", userId);
    await admin.from("audit_logs").insert({ actor_id: profile.id, action: active ? "account.activated" : "account.deactivated", entity_type: "profile", entity_id: userId });
    revalidatePath("/profesor/alumnos");
    return { ok: true, message: active ? "Cuenta activada." : "Cuenta desactivada." };
  } catch (error) {
    logServerError("set-active", error);
    return { ok: false, message: "No pudimos cambiar el estado de la cuenta." };
  }
}

export async function updateAccountAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const { profile, supabase } = await requireTeacher();
  const parsed = z
    .object({ id: z.uuid(), displayName: displayNameSchema, editorialName: editorialNameSchema, groupId: optionalUuid, username: usernameSchema })
    .safeParse({
      id: formData.get("id"),
      displayName: formData.get("displayName") ?? "",
      editorialName: formData.get("editorialName") ?? "",
      groupId: formData.get("groupId") ?? "",
      username: formData.get("username") ?? "",
    });
  if (!parsed.success) return { ok: false, message: firstZodMessage(parsed.error), fieldErrors: zodFieldErrors(parsed.error) };
  const { id, displayName, editorialName, groupId, username } = parsed.data;
  const { data: current } = await supabase.from("profiles").select("username").eq("id", id).maybeSingle();
  if (!current) return { ok: false, message: "No encontramos la cuenta." };

  const { error } = await supabase.from("profiles").update({ display_name: displayName, editorial_name: editorialName, group_id: groupId }).eq("id", id);
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos guardar los cambios.") };

  if (username !== current.username) {
    try {
      const admin = createAdminClient();
      const { data: taken } = await admin.from("profiles").select("id").eq("username", username).maybeSingle();
      if (taken) return { ok: false, message: "Ese nombre de usuario ya está en uso.", fieldErrors: { username: "Ese nombre de usuario ya está en uso." } };
      const { error: authError } = await admin.auth.admin.updateUserById(id, { email: usernameToEmail(username, studentEmailDomain()), email_confirm: true });
      if (authError) throw authError;
      await admin.from("profiles").update({ username }).eq("id", id);
    } catch (e) {
      logServerError("rename-user", e);
      return { ok: false, message: "Se guardó el nombre, pero no pudimos cambiar el usuario." };
    }
  }
  await createAdminClient().from("audit_logs").insert({ actor_id: profile.id, action: "account.updated", entity_type: "profile", entity_id: id });
  revalidatePath("/profesor/alumnos");
  return { ok: true, message: "Datos actualizados." };
}

export async function setRoleAction(userId: string, role: AppRole): Promise<ActionResult> {
  const { profile } = await requireTeacher();
  if (!uuid.safeParse(userId).success || !["teacher", "student"].includes(role)) return { ok: false, message: "Datos no válidos." };
  if (userId === profile.id) return { ok: false, message: "No puedes cambiar tu propio rol." };
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role, group_id: role === "teacher" ? null : undefined }).eq("id", userId);
  if (error) return { ok: false, message: friendlyDbError(error, "No pudimos cambiar el rol.") };
  await admin.from("audit_logs").insert({ actor_id: profile.id, action: `account.role.${role}`, entity_type: "profile", entity_id: userId });
  revalidatePath("/profesor/equipo");
  revalidatePath("/profesor/alumnos");
  return { ok: true, message: role === "teacher" ? "Ahora la cuenta tiene permisos de profesor." : "La cuenta ahora es de alumno." };
}

/** Elimina la cuenta, sus trabajos y sus imágenes (por ejemplo, al terminar el ciclo escolar). */
export async function deleteAccountAction(userId: string): Promise<ActionResult> {
  const { profile, supabase } = await requireTeacher();
  if (!uuid.safeParse(userId).success) return { ok: false, message: "Cuenta no válida." };
  if (userId === profile.id) return { ok: false, message: "No puedes eliminar tu propia cuenta." };
  const { data: target } = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
  if (!target) return { ok: false, message: "No encontramos la cuenta." };
  try {
    const admin = createAdminClient();
    const { count } = await admin.from("magazines").select("id", { count: "exact", head: true }).eq("owner_id", userId);
    if ((count ?? 0) > 0) return { ok: false, message: "Esta cuenta es dueña de revistas. Elimina o reasigna esas revistas primero." };
    const { data: media } = await admin.from("media_assets").select("storage_path").eq("owner_id", userId);
    const paths = (media ?? []).map((m) => m.storage_path);
    if (paths.length > 0) await admin.storage.from(MEDIA_BUCKET).remove(paths);
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) throw error;
    await admin.from("audit_logs").insert({ actor_id: profile.id, action: "account.deleted", entity_type: "profile", entity_id: userId });
    revalidatePath("/profesor/alumnos");
    return { ok: true, message: "Cuenta eliminada con sus trabajos e imágenes." };
  } catch (error) {
    logServerError("delete-account", error);
    return { ok: false, message: "No pudimos eliminar la cuenta." };
  }
}
