"use client";

import { Check, Copy, Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { ActionForm, fieldError, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { createMagazineAction, updateMagazineAction } from "@/lib/actions/magazines";
import { reviewWorkAction, saveAssignmentAction, updateSettingsAction } from "@/lib/actions/teacher";
import type { WorkStatus } from "@/types/database";

interface Option {
  id: string;
  name: string;
}

// ---------------- Proyectos ----------------

export interface AssignmentData {
  id: string;
  title: string;
  description: string | null;
  group_id: string;
  magazine_id: string | null;
  work_kind: "article" | "cover" | null;
  due_date: string | null;
  allowed_template_ids: string[];
}

export function AssignmentDialogButton({ assignment, groups, magazines, templates }: { assignment?: AssignmentData; groups: Option[]; magazines: Option[]; templates: Array<Option & { kind: string }> }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {assignment ? (
        <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setOpen(true)}>
          Editar
        </Button>
      ) : (
        <Button icon={<Plus className="size-5" />} onClick={() => setOpen(true)} disabled={groups.length === 0}>
          Asignar proyecto
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} size="lg" title={assignment ? "Editar proyecto" : "Asignar un proyecto"}>
        <ActionForm action={saveAssignmentAction} onSuccess={() => setOpen(false)} className="space-y-4">
          {(state) => (
            <>
              {assignment && <input type="hidden" name="id" value={assignment.id} />}
              <Field label="Título" htmlFor="a-title" error={fieldError(state, "title")}>
                <Input id="a-title" name="title" defaultValue={assignment?.title} maxLength={120} placeholder="Por ejemplo: Noticias de nuestra escuela" />
              </Field>
              <Field label="Instrucciones para los alumnos" htmlFor="a-desc" error={fieldError(state, "description")}>
                <Textarea id="a-desc" name="description" defaultValue={assignment?.description ?? ""} maxLength={2000} rows={4} placeholder="Qué deben investigar, cuántas páginas, qué fuentes usar…" />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Grupo" htmlFor="a-group" error={fieldError(state, "groupId")}>
                  <Select id="a-group" name="groupId" defaultValue={assignment?.group_id ?? groups[0]?.id}>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Fecha de entrega" htmlFor="a-due" error={fieldError(state, "dueDate")}>
                  <Input id="a-due" name="dueDate" type="date" defaultValue={assignment?.due_date ?? ""} />
                </Field>
                <Field label="Tipo de trabajo" htmlFor="a-kind">
                  <Select id="a-kind" name="workKind" defaultValue={assignment?.work_kind ?? ""}>
                    <option value="">Artículo o portada</option>
                    <option value="article">Solo artículos</option>
                    <option value="cover">Solo portadas</option>
                  </Select>
                </Field>
                <Field label="Revista de destino (opcional)" htmlFor="a-mag">
                  <Select id="a-mag" name="magazineId" defaultValue={assignment?.magazine_id ?? ""}>
                    <option value="">Ninguna por ahora</option>
                    {magazines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <fieldset>
                <legend className="text-sm font-bold">Plantillas permitidas</legend>
                <p className="mb-2 text-sm text-tinta-suave">Si no marcas ninguna, podrán usar todas las plantillas activas.</p>
                <div className="grid max-h-48 gap-1.5 overflow-y-auto rounded-xl border border-linea p-3 sm:grid-cols-2">
                  {templates.map((t) => (
                    <Checkbox key={t.id} name="templates" value={t.id} defaultChecked={assignment?.allowed_template_ids.includes(t.id)} label={`${t.name}${t.kind === "cover" ? " (portada)" : ""}`} />
                  ))}
                </div>
              </fieldset>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <SubmitButton>{assignment ? "Guardar cambios" : "Asignar"}</SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>
    </>
  );
}

// ---------------- Revistas ----------------

export interface MagazineData {
  id: string;
  title: string;
  description: string | null;
  group_id: string | null;
  visibility: "private" | "public";
  allow_pdf_download: boolean;
  edition_label: string | null;
  school_cycle: string | null;
}

function MagazineFields({ magazine, groups, state }: { magazine?: MagazineData; groups: Option[]; state: Parameters<typeof fieldError>[0] }) {
  return (
    <>
      <Field label="Título de la revista" htmlFor="m-title" error={fieldError(state, "title")}>
        <Input id="m-title" name="title" defaultValue={magazine?.title} maxLength={120} placeholder="Por ejemplo: La Voz del 1.° A" />
      </Field>
      <Field label="Descripción (opcional)" htmlFor="m-desc" error={fieldError(state, "description")}>
        <Textarea id="m-desc" name="description" defaultValue={magazine?.description ?? ""} maxLength={1000} rows={2} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Grupo" htmlFor="m-group">
          <Select id="m-group" name="groupId" defaultValue={magazine?.group_id ?? ""}>
            <option value="">Varios grupos</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Número de edición" htmlFor="m-ed">
          <Input id="m-ed" name="editionLabel" defaultValue={magazine?.edition_label ?? ""} maxLength={60} placeholder="Número 1" />
        </Field>
        <Field label="Ciclo escolar" htmlFor="m-cycle">
          <Input id="m-cycle" name="schoolCycle" defaultValue={magazine?.school_cycle ?? ""} maxLength={60} placeholder="2026–2027" />
        </Field>
      </div>
      <Field label="¿Quién podrá leerla al publicarla?" htmlFor="m-vis">
        <Select id="m-vis" name="visibility" defaultValue={magazine?.visibility ?? "private"}>
          <option value="private">Privada: solo usuarios con sesión de la escuela</option>
          <option value="public">Pública: cualquier persona con el enlace</option>
        </Select>
      </Field>
      <Checkbox name="allowPdf" defaultChecked={magazine?.allow_pdf_download ?? false} label="Permitir que los lectores descarguen el PDF" />
    </>
  );
}

export function NewMagazineButton({ groups, templates }: { groups: Option[]; templates: Array<Option & { kind: string; pageType?: string }> }) {
  const [open, setOpen] = useState(false);
  const covers = templates.filter((t) => t.kind === "cover");
  const extra = (pageType: string) => templates.find((t) => t.pageType === pageType)?.id ?? "";
  return (
    <>
      <Button icon={<Plus className="size-5" />} onClick={() => setOpen(true)}>
        Nueva revista
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} size="lg" title="Crear una revista">
        <ActionForm action={createMagazineAction} className="space-y-4">
          {(state) => (
            <>
              <MagazineFields groups={groups} state={state} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Orientación de las páginas" htmlFor="m-or" hint="No se puede cambiar después.">
                  <Select id="m-or" name="orientation" defaultValue="portrait">
                    <option value="portrait">Vertical (A4)</option>
                    <option value="landscape">Horizontal (A4)</option>
                  </Select>
                </Field>
                <Field label="Portada inicial" htmlFor="m-cover">
                  <Select id="m-cover" name="coverTemplate" defaultValue={covers[0]?.id ?? ""}>
                    <option value="">Sin portada (la añado después)</option>
                    {covers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
              <fieldset className="space-y-1.5">
                <legend className="mb-1 text-sm font-bold">Páginas iniciales</legend>
                {extra("index") && <Checkbox name="indexTemplate" value={extra("index")} defaultChecked label="Índice" />}
                {extra("editorial") && <Checkbox name="editorialTemplate" value={extra("editorial")} defaultChecked label="Editorial" />}
                {extra("credits") && <Checkbox name="creditsTemplate" value={extra("credits")} label="Créditos" />}
                {extra("back_cover") && <Checkbox name="backTemplate" value={extra("back_cover")} label="Contraportada" />}
                <p className="text-xs text-tinta-suave">Los artículos aprobados se insertan después desde el editor de la revista.</p>
              </fieldset>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <SubmitButton>Crear revista</SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>
    </>
  );
}

export function MagazineSettingsForm({ magazine, groups }: { magazine: MagazineData; groups: Option[] }) {
  return (
    <ActionForm action={updateMagazineAction} className="space-y-4">
      {(state) => (
        <>
          <input type="hidden" name="id" value={magazine.id} />
          <MagazineFields magazine={magazine} groups={groups} state={state} />
          <div className="flex justify-end">
            <SubmitButton>Guardar datos</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

// ---------------- Revisión ----------------

export function ReviewForm({ workId, status }: { workId: string; status: WorkStatus }) {
  const reviewing = status === "submitted";
  const [decision, setDecision] = useState(reviewing ? "approved" : "reopened");
  const options = reviewing
    ? [
        { value: "approved", label: "Aprobar", help: "El trabajo podrá incorporarse a una revista." },
        { value: "changes_requested", label: "Solicitar correcciones", help: "El alumno podrá editarlo y volver a enviarlo." },
        { value: "rejected", label: "Rechazar", help: "El trabajo no se aceptará. Explica el motivo." },
      ]
    : [{ value: "reopened", label: "Volver a abrir", help: "El alumno podrá editarlo de nuevo (se guarda una copia de la versión actual)." }];
  if (status === "draft") return <Alert kind="info">El alumno todavía no ha enviado este trabajo.</Alert>;
  return (
    <ActionForm action={reviewWorkAction} resetOnSuccess className="space-y-4">
      <input type="hidden" name="workId" value={workId} />
      <fieldset className="space-y-2">
        <legend className="mb-1 text-sm font-bold">Decisión</legend>
        {options.map((o) => (
          <label key={o.value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${decision === o.value ? "border-cielo bg-cielo-claro/50" : "border-linea"}`}>
            <input type="radio" name="decision" value={o.value} checked={decision === o.value} onChange={() => setDecision(o.value)} className="mt-1 accent-cielo" />
            <span>
              <span className="block font-bold">{o.label}</span>
              <span className="text-sm text-tinta-suave">{o.help}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <Field label="Comentarios para el alumno" htmlFor="r-comment" hint={decision === "changes_requested" ? "Obligatorio: explica qué debe corregir." : "Opcional. Nunca se muestran en la revista publicada."}>
        <Textarea id="r-comment" name="comment" maxLength={2000} rows={4} />
      </Field>
      <div className="flex justify-end">
        <SubmitButton variant={decision === "rejected" ? "danger" : "primary"}>Registrar revisión</SubmitButton>
      </div>
    </ActionForm>
  );
}

// ---------------- Ajustes ----------------

export interface SettingsData {
  school_name: string;
  max_image_mb: number;
  user_quota_mb: number;
  total_quota_mb: number;
  privacy_policy: string;
  image_notice: string;
}

export function SettingsForm({ settings }: { settings: SettingsData }) {
  return (
    <ActionForm action={updateSettingsAction} className="space-y-5">
      {(state) => (
        <>
          <Field label="Nombre de la escuela" htmlFor="st-school" error={fieldError(state, "schoolName")}>
            <Input id="st-school" name="schoolName" defaultValue={settings.school_name} maxLength={120} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Tamaño máximo por imagen (MB)" htmlFor="st-max" hint="Entre 1 y 10 MB." error={fieldError(state, "maxImageMb")}>
              <Input id="st-max" name="maxImageMb" type="number" min={1} max={10} step={0.5} defaultValue={settings.max_image_mb} />
            </Field>
            <Field label="Espacio por usuario (MB)" htmlFor="st-user" error={fieldError(state, "userQuotaMb")}>
              <Input id="st-user" name="userQuotaMb" type="number" min={10} max={2000} defaultValue={settings.user_quota_mb} />
            </Field>
            <Field label="Espacio total de la escuela (MB)" htmlFor="st-total" hint="El plan gratuito de Supabase incluye 1 GB." error={fieldError(state, "totalQuotaMb")}>
              <Input id="st-total" name="totalQuotaMb" type="number" min={100} max={100000} defaultValue={settings.total_quota_mb} />
            </Field>
          </div>
          <Field label="Aviso sobre el uso responsable de imágenes" htmlFor="st-notice" hint="Se muestra a los alumnos al subir fotografías." error={fieldError(state, "imageNotice")}>
            <Textarea id="st-notice" name="imageNotice" defaultValue={settings.image_notice} maxLength={1000} rows={3} />
          </Field>
          <Field label="Aviso de privacidad" htmlFor="st-privacy" hint="Se publica en /privacidad. Revísalo con la dirección de la escuela; puedes usar saltos de línea." error={fieldError(state, "privacyPolicy")}>
            <Textarea id="st-privacy" name="privacyPolicy" defaultValue={settings.privacy_policy} maxLength={20000} rows={12} />
          </Field>
          <div className="flex justify-end">
            <SubmitButton>Guardar ajustes</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}

export function CopyLinkButton({ path }: { path: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <Button
      size="sm"
      variant="secondary"
      icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      onClick={() => {
        const url = `${window.location.origin}${path}`;
        void navigator.clipboard.writeText(url).then(
          () => {
            setCopied(true);
            toast("success", "Enlace copiado.");
            setTimeout(() => setCopied(false), 2000);
          },
          () => toast("error", `No pudimos copiar. El enlace es: ${url}`),
        );
      }}
    >
      Copiar enlace
    </Button>
  );
}
