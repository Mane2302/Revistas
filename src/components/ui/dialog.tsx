"use client";

import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  /** Impide cerrar con Escape o clic fuera (p. ej. mientras se guarda). */
  locked?: boolean;
}

const SIZES = { sm: "max-w-md", md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-6xl" };

/** Diálogo modal accesible basado en <dialog>: atrapa el foco y se cierra con Escape. */
export function Dialog({ open, onClose, title, description, children, footer, size = "md", locked }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!locked) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !locked) onClose();
      }}
      className={cn(
        "m-auto w-[calc(100%-2rem)] rounded-2xl bg-white p-0 text-tinta shadow-flotante open:animate-aparecer",
        SIZES[size],
      )}
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-linea px-6 py-4">
            <div>
              <h2 id={titleId} className="font-display text-lg font-bold">
                {title}
              </h2>
              {description && <div className="mt-1 text-sm text-tinta-suave">{description}</div>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={locked}
              className="rounded-lg p-1.5 text-tinta-suave hover:bg-tinta/5 disabled:opacity-40"
              aria-label="Cerrar"
            >
              <X className="size-5" />
            </button>
          </header>
          <div className="overflow-y-auto px-6 py-5">{children}</div>
          {footer && <footer className="flex flex-wrap justify-end gap-2 border-t border-linea px-6 py-4">{footer}</footer>}
        </div>
      )}
    </dialog>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, loading, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      locked={loading}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={loading}>
            Cancelar
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="text-[0.95rem] leading-relaxed">{message}</div>
    </Dialog>
  );
}
