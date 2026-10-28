"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";
import { ActionForm, fieldError, SubmitButton } from "@/components/ui/action-form";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Field, Input, Textarea } from "@/components/ui/field";
import { saveGroupAction } from "@/lib/actions/teacher";

interface GroupData {
  id: string;
  name: string;
  description: string | null;
}

export function GroupDialogButton({ group }: { group?: GroupData }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {group ? (
        <Button size="sm" variant="ghost" icon={<Pencil className="size-4" />} onClick={() => setOpen(true)}>
          Editar
        </Button>
      ) : (
        <Button icon={<Plus className="size-5" />} onClick={() => setOpen(true)}>
          Nuevo grupo
        </Button>
      )}
      <Dialog open={open} onClose={() => setOpen(false)} title={group ? "Editar grupo" : "Nuevo grupo"}>
        <ActionForm action={saveGroupAction} onSuccess={() => setOpen(false)} className="space-y-4">
          {(state) => (
            <>
              {group && <input type="hidden" name="id" value={group.id} />}
              <Field label="Nombre del grupo" htmlFor="g-name" hint="Por ejemplo: 1.° A" error={fieldError(state, "name")}>
                <Input id="g-name" name="name" defaultValue={group?.name} maxLength={80} required />
              </Field>
              <Field label="Descripción (opcional)" htmlFor="g-desc" error={fieldError(state, "description")}>
                <Textarea id="g-desc" name="description" defaultValue={group?.description ?? ""} maxLength={500} />
              </Field>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <SubmitButton>{group ? "Guardar cambios" : "Crear grupo"}</SubmitButton>
              </div>
            </>
          )}
        </ActionForm>
      </Dialog>
    </>
  );
}
