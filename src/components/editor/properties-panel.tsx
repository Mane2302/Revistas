"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Bold,
  CaseUpper,
  ChevronDown,
  ChevronUp,
  Copy,
  Crop,
  Italic,
  Lock,
  LockOpen,
  Trash2,
  Underline,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateMediaCreditsAction } from "@/lib/actions/media";
import { createTextElement, TEXT_PRESETS } from "@/lib/document/factory";
import { LIMITS, PAGE_TYPE_LABELS, PAGE_TYPES, type ImageElement, type PageElement, type ShapeElement, type TextElement, type TextStyle } from "@/lib/document/schema";
import { DECORATIVE_MIN_SIZE, FONT_IDS, FONTS, fontCssFamily, TYPE_SCALE, type FontId } from "@/lib/fonts";
import { ColorInput, FieldLabel, NumberInput, RangeInput, Section, Segmented, ToolButton } from "./controls";
import { useEditor } from "./editor-context";
import { currentPage } from "./state";

export function PropertiesPanel() {
  const { state, readOnly } = useEditor();
  const page = currentPage(state);
  const selected = page.elements.filter((e) => state.selection.includes(e.id));

  if (readOnly) {
    return <p className="p-4 text-sm text-tinta-suave">Este trabajo está en modo de solo lectura.</p>;
  }
  if (selected.length === 0) return <PageProperties />;
  if (selected.length > 1) {
    return (
      <div>
        <Section title={`${selected.length} elementos seleccionados`}>
          <p className="text-sm text-tinta-suave">Arrástralos para moverlos juntos.</p>
        </Section>
        <CommonActions />
      </div>
    );
  }
  const el = selected[0]!;
  return (
    <div>
      {el.type === "text" && <TextProperties el={el} />}
      {el.type === "image" && <ImageProperties el={el} />}
      {el.type === "shape" && <ShapeProperties el={el} />}
      <GeometryProperties el={el} />
      <CommonActions />
    </div>
  );
}

function useUpdate(id: string) {
  const { dispatch } = useEditor();
  return (patch: Partial<PageElement>, key?: string) => dispatch({ type: "update-elements", updates: { [id]: patch }, key: key ? `${key}-${id}` : undefined });
}

