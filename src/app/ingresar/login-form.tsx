"use client";

import { LogIn } from "lucide-react";
import { ActionForm, SubmitButton } from "@/components/ui/action-form";
import { Field, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/misc";
import { PasswordInput } from "@/components/ui/password-input";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm({ next }: { next: string }) {
  return (
    <ActionForm action={loginAction} toast={false} className="space-y-5">
      {(state) => (
        <>
          {!state.ok && state.message && <Alert kind="error">{state.message}</Alert>}
          <input type="hidden" name="next" value={next} />
          <Field label="Usuario" htmlFor="username">
            <Input id="username" name="username" autoComplete="username" autoCapitalize="none" spellCheck={false} placeholder="por ejemplo: alumno01" required />
          </Field>
          <Field label="Contraseña" htmlFor="password">
            <PasswordInput id="password" name="password" autoComplete="current-password" required />
          </Field>
          <div className="pt-1">
            <SubmitButton size="lg" className="w-full" icon={<LogIn className="size-5" />}>
              Entrar
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
