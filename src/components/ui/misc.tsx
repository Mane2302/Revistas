import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { MAGAZINE_STATUS, WORK_STATUS, type Tone } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { MagazineStatus, WorkStatus } from "@/types/database";

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("size-5 animate-spin", className)} aria-hidden />;
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("rounded-2xl border border-linea bg-white shadow-tarjeta", className)}>{children}</div>;
}

const TONES: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-700 ring-gray-200",
  blue: "bg-cielo-claro text-cielo-oscuro ring-cielo/20",
  amber: "bg-sol-claro text-[#8a5300] ring-sol/50",
  green: "bg-menta-claro text-[#0b6b49] ring-menta/30",
  red: "bg-red-50 text-red-700 ring-red-200",
  violet: "bg-uva-claro text-uva ring-uva/20",
};

export function Badge({ tone = "gray", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset whitespace-nowrap", TONES[tone], className)}>
      {children}
    </span>
  );
}

export function WorkStatusBadge({ status }: { status: WorkStatus }) {
  const s = WORK_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function MagazineStatusBadge({ status }: { status: MagazineStatus }) {
  const s = MAGAZINE_STATUS[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

const ALERTS: Record<"info" | "success" | "warning" | "error", { icon: LucideIcon; className: string }> = {
  info: { icon: Info, className: "border-cielo/25 bg-cielo-claro/60 text-cielo-oscuro" },
  success: { icon: CheckCircle2, className: "border-menta/30 bg-menta-claro/70 text-[#0b5e43]" },
  warning: { icon: AlertTriangle, className: "border-sol/60 bg-sol-claro text-[#7a4b00]" },
  error: { icon: XCircle, className: "border-red-200 bg-red-50 text-red-800" },
};

export function Alert({ kind = "info", title, children, className }: { kind?: keyof typeof ALERTS; title?: string; children?: ReactNode; className?: string }) {
  const { icon: Icon, className: tone } = ALERTS[kind];
  return (
    <div role={kind === "error" ? "alert" : undefined} className={cn("flex gap-3 rounded-xl border px-4 py-3", tone, className)}>
      <Icon className="mt-0.5 size-5 shrink-0" aria-hidden />
      <div className="space-y-1 text-[0.95rem] leading-snug">
        {title && <p className="font-bold">{title}</p>}
        {children && <div>{children}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, children, action }: { icon: LucideIcon; title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border-2 border-dashed border-linea bg-white/60 px-6 py-12 text-center">
      <span className="mb-4 grid size-14 place-items-center rounded-2xl bg-sol-claro text-[#8a5300]">
        <Icon className="size-7" aria-hidden />
      </span>
      <h3 className="font-display text-lg font-bold">{title}</h3>
      {children && <div className="mt-1 max-w-md text-tinta-suave">{children}</div>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function PageHeader({ title, description, actions, eyebrow }: { title: string; description?: ReactNode; actions?: ReactNode; eyebrow?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && <p className="mb-1 text-sm font-bold tracking-wide text-coral-oscuro uppercase">{eyebrow}</p>}
        <h1 className="font-display text-2xl font-bold text-balance sm:text-3xl">{title}</h1>
        {description && <div className="mt-1.5 max-w-2xl text-tinta-suave">{description}</div>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon, tone, href }: { label: string; value: number | string; icon: LucideIcon; tone: Tone; href?: string }) {
  const content = (
    <Card className="flex items-center gap-4 p-5 transition-transform hover:-translate-y-0.5">
      <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl ring-1 ring-inset", TONES[tone])}>
        <Icon className="size-6" aria-hidden />
      </span>
      <div>
        <p className="font-display text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-sm font-semibold text-tinta-suave">{label}</p>
      </div>
    </Card>
  );
  return href ? (
    <Link href={href} className="block rounded-2xl">
      {content}
    </Link>
  ) : (
    content
  );
}

/** Paginación con enlaces (funciona sin JavaScript y conserva los filtros). */
export function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-between gap-2 text-sm">
      <p className="text-tinta-suave">
        Página {page} de {pages} · {total} en total
      </p>
      <div className="flex gap-2">
        {page > 1 && (
          <Link className="rounded-lg border border-linea bg-white px-3 py-1.5 font-bold hover:bg-cielo-claro" href={hrefFor(page - 1)}>
            Anterior
          </Link>
        )}
        {page < pages && (
          <Link className="rounded-lg border border-linea bg-white px-3 py-1.5 font-bold hover:bg-cielo-claro" href={hrefFor(page + 1)}>
            Siguiente
          </Link>
        )}
      </div>
    </nav>
  );
}
