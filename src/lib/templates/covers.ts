import { builder, type TemplateDefinition } from "./builders";

// Campos editables comunes: magazine-name, title, subtitle, image-main,
// headline-1..3, edition, date, credits.

function moderna(): TemplateDefinition {
  const ink = "#1d1b33";
  const accent = "#ff5a5f";
  const b = builder("portada-moderna")
    .text("magazine-name", [15, 14, 180, 28], "Mi Revista", { fontFamily: "montserrat", fontSize: 52, fontWeight: 700, color: ink, uppercase: true, letterSpacing: 1, lineHeight: 1 })
    .line([15, 44, 180, 2], accent, 1.2)
    .text("edition", [15, 48, 90, 7], "Número 1", { fontSize: 10, fontWeight: 700, color: accent, uppercase: true, letterSpacing: 1 })
    .text("date", [105, 48, 90, 7], "Ciclo escolar 2026–2027", { fontSize: 10, color: ink, align: "right" })
    .image("image-main", [15, 58, 180, 162], { radius: 3, placeholder: "Fotografía principal" })
    .text("headline-1", [22, 66, 82, 12], "Titular secundario uno", { fontSize: 11, fontWeight: 700, color: "#ffffff" }, { background: accent, padding: 2.5 })
    .text("headline-2", [22, 81, 72, 12], "Titular secundario dos", { fontSize: 11, fontWeight: 700, color: "#ffffff" }, { background: "#3d5afe", padding: 2.5 })
    .text("headline-3", [22, 96, 76, 12], "Titular secundario tres", { fontSize: 11, fontWeight: 700, color: ink }, { background: "#ffc145", padding: 2.5 })
    .rect([15, 226, 180, 58], ink, { radius: 3 })
    .text("title", [22, 231, 166, 26], "El gran título de esta edición", { fontFamily: "playfair-display", fontSize: 27, fontWeight: 700, color: "#ffffff", lineHeight: 1.05 })
    .text("subtitle", [22, 258, 166, 12], "Una frase que invite a leer la revista completa", { fontSize: 12, color: "#e5e7eb" })
    .text("credits", [22, 273, 166, 7], "Hecha por estudiantes de 1.° de secundaria", { fontSize: 8, color: "#ffc145" });
  return {
    id: "portada-moderna",
    name: "Portada moderna",
    description: "Nombre grande, fotografía principal y titulares en etiquetas de color.",
    category: "General",
    kind: "cover",
    sortOrder: 10,
    page: b.page("#fffaf2", "cover"),
  };
}

function ciencia(): TemplateDefinition {
  const cyan = "#22d3ee";
  const lime = "#a3e635";
  const soft = "#c7d2fe";
  const b = builder("portada-ciencia")
    .ellipse([118, 34, 120, 120], null, { stroke: cyan, strokeWidth: 0.6, opacity: 0.5 })
    .ellipse([-34, 176, 110, 110], null, { stroke: lime, strokeWidth: 0.6, opacity: 0.45 })
    .text("magazine-name", [15, 15, 180, 20], "Ciencia Joven", { fontFamily: "archivo", fontSize: 38, fontWeight: 700, color: cyan, uppercase: true, letterSpacing: 3, lineHeight: 1 })
    .text("edition", [15, 38, 100, 7], "Edición 1 · Ciencia y tecnología", { fontSize: 9, color: soft, uppercase: true, letterSpacing: 1 })
    .text("date", [115, 38, 80, 7], "Ciclo 2026–2027", { fontSize: 9, color: soft, align: "right" })
    .image("image-main", [45, 52, 120, 120], { radius: 60, borderWidth: 1.5, borderColor: cyan, placeholder: "Experimento o invento" })
    .text("title", [15, 182, 180, 44], "Descubrimientos que cambian el mundo", { fontFamily: "oswald", fontSize: 34, fontWeight: 700, color: "#ffffff", uppercase: true, lineHeight: 1.05 })
    .text("subtitle", [15, 228, 150, 14], "Experimentos, inventos y preguntas para pensar.", { fontSize: 12, color: soft })
    .rect([15, 252, 2.5, 12], lime)
    .text("headline-1", [20, 252, 54, 14], "Robots en la escuela", { fontSize: 10, fontWeight: 700, color: "#ffffff", lineHeight: 1.2 })
    .rect([77, 252, 2.5, 12], lime)
    .text("headline-2", [82, 252, 54, 14], "El agua que bebemos", { fontSize: 10, fontWeight: 700, color: "#ffffff", lineHeight: 1.2 })
    .rect([139, 252, 2.5, 12], lime)
    .text("headline-3", [144, 252, 51, 14], "Mirando las estrellas", { fontSize: 10, fontWeight: 700, color: "#ffffff", lineHeight: 1.2 })
    .text("credits", [15, 278, 180, 7], "Redacción: equipo de 1.° de secundaria", { fontSize: 8, color: "#94a3b8" });
  return {
    id: "portada-ciencia",
    name: "Ciencia y tecnología",
    description: "Fondo oscuro, fotografía circular y titulares con viñetas de color.",
    category: "Ciencia y tecnología",
    kind: "cover",
    sortOrder: 20,
    page: b.page("#0b1533", "cover"),
  };
}

