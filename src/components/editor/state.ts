import { cloneElement, clonePage } from "@/lib/document/factory";
import { constrainToPage } from "@/lib/document/geometry";
import { LIMITS, type Background, type EditorDocument, type Page, type PageElement } from "@/lib/document/schema";

// Estado del editor: documento, página y selección actuales e historial para deshacer/rehacer.

interface Snapshot {
  doc: EditorDocument;
  title: string;
  pageIndex: number;
}

export interface EditorState {
  doc: EditorDocument;
  title: string;
  pageIndex: number;
  selection: string[];
  past: Snapshot[];
  future: Snapshot[];
  /** Agrupa cambios seguidos (escribir, arrastrar) en un solo paso del historial. */
  coalesceKey: string | null;
  coalesceAt: number;
  /** Aumenta con cada cambio del documento; el guardado automático lo observa. */
  revision: number;
  maxPages: number;
}

export type ReorderDirection = "front" | "back" | "forward" | "backward";

export type EditorAction =
  | { type: "select"; ids: string[] }
  | { type: "set-page"; index: number }
  | { type: "set-title"; title: string }
  | { type: "update-elements"; updates: Record<string, Partial<PageElement>>; key?: string }
  | { type: "add-elements"; elements: PageElement[] }
  | { type: "delete-selected" }
  | { type: "duplicate-selected" }
  | { type: "reorder"; direction: ReorderDirection }
  | { type: "update-background"; patch: Partial<Background>; key?: string }
  | { type: "add-pages"; pages: Page[]; at?: number }
  | { type: "replace-page"; index: number; page: Page }
  | { type: "update-page-meta"; index: number; patch: Partial<Pick<Page, "pageType">> }
  | { type: "delete-page"; index: number }
  | { type: "duplicate-page"; index: number }
  | { type: "move-page"; from: number; to: number }
  | { type: "replace-document"; doc: EditorDocument; title?: string }
  | { type: "undo" }
  | { type: "redo" };

const HISTORY_LIMIT = 100;
const COALESCE_MS = 1200;

export function initEditorState(doc: EditorDocument, title: string, maxPages: number): EditorState {
  return { doc, title, pageIndex: 0, selection: [], past: [], future: [], coalesceKey: null, coalesceAt: 0, revision: 0, maxPages };
}

export function currentPage(state: EditorState): Page {
  return state.doc.pages[state.pageIndex] ?? state.doc.pages[0]!;
}

/** Aplica un cambio guardando la versión anterior en el historial. */
function commit(state: EditorState, next: Partial<Snapshot> & { selection?: string[] }, key?: string): EditorState {
  const now = Date.now();
  const coalesce = key !== undefined && key === state.coalesceKey && now - state.coalesceAt < COALESCE_MS;
  const past = coalesce ? state.past : [...state.past, { doc: state.doc, title: state.title, pageIndex: state.pageIndex }].slice(-HISTORY_LIMIT);
  return {
    ...state,
    doc: next.doc ?? state.doc,
    title: next.title ?? state.title,
    pageIndex: next.pageIndex ?? state.pageIndex,
    selection: next.selection ?? state.selection,
    past,
    future: [],
    coalesceKey: key ?? null,
    coalesceAt: now,
    revision: state.revision + 1,
  };
}

