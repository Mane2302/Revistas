"use client";

import {
  BookOpenCheck,
  FileClock,
  FolderKanban,
  HardDrive,
  Home,
  ImageIcon,
  LayoutTemplate,
  LogOut,
  Menu,
  Newspaper,
  ScrollText,
  Settings,
  Shield,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Logo } from "@/components/brand";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const TEACHER_NAV = [
  { href: "/profesor", label: "Inicio", icon: Home },
  { href: "/profesor/grupos", label: "Grupos", icon: UsersRound },
  { href: "/profesor/alumnos", label: "Alumnos", icon: Users },
  { href: "/profesor/proyectos", label: "Proyectos", icon: FolderKanban },
  { href: "/profesor/revision", label: "Revisión", icon: BookOpenCheck },
  { href: "/profesor/revistas", label: "Revistas", icon: Newspaper },
  { href: "/profesor/publicaciones", label: "Publicaciones", icon: FileClock },
  { href: "/profesor/plantillas", label: "Plantillas", icon: LayoutTemplate },
  { href: "/profesor/almacenamiento", label: "Imágenes y espacio", icon: HardDrive },
  { href: "/profesor/equipo", label: "Profesores", icon: Shield },
  { href: "/profesor/auditoria", label: "Registro de cambios", icon: ScrollText },
  { href: "/profesor/ajustes", label: "Ajustes", icon: Settings },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <ul className="space-y-0.5">
      {TEACHER_NAV.map(({ href, label, icon: Icon }) => {
        const active = href === "/profesor" ? pathname === href : pathname.startsWith(href);
        return (
          <li key={href}>
            <Link
              href={href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 font-bold transition-colors",
                active ? "bg-cielo text-white shadow-sm" : "text-tinta-suave hover:bg-tinta/5 hover:text-tinta",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function UserBox({ name, role }: { name: string; role: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-papel p-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sol font-bold text-tinta">{name.trim().charAt(0).toUpperCase()}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{name}</p>
        <p className="text-xs text-tinta-suave">{role}</p>
      </div>
      <form action={logoutAction}>
        <button type="submit" className="rounded-lg p-2 text-tinta-suave hover:bg-white hover:text-coral-oscuro" aria-label="Cerrar sesión" title="Cerrar sesión">
          <LogOut className="size-5" />
        </button>
      </form>
    </div>
  );
}

export function TeacherShell({ name, children }: { name: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col gap-4 border-r border-linea bg-white p-4 lg:flex">
        <Logo href="/profesor" />
        <nav aria-label="Panel del profesor" className="flex-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <Link href="/cambiar-contrasena" className="px-3 text-sm font-bold text-tinta-suave hover:text-tinta">
          Cambiar mi contraseña
        </Link>
        <UserBox name={name} role="Profesor" />
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-linea bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <Logo href="/profesor" />
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-tinta/5" aria-label="Abrir menú">
          <Menu className="size-6" />
        </button>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-tinta/40" onClick={() => setOpen(false)} aria-label="Cerrar menú" />
          <div className="absolute inset-y-0 left-0 flex w-72 animate-aparecer flex-col gap-4 overflow-y-auto bg-white p-4">
            <div className="flex items-center justify-between">
              <Logo href="/profesor" />
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg p-2 hover:bg-tinta/5" aria-label="Cerrar menú">
                <X className="size-5" />
              </button>
            </div>
            <NavLinks onNavigate={() => setOpen(false)} />
            <UserBox name={name} role="Profesor" />
          </div>
        </div>
      )}

      <main id="contenido" className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
        {children}
      </main>
    </div>
  );
}

export function StudentShell({ name, children }: { name: string; children: ReactNode }) {
  const pathname = usePathname();
  const links = [
    { href: "/alumno", label: "Mis trabajos", icon: Home },
    { href: "/alumno/imagenes", label: "Mis imágenes", icon: ImageIcon },
  ];
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-linea bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3 sm:px-6">
          <Logo href="/alumno" compact />
          <nav aria-label="Panel del alumno" className="flex flex-1 gap-1">
            {links.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? "page" : undefined}
                className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold", pathname === href ? "bg-cielo-claro text-cielo-oscuro" : "text-tinta-suave hover:bg-tinta/5")}
              >
                <Icon className="size-4" aria-hidden />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            ))}
          </nav>
          <div className="w-auto sm:w-64">
            <UserBox name={name} role="Alumno" />
          </div>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {children}
      </main>
    </div>
  );
}
