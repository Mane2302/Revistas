"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export const SWATCHES = [
  "#1d1b33", "#111827", "#374151", "#6b7280", "#ffffff",
  "#ff5a5f", "#e63946", "#b91c1c", "#ea580c", "#ffc145",
  "#facc15", "#16a34a", "#0f766e", "#22d3ee", "#3d5afe",
  "#2563eb", "#7c3aed", "#be185d", "#ff6fae", "#b08d57",
];

export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("space-y-3 border-b border-linea px-4 py-4 last:border-b-0", className)}>
      <h3 className="text-xs font-extrabold tracking-wider text-tinta-suave uppercase">{title}</h3>
      {children}
    </section>
  );
}

export function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1 block text-sm font-bold">
      {children}
    </label>
  );
}

const inputClass =
  "h-9 w-full rounded-lg border border-linea bg-white px-2.5 text-sm focus:border-cielo focus:outline-none focus:ring-2 focus:ring-cielo/20";

/** Campo numérico que valida al confirmar: nunca deja valores fuera de rango. */
export function NumberInput({ label, value, onChange, min, max, step = 1, unit }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit?: string }) {
  const id = useId();
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const n = Number(draft.replace(",", "."));
    if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n / step) * step)));
    setDraft(null);
  };
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          className={cn(inputClass, unit && "pr-9")}
          value={draft ?? String(Math.round(value * 100) / 100)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              onChange(Math.min(max, Math.max(min, value + (e.key === "ArrowUp" ? step : -step))));
            }
          }}
        />
        {unit && <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-tinta-suave">{unit}</span>}
      </div>
    </div>
  );
}

export function RangeInput({ label, value, onChange, min, max, step, format }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number; step: number; format?: (v: number) => string }) {
  const id = useId();
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="text-xs font-bold text-tinta-suave tabular-nums">{format ? format(value) : value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-cielo" />
    </div>
  );
}

export function ColorInput({ label, value, onChange, allowNone }: { label: string; value: string | null; onChange: (v: string | null) => void; allowNone?: boolean }) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {allowNone && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-pressed={value === null}
            className={cn("relative size-7 overflow-hidden rounded-md border border-linea bg-white", value === null && "ring-2 ring-cielo ring-offset-1")}
            title="Sin color"
            aria-label="Sin color"
          >
            <span className="absolute inset-0 m-auto h-0.5 w-9 -rotate-45 bg-red-500" />
          </button>
        )}
        {SWATCHES.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            aria-pressed={value?.toLowerCase() === c}
            className={cn("size-7 rounded-md border border-black/10", value?.toLowerCase() === c && "ring-2 ring-cielo ring-offset-1")}
            style={{ background: c }}
            title={c}
            aria-label={`Color ${c}`}
          />
        ))}
        <input id={id} type="color" value={value ?? "#ffffff"} onChange={(e) => onChange(e.target.value)} className="size-7 cursor-pointer rounded-md border border-linea bg-white p-0.5" title="Otro color" aria-label={`${label}: otro color`} />
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string; icon?: ReactNode }>; onChange: (v: T) => void }) {
  return (
    <div>
      <span className="mb-1 block text-sm font-bold">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex rounded-lg border border-linea bg-papel p-0.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            title={o.label}
            className={cn("flex h-8 flex-1 items-center justify-center gap-1 rounded-md text-sm font-bold transition-colors", value === o.value ? "bg-white text-cielo-oscuro shadow-sm" : "text-tinta-suave hover:text-tinta")}
          >
            {o.icon ?? o.label}
            {o.icon && <span className="sr-only">{o.label}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ToolButton({ label, onClick, children, pressed, disabled, className }: { label: string; onClick: () => void; children: ReactNode; pressed?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-9 place-items-center rounded-lg text-tinta transition-colors hover:bg-tinta/5 disabled:opacity-35",
        pressed && "bg-cielo-claro text-cielo-oscuro",
        className,
      )}
    >
      {children}
    </button>
  );
}