function noticias(): TemplateDefinition {
  const ink = "#111827";
  const red = "#b91c1c";
  const b = builder("portada-noticias")
    .text("magazine-name", [15, 12, 180, 22], "La Gaceta Escolar", { fontFamily: "playfair-display", fontSize: 36, fontWeight: 700, color: ink, align: "center", lineHeight: 1 })
    .line([15, 35, 180, 2], ink, 0.8)
    .text("edition", [15, 39, 60, 6], "Número 1", { fontSize: 8.5, uppercase: true, letterSpacing: 1, color: ink })
    .text("date", [75, 39, 60, 6], "Lunes 3 de noviembre", { fontSize: 8.5, align: "center", color: ink })
    .text(undefined, [135, 39, 60, 6], "Edición escolar", { fontSize: 8.5, align: "right", color: ink })
    .line([15, 45, 180, 2], ink, 0.3)
    .text("title", [15, 50, 180, 30], "Titular principal de la noticia más importante", { fontFamily: "merriweather", fontSize: 25, fontWeight: 700, color: ink, align: "center", lineHeight: 1.15 })
    .text("subtitle", [25, 82, 160, 12], "Bajada: un resumen breve de lo que sucedió.", { fontFamily: "merriweather", fontSize: 11, italic: true, color: "#374151", align: "center" })
    .image("image-main", [15, 97, 180, 110], { placeholder: "Fotografía de la noticia" })
    .line([15, 210, 180, 2], red, 0.8)
    .text("headline-1", [15, 215, 56, 15], "Segunda noticia del día", { fontFamily: "merriweather", fontSize: 11.5, fontWeight: 700, color: ink, lineHeight: 1.2 })
    .text("summary-1", [15, 231, 56, 44], "Escribe aquí un resumen corto de otra noticia de la escuela.", { fontSize: 8.5, color: "#374151", align: "justify" })
    .line([72, 215, 4, 60], "#9ca3af", 0.3)
    .text("headline-2", [77, 215, 56, 15], "Tercera noticia", { fontFamily: "merriweather", fontSize: 11.5, fontWeight: 700, color: ink, lineHeight: 1.2 })
    .text("summary-2", [77, 231, 56, 44], "Escribe aquí un resumen corto de otra noticia de la escuela.", { fontSize: 8.5, color: "#374151", align: "justify" })
    .line([134, 215, 4, 60], "#9ca3af", 0.3)
    .text("headline-3", [139, 215, 56, 15], "Cuarta noticia", { fontFamily: "merriweather", fontSize: 11.5, fontWeight: 700, color: ink, lineHeight: 1.2 })
    .text("summary-3", [139, 231, 56, 44], "Escribe aquí un resumen corto de otra noticia de la escuela.", { fontSize: 8.5, color: "#374151", align: "justify" })
    .text("credits", [15, 281, 180, 6], "Periódico escolar hecho por estudiantes de 1.° de secundaria", { fontSize: 7.5, align: "center", color: "#4b5563" });
  return {
    id: "portada-noticias",
    name: "Noticias escolares",
    description: "Estilo periódico: cabecera clásica, titular grande y tres columnas.",
    category: "Noticias",
    kind: "cover",
    sortOrder: 30,
    page: b.page("#fdfdfb", "cover"),
  };
}

