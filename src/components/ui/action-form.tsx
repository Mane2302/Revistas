"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { INITIAL_ACTION_STATE, type ActionResult } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { useToast } from "./toast";

type FormAction<T> = (prev: ActionResult<T>, formData: FormData) => Promise<ActionResult<T>>;

interface ActionFormProps<T> {
  action: FormAction<T>;
  children: ReactNode | ((state: ActionResult<T>) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  onSuccess?: (state: ActionResult<T>) => void;
  /** Mostrar el resultado como aviso emergente (por defecto) o solo en línea. */
  toast?: boolean;
}

/**
 * Formulario conectado a una Server Action: deshabilita los campos mientras se envía,
 * muestra el resultado como aviso y expone los errores por campo.
 */
export function ActionForm<T = undefined>({ action, children, className, resetOnSuccess, onSuccess, toast = true }: ActionFormProps<T>) {
  const [state, formAction, pending] = useActionState(action, INITIAL_ACTION_STATE as ActionResult<T>);
  const formRef = useRef<HTMLFormElement>(null);
  const push = useToast();
  const onSuccessRef = useRef(onSuccess);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  });

  useEffect(() => {
    if (state === INITIAL_ACTION_STATE || !state.message) return;
    if (toast) push(state.ok ? "success" : "error", state.message);
    if (state.ok) {
      if (resetOnSuccess) formRef.current?.reset();
      onSuccessRef.current?.(state);
    }
  }, [state, toast, push, resetOnSuccess]);

  return (
    <form ref={formRef} action={formAction} noValidate>
      {/* El diseño (espaciado, cuadrícula) va en el fieldset: es el contenedor directo de los campos. */}
      <fieldset disabled={pending} className={cn("m-0 min-w-0 border-0 p-0", className)}>
        {typeof children === "function" ? children(state) : children}
      </fieldset>
    </form>
  );
}

export function SubmitButton({ children, variant, size, className, icon }: { children: ReactNode; variant?: ButtonVariant; size?: ButtonSize; className?: string; icon?: ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} size={size} loading={pending} className={className} icon={icon}>
      {children}
    </Button>
  );
}

export function fieldError<T>(state: ActionResult<T>, name: string): string | undefined {
  return state.ok ? undefined : state.fieldErrors?.[name];
}
