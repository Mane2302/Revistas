// Descarga (una sola vez) los archivos TTF de las familias tipográficas y sus licencias.
// Todas las familias usan la licencia SIL Open Font License 1.1, que permite
// redistribuirlas, alojarlas e incrustarlas en documentos PDF.
// Uso: node scripts/descargar-fuentes.mjs
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const FAMILIES = [
  { id: "inter", name: "Inter", repo: "ofl/inter" },
  { id: "roboto", name: "Roboto", repo: "ofl/roboto" },
  { id: "open-sans", name: "Open Sans", repo: "ofl/opensans" },
  { id: "lato", name: "Lato", repo: "ofl/lato" },
  { id: "montserrat", name: "Montserrat", repo: "ofl/montserrat" },
  { id: "merriweather", name: "Merriweather", repo: "ofl/merriweather" },
  { id: "playfair-display", name: "Playfair Display", repo: "ofl/playfairdisplay" },
  { id: "oswald", name: "Oswald", repo: "ofl/oswald" },
  { id: "nunito", name: "Nunito", repo: "ofl/nunito" },
  { id: "source-sans-3", name: "Source Sans 3", repo: "ofl/sourcesans3" },
  { id: "archivo", name: "Archivo", repo: "ofl/archivo" },
  { id: "libre-baskerville", name: "Libre Baskerville", repo: "ofl/librebaskerville" },
];

const OUT = path.resolve("public/fonts");

async function fetchCss(name, spec) {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:${spec}`;
  const res = await fetch(url, { headers: { "User-Agent": "curl/8.0" } });
  return res.ok ? res.text() : null;
}

for (const fam of FAMILIES) {
  const css =
    (await fetchCss(fam.name, "ital,wght@0,400;0,700;1,400;1,700")) ??
    (await fetchCss(fam.name, "ital,wght@0,400;0,700;1,400")) ??
    (await fetchCss(fam.name, "wght@400;700"));
  if (!css) throw new Error(`No se pudo obtener ${fam.name}`);
  const dir = path.join(OUT, fam.id);
  await mkdir(dir, { recursive: true });
  // Algunas familias variables añaden propiedades (font-stretch…) entre font-weight y src.
  const faces = [...css.matchAll(/font-style:\s*(\w+);\s*font-weight:\s*(\d+);[^}]*?src:\s*url\(([^)]+)\)/g)];
  const styles = [];
  for (const [, style, weight, url] of faces) {
    const file = `${weight}${style === "italic" ? "-italic" : ""}.ttf`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Error al descargar ${url}`);
    await writeFile(path.join(dir, file), Buffer.from(await res.arrayBuffer()));
    styles.push(file);
  }
  const lic = await fetch(`https://raw.githubusercontent.com/google/fonts/main/${fam.repo}/OFL.txt`);
  if (!lic.ok) throw new Error(`Licencia no encontrada para ${fam.name}`);
  await writeFile(path.join(dir, "OFL.txt"), await lic.text());
  console.log(`${fam.name}: ${styles.join(", ")}`);
}
