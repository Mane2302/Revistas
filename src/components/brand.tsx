import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect x="4" y="6" width="24" height="30" rx="3" fill="#3d5afe" transform="rotate(-8 16 21)" />
      <rect x="11" y="4" width="24" height="30" rx="3" fill="#ffffff" stroke="#1d1b33" strokeWidth="2" />
      <rect x="15" y="9" width="16" height="4" rx="1.5" fill="#ff5a5f" />
      <rect x="15" y="16" width="16" height="9" rx="1.5" fill="#ffc145" />
      <rect x="15" y="28" width="11" height="2" rx="1" fill="#1d1b33" />
    </svg>
  );
}

export function Logo({ href = "/", compact }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5 rounded-lg" aria-label="Revista Escolar Digital, inicio">
      <LogoMark />
      {!compact && (
        <span className="font-display text-[0.95rem] leading-none font-bold tracking-tight uppercase">
          Revista Escolar
          <span className="block text-coral-oscuro">Digital</span>
        </span>
      )}
    </Link>
  );
}

/** Ilustración original: revistas, fotografías y lápiz (sin personas). */
export function HeroIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 480 400" className={className} role="img" aria-label="Ilustración de revistas, fotografías y un lápiz">
      <circle cx="250" cy="200" r="170" fill="#fff3d6" />
      <circle cx="400" cy="70" r="28" fill="#ffc145" />
      <circle cx="70" cy="320" r="18" fill="#ff5a5f" opacity="0.8" />
      {/* revista de fondo */}
      <g transform="rotate(-10 180 210)">
        <rect x="95" y="80" width="170" height="230" rx="10" fill="#3d5afe" />
        <rect x="112" y="100" width="136" height="22" rx="4" fill="#ffffff" opacity="0.9" />
        <rect x="112" y="134" width="136" height="100" rx="6" fill="#8ea0ff" />
        <rect x="112" y="246" width="100" height="10" rx="5" fill="#ffffff" opacity="0.7" />
        <rect x="112" y="264" width="80" height="10" rx="5" fill="#ffffff" opacity="0.5" />
      </g>
      {/* revista principal */}
      <g transform="rotate(5 300 210)">
        <rect x="215" y="70" width="180" height="245" rx="10" fill="#ffffff" stroke="#1d1b33" strokeWidth="4" />
        <rect x="235" y="92" width="140" height="24" rx="4" fill="#1d1b33" />
        <rect x="235" y="128" width="140" height="96" rx="6" fill="#ffe4e2" />
        <path d="M245 210 l30 -38 l22 26 l16 -18 l32 30 z" fill="#ff5a5f" />
        <circle cx="345" cy="152" r="10" fill="#ffc145" />
        <rect x="235" y="236" width="140" height="9" rx="4.5" fill="#1d1b33" opacity="0.85" />
        <rect x="235" y="254" width="110" height="8" rx="4" fill="#55536f" opacity="0.5" />
        <rect x="235" y="270" width="124" height="8" rx="4" fill="#55536f" opacity="0.5" />
        <rect x="235" y="286" width="90" height="8" rx="4" fill="#55536f" opacity="0.5" />
      </g>
      {/* fotografía instantánea */}
      <g transform="rotate(-14 105 300)">
        <rect x="45" y="235" width="110" height="125" rx="6" fill="#ffffff" stroke="#1d1b33" strokeWidth="3" />
        <rect x="56" y="246" width="88" height="80" rx="3" fill="#dcf7ec" />
        <path d="M58 322 l25 -30 l18 20 l14 -14 l27 24 z" fill="#0f9f6e" />
        <circle cx="125" cy="266" r="8" fill="#ffc145" />
      </g>
      {/* lápiz */}
      <g transform="rotate(35 400 300)">
        <rect x="360" y="285" width="110" height="20" rx="4" fill="#ffc145" stroke="#1d1b33" strokeWidth="3" />
        <path d="M360 285 l-24 10 l24 10 z" fill="#ffe4b0" stroke="#1d1b33" strokeWidth="3" strokeLinejoin="round" />
        <rect x="455" y="285" width="15" height="20" rx="3" fill="#ff5a5f" stroke="#1d1b33" strokeWidth="3" />
      </g>
      {/* destellos */}
      <path d="M420 170 l6 14 l14 6 l-14 6 l-6 14 l-6 -14 l-14 -6 l14 -6 z" fill="#3d5afe" />
      <path d="M80 110 l4 10 l10 4 l-10 4 l-4 10 l-4 -10 l-10 -4 l10 -4 z" fill="#7c3aed" />
    </svg>
  );
}
