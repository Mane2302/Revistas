"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { horizontalListSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FilePlus2, Library } from "lucide-react";
import { useId } from "react";
import { PageView } from "@/components/magazine/page-view";
import { createBlankPage } from "@/lib/document/factory";
import { PAGE_TYPE_LABELS, type Page } from "@/lib/document/schema";
import { cn } from "@/lib/utils";
import { useEditor } from "./editor-context";

function Thumb({ page, index }: { page: Page; index: number }) {
  const { state, dispatch, assets, mode, readOnly } = useEditor();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: page.id, disabled: readOnly });
  const active = index === state.pageIndex;
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("shrink-0", isDragging && "z-10 opacity-80")}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={() => dispatch({ type: "set-page", index })}
        aria-current={active ? "page" : undefined}
        aria-label={`Página ${index + 1}${mode === "magazine" && page.pageType ? `, ${PAGE_TYPE_LABELS[page.pageType]}` : ""}. Arrastra para cambiar el orden.`}
        className={cn("block rounded-md p-0.5 transition", active ? "ring-3 ring-cielo" : "ring-1 ring-linea hover:ring-cielo/50")}
      >
        <PageView page={page} orientation={state.doc.orientation} width={state.doc.orientation === "portrait" ? 64 : 90} assets={assets} />
      </button>
      <span className="mt-1 block max-w-24 truncate text-center text-[11px] font-bold text-tinta-suave">
        {index + 1}
        {mode === "magazine" && page.pageType && page.pageType !== "custom" ? ` · ${PAGE_TYPE_LABELS[page.pageType]}` : ""}
      </span>
    </li>
  );
}

export function PagesStrip() {
  const { state, dispatch, readOnly, mode, openInsertWork } = useEditor();
  const dndId = useId();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = state.doc.pages.findIndex((p) => p.id === e.active.id);
    const to = state.doc.pages.findIndex((p) => p.id === e.over!.id);
    dispatch({ type: "move-page", from, to });
  };

  return (
    <div className="flex items-center gap-3 overflow-x-auto px-4 py-2">
      <DndContext id={dndId} sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={state.doc.pages.map((p) => p.id)} strategy={horizontalListSortingStrategy}>
          <ol className="flex items-start gap-3" aria-label="Páginas">
            {state.doc.pages.map((p, i) => (
              <Thumb key={p.id} page={p} index={i} />
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {!readOnly && (
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            type="button"
            onClick={() => dispatch({ type: "add-pages", pages: [createBlankPage()] })}
            disabled={state.doc.pages.length >= state.maxPages}
            className="flex items-center gap-1.5 rounded-lg border border-dashed border-tinta-suave/40 px-3 py-2 text-xs font-bold hover:border-cielo hover:bg-cielo-claro/50 disabled:opacity-40"
          >
            <FilePlus2 className="size-4" /> Página en blanco
          </button>
          {mode === "magazine" && openInsertWork && (
            <button type="button" onClick={openInsertWork} className="flex items-center gap-1.5 rounded-lg border border-dashed border-tinta-suave/40 px-3 py-2 text-xs font-bold hover:border-cielo hover:bg-cielo-claro/50">
              <Library className="size-4" /> Insertar trabajo aprobado
            </button>
          )}
        </div>
      )}
    </div>
  );
}
