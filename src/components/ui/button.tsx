import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Spinner } from "./misc";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-cielo text-white hover:bg-cielo-oscuro shadow-sm",
  accent: "bg-coral-oscuro text-white hover:bg-[#b02c31] shadow-sm",
  secondary: "bg-white text-tinta border border-linea hover:bg-cielo-claro/60 hover:border-cielo/40",
  ghost: "text-tinta hover:bg-tinta/5",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-11 px-4 text-[0.95rem] gap-2 rounded-xl",
  lg: "h-14 px-6 text-lg gap-2.5 rounded-2xl",
};

export function buttonClasses(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string): string {
  return cn(
    "inline-flex items-center justify-center font-bold transition-[background-color,border-color,transform] duration-150",
    "active:scale-[0.98] disabled:opacity-55 disabled:pointer-events-none select-none whitespace-nowrap",
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

type ButtonProps = ComponentProps<"button"> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({ variant, size, loading, icon, className, children, disabled, type = "button", ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <Spinner className="size-4" /> : icon}
      {children}
    </button>
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & { variant?: ButtonVariant; size?: ButtonSize; icon?: ReactNode };

export function ButtonLink({ variant, size, icon, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {icon}
      {children}
    </Link>
  );
}
