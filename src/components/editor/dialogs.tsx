"use client";

import { ChevronLeft, ChevronRight, Download, FileWarning, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { PageView } from "@/components/magazine/page-view";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/field";
import { Alert, Badge } from "@/components/ui/misc";
import { getAssetMapAction } from "@/lib/actions/media";
import { listApprovedWorksAction, type ApprovedWork } from "@/lib/actions/magazines";
import type { AssetMap } from "@/lib/document/assets";
import { clonePage } from "@/lib/document/factory";
import { collectAssetIds, type EditorDocument, type Orientation, type Page } from "@/lib/document/schema";
import { adaptPageOrientation, planTemplateSwitch } from "@/lib/document/template-switch";
import { browserFontProvider, browserImageProvider, downloadBytes, pdfFileName, preflight } from "@/lib/pdf/browser";
import { buildPdf, PdfImageError, type PdfIssue } from "@/lib/pdf/render-pdf";
import { WORK_STATUS } from "@/lib/status";
import type { TemplateOption } from "./editor-context";

// ---------- Cambio de plantilla con vista previa ----------

export function TemplateDialog({
  template,
  current,
  orientation,
  assets,
  allowAddPage,
  onApply,
  onAddPage,
  onClose,
}: {
  template: TemplateOption | null;
  current: Page;
  orientation: Orientation;
  assets: AssetMap;
  allowAddPage: boolean;
  onApply: (page: Page) => void;
  onAddPage: (page: Page) => void;
  onClose: () => void;
}) {
  const [keepExtras, setKeepExtras] = useState(true);
  const plan = useMemo(() => {
    if (!template) return null;
    const adapted = adaptPageOrientation({ ...template.page, templateId: template.id }, "portrait", orientation);
    return planTemplateSwitch(current, adapted);
  }, [template, current, orientation]);
  if (!template || !plan) return null;
  const result = keepExtras ? plan.resultWithExtras : plan.result;
  const fresh = { ...clonePage(adaptPageOrientation(template.page, "portrait", orientation)), templateId: template.id, pageType: template.page.pageType };
  const thumbWidth = orientation === "portrait" ? 220 : 300;

  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={`Usar la plantilla «${template.name}»`}
      description={template.description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          {allowAddPage && (
            <Button variant="secondary" onClick={() => onAddPage(fresh)}>
              Añadir como página nueva
            </Button>
          )}
          <Button onClick={() => onApply(result)}>Aplicar a esta página</Button>
        </>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        <figure>
          <figcaption className="mb-2 text-sm font-bold">Ahora</figcaption>
          <div className="overflow-hidden rounded-lg border border-linea shadow-sm">
            <PageView page={current} orientation={orientation} width={thumbWidth} assets={assets} />
          </div>
        </figure>
        <figure>
          <figcaption className="mb-2 text-sm font-bold">Con la nueva plantilla</figcaption>
          <div className="overflow-hidden rounded-lg border-2 border-cielo shadow-sm">
            <PageView page={result} orientation={orientation} width={thumbWidth} assets={assets} />
          </div>
        </figure>
      </div>
      <div className="mt-5 space-y-3">
        {plan.moved.length > 0 && <Alert kind="success">Se trasladará tu contenido: {plan.moved.length} elemento(s) con texto o fotos tuyos.</Alert>}
        {plan.unmatched.length > 0 && (
          <Alert kind="warning" title="Parte de tu contenido no tiene un lugar en la nueva plantilla">
            <ul className="mt-1 list-disc pl-5 text-sm">
              {plan.unmatched.map((u) => (
                <li key={u.id}>
                  {u.kind}: {u.preview}
                </li>
              ))}
            </ul>
            <Checkbox className="mt-2" label="Conservar estos elementos encima del nuevo diseño (podrás moverlos)" checked={keepExtras} onChange={(e) => setKeepExtras(e.target.checked)} />
          </Alert>
        )}
        <p className="text-sm text-tinta-suave">Puedes deshacer el cambio con Ctrl+Z. La plantilla original no se modifica.</p>
      </div>
    </Dialog>
  );
}

// ---------- Vista previa de todo el documento ----------

export function PreviewDialog({ open, doc, assets, title, onClose }: { open: boolean; doc: EditorDocument; assets: AssetMap; title: string; onClose: () => void }) {
  const [index, setIndex] = useState(0);
  const i = Math.min(index, doc.pages.length - 1);
  const page = doc.pages[i];
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") setIndex((v) => Math.min(doc.pages.length - 1, v + 1));
      if (e.key === "ArrowLeft") setIndex((v) => Math.max(0, v - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, doc.pages.length]);
  const width = doc.orientation === "portrait" ? 460 : 700;
  return (
    <Dialog open={open} onClose={onClose} title={`Vista previa: ${title}`} size="xl">
      {page && (
        <div className="flex flex-col items-center gap-4">
          <div className="max-w-full overflow-auto rounded-md shadow-flotante">
            <PageView page={page} orientation={doc.orientation} width={width} assets={assets} showPlaceholders={false} label={`Página ${i + 1}`} />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setIndex(i - 1)} disabled={i === 0} icon={<ChevronLeft className="size-4" />}>
              Anterior
            </Button>
            <span className="text-sm font-bold tabular-nums">
              {i + 1} / {doc.pages.length}
            </span>
            <Button variant="secondary" size="sm" onClick={() => setIndex(i + 1)} disabled={i >= doc.pages.length - 1}>
              Siguiente <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

// ---------- Exportación a PDF con revisión previa y progreso ----------

type ExportPhase = { step: "check"; issues: PdfIssue[] } | { step: "working"; done: number; total: number } | { step: "done"; issues: PdfIssue[] } | { step: "error"; message: string };

export function ExportDialog({ open, doc, assets, title, onClose }: { open: boolean; doc: EditorDocument; assets: AssetMap; title: string; onClose: () => void }) {
  const [phase, setPhase] = useState<ExportPhase>({ step: "check", issues: [] });
  const [key, setKey] = useState(0);
  const issues = useMemo(() => (open ? preflight(doc.pages, assets) : []), [open, doc.pages, assets]);
  const blocking = issues.filter((x) => x.severity === "error");

  async function run() {
    setPhase({ step: "working", done: 0, total: doc.pages.length });
    try {
      const { bytes, issues: found } = await buildPdf(doc.pages, {
        title,
        orientation: doc.orientation,
        fonts: browserFontProvider(),
        images: browserImageProvider(assets),
        onProgress: (done, total) => setPhase({ step: "working", done, total }),
      });
      downloadBytes(bytes, pdfFileName(title));
      setPhase({ step: "done", issues: found.filter((x) => !/marco de imagen vacío|en blanco/.test(x.message)) });
    } catch (error) {
      setPhase({
        step: "error",
        message: error instanceof PdfImageError ? `${error.message} Revisa tu conexión y vuelve a intentarlo.` : "No pudimos generar el PDF. Revisa tu conexión y vuelve a intentarlo.",
      });
    }
  }

  const close = () => {
    setPhase({ step: "check", issues: [] });
    setKey((k) => k + 1);
    onClose();
  };
  const working = phase.step === "working";

  return (
    <Dialog
      key={key}
      open={open}
      onClose={close}
      locked={working}
      title="Descargar PDF"
      description={`Tamaño A4 ${doc.orientation === "portrait" ? "vertical" : "horizontal"} · ${doc.pages.length} página(s)`}
      footer={
        phase.step === "check" ? (
          <>
            <Button variant="secondary" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={run} disabled={blocking.length > 0} icon={<Download className="size-4" />}>
              {issues.length > 0 ? "Exportar de todos modos" : "Generar PDF"}
            </Button>
          </>
        ) : phase.step === "working" ? null : (
          <Button onClick={close}>Cerrar</Button>
        )
      }
    >
      {phase.step === "check" && (
        <div className="space-y-3">
          {issues.length === 0 ? (
            <Alert kind="success">Todo listo: no encontramos problemas.</Alert>
          ) : (
            <>
              {blocking.length > 0 && (
                <Alert kind="error" title="No se puede exportar todavía">
                  Hay imágenes que no se han cargado. Espera unos segundos o recarga la página.
                </Alert>
              )}
              <IssueList issues={issues} />
            </>
          )}
        </div>
      )}
      {phase.step === "working" && (
        <div className="space-y-3 py-2" aria-live="polite">
          <p className="flex items-center gap-2 font-bold">
            <Loader2 className="size-5 animate-spin text-cielo" /> Generando página {phase.done} de {phase.total}…
          </p>
          <div className="h-3 overflow-hidden rounded-full bg-cielo-claro">
            <div className="h-full rounded-full bg-cielo transition-all" style={{ width: `${(phase.done / Math.max(1, phase.total)) * 100}%` }} />
          </div>
          <p className="text-sm text-tinta-suave">No cierres esta ventana. Las revistas con muchas fotos pueden tardar un poco.</p>
        </div>
      )}
      {phase.step === "done" && (
        <div className="space-y-3">
          <Alert kind="success" title="PDF descargado">Revisa tu carpeta de descargas.</Alert>
          {phase.issues.length > 0 && (
            <>
              <p className="text-sm font-bold">Te recomendamos revisar:</p>
              <IssueList issues={phase.issues} />
            </>
          )}
        </div>
      )}
      {phase.step === "error" && <Alert kind="error" title="No se generó el PDF">{phase.message}</Alert>}
    </Dialog>
  );
}

function IssueList({ issues }: { issues: PdfIssue[] }) {
  return (
    <ul className="max-h-64 space-y-1.5 overflow-y-auto text-sm">
      {issues.map((x, i) => (
        <li key={i} className="flex gap-2">
          <FileWarning className={x.severity === "error" ? "size-4 shrink-0 text-red-600" : "size-4 shrink-0 text-[#8a5300]"} aria-hidden />
          <span>
            <strong>Página {x.page}:</strong> {x.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---------- Insertar trabajos aprobados en una revista ----------

export function InsertWorkDialog({ open, orientation, onInsert, onClose }: { open: boolean; orientation: Orientation; onInsert: (pages: Page[], assets: AssetMap) => void; onClose: () => void }) {
  const [works, setWorks] = useState<ApprovedWork[] | null>(null);
  const [assets, setAssets] = useState<AssetMap>({});
  useEffect(() => {
    if (!open || works) return;
    let cancelled = false;
    void listApprovedWorksAction().then(async (list) => {
      const map = await getAssetMapAction(list.flatMap((w) => collectAssetIds(w.pages)));
      if (!cancelled) {
        setAssets(map);
        setWorks(list);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, works]);

  return (
    <Dialog open={open} onClose={onClose} size="lg" title="Insertar trabajos aprobados" description="Se insertará una copia: el trabajo original del alumno no se modifica.">
      {!works ? (
        <p className="flex items-center gap-2 text-tinta-suave">
          <Loader2 className="size-4 animate-spin" /> Cargando trabajos aprobados…
        </p>
      ) : works.length === 0 ? (
        <p className="text-tinta-suave">Todavía no hay trabajos aprobados. Apruébalos desde «Revisión».</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-3">
          {works.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                className="w-full rounded-xl border border-linea p-2 text-left hover:border-cielo hover:bg-cielo-claro/40"
                onClick={() =>
                  onInsert(
                    w.pages.map((p) => ({ ...clonePage(adaptPageOrientation(p, "portrait", orientation)), pageType: w.kind === "cover" ? "cover" : "article", sourceArticleId: w.id })),
                    assets,
                  )
                }
              >
                {w.pages[0] && <PageView page={w.pages[0]} orientation="portrait" width={150} assets={assets} className="mx-auto" />}
                <span className="mt-2 block text-sm leading-tight font-bold">{w.title}</span>
                <span className="block text-xs text-tinta-suave">
                  {w.author} · {w.pages.length} pág.
                </span>
                <Badge tone={WORK_STATUS[w.status as keyof typeof WORK_STATUS]?.tone ?? "gray"} className="mt-1">
                  {WORK_STATUS[w.status as keyof typeof WORK_STATUS]?.label ?? w.status}
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  );
}
