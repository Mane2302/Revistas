"use client";

import {
  ArrowLeft,
  CheckCircle2,
  CloudOff,
  Eye,
  FileDown,
  Loader2,
  PanelLeft,
  PanelRight,
  Redo2,
  Save,
  Send,
  TriangleAlert,
  Undo2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog, Dialog } from "@/components/ui/dialog";
import { Alert } from "@/components/ui/misc";
import { useToast } from "@/components/ui/toast";
import { saveMagazineAction } from "@/lib/actions/magazines";
import { listMyMediaAction, type MediaItem } from "@/lib/actions/media";
import { submitWorkAction } from "@/lib/actions/works";
import type { AssetMap } from "@/lib/document/assets";
import { cloneElement, createImageElement } from "@/lib/document/factory";
import { pageSize } from "@/lib/document/geometry";
import { saveWorkAction } from "@/lib/actions/works";
import { LIMITS, type EditorDocument, type Page, type PageElement } from "@/lib/document/schema";
import { uploadImageFile } from "@/lib/storage/upload-client";
import { cn, formatDateTime } from "@/lib/utils";
import type { WorkStatus } from "@/types/database";
import { Canvas } from "./canvas";
import { ToolButton } from "./controls";
import { EditorContext, type EditorContextValue, type LeftTab, type TemplateOption } from "./editor-context";
import { ExportDialog, InsertWorkDialog, PreviewDialog, TemplateDialog } from "./dialogs";
import { PagesStrip } from "./pages-strip";
import { PropertiesPanel } from "./properties-panel";
import { currentPage, editorReducer, initEditorState } from "./state";
import { clearBackup, readBackup, useAutosave, type LocalBackup, type SaveStatus } from "./use-autosave";
import { ToolsPanel } from "./tools-panel";

export interface EditorProps {
  mode: "work" | "magazine";
  id: string;
  workKind: "article" | "cover" | null;
  status?: WorkStatus;
  initialTitle: string;
  initialDoc: EditorDocument;
  initialVersion: number;
  initialAssets: AssetMap;
  templates: TemplateOption[];
  readOnly: boolean;
  readOnlyReason?: string;
  backHref: string;
  imageNotice: string;
  maxImageMb: number;
  canSubmit: boolean;
}

const STATUS_UI: Record<SaveStatus, { label: string; className: string; icon: typeof Save }> = {
  saved: { label: "Guardado", className: "text-[#0b6b49]", icon: CheckCircle2 },
  pending: { label: "Cambios pendientes", className: "text-tinta-suave", icon: Save },
  saving: { label: "Guardando…", className: "text-cielo-oscuro", icon: Loader2 },
  error: { label: "Error al guardar", className: "text-red-700", icon: TriangleAlert },
  offline: { label: "Sin conexión", className: "text-[#8a5300]", icon: CloudOff },
  conflict: { label: "Conflicto", className: "text-red-700", icon: TriangleAlert },
  locked: { label: "Solo lectura", className: "text-tinta-suave", icon: TriangleAlert },
};

const CLIPBOARD_KEY = "revista:portapapeles";
const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT" || el.isContentEditable);
}

