"use client";

import { useState } from "react";
import type { AssetMap } from "@/lib/document/assets";
import type { Orientation, Page } from "@/lib/document/schema";
import { cn } from "@/lib/utils";
import { PageView } from "./page-view";

/** Vista previa de un documento: página grande + miniaturas para navegar. */
export function PagesGallery({ pages, orientation, assets, width = 420 }: { pages: Page[]; orientation: Orientation; assets: AssetMap; width?: number }) {
  const [index, setIndex] = useState(0);
  const page = pages[Math.min(index, pages.length - 1)];
  if (!page) return <p className="text-tinta-suave">Este documento no tiene páginas.</p>;
  const w = orientation === "portrait" ? width : Math.round(width * 1.4);
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="max-w-full overflow-x-auto">
        <PageView page={page} orientation={orientation} width={w} assets={assets} className="rounded-sm shadow-flotante" label={`Página ${index + 1} de ${pages.length}`} />
      </div>
      {pages.length > 1 && (
        <ol className="flex max-w-full gap-2 overflow-x-auto p-1" aria-label="Páginas">
          {pages.map((p, i) => (
            <li key={p.id}>
              <button type="button" onClick={() => setIndex(i)} aria-current={i === index ? "page" : undefined} aria-label={`Ver página ${i + 1}`} className={cn("block rounded p-0.5", i === index ? "ring-3 ring-cielo" : "ring-1 ring-linea")}>
                <PageView page={p} orientation={orientation} width={orientation === "portrait" ? 52 : 72} assets={assets} />
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
