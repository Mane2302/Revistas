// Ajuste de líneas independiente del entorno. Lo usa el exportador PDF con las
// métricas reales de cada fuente (pdf-lib) y las pruebas unitarias.

export interface LaidOutLine {
  text: string;
  /** Ancho medido de la línea (incluye el espaciado entre letras). */
  width: number;
  /** Verdadero si la línea debe justificarse (no es la última de su párrafo). */
  justifiable: boolean;
}

export type Measure = (text: string) => number;

export function applyTextTransform(text: string, uppercase: boolean): string {
  return uppercase ? text.toLocaleUpperCase("es") : text;
}

export function measureWithSpacing(measure: Measure, text: string, letterSpacing: number): number {
  return measure(text) + letterSpacing * [...text].length;
}

/** Divide una palabra demasiado larga en trozos que quepan en el ancho disponible. */
function breakLongWord(word: string, maxWidth: number, width: (s: string) => number): string[] {
  const parts: string[] = [];
  let current = "";
  for (const ch of word) {
    if (current && width(current + ch) > maxWidth) {
      parts.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) parts.push(current);
  return parts;
}

/**
 * Ajusta el texto al ancho dado, respetando los saltos de línea del usuario
 * (como `white-space: pre-wrap` + `overflow-wrap: break-word` en CSS).
 */
export function layoutText(text: string, maxWidth: number, measure: Measure, letterSpacing = 0): LaidOutLine[] {
  const width = (s: string) => measureWithSpacing(measure, s, letterSpacing);
  const lines: LaidOutLine[] = [];
  for (const paragraph of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (paragraph.trim() === "") {
      lines.push({ text: "", width: 0, justifiable: false });
      continue;
    }
    const paragraphLines: string[] = [];
    let current = "";
    for (const word of paragraph.split(" ")) {
      const candidate = current ? `${current} ${word}` : word;
      if (width(candidate) <= maxWidth) {
        current = candidate;
        continue;
      }
      if (current) paragraphLines.push(current);
      if (width(word) > maxWidth) {
        const pieces = breakLongWord(word, maxWidth, width);
        paragraphLines.push(...pieces.slice(0, -1));
        current = pieces[pieces.length - 1] ?? "";
      } else {
        current = word;
      }
    }
    paragraphLines.push(current);
    paragraphLines.forEach((line, i) => {
      const trimmed = line.replace(/\s+$/, "");
      lines.push({ text: trimmed, width: width(trimmed), justifiable: i < paragraphLines.length - 1 });
    });
  }
  return lines;
}
