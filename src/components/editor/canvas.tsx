"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { boxStyle, PageView, textStyleCss } from "@/components/magazine/page-view";
import { computeImageLayout, pageSize, round } from "@/lib/document/geometry";
import { LIMITS, type ImageElement, type PageElement } from "@/lib/document/schema";
import { cn } from "@/lib/utils";
import { currentPage } from "./state";
import { useEditor } from "./editor-context";

type Handle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const HANDLES: Handle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

type Box = { x: number; y: number; w: number; h: number };

type DragState =
  | { kind: "move"; startX: number; startY: number; origin: Record<string, Box>; key: string; moved: boolean }
  | { kind: "resize"; handle: Handle; startX: number; startY: number; origin: Box; id: string; key: string; keepRatio: boolean }
  | { kind: "crop"; startX: number; startY: number; id: string; focusX: number; focusY: number; key: string };

const SNAP_MM = 1.5;

export function Canvas({ scale, onDropFiles }: { scale: number; onDropFiles: (files: File[]) => void }) {
  const { state, dispatch, assets, readOnly, cropId, setCropId } = useEditor();
  const page = currentPage(state);
  const orientation = state.doc.orientation;
  const { w: pw, h: ph } = pageSize(orientation);
  const drag = useRef<DragState | null>(null);
  const [guides, setGuides] = useState<{ x?: number; y?: number }>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [overflowIds, setOverflowIds] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);

  const selected = page.elements.filter((e) => state.selection.includes(e.id));
  const single = selected.length === 1 ? selected[0] : undefined;
  const editing = page.elements.find((e) => e.id === editingId && e.type === "text");

  // Detecta textos que no caben en su cuadro (se marcan en rojo).
  useEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled || !pageRef.current) return;
      const nodes = pageRef.current.querySelectorAll<HTMLElement>("[data-text-id]");
      const ids: string[] = [];
      nodes.forEach((n) => {
        const inner = n.firstElementChild as HTMLElement | null;
        const available = n.clientHeight - parseFloat(getComputedStyle(n).paddingTop) - parseFloat(getComputedStyle(n).paddingBottom);
        if (inner && inner.scrollHeight > available + 2) ids.push(n.dataset.textId ?? "");
      });
      setOverflowIds((prev) => (prev.join() === ids.join() ? prev : ids));
    };
    const frame = requestAnimationFrame(measure);
    void document.fonts?.ready.then(() => requestAnimationFrame(measure));
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [page, scale]);

  function startMove(e: ReactPointerEvent, el: PageElement) {
    if (readOnly) return;
    e.stopPropagation();
    if (editingId === el.id) return;
    if (editingId) setEditingId(null);
    let selection = state.selection;
    if (e.shiftKey) selection = selection.includes(el.id) ? selection.filter((i) => i !== el.id) : [...selection, el.id];
    else if (!selection.includes(el.id)) selection = [el.id];
    dispatch({ type: "select", ids: selection });
    if (cropId && cropId !== el.id) setCropId(null);

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    if (cropId === el.id && el.type === "image") {
      drag.current = { kind: "crop", startX: e.clientX, startY: e.clientY, id: el.id, focusX: el.focusX, focusY: el.focusY, key: `crop-${e.timeStamp}` };
      return;
    }
    const movable = page.elements.filter((x) => selection.includes(x.id) && !x.locked);
    if (movable.length === 0) return;
    drag.current = {
      kind: "move",
      startX: e.clientX,
      startY: e.clientY,
      origin: Object.fromEntries(movable.map((m) => [m.id, { x: m.x, y: m.y, w: m.w, h: m.h }])),
      key: `move-${e.timeStamp}`,
      moved: false,
    };
  }

  function startResize(e: ReactPointerEvent, el: PageElement, handle: Handle) {
    e.stopPropagation();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { kind: "resize", handle, startX: e.clientX, startY: e.clientY, origin: { x: el.x, y: el.y, w: el.w, h: el.h }, id: el.id, key: `resize-${e.timeStamp}`, keepRatio: e.shiftKey || el.type === "image" };
  }

  function onPointerMove(e: ReactPointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.startX) / scale;
    const dy = (e.clientY - d.startY) / scale;

    if (d.kind === "move") {
      if (!d.moved && Math.hypot(dx, dy) * scale < 3) return;
      d.moved = true;
      let sx = dx;
      let sy = dy;
      const g: { x?: number; y?: number } = {};
      const ids = Object.keys(d.origin);
      if (ids.length === 1 && !e.altKey) {
        // Imán: bordes, márgenes y centro de la página.
        const o = d.origin[ids[0]!]!;
        const targetsX = [0, 15, pw / 2, pw - 15, pw];
        const targetsY = [0, 15, ph / 2, ph - 15, ph];
        let best = SNAP_MM;
        for (const t of targetsX) for (const edge of [o.x + dx, o.x + dx + o.w / 2, o.x + dx + o.w]) if (Math.abs(edge - t) < best) { best = Math.abs(edge - t); sx = dx + (t - edge); g.x = t; }
        best = SNAP_MM;
        for (const t of targetsY) for (const edge of [o.y + dy, o.y + dy + o.h / 2, o.y + dy + o.h]) if (Math.abs(edge - t) < best) { best = Math.abs(edge - t); sy = dy + (t - edge); g.y = t; }
      }
      const updates: Record<string, Partial<PageElement>> = {};
      for (const [id, o] of Object.entries(d.origin)) {
        updates[id] = { x: round(Math.min(pw - 5, Math.max(5 - o.w, o.x + sx)), 1), y: round(Math.min(ph - 5, Math.max(5 - o.h, o.y + sy)), 1) };
      }
      setGuides(g);
      dispatch({ type: "update-elements", updates, key: d.key });
      return;
    }

    if (d.kind === "resize") {
      const o = d.origin;
      const min = LIMITS.minResizeSize;
      let { x, y, w, h } = o;
      if (d.handle.includes("e")) w = o.w + dx;
      if (d.handle.includes("w")) { w = o.w - dx; x = o.x + dx; }
      if (d.handle.includes("s")) h = o.h + dy;
      if (d.handle.includes("n")) { h = o.h - dy; y = o.y + dy; }
      if (d.keepRatio && d.handle.length === 2) {
        const ratio = o.w / o.h;
        if (Math.abs(w - o.w) / o.w > Math.abs(h - o.h) / o.h) h = w / ratio;
        else w = h * ratio;
        if (d.handle.includes("w")) x = o.x + o.w - w;
        if (d.handle.includes("n")) y = o.y + o.h - h;
      }
      if (w < min) { if (d.handle.includes("w")) x -= min - w; w = min; }
      if (h < min) { if (d.handle.includes("n")) y -= min - h; h = min; }
      w = Math.min(w, pw * 2);
      h = Math.min(h, ph * 2);
      dispatch({ type: "update-elements", updates: { [d.id]: { x: round(x, 1), y: round(y, 1), w: round(w, 1), h: round(h, 1) } }, key: d.key });
      return;
    }

    // Recorte: arrastrar mueve la foto dentro de su marco.
    const el = page.elements.find((x) => x.id === d.id) as ImageElement | undefined;
    const asset = el?.assetId ? assets[el.assetId] : undefined;
    if (!el || !asset) return;
    const layout = computeImageLayout(asset.width, asset.height, el.w, el.h, el.fit, el.zoom, d.focusX, d.focusY);
    const rangeX = layout.width - el.w;
    const rangeY = layout.height - el.h;
    const focusX = rangeX > 0.01 ? Math.min(100, Math.max(0, d.focusX - (dx / rangeX) * 100)) : d.focusX;
    const focusY = rangeY > 0.01 ? Math.min(100, Math.max(0, d.focusY - (dy / rangeY) * 100)) : d.focusY;
    dispatch({ type: "update-elements", updates: { [d.id]: { focusX: round(focusX, 1), focusY: round(focusY, 1) } }, key: d.key });
  }

  function endDrag() {
    drag.current = null;
    setGuides({});
  }

  return (
    <div
      className={cn("relative mx-auto my-8 shadow-flotante transition-shadow", dragOver && "ring-4 ring-cielo ring-offset-4")}
      style={{ width: pw * scale }}
      onPointerDown={() => {
        if (readOnly) return;
        setEditingId(null);
        setCropId(null);
        dispatch({ type: "select", ids: [] });
      }}
      onDragOver={(e) => {
        if (readOnly || !e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (!readOnly) onDropFiles([...e.dataTransfer.files]);
      }}
    >
      <div ref={pageRef}>
        <PageView page={page} orientation={orientation} width={pw * scale} assets={assets} hideIds={editing ? new Set([editing.id]) : undefined} label={`Página ${state.pageIndex + 1}`}>
          {/* Zonas interactivas (mismo orden que los elementos: el de arriba recibe el clic) */}
          {page.elements.map((el) => (
            <div
              key={el.id}
              data-hit={el.id}
              style={{ ...boxStyle(el, scale), cursor: readOnly ? "default" : cropId === el.id ? "grab" : el.locked ? "pointer" : "move", touchAction: "none" }}
              onPointerDown={(e) => startMove(e, el)}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              onDoubleClick={() => {
                if (readOnly || el.locked) return;
                if (el.type === "text") setEditingId(el.id);
                if (el.type === "image" && el.assetId) setCropId(el.id);
              }}
            />
          ))}

          {/* Contorno de textos desbordados */}
          {page.elements
            .filter((el) => overflowIds.includes(el.id))
            .map((el) => (
              <div key={`of-${el.id}`} className="pointer-events-none border-2 border-dashed border-red-500" style={boxStyle(el, scale)}>
                <span className="absolute -bottom-6 left-0 flex items-center gap-1 rounded bg-red-600 px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap text-white">
                  <AlertTriangle className="size-3" aria-hidden /> El texto no cabe
                </span>
              </div>
            ))}

          {/* Selección */}
          {!readOnly &&
            selected.map((el) => (
              <div key={`sel-${el.id}`} className={cn("pointer-events-none absolute outline-2 outline-offset-1", cropId === el.id ? "outline-coral" : "outline-cielo")} style={boxStyle(el, scale)} />
            ))}
          {!readOnly && single && !single.locked && cropId !== single.id && editingId !== single.id &&
            HANDLES.map((h) => {
              const left = h.includes("w") ? 0 : h.includes("e") ? 1 : 0.5;
              const top = h.includes("n") ? 0 : h.includes("s") ? 1 : 0.5;
              return (
                <div
                  key={h}
                  role="presentation"
                  onPointerDown={(e) => startResize(e, single, h)}
                  onPointerMove={onPointerMove}
                  onPointerUp={endDrag}
                  onPointerCancel={endDrag}
                  className="absolute size-3 rounded-[3px] border-2 border-cielo bg-white shadow"
                  style={{
                    left: (single.x + single.w * left) * scale - 6,
                    top: (single.y + single.h * top) * scale - 6,
                    cursor: `${h}-resize`,
                    touchAction: "none",
                  }}
                />
              );
            })}

          {/* Guías del imán */}
          {guides.x !== undefined && <div className="pointer-events-none absolute top-0 bottom-0 w-px bg-coral" style={{ left: guides.x * scale }} />}
          {guides.y !== undefined && <div className="pointer-events-none absolute right-0 left-0 h-px bg-coral" style={{ top: guides.y * scale }} />}

          {/* Edición de texto directamente en la página */}
          {editing && editing.type === "text" && (
            <textarea
              autoFocus
              aria-label="Editar texto"
              className="page-text absolute resize-none border-0 bg-white/40 outline-2 outline-coral"
              style={{
                ...boxStyle(editing, scale),
                ...textStyleCss(editing, scale),
                padding: editing.padding * scale,
                textTransform: editing.style.uppercase ? "uppercase" : "none",
                overflow: "hidden",
              }}
              value={editing.text}
              onFocus={(e) => {
                if (editing.sample) e.currentTarget.select();
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => dispatch({ type: "update-elements", updates: { [editing.id]: { text: e.target.value.slice(0, LIMITS.maxTextLength), sample: false } }, key: `text-${editing.id}` })}
              onKeyDown={(e) => {
                if (e.key === "Escape") setEditingId(null);
              }}
              onBlur={() => setEditingId(null)}
            />
          )}
        </PageView>
      </div>
      {cropId && (
        <p className="absolute -top-7 left-0 rounded-md bg-coral-oscuro px-2 py-1 text-xs font-bold text-white">
          Modo recorte: arrastra la foto para encuadrarla. Pulsa Esc para terminar.
        </p>
      )}
    </div>
  );
}