function TextProperties({ el }: { el: TextElement }) {
  const update = useUpdate(el.id);
  const style = (patch: Partial<TextStyle>, key?: string) => update({ style: { ...el.style, ...patch } }, key);
  const font = FONTS[el.style.fontFamily];
  return (
    <>
      <Section title="Texto">
        <div>
          <FieldLabel htmlFor="prop-text">Contenido</FieldLabel>
          <textarea
            id="prop-text"
            value={el.text}
            maxLength={LIMITS.maxTextLength}
            onChange={(e) => update({ text: e.target.value, sample: false } as Partial<TextElement>, "text")}
            onFocus={(e) => {
              if (el.sample) e.currentTarget.select();
            }}
            rows={5}
            className="w-full rounded-lg border border-linea p-2 text-sm leading-relaxed focus:border-cielo focus:outline-none focus:ring-2 focus:ring-cielo/20"
          />
          {el.sample && <p className="mt-1 text-xs font-semibold text-[#8a5300]">Texto de ejemplo: reemplázalo con el tuyo.</p>}
        </div>
      </Section>
      <Section title="Tipografía">
        <div>
          <FieldLabel htmlFor="prop-font">Fuente</FieldLabel>
          <select
            id="prop-font"
            value={el.style.fontFamily}
            onChange={(e) => {
              const f = e.target.value as FontId;
              style({ fontFamily: f, italic: el.style.italic && FONTS[f].hasItalic });
            }}
            className="h-9 w-full rounded-lg border border-linea bg-white px-2 text-sm"
          >
            {FONT_IDS.map((id) => (
              <option key={id} value={id}>
                {FONTS[id].label} — {FONTS[id].usage}
              </option>
            ))}
          </select>
          <p className="mt-1.5 truncate rounded-md bg-papel px-2 py-1 text-lg" style={{ fontFamily: fontCssFamily(el.style.fontFamily) }}>
            Revista Escolar 123
          </p>
        </div>
        <NumberInput label="Tamaño" unit="pt" value={el.style.fontSize} min={LIMITS.fontSize.min} max={LIMITS.fontSize.max} step={0.5} onChange={(fontSize) => style({ fontSize })} />
        <div className="flex flex-wrap gap-1">
          {Object.values(TYPE_SCALE).map((t) => (
            <button key={t.label} type="button" onClick={() => style({ fontSize: t.size })} className="rounded-md border border-linea px-2 py-0.5 text-xs font-bold hover:bg-cielo-claro">
              {t.label}
            </button>
          ))}
        </div>
        {font.decorative && el.style.fontSize < DECORATIVE_MIN_SIZE && (
          <p className="rounded-md bg-sol-claro p-2 text-xs font-semibold text-[#7a4b00]">{font.label} es decorativa: úsala en títulos de {DECORATIVE_MIN_SIZE} pt o más para que se lea bien.</p>
        )}
        <div className="flex gap-1">
          <ToolButton label="Negrita" pressed={el.style.fontWeight === 700} onClick={() => style({ fontWeight: el.style.fontWeight === 700 ? 400 : 700 })}>
            <Bold className="size-4" />
          </ToolButton>
          <ToolButton label={font.hasItalic ? "Cursiva" : "Esta fuente no tiene cursiva"} disabled={!font.hasItalic} pressed={el.style.italic} onClick={() => style({ italic: !el.style.italic })}>
            <Italic className="size-4" />
          </ToolButton>
          <ToolButton label="Subrayado" pressed={el.style.underline} onClick={() => style({ underline: !el.style.underline })}>
            <Underline className="size-4" />
          </ToolButton>
          <ToolButton label="Mayúsculas" pressed={el.style.uppercase} onClick={() => style({ uppercase: !el.style.uppercase })}>
            <CaseUpper className="size-4" />
          </ToolButton>
        </div>
        <Segmented
          label="Alineación"
          value={el.style.align}
          onChange={(align) => style({ align })}
          options={[
            { value: "left", label: "Izquierda", icon: <AlignLeft className="size-4" /> },
            { value: "center", label: "Centro", icon: <AlignCenter className="size-4" /> },
            { value: "right", label: "Derecha", icon: <AlignRight className="size-4" /> },
            { value: "justify", label: "Justificado", icon: <AlignJustify className="size-4" /> },
          ]}
        />
        <ColorInput label="Color del texto" value={el.style.color} onChange={(color) => style({ color: color ?? "#000000" })} />
        <RangeInput label="Interlineado" value={el.style.lineHeight} min={LIMITS.lineHeight.min} max={LIMITS.lineHeight.max} step={0.05} format={(v) => v.toFixed(2)} onChange={(lineHeight) => style({ lineHeight }, "lh")} />
        <RangeInput label="Espacio entre letras" value={el.style.letterSpacing} min={LIMITS.letterSpacing.min} max={LIMITS.letterSpacing.max} step={0.1} format={(v) => `${v.toFixed(1)} pt`} onChange={(letterSpacing) => style({ letterSpacing }, "ls")} />
      </Section>
      <Section title="Cuadro de texto">
        <ColorInput label="Fondo" allowNone value={el.background} onChange={(background) => update({ background, padding: background && el.padding === 0 ? 2 : el.padding } as Partial<TextElement>)} />
        <RangeInput label="Margen interior" value={el.padding} min={0} max={LIMITS.padding.max} step={0.5} format={(v) => `${v} mm`} onChange={(padding) => update({ padding } as Partial<TextElement>, "pad")} />
        <Segmented
          label="Posición vertical"
          value={el.verticalAlign}
          onChange={(verticalAlign) => update({ verticalAlign } as Partial<TextElement>)}
          options={[
            { value: "top", label: "Arriba" },
            { value: "middle", label: "Centro" },
            { value: "bottom", label: "Abajo" },
          ]}
        />
      </Section>
    </>
  );
}

