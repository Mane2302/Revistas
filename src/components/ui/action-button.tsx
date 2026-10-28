"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/lib/errors";
import { Button, type ButtonSize, type ButtonVariant } from "./button";
import { ConfirmDialog } from "./dialog";
import { useToast } from "./toast";

interface ActionButtonProps<T> {
  action: () => Promise<ActionResult<T>>;
  children: ReactNode;
  confirm?: { title: string; message: ReactNode; confirmLabel: string; danger?: boolean };
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
  onDone?: (result: ActionResult<T>) => void;
}

/** Botón que ejecuta una Server Action, con confirmación opcional, estado de carga y aviso del resultado. */
export function ActionButton<T>({ action, children, confirm, variant = "secondary", size = "sm", icon, className, onDone }: ActionButtonProps<T>) {
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const toast = useToast();
  const router = useRouter();

  const run = () =>
    start(async () => {
      try {
        const res = await action();
        if (res.message) toast(res.ok ? "success" : "error", res.message);
        setAsking(false);
        onDone?.(res);
        router.refresh();
      } catch {
        toast("error", "No pudimos completar la acción. Revisa tu conexión.");
        setAsking(false);
      }
    });

  return (
    <>
      <Button variant={variant} size={size} icon={icon} className={className} loading={pending && !asking} onClick={() => (confirm ? setAsking(true) : run())}>
        {children}
      </Button>
      {confirm && (
        <ConfirmDialog
          open={asking}
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          danger={confirm.danger}
          loading={pending}
          onCancel={() => setAsking(false)}
          onConfirm={run}
        />
      )}
    </>
  );
}
