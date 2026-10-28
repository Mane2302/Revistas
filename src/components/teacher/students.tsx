"use client";

import { FileSpreadsheet, KeyRound, MoreHorizontal, Pencil, Power, Trash2, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ActionForm, fieldError, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Field, Input, Select } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import {
  createStudentAction,
  deleteAccountAction,
  importStudentsAction,
  resetPasswordAction,
  setAccountActiveAction,
  updateAccountAction,
  type CsvRowError,
  type IssuedCredential,
} from "@/lib/actions/accounts";
import { normalizeUsername } from "@/lib/auth/credentials";
import { CredentialList } from "./credential-card";

export interface GroupOption {
  id: string;
  name: string;
}

export interface StudentRow {
  id: string;
  username: string;
  display_name: string;
  editorial_name: string | null;
  group_id: string | null;
  is_active: boolean;
}

/** Alta de una cuenta (alumno o profesor) sin correo electrónico. */
export function NewAccountButton({ groups, role = "student" }: { groups: GroupOption[]; role?: "student" | "teacher" }) {
  const [open, setOpen] = useState(false);
  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const [username, setUsername] = useState("");
  const router = useRouter();
  const close = () => {
    setOpen(false);
    setIssued(null);
    setUsername("");
    router.refresh();
  };
  return (
    <>
      <Button icon={<UserPlus className="size-5" />} onClick={() => setOpen(true)}>
        {role === "teacher" ? "Nuevo profesor" : "Registrar alumno"}
      </Button>
      <Dialog open={open} onClose={close} title={role === "teacher" ? "Nueva cuenta de profesor" : "Registrar alumno"} description="No se necesita correo, teléfono ni fecha de nacimiento.">
        {issued ? (
          <div className="space-y-4">
            <CredentialList credentials={[issued]} />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIssued(null)}>
                Registrar otro
              </Button>
              <Button onClick={close}>Listo</Button>
            </div>
          </div>
        ) : (
          <ActionForm action={createStudentAction} onSuccess={(s) => s.ok && s.data && setIssued(s.data)} className="space-y-4">
            {(state) => (
              <>
                <input type="hidden" name="role" value={role} />
                <Field label="Nombre visible" htmlFor="s-name" hint="Como aparecerá en el panel del profesor." error={fieldError(state, "displayName")}>
                  <Input id="s-name" name="displayName" maxLength={80} required autoComplete="off" />
                </Field>
                <Field label="Nombre de usuario" htmlFor="s-user" hint={username ? `Se guardará como: ${normalizeUsername(username) || "—"}` : "Por ejemplo: alumno01"} error={fieldError(state, "username")}>
                  <Input id="s-user" name="username" maxLength={40} required autoComplete="off" autoCapitalize="none" spellCheck={false} value={username} onChange={(e) => setUsername(e.target.value)} />
                </Field>
                {role === "student" && (
                  <>
                    <Field label="Grupo" htmlFor="s-group" error={fieldError(state, "groupId")}>
                      <Select id="s-group" name="groupId" defaultValue={groups[0]?.id ?? ""}>
                        <option value="">Sin grupo</option>
                        {groups.map((g) => (
                          <option key={g.id} value={g.id}>
                            {g.name}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Nombre editorial o seudónimo (opcional)" htmlFor="s-ed" hint="Se usará en los créditos de las revistas publicadas en lugar del nombre completo." error={fieldError(state, "editorialName")}>
                      <Input id="s-ed" name="editorialName" maxLength={60} autoComplete="off" />
                    </Field>
                  </>
                )}
                <Alert kind="info">Se generará una contraseña temporal segura que deberá cambiar en su primer acceso.</Alert>
                <div className="flex justify-end gap-2">
                  <Button variant="secondary" onClick={close}>
                    Cancelar
                  </Button>
                  <SubmitButton>Crear cuenta</SubmitButton>
                </div>
              </>
            )}
          </ActionForm>
        )}
      </Dialog>
    </>
  );
}

export function ImportCsvButton() {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState<IssuedCredential[] | null>(null);
  const router = useRouter();
  const close = () => {
    setOpen(false);
    setCreated(null);
    router.refresh();
  };
  const template = "﻿nombre,usuario,grupo,nombre_editorial\r\nNombre Apellido,alumno01,1° A,Reportera estrella\r\n";
  return (
    <>
      <Button variant="secondary" icon={<FileSpreadsheet className="size-5" />} onClick={() => setOpen(true)}>
        Importar CSV
      </Button>
      <Dialog open={open} onClose={close} size="lg" title="Registrar varios alumnos con un archivo CSV">
        {created ? (
          <div className="space-y-4">
            <CredentialList credentials={created} />
            <div className="flex justify-end">
              <Button onClick={close}>Listo</Button>
            </div>
          </div>
        ) : (
          <ActionForm action={importStudentsAction} onSuccess={(s) => s.ok && setCreated(s.data?.created ?? [])} className="space-y-4">
            {(state) => {
              const errors: CsvRowError[] | undefined = state.data?.errors;
              return (
                <>
                  <p className="text-sm text-tinta-suave">
                    El archivo debe tener las columnas <strong>nombre, usuario, grupo</strong> y, opcionalmente, <strong>nombre_editorial</strong>. Los grupos deben existir. Se revisa todo el archivo antes de registrar: si una fila tiene un error, no se registra a nadie.
                  </p>
                  <a
                    href={`data:text/csv;charset=utf-8,${encodeURIComponent(template)}`}
                    download="plantilla-alumnos.csv"
                    className="inline-block text-sm font-bold text-cielo-oscuro underline"
                  >
                    Descargar plantilla de ejemplo
                  </a>
                  <Field label="Archivo CSV" htmlFor="csv-file">
                    <input id="csv-file" name="file" type="file" accept=".csv,text/csv" required className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-cielo-claro file:px-3 file:py-2 file:font-bold file:text-cielo-oscuro" />
                  </Field>
                  {errors && errors.length > 0 && (
                    <Alert kind="error" title="Corrige estas filas y vuelve a subir el archivo">
                      <ul className="mt-1 max-h-48 list-disc space-y-0.5 overflow-y-auto pl-5 text-sm">
                        {errors.map((e, i) => (
                          <li key={i}>
                            Fila {e.row}: {e.message}
                          </li>
                        ))}
                      </ul>
                    </Alert>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="secondary" onClick={close}>
                      Cancelar
                    </Button>
                    <SubmitButton>Validar y registrar</SubmitButton>
                  </div>
                </>
              );
            }}
          </ActionForm>
        )}
      </Dialog>
    </>
  );
}

export function StudentActions({ student, groups }: { student: StudentRow; groups: GroupOption[] }) {
  const [menu, setMenu] = useState(false);
  const [dialog, setDialog] = useState<"edit" | "reset" | "toggle" | "delete" | null>(null);
  const [issued, setIssued] = useState<IssuedCredential | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const run = (fn: () => Promise<{ ok: boolean; message?: string; data?: unknown }>, after?: (data: unknown) => void) =>
    start(async () => {
      const res = await fn();
      if (res.message) toast(res.ok ? "success" : "error", res.message);
      if (res.ok) after?.(res.data);
      if (!res.ok || !after) setDialog(null);
      router.refresh();
    });

  const choose = (d: typeof dialog) => {
    setMenu(false);
    setDialog(d);
  };

  return (
    <div className="relative">
      <Button size="sm" variant="ghost" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-label={`Acciones para ${student.display_name}`} icon={<MoreHorizontal className="size-5" />} />
      {menu && (
        <>
          <button type="button" className="fixed inset-0 z-10 cursor-default" aria-hidden tabIndex={-1} onClick={() => setMenu(false)} />
          <ul className="absolute right-0 z-20 mt-1 w-56 animate-aparecer overflow-hidden rounded-xl border border-linea bg-white py-1 shadow-flotante" role="menu">
            {[
              { id: "edit" as const, label: "Editar datos", icon: Pencil },
              { id: "reset" as const, label: "Restablecer contraseña", icon: KeyRound },
              { id: "toggle" as const, label: student.is_active ? "Desactivar cuenta" : "Activar cuenta", icon: Power },
              { id: "delete" as const, label: "Eliminar cuenta", icon: Trash2 },
            ].map(({ id, label, icon: Icon }) => (
              <li key={id} role="none">
                <button type="button" role="menuitem" onClick={() => choose(id)} className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-bold hover:bg-papel ${id === "delete" ? "text-red-700" : ""}`}>
                  <Icon className="size-4" /> {label}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <Dialog open={dialog === "edit"} onClose={() => setDialog(null)} title={`Editar a ${student.display_name}`}>
        <ActionForm action={updateAccountAction} onSuccess={() => setDialog(null)} className="space-y-4">
          {(state) => (
            <>
              <input type="hidden" name="id" value={student.id} />
              <Field label="Nombre visible" htmlFor={`e-name-${student.id}`} error={fieldError(state, "displayName")}>
                <Input id={`e-name-${student.id}`} name="displayName" defaultValue={student.display_name} maxLength={80} />
              </Field>
              <Field label="Nombre de usuario" htmlFor={`e-user-${student.id}`} hint="Si lo cambias, el alumno deberá usar el nuevo para entrar." error={fieldError(state, "username")}>
                <Input id={`e-user-${student.id}`} name="username" defaultValue={student.username} maxLength={40} autoCapitalize="none" />
              </Field>
              <Field label="Nombre editorial o seudónimo" htmlFor={`e-ed-${student.id}`} error={fieldError(state, "editorialName")}>
                <Input id={`e-ed-${student.id}`} name="editorialName" defaultValue={student.editorial_name ?? ""} maxLength={60} />
              </Field>
              <Field label="Grupo" htmlFor={`e-group-${student.id}`}>
                <Select id={`e-group-${student.id}`} name="groupId" defaultValue={student.group_id ?? ""}>
                  <option value="">Sin grupo</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setDialog(null)}>
                  Cancelar
                </Button>
                <SubmitButton>Guardar</SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>

      <Dialog
        open={dialog === "reset"}
        onClose={() => {
          setDialog(null);
          setIssued(null);
        }}
        title="Restablecer contraseña"
      >
        {issued ? (
          <CredentialList credentials={[issued]} />
        ) : (
          <div className="space-y-4">
            <p>
              Se generará una contraseña temporal nueva para <strong>{student.display_name}</strong> ({student.username}). La anterior dejará de funcionar y deberá cambiarla al entrar.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDialog(null)}>
                Cancelar
              </Button>
              <Button loading={pending} onClick={() => run(() => resetPasswordAction(student.id), (data) => setIssued(data as IssuedCredential))}>
                Generar contraseña temporal
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      <ConfirmDialog
        open={dialog === "toggle"}
        title={student.is_active ? "¿Desactivar esta cuenta?" : "¿Activar esta cuenta?"}
        message={student.is_active ? "El alumno no podrá iniciar sesión y se cerrarán sus sesiones abiertas. Sus trabajos se conservan." : "El alumno podrá volver a iniciar sesión."}
        confirmLabel={student.is_active ? "Desactivar" : "Activar"}
        danger={student.is_active}
        loading={pending}
        onCancel={() => setDialog(null)}
        onConfirm={() => run(() => setAccountActiveAction(student.id, !student.is_active))}
      />
      <ConfirmDialog
        open={dialog === "delete"}
        title="¿Eliminar la cuenta definitivamente?"
        message={
          <>
            Se borrarán la cuenta de <strong>{student.display_name}</strong>, todos sus trabajos y sus imágenes. Esta acción no se puede deshacer. Las revistas ya publicadas conservan su copia.
          </>
        }
        confirmLabel="Eliminar para siempre"
        danger
        loading={pending}
        onCancel={() => setDialog(null)}
        onConfirm={() => run(() => deleteAccountAction(student.id))}
      />
    </div>
  );
}
