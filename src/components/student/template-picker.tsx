"use client";

import { Loader2 } from "lucide-react";
import { useState, useTransition } from "react";
import type { TemplateOption } from "@/components/editor/editor-context";
import { PageView } from "@/components/magazine/page-view";
import { useToast } from "@/components/ui/toast";
import { createWorkAction } from "@/lib/actions/works";
import { cn } from "@/lib/utils";

export function TemplatePicker({ templates, kind, assignmentId }: { templates: TemplateOption[]; kind: "article" | "cover"; assignmentId: string | null }) {
  const [category, setCategory] = useState<string>("Todas");
  const [chosen, setChosen] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const toast = useToast();
  const categories = ["Todas", ...new Set(templates.map((t) => t.category))];
  const visible = category === "Todas" ? templates : templates.filter((t) => t.category === category);

  const create = (id: string) => {
    setChosen(id);
    start(async () => {
      // Si todo va bien, la acción redirige al editor.
      const res = await createWorkAction({ kind, templateId: id, assignmentId });
      if (res && !res.ok) {
        toast("error", res.message);
        setChosen(null);
      }
    });
  };

  return (
    <>
      <div className="mb-5 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoría">
        {categories.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCategory(c)}
            aria-pressed={category === c}
            className={cn("rounded-full px-3.5 py-1.5 text-sm font-bold", category === c ? "bg-tinta text-white" : "bg-white text-tinta-suave ring-1 ring-linea hover:text-tinta")}
          >
            {c}
          </button>
        ))}
      </div>
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visible.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              disabled={pending}
              onClick={() => create(t.id)}
              className="group relative block w-full rounded-2xl border border-linea bg-white p-3 text-left shadow-tarjeta transition hover:-translate-y-1 hover:border-cielo hover:shadow-flotante disabled:opacity-60"
            >
              <div className="grid place-items-center rounded-xl bg-[#ece8e0] py-4">
                <PageView page={t.page} orientation="portrait" width={170} assets={{}} className="shadow-md" />
              </div>
              <p className="mt-3 font-display font-bold">{t.name}</p>
              <p className="text-sm text-tinta-suave">{t.description}</p>
              <span className="mt-2 inline-block rounded-lg bg-cielo px-3 py-1.5 text-sm font-bold text-white group-hover:bg-cielo-oscuro">Usar esta plantilla</span>
              {pending && chosen === t.id && (
                <span className="absolute inset-0 grid place-items-center rounded-2xl bg-white/80 font-bold">
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-5 animate-spin" /> Preparando tu copia…
                  </span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
