// Identifica una imagen por su firma binaria (no por la extensión ni el tipo MIME
// declarado) y lee sus dimensiones. Cualquier otro contenido (SVG, HTML, PDF…) se rechaza.

export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedMime = keyof typeof ALLOWED_IMAGE_TYPES;
export type AllowedExt = (typeof ALLOWED_IMAGE_TYPES)[AllowedMime];

export const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "webp"] as const;

export interface SniffedImage {
  mime: AllowedMime;
  ext: AllowedExt;
  width: number | null;
  height: number | null;
}

export function fileExtension(name: string): string {
  const m = /\.([a-z0-9]+)$/i.exec(name.trim());
  return m?.[1]?.toLowerCase() ?? "";
}

export function isAllowedExtension(name: string): boolean {
  return (ALLOWED_EXTENSIONS as readonly string[]).includes(fileExtension(name));
}

const u16le = (b: Uint8Array, o: number) => (b[o] ?? 0) | ((b[o + 1] ?? 0) << 8);
const u24le = (b: Uint8Array, o: number) => u16le(b, o) | ((b[o + 2] ?? 0) << 16);
const u16be = (b: Uint8Array, o: number) => ((b[o] ?? 0) << 8) | (b[o + 1] ?? 0);
const u32be = (b: Uint8Array, o: number) => ((b[o] ?? 0) * 2 ** 24) + (((b[o + 1] ?? 0) << 16) | ((b[o + 2] ?? 0) << 8) | (b[o + 3] ?? 0));
const ascii = (b: Uint8Array, o: number, n: number) => String.fromCharCode(...b.subarray(o, o + n));

function jpegSize(b: Uint8Array): { width: number; height: number } | null {
  let o = 2;
  while (o + 9 < b.length) {
    if (b[o] !== 0xff) return null;
    const marker = b[o + 1] ?? 0;
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      o += 2;
      continue;
    }
    const len = u16be(b, o + 2);
    // SOF0..SOF15 salvo DHT (C4), JPG (C8) y DAC (CC)
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      return { height: u16be(b, o + 5), width: u16be(b, o + 7) };
    }
    o += 2 + len;
  }
  return null;
}

export function sniffImage(bytes: Uint8Array): SniffedImage | null {
  const b = bytes;
  if (b.length >= 24 && b[0] === 0x89 && ascii(b, 1, 3) === "PNG" && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) {
    return { mime: "image/png", ext: "png", width: u32be(b, 16), height: u32be(b, 20) };
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) {
    const size = jpegSize(b);
    return { mime: "image/jpeg", ext: "jpg", width: size?.width ?? null, height: size?.height ?? null };
  }
  if (b.length >= 30 && ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") {
    const chunk = ascii(b, 12, 4);
    if (chunk === "VP8 ") return { mime: "image/webp", ext: "webp", width: u16le(b, 26) & 0x3fff, height: u16le(b, 28) & 0x3fff };
    if (chunk === "VP8L") {
      const b1 = b[21] ?? 0;
      const b2 = b[22] ?? 0;
      const b3 = b[23] ?? 0;
      const b4 = b[24] ?? 0;
      return { mime: "image/webp", ext: "webp", width: 1 + (((b2 & 0x3f) << 8) | b1), height: 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6)) };
    }
    if (chunk === "VP8X") return { mime: "image/webp", ext: "webp", width: 1 + u24le(b, 24), height: 1 + u24le(b, 27) };
    return { mime: "image/webp", ext: "webp", width: null, height: null };
  }
  return null;
}
