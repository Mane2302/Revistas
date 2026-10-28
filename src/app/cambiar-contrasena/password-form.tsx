"use client";

import { Check, Circle, KeyRound } from "lucide-react";
import { useState } from "react";
import { ActionForm, fieldError, SubmitButton } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { PasswordInput } from "@/components/ui/password-input";
import { changePasswordAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

// Mismas reglas que passwordSchema (src/lib/auth/credentials.ts), mostradas mientras se escribe.
function requirements(password: string, confirm: string) {
  return [
    { label: "Al menos 8 caracteres", ok: password.length >= 8 && password.length <= 72 },
    { label: "Al menos una letra", ok: /[A-Za-zÁÉÍÓÚáéíóúÑñ]/.test(password) },
    { label: "Al menos un número", ok: /[0-9]/.test(password) },
    { label: "Las dos contraseñas coinciden", ok: password.length > 0 && password === confirm },
  ];
}

export function PasswordForm({ askCurrent }: { askCurrent: boolean }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const checks = requirements(password, confirm);

  return (
    <ActionForm action={changePasswordAction} toast={false} className="space-y-5">
      {(state) => (
        <>
          {!state.ok && state.message && <Alert kind="error">{state.message}</Alert>}
          {askCurrent && (
            <Field label="Contraseña actual" htmlFor="current" error={fieldError(state, "current")}>
              <PasswordInput id="current" name="current" autoComplete="current-password" required />
            </Field>
          )}

          <div className="rounded-xl border border-cielo/25 bg-cielo-claro/50 p-4 text-sm" id="password-rules">
            <p className="font-bold text-tinta">¿Cómo debe ser tu contraseña?</p>
            <ul className="mt-2 space-y-1" aria-live="polite">
              {checks.map((c) => (
                <li key={c.label} className={cn("flex items-center gap-2", c.ok ? "font-semibold text-[#0b6b49]" : "text-tinta-suave")}>
                  {c.ok ? <Check className="size-4 shrink-0" aria-hidden /> : <Circle className="size-4 shrink-0" aria-hidden />}
                  {c.label}
                  <span className="sr-only">{c.ok ? "(cumplido)" : "(pendiente)"}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-tinta-suave">
              Consejo: usa una frase fácil de recordar para ti y difícil de adivinar, con palabras y números (por ejemplo, el nombre de algo que te guste y un número). No uses tu nombre, tu usuario ni «12345678», y no se la compartas a nadie.
            </p>
          </div>

          <Field label="Contraseña nueva" htmlFor="password" error={fieldError(state, "password")}>
            <PasswordInput
              id="password"
              name="password"
              autoComplete="new-password"
              minLength={8}
              maxLength={72}
              required
              aria-describedby="password-rules"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </Field>
          <Field label="Repite la contraseña nueva" htmlFor="confirm" error={fieldError(state, "confirm")}>
            <PasswordInput id="confirm" name="confirm" autoComplete="new-password" maxLength={72} required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </Field>
          <p className="text-xs text-tinta-suave">Pulsa el ojo para ver lo que escribes y revisar que no haya errores.</p>
          <div className="pt-1">
            <SubmitButton size="lg" className="w-full" icon={<KeyRound className="size-5" />}>
              Guardar contraseña
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
