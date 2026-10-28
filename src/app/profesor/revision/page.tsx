import { BookOpenCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageView } from "@/components/magazine/page-view";
import { ButtonLink } from "@/components/ui/button";
import { Card, EmptyState, PageHeader, Pagination, WorkStatusBadge } from "@/components/ui/misc";
import { requireTeacher } from "@/lib/auth/session";
import { workContentSchema } from "@/lib/document/schema";
import { WORK_KIND_LABEL, WORK_STATUS } from "@/lib/status";
import { buildAssetMap } from "@/lib/storage/assets";
import { cn, formatDate, formatDateTime, pageParam, textParam } from "@/lib/utils";
import type { WorkStatus } from "@/types/database";

export const metadata: Metadata = { title: "Revisión editorial" };

const PAGE_SIZE = 15;
const TABS: Array<{ id: WorkStatus | "todos"; label: string }> = [
  { id: "submitted", label: "En revisión" },
  { id: "changes_requested", label: "Con correcciones" },
  { id: "approved", label: "Aprobados" },
  { id: "rejected", label: "Rechazados" },
  { id: "published", label: "Publicados" },
  { id: "todos", label: "Todos" },
];

export default async function ReviewInbox({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireTeacher();
  const params = await searchParams;
  const estado = (textParam(params.estado) || "submitted") as WorkStatus | "todos";
  const page = pageParam(params.pagina);

  let query = supabase
    .from("articles")
    .select("id, title, kind, status, submitted_at, updated_at, content_json, profiles!articles_author_id_fkey(display_name), groups(name), assignments(title, due_date)", { count: "exact" });
  query = estado === "todos" ? query.neq("status", "draft") : query.eq("status", estado);
  query = query.order(estado === "submitted" ? "submitted_at" : "updated_at", { ascending: estado === "submitted" }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);
  const { data: works, count } = await query;

  // Miniatura de la primera página de cada trabajo (solo los de esta página de resultados).
  const firstPages = (works ?? []).map((w) => {
    const c = workContentSchema.safeParse(w.content_json);
    return c.success ? { page: c.data.pages[0]!, orientation: c.data.orientation } : null;
  });
  const assetIds = firstPages.flatMap((f) => (f ? f.page.elements.flatMap((e) => (e.type === "image" && e.assetId ? [e.assetId] : [])) : []));
  const assets = await buildAssetMap(supabase, assetIds);

  return (
    <>
      <PageHeader title="Revisión editorial" description="Revisa los trabajos que te enviaron, deja comentarios y aprueba los que pasarán a la revista." />
      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t.id}
            href={`/profesor/revision?estado=${t.id}`}
            aria-current={estado === t.id ? "page" : undefined}
            className={cn("rounded-full px-3.5 py-1.5 text-sm font-bold", estado === t.id ? "bg-tinta text-white" : "bg-white text-tinta-suave ring-1 ring-linea hover:text-tinta")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {(works ?? []).length === 0 ? (
        <EmptyState icon={BookOpenCheck} title="No hay trabajos en esta bandeja">
          {estado === "submitted" ? "¡Estás al día! Los trabajos enviados aparecerán aquí." : `No hay trabajos con estado «${estado === "todos" ? "enviado" : WORK_STATUS[estado].label}».`}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-linea">
          {(works ?? []).map((w, i) => {
            const fp = firstPages[i];
            return (
              <div key={w.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                <div className="hidden overflow-hidden rounded border border-linea sm:block">
                  {fp ? <PageView page={fp.page} orientation={fp.orientation} width={fp.orientation === "portrait" ? 54 : 76} assets={assets} /> : <div className="h-[76px] w-[54px] bg-papel" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold">{w.title}</p>
                  <p className="text-sm text-tinta-suave">
                    {WORK_KIND_LABEL[w.kind]} · {w.profiles?.display_name ?? "—"} · {w.groups?.name ?? "Sin grupo"}
                  </p>
                  <p className="text-xs text-tinta-suave">
                    {w.submitted_at ? `Enviado ${formatDateTime(w.submitted_at)}` : `Actualizado ${formatDateTime(w.updated_at)}`}
                    {w.assignments?.due_date && ` · Entrega del proyecto: ${formatDate(w.assignments.due_date)}`}
                  </p>
                </div>
                <WorkStatusBadge status={w.status} />
                <ButtonLink href={`/profesor/revision/${w.id}`} size="sm" variant={w.status === "submitted" ? "primary" : "secondary"}>
                  {w.status === "submitted" ? "Revisar" : "Ver"}
                </ButtonLink>
              </div>
            );
          })}
        </Card>
      )}
      <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} hrefFor={(p) => `/profesor/revision?estado=${estado}&pagina=${p}`} />
    </>
  );
}
