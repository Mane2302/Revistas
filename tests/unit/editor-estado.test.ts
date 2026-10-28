import { describe, expect, it } from "vitest";
import { editorReducer, initEditorState, type EditorState } from "@/components/editor/state";
import { createBlankPage, createShapeElement, createTextElement } from "@/lib/document/factory";

function setup(): EditorState {
  const page = createBlankPage();
  page.elements = [createTextElement("title", "portrait"), createShapeElement("rect", "portrait")];
  return initEditorState({ orientation: "portrait", pages: [page] }, "Mi trabajo", 24);
}

const ids = (s: EditorState) => s.doc.pages[s.pageIndex]!.elements.map((e) => e.id);

describe("estado del editor", () => {
  it("deshace y rehace cambios", () => {
    let s = setup();
    const [textId] = ids(s);
    s = editorReducer(s, { type: "update-elements", updates: { [textId!]: { x: 50 } } });
    expect(s.doc.pages[0]!.elements[0]!.x).toBe(50);
    s = editorReducer(s, { type: "undo" });
    expect(s.doc.pages[0]!.elements[0]!.x).not.toBe(50);
    s = editorReducer(s, { type: "redo" });
    expect(s.doc.pages[0]!.elements[0]!.x).toBe(50);
  });

  it("agrupa las pulsaciones de teclado en un solo paso", () => {
    let s = setup();
    const [textId] = ids(s);
    for (const t of ["H", "Ho", "Hol", "Hola"]) s = editorReducer(s, { type: "update-elements", updates: { [textId!]: { text: t } as never }, key: `text-${textId}` });
    expect(s.past).toHaveLength(1);
    expect(s.revision).toBe(4);
  });

  it("duplica, reordena y elimina elementos", () => {
    let s = setup();
    const [textId, shapeId] = ids(s);
    s = editorReducer(s, { type: "select", ids: [textId!] });
    s = editorReducer(s, { type: "duplicate-selected" });
    expect(ids(s)).toHaveLength(3);
    const copy = s.selection[0]!;
    expect(copy).not.toBe(textId);
    s = editorReducer(s, { type: "reorder", direction: "back" });
    expect(ids(s)[0]).toBe(copy);
    s = editorReducer(s, { type: "select", ids: [shapeId!] });
    s = editorReducer(s, { type: "delete-selected" });
    expect(ids(s)).not.toContain(shapeId);
  });

  it("no elimina elementos bloqueados", () => {
    let s = setup();
    const [textId] = ids(s);
    s = editorReducer(s, { type: "update-elements", updates: { [textId!]: { locked: true } } });
    s = editorReducer(s, { type: "select", ids: [textId!] });
    s = editorReducer(s, { type: "delete-selected" });
    expect(ids(s)).toContain(textId);
  });

  it("gestiona páginas: añadir, duplicar, mover y borrar (nunca la última)", () => {
    let s = setup();
    const first = s.doc.pages[0]!.id;
    s = editorReducer(s, { type: "add-pages", pages: [createBlankPage("#000000")] });
    expect(s.doc.pages).toHaveLength(2);
    expect(s.pageIndex).toBe(1);
    s = editorReducer(s, { type: "duplicate-page", index: 0 });
    expect(s.doc.pages).toHaveLength(3);
    s = editorReducer(s, { type: "move-page", from: 0, to: 2 });
    expect(s.doc.pages[2]!.id).toBe(first);
    s = editorReducer(s, { type: "delete-page", index: 0 });
    s = editorReducer(s, { type: "delete-page", index: 0 });
    s = editorReducer(s, { type: "delete-page", index: 0 });
    expect(s.doc.pages).toHaveLength(1);
  });

  it("respeta el máximo de páginas", () => {
    let s = initEditorState({ orientation: "portrait", pages: [createBlankPage()] }, "x", 2);
    s = editorReducer(s, { type: "add-pages", pages: [createBlankPage(), createBlankPage()] });
    expect(s.doc.pages).toHaveLength(2);
  });

  it("mantiene los elementos nuevos dentro de la página", () => {
    let s = setup();
    s = editorReducer(s, { type: "add-elements", elements: [{ ...createTextElement("body", "portrait"), x: 900, y: 900 }] });
    const added = s.doc.pages[0]!.elements.at(-1)!;
    expect(added.x).toBeLessThan(210);
    expect(added.y).toBeLessThan(297);
  });
});
