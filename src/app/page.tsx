import { BookOpen, ImagePlus, LayoutTemplate, PenLine, ShieldCheck, Type } from "lucide-react";
import Link from "next/link";
import { HeroIllustration, Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";

const FEATURES = [
  { icon: LayoutTemplate, title: "21 plantillas", text: "Portadas, noticias, entrevistas, reportajes, ciencia, deportes y más.", color: "bg-cielo-claro text-cielo-oscuro" },
  { icon: Type, title: "12 tipografías", text: "Elige letras elegantes, modernas o divertidas sin perder legibilidad.", color: "bg-coral-claro text-coral-oscuro" },
  { icon: ImagePlus, title: "Tus fotografías", text: "Sube imágenes, recórtalas y acomódalas donde quieras.", color: "bg-sol-claro text-[#8a5300]" },
  { icon: PenLine, title: "Revisión del profesor", text: "Envía tu artículo, recibe comentarios y mejóralo.", color: "bg-menta-claro text-[#0b6b49]" },
];

export default function HomePage() {
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2" aria-label="Principal">
          <Link href="/revistas" className="hidden rounded-lg px-3 py-2 font-bold hover:bg-tinta/5 sm:block">
            Revistas publicadas
          </Link>
          <ButtonLink href="/ingresar">Iniciar sesión</ButtonLink>
        </nav>
      </header>

      <main id="contenido">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-2 lg:pt-14">
          <div className="animate-aparecer">
            <p className="mb-3 inline-flex rounded-full bg-sol-claro px-3 py-1 text-sm font-bold text-[#7a4b00]">Tecnología · 1.° de secundaria</p>
            <h1 className="font-display text-4xl leading-[1.05] font-bold tracking-tight text-balance uppercase sm:text-6xl">
              Revista Escolar <span className="text-coral-oscuro">Digital</span>
            </h1>
            <p className="mt-4 font-serif text-2xl text-tinta-suave italic sm:text-3xl">«Imagina, escribe, diseña y publica».</p>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-tinta-suave">
              Crea portadas y artículos con un editor visual, elige tipografías y colores, agrega tus fotografías y publica la revista de tu grupo.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/ingresar" size="lg">
                Entrar a mi cuenta
              </ButtonLink>
              <ButtonLink href="/revistas" size="lg" variant="secondary" icon={<BookOpen className="size-5" />}>
                Leer revistas
              </ButtonLink>
            </div>
          </div>
          <HeroIllustration className="mx-auto w-full max-w-lg drop-shadow-sm" />
        </section>

        <section className="border-t border-linea bg-white/70">
          <div className="mx-auto grid max-w-6xl gap-4 px-4 py-14 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, text, color }) => (
              <div key={title} className="rounded-2xl border border-linea bg-white p-5 shadow-tarjeta">
                <span className={`mb-3 grid size-11 place-items-center rounded-xl ${color}`}>
                  <Icon className="size-6" aria-hidden />
                </span>
                <h2 className="font-display font-bold">{title}</h2>
                <p className="mt-1 text-tinta-suave">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-4 rounded-2xl bg-tinta p-6 text-white sm:flex-row sm:items-center sm:p-8">
            <ShieldCheck className="size-10 shrink-0 text-sol" aria-hidden />
            <div>
              <h2 className="font-display text-xl font-bold">Un espacio seguro para aprender</h2>
              <p className="mt-1 text-white/80">
                Las cuentas las crea tu profesor: no necesitas correo electrónico. Tus borradores son privados y nada se publica sin su autorización.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-linea py-6 text-center text-sm text-tinta-suave">
        <Link href="/privacidad" className="font-bold underline-offset-2 hover:underline">
          Aviso de privacidad
        </Link>{" "}
        · Sin publicidad ni seguimiento.
      </footer>
    </div>
  );
}