function cultura(): TemplateDefinition {
  const red = "#7f1d1d";
  const brown = "#5b4636";
  const gold = "#b08d57";
  const b = builder("portada-cultura")
    .rect([8, 8, 194, 281], null, { stroke: gold, strokeWidth: 0.8 })
    .rect([11, 11, 188, 275], null, { stroke: gold, strokeWidth: 0.3 })
    .text("edition", [20, 18, 170, 6], "Número 1 · Cultura e historia", { fontSize: 8.5, uppercase: true, letterSpacing: 2, color: brown, align: "center" })
    .text("magazine-name", [20, 26, 170, 26], "Raíces", { fontFamily: "playfair-display", fontSize: 50, fontWeight: 700, italic: true, color: red, align: "center", lineHeight: 1 })
    .line([70, 53, 70, 2], gold, 0.6)
    .text("date", [20, 57, 170, 6], "Ciclo escolar 2026–2027", { fontFamily: "libre-baskerville", fontSize: 9, color: brown, align: "center" })
    .image("image-main", [30, 68, 150, 132], { borderWidth: 2, borderColor: gold, placeholder: "Lugar, objeto o tradición" })
    .text("title", [20, 207, 170, 26], "Historias que nos dan identidad", { fontFamily: "libre-baskerville", fontSize: 22, fontWeight: 700, color: red, align: "center", lineHeight: 1.15 })
    .text("subtitle", [30, 235, 150, 12], "Tradiciones, personajes y lugares de nuestra comunidad", { fontFamily: "libre-baskerville", fontSize: 10.5, italic: true, color: brown, align: "center" })
    .text("headline-1", [20, 254, 54, 12], "La fiesta del pueblo", { fontSize: 8.5, fontWeight: 700, uppercase: true, color: brown, align: "center" })
    .text("headline-2", [78, 254, 54, 12], "Recetas de la abuela", { fontSize: 8.5, fontWeight: 700, uppercase: true, color: brown, align: "center" })
    .text("headline-3", [136, 254, 54, 12], "Leyendas de mi barrio", { fontSize: 8.5, fontWeight: 700, uppercase: true, color: brown, align: "center" })
    .text("credits", [20, 272, 170, 6], "Investigación y textos: grupo de 1.° de secundaria", { fontSize: 7.5, color: brown, align: "center" });
  return {
    id: "portada-cultura",
    name: "Cultura e historia",
    description: "Marco clásico dorado, tipografía elegante y fotografía enmarcada.",
    category: "Cultura e historia",
    kind: "cover",
    sortOrder: 40,
    page: b.page("#f3ead7", "cover"),
  };
}

function deportes(): TemplateDefinition {
  const yellow = "#facc15";
  const red = "#ef4444";
  const b = builder("portada-deportes")
    .image("image-main", [0, 0, 210, 205], { placeholder: "Foto de acción deportiva" })
    .rect([0, 150, 210, 55], "#0a0a0a", { opacity: 0.6 })
    .text("magazine-name", [12, 10, 186, 30], "¡A jugar!", { fontFamily: "oswald", fontSize: 58, fontWeight: 700, color: yellow, uppercase: true, lineHeight: 1 })
    .text("edition", [12, 42, 34, 8], "Edición 1", { fontFamily: "oswald", fontSize: 11, fontWeight: 700, color: "#ffffff", uppercase: true, align: "center" }, { background: red, padding: 1 })
    .text("title", [12, 155, 186, 30], "El torneo del año", { fontFamily: "oswald", fontSize: 40, fontWeight: 700, color: "#ffffff", uppercase: true, lineHeight: 1 })
    .text("subtitle", [12, 186, 186, 12], "Resultados, entrevistas y los mejores momentos", { fontSize: 12, color: "#ffffff" })
    .rect([12, 214, 60, 40], "#1f1f1f", { radius: 2 })
    .rect([12, 214, 60, 2], red)
    .text("headline-1", [16, 219, 52, 32], "La final de fútbol", { fontFamily: "oswald", fontSize: 14, fontWeight: 700, color: "#ffffff", uppercase: true, lineHeight: 1.1 })
    .rect([75, 214, 60, 40], "#1f1f1f", { radius: 2 })
    .rect([75, 214, 60, 2], yellow)
    .text("headline-2", [79, 219, 52, 32], "Atletismo escolar", { fontFamily: "oswald", fontSize: 14, fontWeight: 700, color: "#ffffff", uppercase: true, lineHeight: 1.1 })
    .rect([138, 214, 60, 40], "#1f1f1f", { radius: 2 })
    .rect([138, 214, 60, 2], red)
    .text("headline-3", [142, 219, 52, 32], "Entrevista al entrenador", { fontFamily: "oswald", fontSize: 14, fontWeight: 700, color: "#ffffff", uppercase: true, lineHeight: 1.1 })
    .text("date", [12, 262, 120, 8], "Temporada 2026–2027", { fontSize: 9, color: yellow, uppercase: true, letterSpacing: 1 })
    .text("credits", [12, 274, 186, 8], "Reporteros deportivos de 1.° de secundaria", { fontSize: 8, color: "#a3a3a3" });
  return {
    id: "portada-deportes",
    name: "Deportes",
    description: "Fotografía a sangre, letras enormes y tarjetas de titulares.",
    category: "Deportes",
    kind: "cover",
    sortOrder: 50,
    page: b.page("#0a0a0a", "cover"),
  };
}

