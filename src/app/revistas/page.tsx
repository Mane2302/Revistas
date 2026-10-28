import { BookOpen } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand";
import { PageView } from "@/components/magazine/page-view";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { publicationAssets } from "@/lib/data/publications";
import { pageSchema, type Page } from "@/lib/document/schema";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Revistas publicadas" };
// Siempre se consulta la base de datos: una revista retirada debe desaparecer al instante.
export const dynamic = "force-dynamic";

export default async function PublicCatalog() {
  let items: Array<{ publicId: string; title: string; publishedAt: string; orientation: "portrait" | "landscape"; cover: Page | null }> = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    // Solo publicaciones vigentes y públicas; la portada se toma de la instantánea publicada.
    const { data } = await supabase
      .from("magazine_publications")
      .select("public_id, title, orientation, published_at, snapshot")
      .eq("is_current", true)
      .eq("visibility", "public")
      .order("published_at", { ascending: false })
      .limit(48);
    items = (data ?? []).map((p) => {
      const pages = (p.snapshot as { pages?: unknown[] } | null)?.pages;
      const cover = pageSchema.safeParse(Array.isArray(pages) ? pages[0] : null);
      return { publicId: p.public_id, title: p.title, publishedAt: p.published_at, orientation: p.orientation, cover: cover.success ? cover.data : null };
    });
  }
  const assets = await publicationAssets(items.flatMap((i) => (i.cover ? [i.cover] : [])));

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <ButtonLink href="/ingresar" variant="secondary">
          Iniciar sesión
        </ButtonLink>
      </header>
      <main id="contenido" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <h1 className="font-display text-3xl font-bold">Revistas publicadas</h1>
        <p className="mt-1 mb-8 text-tinta-suave">Ediciones hechas por estudiantes y autorizadas por sus profesores.</p>
        {items.length === 0 ? (
          <EmptyState icon={BookOpen} title="Todavía no hay revistas públicas">
            Cuando un profesor publique una revista aparecerá aquí.
          </EmptyState>
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((m) => (
              <li key={m.publicId}>
                <Link href={`/revistas/${m.publicId}`} className="group block">
                  <div className="grid h-72 place-items-center rounded-2xl bg-[#ece8e0] transition group-hover:-translate-y-1">
                    {m.cover ? <PageView page={m.cover} orientation={m.orientation} width={m.orientation === "portrait" ? 180 : 240} assets={assets} showPlaceholders={false} className="shadow-flotante" /> : <BookOpen className="size-10 text-tinta-suave" />}
                  </div>
                  <h2 className="mt-3 font-display leading-tight font-bold">{m.title}</h2>
                  <p className="text-sm text-tinta-suave">Publicada el {formatDate(m.publishedAt)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
