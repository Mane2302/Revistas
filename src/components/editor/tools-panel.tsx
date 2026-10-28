"use client";

import { Baseline, Heading1, ImageIcon, ImagePlus, LayoutTemplate, Loader2, Paintbrush, PaintBucket, Shapes, Trash2, Type, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PageView } from "@/components/magazine/page-view";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteMediaAction, type MediaItem } from "@/lib/actions/media";
import { createImageElement, createShapeElement, createTextElement, SHAPE_PRESETS, TEXT_PRESETS, type ShapePreset, type TextPreset } from "@/lib/document/factory";
import { PAGE_TYPE_LABELS, type PageElement } from "@/lib/document/schema";
import { DECORATIVE_MIN_SIZE, FONT_IDS, FONTS, fontCssFamily, TYPE_SCALE, type FontId } from "@/lib/fonts";
import { TEMPLATE_KIND_LABELS } from "@/lib/templates";
import { cn, formatBytes } from "@/lib/utils";
import { ColorInput, RangeInput, Section, Segmented } from "./controls";
import { useEditor, type LeftTab, type TemplateOption } from "./editor-context";
import { currentPage } from "./state";

const TABS: Array<{ id: LeftTab; label: string; icon: typeof Type }> = [
  { id: "plantillas", label: "Plantillas", icon: LayoutTemplate },
  { id: "texto", label: "Texto", icon: Type },
  { id: "imagenes", label: "Imágenes", icon: ImageIcon },
  { id: "formas", label: "Formas", icon: Shapes },
  { id: "fondo", label: "Fondo", icon: PaintBucket },
  { id: "tipografias", label: "Letras", icon: Baseline },
  { id: "colores", label: "Colores", icon: Paintbrush },
];

const PALETTES = [
  { name: "Alegre", colors: ["#1d1b33", "#ff5a5f", "#ffc145", "#3d5afe", "#fffaf2"] },
  { name: "Ciencia", colors: ["#0b1533", "#22d3ee", "#a3e635", "#c7d2fe", "#ffffff"] },
  { name: "Periódico", colors: ["#111827", "#b91c1c", "#6b7280", "#e5e7eb", "#fdfdfb"] },
  { name: "Historia", colors: ["#7f1d1d", "#5b4636", "#b08d57", "#f3ead7", "#292524"] },
  { name: "Deporte", colors: ["#0a0a0a", "#facc15", "#ef4444", "#16a34a", "#ffffff"] },
  { name: "Arte", colors: ["#7c3aed", "#ff6fae", "#14b8a6", "#ffd23f", "#fff4ea"] },
  { name: "Naturaleza", colors: ["#14532d", "#15803d", "#84cc16", "#dcfce7", "#f0fdf4"] },
];

