import { describe, expect, it } from "vitest";
import { csvCell, parseCsv, toCsv } from "@/lib/csv";
import { isAllowedExtension, sniffImage } from "@/lib/storage/sniff";
import { makePng } from "../helpers/png";

describe("CSV", () => {
  it("lee comas, punto y coma, comillas y BOM", () => {
    expect(parseCsv("﻿nombre,usuario\nAna López,alumno01\r\n")).toEqual([
      ["nombre", "usuario"],
      ["Ana López", "alumno01"],
    ]);
    expect(parseCsv('nombre;usuario\n"Pérez; Luis";alumno02')).toEqual([
      ["nombre", "usuario"],
      ["Pérez; Luis", "alumno02"],
    ]);
    expect(parseCsv('a,b\n"di ""hola""",x\n\n')).toEqual([
      ["a", "b"],
      ['di "hola"', "x"],
    ]);
  });

  it("neutraliza fórmulas al exportar", () => {
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(toCsv([["a", "b,c"]])).toBe('﻿a,"b,c"\r\n');
  });
});

describe("verificación de imágenes", () => {
  it("reconoce un PNG real y sus dimensiones", () => {
    expect(sniffImage(makePng(37, 21))).toEqual({ mime: "image/png", ext: "png", width: 37, height: 21 });
  });

  it("reconoce JPEG y WebP por su firma", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x40, 0x00, 0x80, 0x03, 0, 0, 0, 0, 0, 0]);
    expect(sniffImage(jpeg)).toMatchObject({ mime: "image/jpeg", width: 128, height: 64 });
    const webp = new Uint8Array(40);
    webp.set(new TextEncoder().encode("RIFF"), 0);
    webp.set(new TextEncoder().encode("WEBPVP8X"), 8);
    webp.set([99, 0, 0, 49, 0, 0], 24);
    expect(sniffImage(webp)).toMatchObject({ mime: "image/webp", width: 100, height: 50 });
  });

  it("rechaza SVG, HTML y archivos disfrazados con otra extensión", () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    expect(sniffImage(svg)).toBeNull();
    expect(sniffImage(new TextEncoder().encode("<!doctype html><html>"))).toBeNull();
    expect(sniffImage(new TextEncoder().encode("%PDF-1.7"))).toBeNull();
  });

  it("solo admite extensiones de imagen permitidas", () => {
    expect(isAllowedExtension("foto.JPG")).toBe(true);
    expect(isAllowedExtension("foto.webp")).toBe(true);
    expect(isAllowedExtension("dibujo.svg")).toBe(false);
    expect(isAllowedExtension("foto.png.exe")).toBe(false);
  });
});
