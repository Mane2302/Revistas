"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export type ToastKind = "success" | "error" | "warning" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastContext = createContext<((kind: ToastKind, message: string) => void) | null>(null);

const STYLES: Record<ToastKind, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "border-menta/40 bg-menta-claro text-[#0b5e43]" },
  error: { icon: XCircle, className: "border-red-300 bg-red-50 text-red-800" },
  warning: { icon: AlertTriangle, className: "border-sol bg-sol-claro text-[#7a4b00]" },
  info: { icon: Info, className: "border-cielo/30 bg-cielo-claro text-cielo-oscuro" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const counter = useRef(0);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (kind: ToastKind, message: string) => {
      const id = ++counter.current;
      setItems((list) => [...list.slice(-3), { id, kind, message }]);
      window.setTimeout(() => dismiss(id), kind === "error" ? 8000 : 5000);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4 sm:items-end sm:pr-6">
        {items.map((t) => {
          const { icon: Icon, className } = STYLES[t.kind];
          return (
            <div
              key={t.id}
              role={t.kind === "error" ? "alert" : "status"}
              className={cn("pointer-events-auto flex w-full max-w-sm animate-aparecer items-start gap-3 rounded-xl border px-4 py-3 shadow-flotante", className)}
            >
              <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
              <p className="flex-1 text-[0.95rem] font-semibold leading-snug">{t.message}</p>
              <button type="button" onClick={() => dismiss(t.id)} className="rounded p-0.5 opacity-70 hover:opacity-100" aria-label="Cerrar aviso">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast debe usarse dentro de ToastProvider");
  return ctx;
}
