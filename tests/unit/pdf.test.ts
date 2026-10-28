import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_TEXT_STYLE } from "@/lib/document/factory";
import { pageSchema, type Page, type PageElement } from "@/lib/document/schema";
import { FONT_IDS, FONTS, fontFileUrl } from "@/lib/fonts";
import { buildPdf, type FontProvider, type ImageProvider } from "@/lib/pdf/render-pdf";
import { builtinTemplates } from "@/lib/templates";
import { makePng } from "../helpers/png";

const ROOT = path.resolve(__dirname, "../..");
const OUT = path.join(ROOT, "tmp-output");
const ASSET = "11111111-1111-4111-8111-111111111111";

const fonts: FontProvider = {
  async load(face) {
    return new Uint8Array(readFileSync(path.join(ROOT, "public", fontFileUrl(face.family, face.weight, face.italic))));
  },
};

const png = makePng(320, 240);
let imageRequests = 0;
const images: ImageProvider = {
  async prepare(req) {
    imageRequests++;
    return req.assetId === ASSET ? { bytes: png, format: "png" } : null;
  },
};

function template(id: string): Page {
  const t = builtinTemplates().find((x) => x.id === id);
  if (!t) throw new Error(id);
  const page = structuredClone(t.page);
  // Se rellena la imagen principal y se reemplaza el texto de ejemplo del título.
  page.elements = page.elements.map((el): PageElement => {
    if (el.type === "image") return { ...el, assetId: ASSET };
    if (el.type === "text" && el.role === "title") return { ...el, text: "Ñandú, cigüeña y pingüino: ¿qué aprendimos?", sample: false };
    return el;
  });
  return page;
}

/** Página con todas las familias, en redonda, negrita y cursiva. */
function fontsPage(): Page {
  const elements: PageElement[] = FONT_IDS.flatMap((id, i) => [
    {
      id: `f${i}`,
      type: "text",
      x: 15,
      y: 12 + i * 22,
      w: 180,
      h: 20,
      text: `${FONTS[id].label}: Áá Éé Ññ Üü ¿¡ 0123 — normal`,
      style: { ...DEFAULT_TEXT_STYLE, fontFamily: id, fontSize: 12 },
      background: null,
      padding: 0,
      verticalAlign: "top",
    },
    {
      id: `g${i}`,
      type: "text",
      x: 15,
      y: 19 + i * 22,
      w: 180,
      h: 12,
      text: `${FONTS[id].label} negrita y cursiva subrayada`,
      style: { ...DEFAULT_TEXT_STYLE, fontFamily: id, fontSize: 11, fontWeight: 700, italic: true, underline: true, letterSpacing: 0.5 },
      background: null,
      padding: 0,
      verticalAlign: "top",
    },
  ]);
  return { id: "fuentes", background: { color: "#ffffff", assetId: null, fit: "cover", opacity: 1 }, elements };
}

describe("exportación a PDF", () => {
  it("genera un PDF A4 de varias páginas con texto, fuentes incrustadas e imágenes", async () => {
    const pages = [template("portada-moderna"), template("articulo-noticia"), template("articulo-ciencia"), template("pagina-contraportada"), fontsPage()];
    for (const p of pages) pageSchema.parse(p);
    const progress: number[] = [];
    const { bytes, issues } = await buildPdf(pages, {
      title: "Revista de prueba",
      orientation: "portrait",
      fonts,
      images,
      onProgress: (done) => progress.push(done),
    });
    expect(progress).toEqual([1, 2, 3, 4, 5]);
    expect(imageRequests).toBeGreaterThan(0);
    // Los textos de ejemplo de la plantilla se señalan como avisos, no como errores.
    expect(issues.every((i) => i.severity === "warning")).toBe(true);

    mkdirSync(OUT, { recursive: true });
    writeFileSync(path.join(OUT, "prueba.pdf"), bytes);

    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: false }).promise;
    expect(doc.numPages).toBe(5);

    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const [, , w, h] = page.view;
      expect(Math.round(w!)).toBe(595); // A4 en puntos
      expect(Math.round(h!)).toBe(842);
    }

    // El texto es vectorial y extraíble, con acentos y eñes.
    const cover = await doc.getPage(1);
    const coverText = (await cover.getTextContent()).items.map((i) => ("str" in i ? i.str : "")).join(" ");
    expect(coverText).toContain("pingüino");
    expect(coverText).toMatch(/MI REVISTA/);
    const fontText = (await (await doc.getPage(5)).getTextContent()).items.map((i) => ("str" in i ? i.str : "")).join(" ");
    for (const id of FONT_IDS) expect(fontText).toContain(FONTS[id].label);

    // Vista previa en PNG para inspección visual.
    for (const n of [1, 2, 3, 5]) {
      const page = await doc.getPage(n);
      const viewport = page.getViewport({ scale: 1.3 });
      const factory = doc.canvasFactory as { create(w: number, h: number): { canvas: { toBuffer(t: string): Buffer } } };
      const { canvas } = factory.create(viewport.width, viewport.height);
      await page.render({ canvas: canvas as unknown as HTMLCanvasElement, viewport }).promise;
      writeFileSync(path.join(OUT, `pagina-${n}.png`), canvas.toBuffer("image/png"));
    }
  });

  it("falla de forma explícita si una imagen no se puede cargar", async () => {
    const page = template("articulo-noticia");
    page.elements = page.elements.map((el) => (el.type === "image" ? { ...el, assetId: "22222222-2222-4222-8222-222222222222" } : el));
    await expect(buildPdf([page], { title: "x", orientation: "portrait", fonts, images })).rejects.toThrow(/no se pudo cargar una imagen/);
  });

  it("avisa cuando un texto no cabe en su cuadro", async () => {
    const page: Page = {
      id: "p",
      background: { color: "#ffffff", assetId: null, fit: "cover", opacity: 1 },
      elements: [
        {
          id: "t",
          type: "text",
          x: 10,
          y: 10,
          w: 40,
          h: 10,
          text: "Este texto es demasiado largo para un cuadro tan pequeño y debe generar un aviso.",
          style: { ...DEFAULT_TEXT_STYLE, fontSize: 12 },
          background: null,
          padding: 0,
          verticalAlign: "top",
        },
      ],
    };
    const { issues } = await buildPdf([page], { title: "x", orientation: "landscape", fonts, images });
    expect(issues.some((i) => /no cabe/.test(i.message))).toBe(true);
  });
});