function withPage(state: EditorState, index: number, page: Page): EditorDocument {
  const pages = state.doc.pages.slice();
  pages[index] = page;
  return { ...state.doc, pages };
}

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  const page = currentPage(state);
  switch (action.type) {
    case "select":
      return { ...state, selection: action.ids.filter((id) => page.elements.some((e) => e.id === id)), coalesceKey: null };

    case "set-page": {
      const index = Math.max(0, Math.min(state.doc.pages.length - 1, action.index));
      return { ...state, pageIndex: index, selection: [], coalesceKey: null };
    }

    case "set-title":
      return commit(state, { title: action.title.slice(0, 150) }, "title");

    case "update-elements": {
      let changed = false;
      const elements = page.elements.map((el) => {
        const patch = action.updates[el.id];
        if (!patch) return el;
        changed = true;
        return { ...el, ...patch, id: el.id, type: el.type } as PageElement;
      });
      if (!changed) return state;
      return commit(state, { doc: withPage(state, state.pageIndex, { ...page, elements }) }, action.key);
    }

    case "add-elements": {
      const room = LIMITS.maxElementsPerPage - page.elements.length;
      if (room <= 0) return state;
      const added = action.elements.slice(0, room).map((el) => constrainToPage(el, state.doc.orientation));
      return commit(state, { doc: withPage(state, state.pageIndex, { ...page, elements: [...page.elements, ...added] }), selection: added.map((e) => e.id) });
    }

    case "delete-selected": {
      if (state.selection.length === 0) return state;
      const elements = page.elements.filter((e) => !state.selection.includes(e.id) || e.locked);
      if (elements.length === page.elements.length) return state;
      return commit(state, { doc: withPage(state, state.pageIndex, { ...page, elements }), selection: [] });
    }

    case "duplicate-selected": {
      const copies = page.elements
        .filter((e) => state.selection.includes(e.id))
        .map((e) => ({ ...cloneElement(e), x: e.x + 5, y: e.y + 5, locked: false }));
      if (copies.length === 0) return state;
      return editorReducer(state, { type: "add-elements", elements: copies });
    }

    case "reorder": {
      if (state.selection.length !== 1) return state;
      const idx = page.elements.findIndex((e) => e.id === state.selection[0]);
      if (idx < 0) return state;
      const elements = page.elements.slice();
      const [el] = elements.splice(idx, 1);
      const target = { front: elements.length, back: 0, forward: Math.min(elements.length, idx + 1), backward: Math.max(0, idx - 1) }[action.direction];
      elements.splice(target, 0, el!);
      return commit(state, { doc: withPage(state, state.pageIndex, { ...page, elements }) });
    }

    case "update-background":
      return commit(state, { doc: withPage(state, state.pageIndex, { ...page, background: { ...page.background, ...action.patch } }) }, action.key);

    case "add-pages": {
      const room = state.maxPages - state.doc.pages.length;
      if (room <= 0) return state;
      const at = Math.max(0, Math.min(state.doc.pages.length, action.at ?? state.pageIndex + 1));
      const pages = state.doc.pages.slice();
      pages.splice(at, 0, ...action.pages.slice(0, room));
      return commit(state, { doc: { ...state.doc, pages }, pageIndex: at, selection: [] });
    }

    case "replace-page":
      return commit(state, { doc: withPage(state, action.index, action.page), selection: [] });

    case "update-page-meta": {
      const target = state.doc.pages[action.index];
      if (!target) return state;
      return commit(state, { doc: withPage(state, action.index, { ...target, ...action.patch }) });
    }

    case "delete-page": {
      if (state.doc.pages.length <= 1) return state;
      const pages = state.doc.pages.filter((_, i) => i !== action.index);
      return commit(state, { doc: { ...state.doc, pages }, pageIndex: Math.min(state.pageIndex, pages.length - 1), selection: [] });
    }

    case "duplicate-page": {
      const source = state.doc.pages[action.index];
      if (!source) return state;
      return editorReducer(state, { type: "add-pages", pages: [clonePage(source)], at: action.index + 1 });
    }

    case "move-page": {
      const { from, to } = action;
      if (from === to || !state.doc.pages[from] || to < 0 || to >= state.doc.pages.length) return state;
      const pages = state.doc.pages.slice();
      const [moved] = pages.splice(from, 1);
      pages.splice(to, 0, moved!);
      const current = state.doc.pages[state.pageIndex]!.id;
      return commit(state, { doc: { ...state.doc, pages }, pageIndex: pages.findIndex((p) => p.id === current) });
    }

    case "replace-document":
      return commit(state, { doc: action.doc, title: action.title ?? state.title, pageIndex: 0, selection: [] });

    case "undo": {
      const prev = state.past[state.past.length - 1];
      if (!prev) return state;
      return {
        ...state,
        ...prev,
        pageIndex: Math.min(prev.pageIndex, prev.doc.pages.length - 1),
        selection: [],
        past: state.past.slice(0, -1),
        future: [{ doc: state.doc, title: state.title, pageIndex: state.pageIndex }, ...state.future],
        coalesceKey: null,
        revision: state.revision + 1,
      };
    }

    case "redo": {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        ...next,
        selection: [],
        past: [...state.past, { doc: state.doc, title: state.title, pageIndex: state.pageIndex }],
        future: state.future.slice(1),
        coalesceKey: null,
        revision: state.revision + 1,
      };
    }
  }
}