export function Editor(props: EditorProps) {
  const { mode, id, readOnly } = props;
  const router = useRouter();
  const toast = useToast();
  const maxPages = mode === "magazine" ? LIMITS.maxPagesPerMagazine : LIMITS.maxPagesPerWork;
  const [state, dispatch] = useReducer(editorReducer, undefined, () => initEditorState(props.initialDoc, props.initialTitle, maxPages));
  const [assets, setAssets] = useState<AssetMap>(props.initialAssets);
  const [media, setMedia] = useState<MediaItem[] | null>(null);
  const [uploading, setUploading] = useState(false);
  const [leftTab, setLeftTab] = useState<LeftTab>("plantillas");
  const [panels, setPanels] = useState({ left: true, right: true });
  const [cropId, setCropId] = useState<string | null>(null);
  const [zoomIndex, setZoomIndex] = useState(2);
  const [fit, setFit] = useState(2.4);
  const [template, setTemplate] = useState<TemplateOption | null>(null);
  const [dialog, setDialog] = useState<"preview" | "export" | "submit" | "insert" | null>(null);
  const [pageToDelete, setPageToDelete] = useState<number | null>(null);
  const [backup, setBackup] = useState<LocalBackup | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const canvasArea = useRef<HTMLDivElement>(null);
  const clipboard = useRef<PageElement[]>([]);
  const storageKey = `revista:copia:${mode}:${id}`;

  const autosave = useAutosave({
    storageKey,
    id,
    title: state.title,
    doc: state.doc,
    revision: state.revision,
    initialVersion: props.initialVersion,
    save: mode === "work" ? saveWorkAction : saveMagazineAction,
    enabled: !readOnly,
  });

  // Copia local de una sesión anterior que no llegó a guardarse.
  useEffect(() => {
    if (readOnly) return;
    const frame = requestAnimationFrame(() => {
      const found = readBackup(storageKey);
      if (found && JSON.stringify(found.doc) !== JSON.stringify(props.initialDoc)) setBackup(found);
      else if (found) clearBackup(storageKey);
    });
    return () => cancelAnimationFrame(frame);
  }, [readOnly, storageKey, props.initialDoc]);

  // Escala para que la página quepa en el área del lienzo.
  useEffect(() => {
    const el = canvasArea.current;
    if (!el) return;
    const { w, h } = pageSize(state.doc.orientation);
    const update = () => {
      const scaleW = (el.clientWidth - 64) / w;
      const scaleH = (el.clientHeight - 64) / h;
      setFit(Math.max(0.8, Math.min(scaleW, Math.max(scaleH, scaleW * 0.6))));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state.doc.orientation]);
  const scale = fit * ZOOMS[zoomIndex]!;

  const registerAssets = useCallback((map: AssetMap) => setAssets((prev) => ({ ...prev, ...map })), []);

  const loadMedia = useCallback(async () => {
    const list = await listMyMediaAction();
    setMedia(list);
    registerAssets(Object.fromEntries(list.map((m) => [m.id, { url: m.url, width: m.width, height: m.height, mime: m.mime }])));
  }, [registerAssets]);

  const insertMedia = useCallback(
    (item: MediaItem) => {
      registerAssets({ [item.id]: { url: item.url, width: item.width, height: item.height, mime: item.mime } });
      const page = currentPage(state);
      const target = page.elements.find((e) => e.type === "image" && state.selection.includes(e.id));
      if (target) {
        dispatch({ type: "update-elements", updates: { [target.id]: { assetId: item.id, zoom: 1, focusX: 50, focusY: 50 } as Partial<PageElement> } });
      } else {
        dispatch({ type: "add-elements", elements: [createImageElement(state.doc.orientation, item.id, item.width / item.height)] });
      }
    },
    [state, registerAssets],
  );

  const uploadFiles = useCallback(
    async (files: File[], opts: { insert?: boolean } = {}) => {
      const images = files.slice(0, 10);
      if (images.length === 0) return [];
      setUploading(true);
      const done: MediaItem[] = [];
      for (const file of images) {
        const res = await uploadImageFile(file, props.maxImageMb);
        if (res.ok && res.data) {
          done.push(res.data);
          toast("success", res.message ?? "Imagen subida.");
        } else toast("error", res.message ?? "No pudimos subir la imagen.");
      }
      setUploading(false);
      if (done.length > 0) {
        setMedia((prev) => [...done, ...(prev ?? []).filter((m) => !done.some((d) => d.id === m.id))]);
        registerAssets(Object.fromEntries(done.map((m) => [m.id, { url: m.url, width: m.width, height: m.height, mime: m.mime }])));
        if (opts.insert) for (const m of done) insertMedia(m);
      }
      return done;
    },
    [props.maxImageMb, toast, registerAssets, insertMedia],
  );

  // Atajos de teclado
  useEffect(() => {
    if (readOnly) return;
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void autosave.flush();
        return;
      }
      if (isTyping(e.target)) return;
      const page = currentPage(state);
      const sel = page.elements.filter((x) => state.selection.includes(x.id));
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        dispatch({ type: e.shiftKey ? "redo" : "undo" });
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        dispatch({ type: "redo" });
      } else if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        dispatch({ type: "duplicate-selected" });
      } else if (mod && e.key.toLowerCase() === "c" && sel.length > 0) {
        clipboard.current = sel;
        try {
          window.localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(sel));
        } catch {
          // sin almacenamiento: el portapapeles funciona solo en esta pestaña
        }
        toast("info", sel.length === 1 ? "Elemento copiado." : `${sel.length} elementos copiados.`);
      } else if (mod && e.key.toLowerCase() === "v") {
        let items = clipboard.current;
        try {
          const raw = window.localStorage.getItem(CLIPBOARD_KEY);
          if (raw) items = JSON.parse(raw) as PageElement[];
        } catch {
          // se usa la copia en memoria
        }
        if (items.length > 0) dispatch({ type: "add-elements", elements: items.map((x) => ({ ...cloneElement(x), x: x.x + 5, y: x.y + 5, locked: false })) });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (sel.length > 0) {
          e.preventDefault();
          dispatch({ type: "delete-selected" });
        }
      } else if (e.key === "Escape") {
        setCropId(null);
        dispatch({ type: "select", ids: [] });
      } else if (e.key.startsWith("Arrow") && sel.length > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 5 : 1;
        const dx = e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy = e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        dispatch({ type: "update-elements", updates: Object.fromEntries(sel.filter((x) => !x.locked).map((x) => [x.id, { x: x.x + dx, y: x.y + dy }])), key: "arrows" });
      } else if (e.key === "+" || e.key === "=") setZoomIndex((z) => Math.min(ZOOMS.length - 1, z + 1));
      else if (e.key === "-") setZoomIndex((z) => Math.max(0, z - 1));
    };
    // Pegar una imagen copiada (por ejemplo, una captura) la sube directamente.
    const onPaste = (e: ClipboardEvent) => {
      if (isTyping(e.target)) return;
      const files = [...(e.clipboardData?.files ?? [])].filter((f) => f.type.startsWith("image/"));
      if (files.length > 0) {
        e.preventDefault();
        void uploadFiles(files, { insert: true });
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("paste", onPaste);
    };
  }, [readOnly, state, autosave, toast, uploadFiles]);

  const page = currentPage(state);
  const ctx: EditorContextValue = useMemo(
    () => ({
      state,
      dispatch,
      mode,
      workKind: props.workKind,
      readOnly,
      assets,
      registerAssets,
      templates: props.templates,
      media,
      loadMedia,
      removeMedia: (mediaId) => setMedia((prev) => prev?.filter((m) => m.id !== mediaId) ?? null),
      uploadFiles,
      uploading,
      maxImageMb: props.maxImageMb,
      imageNotice: props.imageNotice,
      chooseTemplate: setTemplate,
      insertMedia,
      setLeftTab: (tab) => {
        setLeftTab(tab);
        setPanels((p) => ({ ...p, left: true }));
      },
      cropId,
      setCropId,
      requestDeletePage: setPageToDelete,
      openInsertWork: mode === "magazine" ? () => setDialog("insert") : undefined,
    }),
    [state, mode, props.workKind, readOnly, assets, registerAssets, props.templates, media, loadMedia, uploadFiles, uploading, props.maxImageMb, props.imageNotice, insertMedia, cropId],
  );

  const statusUi = STATUS_UI[readOnly ? "locked" : autosave.status];
  const StatusIcon = statusUi.icon;

  async function submit() {
    setSubmitting(true);
    const saved = await autosave.flush();
    if (!saved) {
      setSubmitting(false);
      setDialog(null);
      toast("error", "Primero necesitamos guardar tus cambios. Revisa tu conexión e inténtalo de nuevo.");
      return;
    }
    const res = await submitWorkAction(id);
    setSubmitting(false);
    setDialog(null);
    toast(res.ok ? "success" : "error", res.message ?? "");
    if (res.ok) router.push(props.backHref);
  }

  return (
    <EditorContext.Provider value={ctx}>
      <div className="flex h-dvh flex-col bg-[#ece8e0]">
        {/* Barra superior */}
        <header className="flex h-14 shrink-0 items-center gap-2 border-b border-linea bg-white px-2 sm:px-3">
          <Link href={props.backHref} onClick={() => void autosave.flush()} className="grid size-9 place-items-center rounded-lg hover:bg-tinta/5" aria-label="Volver al panel">
            <ArrowLeft className="size-5" />
          </Link>
          <input
            value={state.title}
            onChange={(e) => dispatch({ type: "set-title", title: e.target.value })}
            readOnly={readOnly}
            aria-label="Título"
            maxLength={150}
            className="h-9 min-w-0 flex-1 rounded-lg border border-transparent px-2 font-display font-bold hover:border-linea focus:border-cielo focus:outline-none sm:max-w-xs"
          />
          <span role="status" aria-live="polite" className={cn("hidden items-center gap-1.5 text-sm font-bold md:flex", statusUi.className)} title={autosave.lastSavedAt ? `Último guardado: ${formatDateTime(autosave.lastSavedAt.toISOString())}` : undefined}>
            <StatusIcon className={cn("size-4", autosave.status === "saving" && "animate-spin")} aria-hidden />
            {statusUi.label}
          </span>
          <div className="ml-auto flex items-center gap-0.5">
            {!readOnly && (
              <>
                <ToolButton label="Mostrar herramientas" pressed={panels.left} onClick={() => setPanels((p) => ({ ...p, left: !p.left }))} className="lg:hidden">
                  <PanelLeft className="size-5" />
                </ToolButton>
                <ToolButton label="Deshacer (Ctrl+Z)" onClick={() => dispatch({ type: "undo" })} disabled={state.past.length === 0}>
                  <Undo2 className="size-5" />
                </ToolButton>
                <ToolButton label="Rehacer (Ctrl+Y)" onClick={() => dispatch({ type: "redo" })} disabled={state.future.length === 0}>
                  <Redo2 className="size-5" />
                </ToolButton>
              </>
            )}
            <ToolButton label="Alejar" onClick={() => setZoomIndex((z) => Math.max(0, z - 1))} disabled={zoomIndex === 0}>
              <ZoomOut className="size-5" />
            </ToolButton>
            <span className="hidden w-12 text-center text-sm font-bold tabular-nums sm:block">{Math.round(ZOOMS[zoomIndex]! * 100)} %</span>
            <ToolButton label="Acercar" onClick={() => setZoomIndex((z) => Math.min(ZOOMS.length - 1, z + 1))} disabled={zoomIndex === ZOOMS.length - 1}>
              <ZoomIn className="size-5" />
            </ToolButton>
            <ToolButton label="Vista previa" onClick={() => setDialog("preview")}>
              <Eye className="size-5" />
            </ToolButton>
            <ToolButton label="Descargar PDF" onClick={() => setDialog("export")}>
              <FileDown className="size-5" />
            </ToolButton>
            {!readOnly && (
              <>
                <ToolButton label="Mostrar propiedades" pressed={panels.right} onClick={() => setPanels((p) => ({ ...p, right: !p.right }))} className="lg:hidden">
                  <PanelRight className="size-5" />
                </ToolButton>
                <Button size="sm" variant="secondary" className="ml-1 hidden sm:inline-flex" onClick={() => void autosave.flush()} loading={autosave.status === "saving"} icon={<Save className="size-4" />}>
                  Guardar
                </Button>
              </>
            )}
            {props.canSubmit && !readOnly && (
              <Button size="sm" variant="accent" className="ml-1" icon={<Send className="size-4" />} onClick={() => setDialog("submit")}>
                Enviar
              </Button>
            )}
          </div>
        </header>

        {(readOnly || autosave.status === "error" || autosave.status === "offline" || autosave.status === "locked") && (
          <div className="shrink-0 px-3 pt-2">
            {readOnly ? (
              <Alert kind="info">{props.readOnlyReason ?? "Este documento es de solo lectura."}</Alert>
            ) : autosave.status === "offline" ? (
              <Alert kind="warning">Sin conexión. Tus cambios se guardan en este navegador y se enviarán cuando vuelva la conexión.</Alert>
            ) : (
              <Alert kind="error">
                {autosave.message}{" "}
                {autosave.status === "error" && (
                  <button type="button" className="font-bold underline" onClick={() => void autosave.flush()}>
                    Reintentar ahora
                  </button>
                )}
              </Alert>
            )}
          </div>
        )}

        <div className="relative flex min-h-0 flex-1">
          {!readOnly && panels.left && (
            <aside className="absolute inset-y-0 left-0 z-20 w-[22rem] max-w-[90vw] border-r border-linea shadow-flotante lg:static lg:shadow-none" aria-label="Herramientas">
              <ToolsPanel tab={leftTab} onTab={setLeftTab} />
            </aside>
          )}
          <main id="contenido" ref={canvasArea} className="min-w-0 flex-1 overflow-auto" aria-label="Lienzo">
            <Canvas scale={scale} onDropFiles={(files) => void uploadFiles(files, { insert: true })} />
          </main>
          {!readOnly && panels.right && (
            <aside className="absolute inset-y-0 right-0 z-20 w-80 max-w-[90vw] overflow-y-auto border-l border-linea bg-white shadow-flotante lg:static lg:shadow-none" aria-label="Propiedades">
              <PropertiesPanel />
            </aside>
          )}
        </div>

        <footer className="shrink-0 border-t border-linea bg-white">
          <PagesStrip />
        </footer>
      </div>

      <TemplateDialog
        template={template}
        current={page}
        orientation={state.doc.orientation}
        assets={assets}
        allowAddPage={state.doc.pages.length < maxPages}
        onClose={() => setTemplate(null)}
        onApply={(p: Page) => {
          dispatch({ type: "replace-page", index: state.pageIndex, page: p });
          setTemplate(null);
          toast("success", "Plantilla aplicada. Puedes deshacerlo con Ctrl+Z.");
        }}
        onAddPage={(p: Page) => {
          dispatch({ type: "add-pages", pages: [p] });
          setTemplate(null);
        }}
      />
      <PreviewDialog open={dialog === "preview"} doc={state.doc} assets={assets} title={state.title} onClose={() => setDialog(null)} />
      <ExportDialog open={dialog === "export"} doc={state.doc} assets={assets} title={state.title} onClose={() => setDialog(null)} />
      {mode === "magazine" && (
        <InsertWorkDialog
          open={dialog === "insert"}
          orientation={state.doc.orientation}
          onClose={() => setDialog(null)}
          onInsert={(pages, map) => {
            registerAssets(map);
            dispatch({ type: "add-pages", pages });
            setDialog(null);
            toast("success", "Trabajo insertado en la revista.");
          }}
        />
      )}
      <ConfirmDialog
        open={dialog === "submit"}
        title="¿Enviar tu trabajo al profesor?"
        message="Mientras el profesor lo revisa no podrás editarlo. Si pide correcciones, podrás volver a modificarlo."
        confirmLabel="Sí, enviar"
        loading={submitting}
        onCancel={() => setDialog(null)}
        onConfirm={() => void submit()}
      />
      <ConfirmDialog
        open={pageToDelete !== null}
        title={`¿Eliminar la página ${(pageToDelete ?? 0) + 1}?`}
        message="Se eliminará con todo su contenido. Podrás recuperarla con Deshacer (Ctrl+Z) mientras no cierres el editor."
        confirmLabel="Eliminar página"
        danger
        onCancel={() => setPageToDelete(null)}
        onConfirm={() => {
          if (pageToDelete !== null) dispatch({ type: "delete-page", index: pageToDelete });
          setPageToDelete(null);
        }}
      />
      <Dialog
        open={autosave.status === "conflict"}
        onClose={() => undefined}
        locked
        title="Este trabajo cambió en otra pestaña"
        description="Para no perder nada, no sobrescribimos los cambios automáticamente."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                clearBackup(storageKey);
                window.location.reload();
              }}
            >
              Cargar la versión más reciente
            </Button>
            <Button variant="danger" onClick={autosave.keepMine}>
              Conservar lo de esta pestaña
            </Button>
          </>
        }
      >
        <p>
          Se guardó una versión más nueva desde otra pestaña o dispositivo. Puedes cargarla (perderás los cambios de esta pestaña) o conservar lo que ves aquí, que reemplazará a la otra versión.
        </p>
      </Dialog>
      <Dialog
        open={backup !== null}
        onClose={() => setBackup(null)}
        title="Recuperar cambios sin guardar"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                clearBackup(storageKey);
                setBackup(null);
              }}
            >
              Descartar
            </Button>
            <Button
              onClick={() => {
                if (backup) dispatch({ type: "replace-document", doc: backup.doc, title: backup.title });
                setBackup(null);
                toast("info", "Cambios recuperados. Se guardarán en unos segundos.");
              }}
            >
              Recuperar
            </Button>
          </>
        }
      >
        <p>
          Encontramos cambios de {backup ? formatDateTime(backup.savedAt) : ""} guardados en este navegador que no llegaron al servidor.
          {backup && backup.baseVersion !== props.initialVersion && " Atención: después se guardó otra versión; si recuperas, reemplazarás esa versión."}
        </p>
      </Dialog>
    </EditorContext.Provider>
  );
}
