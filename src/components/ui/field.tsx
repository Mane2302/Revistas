import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const control =
  "w-full rounded-xl border border-linea bg-white px-3.5 text-[0.95rem] text-tinta placeholder:text-tinta-suave/60 " +
  "transition-colors hover:border-tinta-suave/40 focus:border-cielo focus:outline-none focus:ring-3 focus:ring-cielo/20 " +
  "disabled:bg-papel disabled:text-tinta-suave aria-[invalid=true]:border-red-500";

export function Input({ className, ...rest }: ComponentProps<"input">) {
  return <input className={cn(control, "h-11", className)} {...rest} />;
}

export function Textarea({ className, ...rest }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 py-2.5 leading-relaxed", className)} {...rest} />;
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={cn(control, "h-11 cursor-pointer pr-8", className)} {...rest}>
      {children}
    </select>
  );
}

export function Label({ className, ...rest }: ComponentProps<"label">) {
  return <label className={cn("block text-sm font-bold text-tinta", className)} {...rest} />;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, hint, error, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="text-sm font-semibold text-red-700" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="text-sm text-tinta-suave">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function Checkbox({ label, className, ...rest }: ComponentProps<"input"> & { label: ReactNode }) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-2.5 text-[0.95rem]", className)}>
      <input type="checkbox" className="mt-0.5 size-5 shrink-0 cursor-pointer accent-cielo" {...rest} />
      <span>{label}</span>
    </label>
  );
}
