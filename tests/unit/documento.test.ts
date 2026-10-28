import { describe, expect, it } from "vitest";
import { clonePage, createBlankPage, createTextElement, DEFAULT_TEXT_STYLE } from "@/lib/document/factory";
import { computeImageLayout, constrainToPage, pageSize } from "@/lib/document/geometry";
import { collectAssetIds, pageSchema, workContentSchema, type Page, type TextElement } from "@/lib/document/schema";
import { planTemplateSwitch, adaptPageOrientation } from "@/lib/document/template-switch";
import { layoutText } from "@/lib/document/text-layout";
import { builtinTemplates } from "@/lib/templates";

const monospace = (s: string) => [...s].length; // 1 unidad por carácter

describe("ajuste de líneas", () => {
  it("parte por palabras y respeta los saltos de línea", () => {
    const lines = layoutText("uno dos tres cuatro\ncinco", 9, monospace);
    expect(lines.map((l) => l.text)).toEqual(["uno dos", "tres", "cuatro", "cinco"]);
    expect(lines.map((l) => l.justifiable)).toEqual([true, true, false, false]);
  });

  it("divide palabras más largas que el cuadro", () => {
    expect(layoutText("abcdefghij", 4, monospace).map((l) => l.text)).toEqual(["abcd", "efgh", "ij"]);
  });

  it("incluye el espaciado entre letras en el ancho", () => {
    const [line] = layoutText("abc", 100, monospace, 2);
    expect(line?.width).toBe(9);
  });

  it("conserva los párrafos vacíos", () => {
    expect(layoutText("a\n\nb", 10, monospace).map((l) => l.text)).toEqual(["a", "", "b"]);
  });
});

describe("recorte de imágenes", () => {
  it("cover rellena el marco y centra", () => {
    const l = computeImageLayout(400, 200, 100, 100, "cover", 1, 50, 50);
    expect(l).toEqual({ left: -50, top: 0, width: 200, height: 100 });
  });

  it("contain muestra la imagen completa", () => {
    const l = computeImageLayout(400, 200, 100, 100, "contain", 1, 50, 50);
    expect(l).toEqual({ left: 0, top: 25, width: 100, height: 50 });
  });

  it("el foco mueve la zona visible y el zoom amplía", () => {
    expect(computeImageLayout(400, 200, 100, 100, "cover", 1, 0, 50).left).toBeCloseTo(0);
    expect(computeImageLayout(400, 200, 100, 100, "cover", 2, 50, 50).width).toBe(400);
  });

  it("limita valores desproporcionados", () => {
    expect(computeImageLayout(100, 100, 50, 50, "cover", 99, 500, -3).width).toBe(200);
  });
});

describe("límites de la página", () => {
  it("mantiene los elementos dentro de la página y con tamaño mínimo", () => {
    const el = { ...createTextElement("body", "portrait"), x: 500, y: -400, w: 0.5, h: 0.5 };
    const c = constrainToPage(el, "portrait");
    expect(c.w).toBe(3);
    expect(c.x).toBeLessThanOrEqual(pageSize("portrait").w);
    expect(c.y).toBeGreaterThan(-4);
  });
});

describe("esquema del documento", () => {
  it("rechaza tamaños de letra negativos o enormes", () => {
    const base = createTextElement("body", "portrait");
    const page = (style: Partial<TextElement["style"]>): Page => ({ ...createBlankPage(), elements: [{ ...base, style: { ...DEFAULT_TEXT_STYLE, ...style } }] });
    expect(pageSchema.safeParse(page({ fontSize: -5 })).success).toBe(false);
    expect(pageSchema.safeParse(page({ fontSize: 500 })).success).toBe(false);
    expect(pageSchema.safeParse(page({ fontSize: 12 })).success).toBe(true);
  });

  it("rechaza imágenes en Base64 o URLs en lugar de identificadores", () => {
    const page = clonePage(builtinTemplates()[0]!.page);
    const img = page.elements.find((e) => e.type === "image")!;
    const withData = { ...page, elements: [{ ...img, assetId: "data:image/png;base64,AAAA" }] };
    expect(pageSchema.safeParse(withData).success).toBe(false);
  });

  it("rechaza fuentes no incluidas y colores inválidos", () => {
    const base = createTextElement("body", "portrait");
    const bad = { ...createBlankPage(), elements: [{ ...base, style: { ...base.style, fontFamily: "comic-sans", color: "red" } }] };
    expect(pageSchema.safeParse(bad).success).toBe(false);
  });

  it("exige al menos una página y limita la cantidad", () => {
    expect(workContentSchema.safeParse({ schemaVersion: 1, orientation: "portrait", pages: [] }).success).toBe(false);
    const many = Array.from({ length: 25 }, () => createBlankPage());
    expect(workContentSchema.safeParse({ schemaVersion: 1, orientation: "portrait", pages: many }).success).toBe(false);
  });
});