export function ToolsPanel({ tab, onTab }: { tab: LeftTab; onTab: (t: LeftTab) => void }) {
  return (
    <div className="flex h-full">
      <nav aria-label="Herramientas" className="flex w-[4.5rem] shrink-0 flex-col gap-1 border-r border-linea bg-white p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTab(id)}
            aria-pressed={tab === id}
            className={cn(
              "flex flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-bold transition-colors",
              tab === id ? "bg-cielo-claro text-cielo-oscuro" : "text-tinta-suave hover:bg-tinta/5 hover:text-tinta",
            )}
          >
            <Icon className="size-5" aria-hidden />
            {label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto bg-white">
        {tab === "plantillas" && <TemplatesTab />}
        {tab === "texto" && <TextTab />}
        {tab === "imagenes" && <ImagesTab />}
        {tab === "formas" && <ShapesTab />}
        {tab === "fondo" && <BackgroundTab />}
        {tab === "tipografias" && <FontsTab />}
        {tab === "colores" && <ColorsTab />}
      </div>
    </div>
  );
}

function TemplatesTab() {
  const { templates, chooseTemplate, state, mode } = useEditor();
  const groups = new Map<string, TemplateOption[]>();
  for (const t of templates) {
    const key = mode === "magazine" ? TEMPLATE_KIND_LABELS[t.kind] : t.category;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return (
    <div>
      <p className="px-4 pt-4 text-sm text-tinta-suave">
        Elige un diseño para esta página. Tu texto y tus fotos se conservarán cuando sea posible y verás una vista previa antes de aplicarlo.
      </p>
      {templates.length === 0 && <p className="p-4 text-sm">No hay plantillas activas. Pide a tu profesor que active alguna.</p>}
      {[...groups.entries()].map(([group, list]) => (
        <Section key={group} title={group}>
          <div className="grid grid-cols-2 gap-3">
            {list.map((t) => (
              <button key={t.id} type="button" onClick={() => chooseTemplate(t)} className="group text-left" title={t.description}>
                <div className="overflow-hidden rounded-lg border border-linea shadow-sm transition group-hover:-translate-y-0.5 group-hover:border-cielo group-hover:shadow-md">
                  <PageView page={t.page} orientation="portrait" width={104} assets={{}} />
                </div>
                <span className="mt-1 block text-xs leading-tight font-bold">{t.name}</span>
              </button>
            ))}
          </div>
        </Section>
      ))}
      {mode === "magazine" && (
        <p className="px-4 pb-4 text-xs text-tinta-suave">Página actual: {PAGE_TYPE_LABELS[currentPage(state).pageType ?? "custom"]}</p>
      )}
    </div>
  );
}

function TextTab() {
  const { dispatch, state } = useEditor();
  const add = (p: TextPreset) => dispatch({ type: "add-elements", elements: [createTextElement(p, state.doc.orientation)] });
  return (
    <Section title="Agregar texto">
      <div className="space-y-2">
        {(Object.keys(TEXT_PRESETS) as TextPreset[]).map((p) => {
          const preset = TEXT_PRESETS[p];
          return (
            <button
              key={p}
              type="button"
              onClick={() => add(p)}
              className="flex w-full items-center gap-3 rounded-xl border border-linea px-3 py-2.5 text-left transition hover:border-cielo hover:bg-cielo-claro/40"
            >
              <Heading1 className="size-4 shrink-0 text-tinta-suave" aria-hidden />
              <span
                className="truncate"
                style={{
                  fontFamily: fontCssFamily(preset.style.fontFamily ?? "inter"),
                  fontWeight: preset.style.fontWeight ?? 400,
                  fontStyle: preset.style.italic ? "italic" : "normal",
                  fontSize: Math.min(22, Math.max(13, (preset.style.fontSize ?? 11) * 0.7)),
                }}
              >
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-xs text-tinta-suave">Consejo: haz doble clic sobre un texto de la página para escribir directamente.</p>
    </Section>
  );
}

function ImageLibrary({ onPick, compact }: { onPick: (m: MediaItem) => void; compact?: boolean }) {
  const { media, loadMedia, removeMedia } = useEditor();
  const toast = useToast();
  const [toDelete, setToDelete] = useState<MediaItem | null>(null);
  const [busy, setBusy] = useState(false);
  const requested = useRef(false);
  useEffect(() => {
    if (!requested.current && media === null) {
      requested.current = true;
      void loadMedia();
    }
  }, [media, loadMedia]);

  if (media === null) {
    return (
      <p className="flex items-center gap-2 text-sm text-tinta-suave">
        <Loader2 className="size-4 animate-spin" /> Cargando tus imágenes…
      </p>
    );
  }
  if (media.length === 0) return <p className="text-sm text-tinta-suave">Aún no has subido imágenes.</p>;
  return (
    <>
      <ul className={cn("grid gap-2", compact ? "grid-cols-3" : "grid-cols-2")}>
        {media.map((m) => (
          <li key={m.id} className="group relative">
            <button type="button" onClick={() => onPick(m)} className="block w-full overflow-hidden rounded-lg border border-linea hover:border-cielo" title={`${m.originalFilename} · ${formatBytes(m.sizeBytes)}`}>
              {/* eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal */}
              <img src={m.url} alt={m.description ?? m.originalFilename} className="aspect-square w-full object-cover" loading="lazy" />
            </button>
            {!compact && (
              <button
                type="button"
                onClick={() => setToDelete(m)}
                className="absolute top-1 right-1 rounded-md bg-white/90 p-1 text-red-700 opacity-0 shadow group-hover:opacity-100 focus:opacity-100"
                aria-label={`Borrar ${m.originalFilename}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            )}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={toDelete !== null}
        title="¿Borrar esta imagen?"
        message="Se eliminará de tu biblioteca. Si la imagen se usa en algún trabajo o revista no se borrará."
        confirmLabel="Borrar imagen"
        danger
        loading={busy}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (!toDelete) return;
          setBusy(true);
          const res = await deleteMediaAction(toDelete.id);
          setBusy(false);
          toast(res.ok ? "success" : "error", res.message ?? "");
          if (res.ok) removeMedia(toDelete.id);
          setToDelete(null);
        }}
      />
    </>
  );
}

function ImagesTab() {
  const { uploadFiles, uploading, insertMedia, imageNotice, maxImageMb, dispatch, state } = useEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div>
      <Section title="Subir imágenes">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void uploadFiles([...e.dataTransfer.files], { insert: true });
          }}
          className={cn("rounded-xl border-2 border-dashed p-4 text-center transition-colors", over ? "border-cielo bg-cielo-claro" : "border-linea bg-papel")}
        >
          {uploading ? <Loader2 className="mx-auto size-7 animate-spin text-cielo" /> : <Upload className="mx-auto size-7 text-tinta-suave" aria-hidden />}
          <p className="mt-2 text-sm font-bold">{uploading ? "Subiendo y verificando…" : "Arrastra tus fotos aquí"}</p>
          <p className="text-xs text-tinta-suave">JPG, PNG o WebP · hasta {maxImageMb} MB</p>
          <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="mt-3 rounded-lg bg-cielo px-3 py-2 text-sm font-bold text-white hover:bg-cielo-oscuro disabled:opacity-50">
            Elegir desde mi computadora
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => {
              void uploadFiles([...(e.target.files ?? [])], { insert: true });
              e.target.value = "";
            }}
          />
        </div>
        {imageNotice && <p className="rounded-lg bg-sol-claro p-2.5 text-xs leading-snug text-[#7a4b00]">{imageNotice}</p>}
        <button
          type="button"
          onClick={() => dispatch({ type: "add-elements", elements: [createImageElement(state.doc.orientation)] })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-linea py-2 text-sm font-bold hover:bg-tinta/5"
        >
          <ImagePlus className="size-4" /> Agregar marco de foto vacío
        </button>
      </Section>
      <Section title="Mis imágenes">
        <p className="text-xs text-tinta-suave">Haz clic para agregarla. Si tienes un marco de foto seleccionado, la imagen lo reemplaza.</p>
        <ImageLibrary onPick={insertMedia} />
      </Section>
    </div>
  );
}

function ShapesTab() {
  const { dispatch, state } = useEditor();
  return (
    <Section title="Formas y decoraciones">
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(SHAPE_PRESETS) as ShapePreset[]).map((p) => {
          const s = SHAPE_PRESETS[p].make();
          return (
            <button
              key={p}
              type="button"
              onClick={() => dispatch({ type: "add-elements", elements: [createShapeElement(p, state.doc.orientation)] })}
              className="flex flex-col items-center gap-2 rounded-xl border border-linea p-3 text-xs font-bold hover:border-cielo hover:bg-cielo-claro/40"
            >
              <span className="grid h-10 w-16 place-items-center">
                {s.shape === "line" ? (
                  <span className="block bg-tinta" style={s.w >= s.h ? { width: 56, height: 2 } : { width: 2, height: 36 }} />
                ) : (
                  <span
                    className="block"
                    style={{
                      width: 52,
                      height: s.shape === "ellipse" ? 36 : 32,
                      background: s.fill ?? "transparent",
                      border: s.stroke ? `2px solid ${s.stroke}` : undefined,
                      borderRadius: s.shape === "ellipse" ? "50%" : s.radius * 2,
                    }}
                  />
                )}
              </span>
              {SHAPE_PRESETS[p].label}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function BackgroundTab() {
  const { dispatch, state, assets, setLeftTab } = useEditor();
  const page = currentPage(state);
  const bg = page.background;
  const [picking, setPicking] = useState(false);
  return (
    <div>
      <Section title="Color de fondo">
        <ColorInput label="Color" value={bg.color} onChange={(c) => dispatch({ type: "update-background", patch: { color: c ?? "#ffffff" }, key: "bg-color" })} />
      </Section>
      <Section title="Imagen de fondo">
        {bg.assetId ? (
          <>
            {assets[bg.assetId] && (
              // eslint-disable-next-line @next/next/no-img-element -- URL firmada temporal
              <img src={assets[bg.assetId]!.url} alt="" className="aspect-video w-full rounded-lg object-cover" />
            )}
            <Segmented
              label="Ajuste"
              value={bg.fit}
              options={[
                { value: "cover", label: "Rellenar" },
                { value: "contain", label: "Completa" },
              ]}
              onChange={(fit) => dispatch({ type: "update-background", patch: { fit } })}
            />
            <RangeInput label="Opacidad" value={bg.opacity} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)} %`} onChange={(opacity) => dispatch({ type: "update-background", patch: { opacity }, key: "bg-opacity" })} />
            <button type="button" onClick={() => dispatch({ type: "update-background", patch: { assetId: null } })} className="w-full rounded-lg border border-linea py-2 text-sm font-bold hover:bg-tinta/5">
              Quitar imagen de fondo
            </button>
          </>
        ) : picking ? (
          <ImageLibrary
            compact
            onPick={(m) => {
              dispatch({ type: "update-background", patch: { assetId: m.id, fit: "cover", opacity: 1 } });
              setPicking(false);
            }}
          />
        ) : (
          <div className="space-y-2">
            <button type="button" onClick={() => setPicking(true)} className="w-full rounded-lg border border-linea py-2 text-sm font-bold hover:bg-tinta/5">
              Elegir de mis imágenes
            </button>
            <button type="button" onClick={() => setLeftTab("imagenes")} className="w-full text-sm font-bold text-cielo-oscuro hover:underline">
              Subir una imagen nueva
            </button>
          </div>
        )}
      </Section>
    </div>
  );
}

function selectedTextIds(ctx: ReturnType<typeof useEditor>): string[] {
  return currentPage(ctx.state).elements.filter((e) => e.type === "text" && ctx.state.selection.includes(e.id)).map((e) => e.id);
}

function FontsTab() {
  const ctx = useEditor();
  const toast = useToast();
  const page = currentPage(ctx.state);
  const apply = (font: FontId, all: boolean) => {
    const ids = all ? page.elements.filter((e) => e.type === "text").map((e) => e.id) : selectedTextIds(ctx);
    if (ids.length === 0) {
      toast("info", "Selecciona primero un texto en la página.");
      return;
    }
    const updates: Record<string, Partial<PageElement>> = {};
    for (const el of page.elements) {
      if (el.type === "text" && ids.includes(el.id)) updates[el.id] = { style: { ...el.style, fontFamily: font, italic: el.style.italic && FONTS[font].hasItalic } };
    }
    ctx.dispatch({ type: "update-elements", updates });
  };
  return (
    <div>
      <Section title="Tipografías">
        <p className="text-xs text-tinta-suave">Haz clic para aplicarla al texto seleccionado.</p>
        <ul className="space-y-1.5">
          {FONT_IDS.map((id) => (
            <li key={id}>
              <button type="button" onClick={() => apply(id, false)} className="w-full rounded-xl border border-linea px-3 py-2 text-left hover:border-cielo hover:bg-cielo-claro/40">
                <span className="block text-lg leading-tight" style={{ fontFamily: fontCssFamily(id) }}>
                  {FONTS[id].label}
                </span>
                <span className="text-xs text-tinta-suave">
                  {FONTS[id].usage}
                  {FONTS[id].decorative && ` · desde ${DECORATIVE_MIN_SIZE} pt`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Section>
      <Section title="Tamaños recomendados">
        <ul className="space-y-1 text-sm">
          {Object.values(TYPE_SCALE).map((t) => (
            <li key={t.label} className="flex justify-between">
              <span>{t.label}</span>
              <span className="font-bold tabular-nums">{t.size} pt</span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

function ColorsTab() {
  const ctx = useEditor();
  const page = currentPage(ctx.state);
  const applyColor = (color: string) => {
    const selected = page.elements.filter((e) => ctx.state.selection.includes(e.id));
    if (selected.length === 0) {
      ctx.dispatch({ type: "update-background", patch: { color } });
      return;
    }
    const updates: Record<string, Partial<PageElement>> = {};
    for (const el of selected) {
      if (el.type === "text") updates[el.id] = { style: { ...el.style, color } };
      else if (el.type === "shape") updates[el.id] = el.shape === "line" || !el.fill ? { stroke: color } : { fill: color };
      else updates[el.id] = { borderColor: color, borderWidth: el.borderWidth || 1 };
    }
    ctx.dispatch({ type: "update-elements", updates });
  };
  return (
    <Section title="Paletas de color">
      <p className="text-xs text-tinta-suave">Haz clic en un color para aplicarlo al elemento seleccionado. Sin selección, cambia el fondo de la página.</p>
      {PALETTES.map((p) => (
        <div key={p.name}>
          <p className="mb-1 text-sm font-bold">{p.name}</p>
          <div className="flex gap-1.5">
            {p.colors.map((c) => (
              <button key={c} type="button" onClick={() => applyColor(c)} className="h-9 flex-1 rounded-lg border border-black/10 transition hover:scale-105" style={{ background: c }} aria-label={`Aplicar color ${c}`} title={c} />
            ))}
          </div>
        </div>
      ))}
    </Section>
  );
}