function ImageProperties({ el }: { el: ImageElement }) {
  const { setLeftTab, cropId, setCropId, dispatch, state, media } = useEditor();
  const update = useUpdate(el.id);
  const toast = useToast();
  const item = media?.find((m) => m.id === el.assetId);
  const [credits, setCredits] = useState<{ id: string; creditAuthor: string; creditSource: string; creditLicense: string; description: string } | null>(null);
  const editing = credits && credits.id === el.assetId ? credits : null;

  return (
    <>
      <Section title="Imagen">
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" onClick={() => setLeftTab("imagenes")}>
            {el.assetId ? "Cambiar foto" : "Elegir foto"}
          </Button>
          {el.assetId && (
            <Button size="sm" variant="secondary" onClick={() => update({ assetId: null } as Partial<ImageElement>)}>
              Quitar foto
            </Button>
          )}
        </div>
        {el.assetId && (
          <Button size="sm" variant={cropId === el.id ? "accent" : "secondary"} className="w-full" icon={<Crop className="size-4" />} onClick={() => setCropId(cropId === el.id ? null : el.id)}>
            {cropId === el.id ? "Terminar recorte" : "Recortar con el ratón"}
          </Button>
        )}
        <Segmented
          label="Ajuste"
          value={el.fit}
          onChange={(fit) => update({ fit } as Partial<ImageElement>)}
          options={[
            { value: "cover", label: "Rellenar marco" },
            { value: "contain", label: "Ver completa" },
          ]}
        />
        <RangeInput label="Acercar" value={el.zoom} min={1} max={4} step={0.05} format={(v) => `${Math.round(v * 100)} %`} onChange={(zoom) => update({ zoom } as Partial<ImageElement>, "zoom")} />
        <RangeInput label="Mover horizontal" value={el.focusX} min={0} max={100} step={1} format={(v) => `${v} %`} onChange={(focusX) => update({ focusX } as Partial<ImageElement>, "fx")} />
        <RangeInput label="Mover vertical" value={el.focusY} min={0} max={100} step={1} format={(v) => `${v} %`} onChange={(focusY) => update({ focusY } as Partial<ImageElement>, "fy")} />
      </Section>
      <Section title="Marco">
        <RangeInput label="Grosor del borde" value={el.borderWidth} min={0} max={LIMITS.borderWidth.max} step={0.25} format={(v) => `${v} mm`} onChange={(borderWidth) => update({ borderWidth } as Partial<ImageElement>, "bw")} />
        {el.borderWidth > 0 && <ColorInput label="Color del borde" value={el.borderColor} onChange={(borderColor) => update({ borderColor: borderColor ?? "#ffffff" } as Partial<ImageElement>)} />}
        <RangeInput label="Esquinas redondeadas" value={el.radius} min={0} max={Math.round(Math.min(el.w, el.h) / 2)} step={0.5} format={(v) => `${v} mm`} onChange={(radius) => update({ radius } as Partial<ImageElement>, "rad")} />
        <RangeInput label="Opacidad" value={el.opacity} min={0.1} max={1} step={0.05} format={(v) => `${Math.round(v * 100)} %`} onChange={(opacity) => update({ opacity } as Partial<ImageElement>, "op")} />
        <Button
          size="sm"
          variant="secondary"
          className="w-full"
          onClick={() => {
            const caption = { ...createTextElement("caption", state.doc.orientation), x: el.x, y: el.y + el.h + 1.5, w: el.w };
            dispatch({ type: "add-elements", elements: [caption] });
          }}
        >
          Añadir pie de foto
        </Button>
      </Section>
      {el.assetId && item && (
        <Section title="Créditos de la foto">
          <p className="text-xs text-tinta-suave">Registra quién tomó la foto y de dónde salió. Usa solo fotos propias o con permiso.</p>
          {editing ? (
            <form
              className="space-y-2"
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await updateMediaCreditsAction(editing);
                toast(res.ok ? "success" : "error", res.message ?? "");
                if (res.ok) setCredits(null);
              }}
            >
              {(
                [
                  ["creditAuthor", "Autor de la fotografía"],
                  ["creditSource", "Fuente"],
                  ["creditLicense", "Licencia"],
                  ["description", "Descripción"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <FieldLabel htmlFor={`cr-${key}`}>{label}</FieldLabel>
                  <input id={`cr-${key}`} value={editing[key]} maxLength={key === "creditSource" ? 300 : 120} onChange={(e) => setCredits({ ...editing, [key]: e.target.value })} className="h-9 w-full rounded-lg border border-linea px-2 text-sm" />
                </div>
              ))}
              <Button type="submit" size="sm" className="w-full">
                Guardar créditos
              </Button>
            </form>
          ) : (
            <>
              <dl className="space-y-0.5 text-sm">
                <div><dt className="inline font-bold">Autor: </dt><dd className="inline">{item.creditAuthor ?? "—"}</dd></div>
                <div><dt className="inline font-bold">Fuente: </dt><dd className="inline">{item.creditSource ?? "—"}</dd></div>
                <div><dt className="inline font-bold">Licencia: </dt><dd className="inline">{item.creditLicense ?? "—"}</dd></div>
              </dl>
              <Button
                size="sm"
                variant="secondary"
                className="w-full"
                onClick={() =>
                  setCredits({ id: item.id, creditAuthor: item.creditAuthor ?? "", creditSource: item.creditSource ?? "", creditLicense: item.creditLicense ?? "", description: item.description ?? "" })
                }
              >
                Editar créditos
              </Button>
            </>
          )}
        </Section>
      )}
    </>
  );
}

