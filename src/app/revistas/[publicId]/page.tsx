import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand";
import { Reader } from "@/components/magazine/reader";
import { getPublication, publicationAssets } from "@/lib/data/publications";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ publicId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { publicId } = await params;
  const magazine = await getPublication(await createClient(), publicId);
  return { title: magazine?.title ?? "Revista no disponible" };
}

export default async function PublicMagazinePage({ params, searchParams }: Props) {
  const { publicId } = await params;
  const magazine = await getPublication(await createClient(), publicId);
  // Si no está publicada (o es privada y no hay sesión), se responde 404 sin dar más detalles.
  if (!magazine) notFound();
  const assets = await publicationAssets(magazine.pages);
  const autoPdf = (await searchParams).pdf === "1";

  return (
    <div className="min-h-dvh bg-[#ece8e0]">
      <header className="border-b border-linea bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Logo />
          <Link href="/revistas" className="text-sm font-bold text-cielo-oscuro hover:underline">
            Más revistas
          </Link>
        </div>
      </header>
      <main id="contenido" className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 text-center">
          <h1 className="font-display text-2xl font-bold sm:text-3xl">{magazine.title}</h1>
          <p className="text-sm text-tinta-suave">
            {[magazine.editionLabel, magazine.schoolCycle, `Publicada el ${formatDate(magazine.publishedAt)}`].filter(Boolean).join(" · ")}
          </p>
          {magazine.description && <p className="mx-auto mt-1 max-w-2xl text-tinta-suave">{magazine.description}</p>}
        </div>
        <Reader title={magazine.title} orientation={magazine.orientation} pages={magazine.pages} assets={assets} allowPdf={magazine.allowPdf} autoPdf={autoPdf} />
      </main>
    </div>
  );
}