function artistica(): TemplateDefinition {
  const pink = "#ff6fae";
  const violet = "#7c3aed";
  const teal = "#14b8a6";
  const yellow = "#ffd23f";
  const b = builder("portada-artistica")
    .ellipse([140, -20, 100, 100], yellow, { opacity: 0.55 })
    .ellipse([-28, 64, 80, 80], teal, { opacity: 0.3 })
    .ellipse([150, 214, 90, 90], pink, { opacity: 0.3 })
    .text("magazine-name", [15, 16, 180, 30], "Arcoíris", { fontFamily: "nunito", fontSize: 52, fontWeight: 700, color: violet, lineHeight: 1 })
    .text("edition", [15, 47, 90, 7], "Edición 1", { fontFamily: "nunito", fontSize: 11, fontWeight: 700, color: pink, uppercase: true, letterSpacing: 1 })
    .text("date", [105, 47, 90, 7], "2026–2027", { fontFamily: "nunito", fontSize: 11, color: violet, align: "right" })
    .image("image-main", [25, 60, 160, 150], { radius: 12, borderWidth: 3, borderColor: "#ffffff", placeholder: "Dibujo, pintura o foto creativa" })
    .text("title", [15, 216, 180, 22], "Imaginar también es aprender", { fontFamily: "playfair-display", fontSize: 26, fontWeight: 700, color: "#1f1147", align: "center", lineHeight: 1.1 })
    .text("subtitle", [25, 239, 160, 10], "Dibujos, poemas, música y creatividad sin límites", { fontFamily: "nunito", fontSize: 12, color: "#4b5563", align: "center" })
    .rect([15, 255, 56, 11], pink, { radius: 5.5 })
    .text("headline-1", [15, 255, 56, 11], "Galería de arte", { fontFamily: "nunito", fontSize: 9.5, fontWeight: 700, color: "#ffffff", align: "center" }, { verticalAlign: "middle" })
    .rect([77, 255, 56, 11], teal, { radius: 5.5 })
    .text("headline-2", [77, 255, 56, 11], "Rincón de poesía", { fontFamily: "nunito", fontSize: 9.5, fontWeight: 700, color: "#ffffff", align: "center" }, { verticalAlign: "middle" })
    .rect([139, 255, 56, 11], yellow, { radius: 5.5 })
    .text("headline-3", [139, 255, 56, 11], "Música en el recreo", { fontFamily: "nunito", fontSize: 9.5, fontWeight: 700, color: "#1f1147", align: "center" }, { verticalAlign: "middle" })
    .text("credits", [15, 276, 180, 7], "Una revista creada por artistas de 1.° de secundaria", { fontFamily: "nunito", fontSize: 8.5, color: "#6b7280", align: "center" });
  return {
    id: "portada-artistica",
    name: "Artística y creativa",
    description: "Formas de colores, marco redondeado y titulares en píldoras.",
    category: "Arte",
    kind: "cover",
    sortOrder: 60,
    page: b.page("#fff4ea", "cover"),
  };
}

export function coverTemplates(): TemplateDefinition[] {
  return [moderna(), ciencia(), noticias(), cultura(), deportes(), artistica()];
}