function ShapeProperties({ el }: { el: ShapeElement }) {
  const update = useUpdate(el.id);
  return (
    <Section title={el.shape === "line" ? "Línea" : "Forma"}>
      {el.shape !== "line" && <ColorInput label="Relleno" allowNone value={el.fill} onChange={(fill) => update({ fill } as Partial<ShapeElement>)} />}
      <ColorInput label={el.shape === "line" ? "Color" : "Borde"} allowNone={el.shape !== "line"} value={el.stroke} onChange={(stroke) => update({ stroke, strokeWidth: stroke && el.strokeWidth === 0 ? 0.5 : el.strokeWidth } as Partial<ShapeElement>)} />
      <RangeInput label="Grosor" value={el.strokeWidth} min={0} max={LIMITS.borderWidth.max} step={0.1} format={(v) => `${v.toFixed(1)} mm`} onChange={(strokeWidth) => update({ strokeWidth } as Partial<ShapeElement>, "sw")} />
      {el.shape === "rect" && <RangeInput label="Esquinas redondeadas" value={el.radius} min={0} max={Math.round(Math.min(el.w, el.h) / 2)} step={0.5} format={(v) => `${v} mm`} onChange={(radius) => update({ radius } as Partial<ShapeElement>, "rad")} />}
      <RangeInput label="Opacidad" value={el.opacity} min={0} max={1} step={0.05} format={(v) => `${Math.round(v * 100)} %`} onChange={(opacity) => update({ opacity } as Partial<ShapeElement>, "op")} />
    </Section>
  );
}

function GeometryProperties({ el }: { el: PageElement }) {
  const update = useUpdate(el.id);
  return (
    <Section title="Posición y tamaño (mm)">
      <div className="grid grid-cols-2 gap-2">
        <NumberInput label="X" value={el.x} min={-200} max={400} step={0.5} onChange={(x) => update({ x })} />
        <NumberInput label="Y" value={el.y} min={-200} max={400} step={0.5} onChange={(y) => update({ y })} />
        <NumberInput label="Ancho" value={el.w} min={LIMITS.minResizeSize} max={600} step={0.5} onChange={(w) => update({ w })} />
        <NumberInput label="Alto" value={el.h} min={LIMITS.minResizeSize} max={600} step={0.5} onChange={(h) => update({ h })} />
      </div>
    </Section>
  );
}