describe("plantillas", () => {
  const all = builtinTemplates();

  it("incluye 6 portadas, 10 artículos y 5 páginas especiales", () => {
    expect(all.filter((t) => t.kind === "cover")).toHaveLength(6);
    expect(all.filter((t) => t.kind === "article")).toHaveLength(10);
    expect(all.filter((t) => t.kind === "extra")).toHaveLength(5);
  });

  it("todas son válidas, con roles únicos y dentro de la página", () => {
    const ids = new Set<string>();
    for (const t of all) {
      expect(ids.has(t.id)).toBe(false);
      ids.add(t.id);
      expect(pageSchema.safeParse(t.page).success).toBe(true);
      const roles = t.page.elements.map((e) => e.role).filter(Boolean);
      expect(new Set(roles).size).toBe(roles.length);
      for (const el of t.page.elements.filter((e) => e.type === "text")) {
        expect(el.x).toBeGreaterThanOrEqual(0);
        expect(el.x + el.w).toBeLessThanOrEqual(210.01);
        expect(el.y + el.h).toBeLessThanOrEqual(297.01);
      }
    }
  });

  it("las portadas tienen todos los campos editables pedidos", () => {
    const required = ["magazine-name", "title", "subtitle", "image-main", "headline-1", "headline-2", "headline-3", "edition", "date", "credits"];
    for (const t of all.filter((x) => x.kind === "cover")) {
      const roles = t.page.elements.map((e) => e.role);
      for (const r of required) expect(roles, `${t.id} sin ${r}`).toContain(r);
    }
  });

  it("la noticia y la entrevista tienen su estructura", () => {
    const roles = (id: string) => all.find((t) => t.id === id)!.page.elements.map((e) => e.role);
    expect(roles("articulo-noticia")).toEqual(expect.arrayContaining(["title", "subtitle", "author", "date", "lead", "body", "image-main", "caption"]));
    expect(roles("articulo-entrevista")).toEqual(expect.arrayContaining(["title", "intro", "image-main", "question-1", "answer-1", "closing"]));
    expect(roles("articulo-ciencia")).toEqual(expect.arrayContaining(["title", "intro", "subheading-1", "body", "image-main", "factbox", "sources"]));
  });

  it("usar una plantilla no modifica la original", () => {
    const original = JSON.stringify(all[0]!.page);
    const copy = clonePage(all[0]!.page);
    copy.elements[0] = { ...copy.elements[0]!, x: 99 };
    expect(JSON.stringify(builtinTemplates()[0]!.page)).toBe(original);
    expect(copy.elements[0]!.id).not.toBe(all[0]!.page.elements[0]!.id);
  });
});

describe("cambio de plantilla", () => {
  const noticia = builtinTemplates().find((t) => t.id === "articulo-noticia")!.page;
  const ciencia = builtinTemplates().find((t) => t.id === "articulo-ciencia")!.page;
  const asset = "33333333-3333-4333-8333-333333333333";

  function filled(): Page {
    const p = clonePage(noticia);
    p.elements = p.elements.map((el) => {
      if (el.type === "text" && el.role === "title") return { ...el, text: "Mi título", sample: false };
      if (el.type === "text" && el.role === "lead") return { ...el, text: "Mi entrada", sample: false };
      if (el.type === "image" && el.role === "image-main") return { ...el, assetId: asset };
      return el;
    });
    return p;
  }

  it("traslada el contenido por rol con el estilo nuevo", () => {
    const plan = planTemplateSwitch(filled(), ciencia);
    const title = plan.result.elements.find((e) => e.role === "title");
    expect(title?.type === "text" && title.text).toBe("Mi título");
    expect(title?.type === "text" && title.style.fontFamily).toBe("archivo");
    expect(collectAssetIds([plan.result])).toEqual([asset]);
    expect(plan.moved).toEqual(expect.arrayContaining(["title", "image-main"]));
  });

  it("avisa del contenido que no encaja y permite conservarlo", () => {
    const plan = planTemplateSwitch(filled(), ciencia);
    expect(plan.unmatched.map((u) => u.preview)).toEqual(["Mi entrada"]);
    expect(plan.resultWithExtras.elements.some((e) => e.type === "text" && e.text === "Mi entrada")).toBe(true);
  });

  it("no traslada textos de ejemplo sin modificar", () => {
    const plan = planTemplateSwitch(clonePage(noticia), ciencia);
    expect(plan.unmatched).toEqual([]);
    expect(plan.moved).toEqual([]);
  });

  it("adapta la geometría a orientación horizontal", () => {
    const land = adaptPageOrientation(ciencia, "portrait", "landscape");
    const maxRight = Math.max(...land.elements.map((e) => e.x + e.w));
    expect(maxRight).toBeLessThanOrEqual(297.5);
    expect(maxRight).toBeGreaterThan(250);
  });
});
