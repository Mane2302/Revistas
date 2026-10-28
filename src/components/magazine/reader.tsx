"use client";

import { ChevronLeft, ChevronRight, FileDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ExportDialog } from "@/components/editor/dialogs";
import { Button } from "@/components/ui/button";
import type { AssetMap } from "@/lib/document/assets";
import { pageSize } from "@/lib/document/geometry";
import type { Orientation, Page } from "@/lib/document/schema";
import { cn } from "@/lib/utils";
import { PageView } from "./page-view";

interface ReaderProps {
  title: string;
  orientation: Orientation;
  pages: Page[];
  assets: AssetMap;
  allowPdf: boolean;
  autoPdf: boolean;
}

/** Lector de solo lectura: navegación por páginas con botones, teclado y miniaturas. */
export function Reader({ title, orientation, pages, assets, allowPdf, autoPdf }: ReaderProps) {
  const [index, setIndex] = useState(0);
  const [width, setWidth] = useState(480);
  const [exporting, setExporting] = useState(allowPdf && autoPdf);
  const area = useRef<HTMLDivElement>(null);
  const { w, h } = pageSize(orientation);

  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const update = () => {
      const maxH = window.innerHeight - 220;
      setWidth(Math.max(260, Math.min(el.clientWidth - 16, (maxH * w) / h, 900)));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [w, h]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "PageDown") setIndex((i) => Math.min(pages.length - 1, i + 1));
      if (e.key === "ArrowLeft" || e.key === "PageUp") setIndex((i) => Math.max(0, i - 1));
      if (e.key === "Home") setIndex(0);
      if (e.key === "End") setIndex(pages.length - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pages.length]);

  const page = pages[index];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-bold text-tinta-suave" aria-live="polite">
          Página {index + 1} de {pages.length}
        </p>
        {allowPdf && (
          <Button variant="secondary" size="sm" icon={<FileDown className="size-4" />} onClick={() => setExporting(true)}>
            Descargar PDF
          </Button>
        )}
      </div>
      <div ref={area} className="flex w-full items-center justify-center gap-2">
        <button type="button" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} className="hidden rounded-full bg-white p-3 shadow-tarjeta hover:bg-cielo-claro disabled:opacity-30 sm:block" aria-label="Página anterior">
          <ChevronLeft className="size-6" />
        </button>
        {page && <PageView key={page.id} page={page} orientation={orientation} width={width} assets={assets} showPlaceholders={false} className="animate-aparecer shadow-flotante" label={`Página ${index + 1}`} />}
        <button type="button" onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))} disabled={index >= pages.length - 1} className="hidden rounded-full bg-white p-3 shadow-tarjeta hover:bg-cielo-claro disabled:opacity-30 sm:block" aria-label="Página siguiente">
          <ChevronRight className="size-6" />
        </button>
      </div>
      <div className="flex gap-3 sm:hidden">
        <Button variant="secondary" onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} icon={<ChevronLeft className="size-4" />}>
          Anterior
        </Button>
        <Button variant="secondary" onClick={() => setIndex((i) => Math.min(pages.length - 1, i + 1))} disabled={index >= pages.length - 1}>
          Siguiente <ChevronRight className="size-4" />
        </Button>
      </div>
      <ol className="flex max-w-full gap-2 overflow-x-auto p-1" aria-label="Todas las páginas">
        {pages.map((p, i) => (
          <li key={p.id}>
            <button type="button" onClick={() => setIndex(i)} aria-current={i === index ? "page" : undefined} aria-label={`Ir a la página ${i + 1}`} className={cn("block rounded p-0.5", i === index ? "ring-3 ring-cielo" : "ring-1 ring-linea")}>
              <PageView page={p} orientation={orientation} width={orientation === "portrait" ? 48 : 68} assets={assets} showPlaceholders={false} />
            </button>
          </li>
        ))}
      </ol>
      {allowPdf && <ExportDialog open={exporting} doc={{ orientation, pages }} assets={assets} title={title} onClose={() => setExporting(false)} />}
    </div>
  );
}