function CommonActions() {
  const { dispatch, state } = useEditor();
  const page = currentPage(state);
  const single = state.selection.length === 1 ? page.elements.find((e) => e.id === state.selection[0]) : undefined;
  return (
    <Section title="Organizar">
      {single && (
        <div className="flex gap-1" role="group" aria-label="Orden de superposición">
          <ToolButton label="Traer al frente" onClick={() => dispatch({ type: "reorder", direction: "front" })}>
            <ArrowUpToLine className="size-4" />
          </ToolButton>
          <ToolButton label="Subir un nivel" onClick={() => dispatch({ type: "reorder", direction: "forward" })}>
            <ChevronUp className="size-4" />
          </ToolButton>
          <ToolButton label="Bajar un nivel" onClick={() => dispatch({ type: "reorder", direction: "backward" })}>
            <ChevronDown className="size-4" />
          </ToolButton>
          <ToolButton label="Enviar al fondo" onClick={() => dispatch({ type: "reorder", direction: "back" })}>
            <ArrowDownToLine className="size-4" />
          </ToolButton>
          <ToolButton label={single.locked ? "Desbloquear" : "Bloquear posición"} pressed={single.locked} onClick={() => dispatch({ type: "update-elements", updates: { [single.id]: { locked: !single.locked } } })}>
            {single.locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}
          </ToolButton>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button size="sm" variant="secondary" icon={<Copy className="size-4" />} onClick={() => dispatch({ type: "duplicate-selected" })}>
          Duplicar
        </Button>
        <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} onClick={() => dispatch({ type: "delete-selected" })}>
          Eliminar
        </Button>
      </div>
      <p className="text-xs text-tinta-suave">Atajos: Supr elimina · Ctrl+D duplica · Ctrl+C / Ctrl+V copian y pegan · flechas mueven 1 mm (Mayús: 5 mm).</p>
    </Section>
  );
}

function PageProperties() {
  const { state, dispatch, mode, requestDeletePage } = useEditor();
  const page = currentPage(state);
  return (
    <div>
      <Section title={`Página ${state.pageIndex + 1} de ${state.doc.pages.length}`}>
        <ColorInput label="Color de fondo" value={page.background.color} onChange={(c) => dispatch({ type: "update-background", patch: { color: c ?? "#ffffff" }, key: "bg" })} />
        {mode === "magazine" && (
          <div>
            <FieldLabel htmlFor="page-type">Tipo de página</FieldLabel>
            <select
              id="page-type"
              value={page.pageType ?? "custom"}
              onChange={(e) => dispatch({ type: "update-page-meta", index: state.pageIndex, patch: { pageType: e.target.value as (typeof PAGE_TYPES)[number] } })}
              className="h-9 w-full rounded-lg border border-linea bg-white px-2 text-sm"
            >
              {PAGE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {PAGE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" variant="secondary" icon={<Copy className="size-4" />} onClick={() => dispatch({ type: "duplicate-page", index: state.pageIndex })}>
            Duplicar
          </Button>
          <Button size="sm" variant="danger" icon={<Trash2 className="size-4" />} disabled={state.doc.pages.length <= 1} onClick={() => requestDeletePage(state.pageIndex)}>
            Eliminar
          </Button>
        </div>
      </Section>
      <Section title="Cómo empezar">
        <ul className="list-disc space-y-1 pl-4 text-sm text-tinta-suave">
          <li>Haz clic en un elemento para seleccionarlo y ver sus opciones aquí.</li>
          <li>Haz doble clic en un texto para escribir.</li>
          <li>Arrastra los puntos azules para cambiar el tamaño.</li>
          <li>Tus cambios se guardan solos.</li>
        </ul>
        <p className="text-xs text-tinta-suave">Elementos en esta página: {page.elements.length}. Texto sugerido: {TEXT_PRESETS.body.label.toLowerCase()} de {TYPE_SCALE.body.size} pt.</p>
      </Section>
    </div>
  );
}
