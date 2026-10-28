import { builder, SAMPLE_BODY, SAMPLE_BODY_2, type TemplateDefinition } from "./builders";

const GRAY = "#6b7280";

function kicker(b: ReturnType<typeof builder>, text: string, color: string, w = 48) {
  return b.text("kicker", [15, 15, w, 8], text, { fontSize: 8, fontWeight: 700, color: "#ffffff", uppercase: true, letterSpacing: 1 }, { background: color });
}

function noticia(): TemplateDefinition {
  const ink = "#1d3557";
  const accent = "#e63946";
  const b = builder("articulo-noticia");
  kicker(b, "Noticia escolar", accent)
    .text("title", [15, 27, 180, 28], "Titular claro y atractivo de la noticia", { fontFamily: "merriweather", fontSize: 23, fontWeight: 700, color: ink, lineHeight: 1.15 })
    .text("subtitle", [15, 56, 180, 13], "Bajada: una o dos líneas que resumen lo más importante.", { fontFamily: "merriweather", fontSize: 11.5, italic: true, color: "#457b9d" })
    .line([15, 70, 180, 2], "#d1d5db", 0.3)
    .text("author", [15, 73, 100, 6], "Por: tu nombre editorial", { fontSize: 8.5, fontWeight: 700, color: ink })
    .text("date", [115, 73, 80, 6], "3 de noviembre de 2026", { fontSize: 8.5, color: GRAY, align: "right" })
    .image("image-main", [15, 82, 180, 92], { placeholder: "Fotografía de la noticia" })
    .text("caption", [15, 175, 180, 7], "Pie de foto: describe la imagen y escribe quién la tomó.", { fontSize: 8, italic: true, color: GRAY })
    .text("lead", [15, 185, 180, 18], "Entrada: responde en pocas líneas qué pasó, quién participó, cuándo y dónde.", { fontSize: 10.5, fontWeight: 700, color: ink, lineHeight: 1.4 })
    .text("body", [15, 205, 87, 78], SAMPLE_BODY, { fontSize: 9.5, align: "justify", lineHeight: 1.45 })
    .text("body-2", [108, 205, 87, 78], SAMPLE_BODY_2, { fontSize: 9.5, align: "justify", lineHeight: 1.45 });
  return {
    id: "articulo-noticia",
    name: "Noticia escolar",
    description: "Titular, bajada, autor, fecha, entrada, fotografía con pie y dos columnas.",
    category: "Noticias",
    kind: "article",
    sortOrder: 110,
    page: b.page("#ffffff", "article"),
  };
}

function entrevista(): TemplateDefinition {
  const violet = "#6d28d9";
  const ink = "#2e1065";
  const b = builder("articulo-entrevista");
  kicker(b, "Entrevista", violet, 34)
    .text("title", [15, 27, 122, 28], "Conversación con…", { fontFamily: "playfair-display", fontSize: 26, fontWeight: 700, color: ink, lineHeight: 1.1 })
    .image("image-main", [147, 13, 48, 48], { radius: 24, borderWidth: 1.2, borderColor: violet, placeholder: "Persona entrevistada" })
    .text("author", [140, 63, 62, 6], "Entrevista: tu nombre", { fontSize: 8, color: GRAY, align: "center" })
    .text("intro", [15, 57, 122, 26], "Presentación: ¿quién es la persona entrevistada? ¿A qué se dedica? ¿Por qué es interesante conocerla?", { fontSize: 10, italic: true, color: "#4c1d95", lineHeight: 1.4 });
  b.line([15, 86, 180, 2], violet, 0.4);
  const ys = [91, 135, 179, 223];
  ys.forEach((y, i) => {
    b.text(`question-${i + 1}`, [15, y, 180, 8], `${i + 1}. Escribe aquí tu pregunta`, { fontSize: 10.5, fontWeight: 700, color: violet })
      .text(`answer-${i + 1}`, [15, y + 9, 180, 32], "Escribe la respuesta tal como la dijo la persona entrevistada. Puedes usar comillas para las frases textuales.", { fontSize: 9.5, color: "#1f2937", lineHeight: 1.45 });
  });
  b.rect([15, 266, 180, 20], "#ede9fe", { radius: 2 })
    .text("closing", [15, 266, 180, 20], "Cierre: agradece a la persona y comparte una reflexión final.", { fontSize: 9.5, italic: true, color: ink }, { padding: 3, verticalAlign: "middle" });
  return {
    id: "articulo-entrevista",
    name: "Entrevista",
    description: "Presentación, fotografía circular, cuatro preguntas con respuestas y cierre.",
    category: "Entrevistas",
    kind: "article",
    sortOrder: 120,
    page: b.page("#fbf7ff", "article"),
  };
}

function reportaje(): TemplateDefinition {
  const teal = "#0f766e";
  const dark = "#134e4a";
  const b = builder("articulo-reportaje")
    .image("image-main", [0, 0, 210, 105], { placeholder: "Fotografía principal del reportaje" })
    .rect([15, 84, 180, 45], "#ffffff", { radius: 2 })
    .text("kicker", [21, 89, 60, 6], "Reportaje", { fontSize: 8, fontWeight: 700, color: teal, uppercase: true, letterSpacing: 2 })
    .text("title", [21, 96, 168, 20], "Título del reportaje", { fontFamily: "archivo", fontSize: 22, fontWeight: 700, color: dark, lineHeight: 1.1 })
    .text("subtitle", [21, 117, 168, 10], "Una frase que explique el tema que investigaste.", { fontFamily: "archivo", fontSize: 10.5, color: GRAY })
    .text("author", [15, 133, 90, 6], "Por: tu nombre editorial", { fontSize: 8.5, fontWeight: 700, color: dark })
    .text("date", [105, 133, 90, 6], "Noviembre de 2026", { fontSize: 8.5, color: GRAY, align: "right" })
    .text("body", [15, 142, 58, 86], SAMPLE_BODY, { fontFamily: "source-sans-3", fontSize: 9.5, align: "justify", lineHeight: 1.45 })
    .text("body-2", [76, 142, 58, 86], SAMPLE_BODY_2, { fontFamily: "source-sans-3", fontSize: 9.5, align: "justify", lineHeight: 1.45 })
    .text("body-3", [137, 142, 58, 86], "Termina con una conclusión: ¿qué aprendiste al investigar este tema? ¿Qué propones?", { fontFamily: "source-sans-3", fontSize: 9.5, align: "justify", lineHeight: 1.45 })
    .rect([15, 233, 2.5, 26], teal)
    .text("quote", [22, 232, 100, 30], "“Una frase destacada de alguien que entrevistaste.”", { fontFamily: "playfair-display", fontSize: 14, italic: true, color: dark, lineHeight: 1.25 })
    .image("image-2", [130, 232, 65, 44], { radius: 2, placeholder: "Segunda fotografía" })
    .text("caption", [130, 277, 65, 8], "Pie de foto de la segunda imagen.", { fontSize: 7.5, italic: true, color: GRAY });
  return {
    id: "articulo-reportaje",
    name: "Reportaje",
    description: "Imagen a lo ancho, título en tarjeta, tres columnas, cita y segunda foto.",
    category: "Reportajes",
    kind: "article",
    sortOrder: 130,
    page: b.page("#f0fdfa", "article"),
  };
}

function ciencia(): TemplateDefinition {
  const blue = "#2563eb";
  const ink = "#0f172a";
  const b = builder("articulo-ciencia");
  kicker(b, "Ciencia y tecnología", blue, 56)
    .text("title", [15, 27, 180, 20], "¿Cómo funciona…?", { fontFamily: "archivo", fontSize: 24, fontWeight: 700, color: ink, lineHeight: 1.1 })
    .text("intro", [15, 48, 180, 17], "Introducción: plantea la pregunta o el fenómeno que vas a explicar y por qué es importante.", { fontSize: 10.5, color: "#334155", lineHeight: 1.4 })
    .text("author", [15, 67, 100, 6], "Por: tu nombre editorial", { fontSize: 8.5, fontWeight: 700, color: ink })
    .text("date", [115, 67, 80, 6], "Noviembre de 2026", { fontSize: 8.5, color: GRAY, align: "right" })
    .image("image-main", [15, 76, 105, 72], { radius: 2, placeholder: "Diagrama o fotografía" })
    .text("caption", [15, 149, 105, 7], "Pie de foto: explica qué muestra la imagen.", { fontSize: 8, italic: true, color: GRAY })
    .rect([126, 76, 69, 80], "#dbeafe", { radius: 3 })
    .text("factbox-title", [130, 80, 61, 8], "¿Sabías que…?", { fontFamily: "archivo", fontSize: 11, fontWeight: 700, color: blue })
    .text("factbox", [130, 89, 61, 64], "Escribe un dato curioso con cifras. Por ejemplo: la luz del Sol tarda unos 8 minutos en llegar a la Tierra.", { fontSize: 9.5, color: ink, lineHeight: 1.45 })
    .text("subheading-1", [15, 160, 87, 8], "1. Primer subtítulo", { fontFamily: "archivo", fontSize: 12, fontWeight: 700, color: blue })
    .text("body", [15, 169, 87, 62], SAMPLE_BODY, { fontSize: 9.5, align: "justify", lineHeight: 1.45 })
    .text("subheading-2", [108, 160, 87, 8], "2. Segundo subtítulo", { fontFamily: "archivo", fontSize: 12, fontWeight: 700, color: blue })
    .text("body-2", [108, 169, 87, 62], SAMPLE_BODY_2, { fontSize: 9.5, align: "justify", lineHeight: 1.45 })
    .rect([15, 236, 180, 48], "#ffffff", { stroke: "#cbd5e1", strokeWidth: 0.3, radius: 2 })
    .text("sources-title", [19, 239, 172, 7], "Fuentes consultadas", { fontFamily: "archivo", fontSize: 10, fontWeight: 700, color: ink })
    .text("sources", [19, 247, 172, 34], "1. Autor, título del libro o de la página web, año.\n2. Autor, título, año.\n3. Persona entrevistada, fecha.", { fontSize: 8.5, color: "#334155", lineHeight: 1.5 });
  return {
    id: "articulo-ciencia",
    name: "Ciencia y tecnología",
    description: "Introducción, subtítulos, imagen, recuadro de datos y fuentes consultadas.",
    category: "Ciencia y tecnología",
    kind: "article",
    sortOrder: 140,
    page: b.page("#f8fafc", "article"),
  };
}

function cultura(): TemplateDefinition {
  const red = "#7f1d1d";
  const brown = "#57534e";
  const gold = "#b08d57";
  const b = builder("articulo-cultura")
    .text("kicker", [15, 16, 180, 6], "Cultura e historia", { fontSize: 8, fontWeight: 700, color: gold, uppercase: true, letterSpacing: 3, align: "center" })
    .text("title", [15, 24, 180, 26], "Título sobre una tradición o una época", { fontFamily: "libre-baskerville", fontSize: 21, fontWeight: 700, color: red, align: "center", lineHeight: 1.15 })
    .line([85, 51, 40, 2], gold, 0.6)
    .text("subtitle", [25, 55, 160, 12], "Una frase que despierte la curiosidad del lector.", { fontFamily: "libre-baskerville", fontSize: 10.5, italic: true, color: brown, align: "center" })
    .text("author", [15, 69, 180, 6], "Por: tu nombre editorial", { fontSize: 8.5, color: brown, align: "center" })
    .image("image-main", [15, 80, 95, 110], { borderWidth: 1.5, borderColor: gold, placeholder: "Imagen histórica o cultural" })
    .text("caption", [15, 191, 95, 8], "Pie de foto: lugar, fecha y autor de la imagen.", { fontSize: 7.5, italic: true, color: brown })
    .text("body", [116, 80, 79, 110], SAMPLE_BODY, { fontFamily: "libre-baskerville", fontSize: 9, align: "justify", lineHeight: 1.55 });
  [15, 77, 139].forEach((x, i) => {
    b.rect([x, 205, 56, 48], "#f1e7d3", { radius: 2 })
      .text(`date-${i + 1}`, [x + 4, 208, 48, 8], ["Año 1900", "Año 1950", "Hoy"][i] ?? "", { fontFamily: "libre-baskerville", fontSize: 12, fontWeight: 700, color: red })
      .text(`event-${i + 1}`, [x + 4, 217, 48, 34], "¿Qué sucedió en esta fecha? Escríbelo en pocas palabras.", { fontSize: 8.5, color: brown, lineHeight: 1.4 });
  });
  b.text("body-2", [15, 258, 180, 28], "Conclusión: ¿por qué es importante conocer y conservar esta tradición?", { fontFamily: "libre-baskerville", fontSize: 9, color: "#292524", lineHeight: 1.55 });
  return {
    id: "articulo-cultura",
    name: "Cultura e historia",
    description: "Estilo clásico con imagen enmarcada y línea del tiempo de tres momentos.",
    category: "Cultura e historia",
    kind: "article",
    sortOrder: 150,
    page: b.page("#faf6ee", "article"),
  };
}

function opinion(): TemplateDefinition {
  const orange = "#ea580c";
  const ink = "#1c1917";
  const b = builder("articulo-opinion");
  kicker(b, "Opinión", orange, 28)
    .image("image-main", [15, 28, 32, 32], { radius: 16, placeholder: "Tu foto o un dibujo" })
    .text("author", [52, 33, 120, 7], "Tu nombre editorial", { fontSize: 10, fontWeight: 700, color: ink })
    .text("author-bio", [52, 41, 120, 6], "Columnista de 1.° de secundaria", { fontSize: 8.5, color: GRAY })
    .text("title", [15, 66, 180, 40], "“Una idea clara que defiendes”", { fontFamily: "playfair-display", fontSize: 26, fontWeight: 700, italic: true, color: ink, lineHeight: 1.15 })
    .line([15, 107, 30, 3], orange, 1.5)
    .text("body", [15, 114, 115, 170], `Presenta tu opinión en el primer párrafo.\n\n${SAMPLE_BODY}\n\nDa al menos dos argumentos y un ejemplo para cada uno.`, { fontFamily: "merriweather", fontSize: 9.5, align: "justify", lineHeight: 1.6 })
    .rect([136, 114, 59, 70], "#ffedd5", { radius: 3 })
    .text("quote", [140, 118, 51, 62], "Escribe aquí la frase más fuerte de tu opinión.", { fontFamily: "playfair-display", fontSize: 13, italic: true, color: orange, lineHeight: 1.3 })
    .text("closing", [136, 190, 59, 40], "Y tú, ¿qué opinas? Comparte tu punto de vista con respeto.", { fontSize: 9, color: GRAY, lineHeight: 1.45 });
  return {
    id: "articulo-opinion",
    name: "Opinión",
    description: "Columna con foto del autor, título en forma de cita y frase destacada.",
    category: "Opinión",
    kind: "article",
    sortOrder: 160,
    page: b.page("#fffbeb", "article"),
  };
}

function deportes(): TemplateDefinition {
  const dark = "#111827";
  const green = "#16a34a";
  const yellow = "#facc15";
  const b = builder("articulo-deportes")
    .rect([0, 0, 210, 42], dark)
    .text("kicker", [15, 9, 34, 7], "Deportes", { fontFamily: "oswald", fontSize: 10, fontWeight: 700, color: "#ffffff", uppercase: true, align: "center" }, { background: green, padding: 0.5 })
    .text("title", [15, 18, 180, 20], "Crónica del partido", { fontFamily: "oswald", fontSize: 26, fontWeight: 700, color: "#ffffff", uppercase: true, lineHeight: 1.05 })
    .rect([15, 47, 180, 26], "#f3f4f6", { radius: 3 })
    .text("team-1", [20, 51, 60, 18], "Equipo local", { fontFamily: "oswald", fontSize: 14, fontWeight: 700, color: dark, align: "right" }, { verticalAlign: "middle" })
    .text("score", [85, 49, 40, 22], "2 – 1", { fontFamily: "oswald", fontSize: 28, fontWeight: 700, color: dark, align: "center" }, { verticalAlign: "middle" })
    .text("team-2", [130, 51, 60, 18], "Equipo visitante", { fontFamily: "oswald", fontSize: 14, fontWeight: 700, color: dark }, { verticalAlign: "middle" })
    .text("subtitle", [15, 77, 180, 11], "Un resumen emocionante del encuentro en una sola frase.", { fontSize: 11, color: "#374151" })
    .text("author", [15, 89, 100, 6], "Por: tu nombre editorial", { fontSize: 8.5, fontWeight: 700, color: dark })
    .text("date", [115, 89, 80, 6], "Noviembre de 2026", { fontSize: 8.5, color: GRAY, align: "right" })
    .image("image-main", [15, 97, 180, 86], { placeholder: "Foto del partido" })
    .text("caption", [15, 184, 180, 7], "Pie de foto: ¿qué momento del partido es?", { fontSize: 8, italic: true, color: GRAY })
    .text("body", [15, 194, 115, 90], SAMPLE_BODY, { fontSize: 9.5, align: "justify", lineHeight: 1.45 })
    .rect([136, 194, 59, 90], dark, { radius: 3 })
    .text("stats-title", [140, 198, 51, 8], "Datos del partido", { fontFamily: "oswald", fontSize: 11, fontWeight: 700, color: yellow, uppercase: true })
    .text("stats", [140, 208, 51, 72], "Goles: 3\nTarjetas: 2\nJugador destacado: …\nAsistentes: …\nPróximo partido: …", { fontSize: 9.5, color: "#ffffff", lineHeight: 1.6 });
  return {
    id: "articulo-deportes",
    name: "Deportes",
    description: "Marcador, fotografía del partido, crónica y recuadro de estadísticas.",
    category: "Deportes",
    kind: "article",
    sortOrder: 170,
    page: b.page("#ffffff", "article"),
  };
}

function ambiente(): TemplateDefinition {
  const green = "#15803d";
  const ink = "#14532d";
  const b = builder("articulo-ambiente").ellipse([160, -22, 72, 72], "#84cc16", { opacity: 0.25 });
  kicker(b, "Medio ambiente", green, 44)
    .text("title", [15, 27, 150, 25], "Cuidemos nuestro planeta", { fontFamily: "nunito", fontSize: 26, fontWeight: 700, color: ink, lineHeight: 1.1 })
    .text("intro", [15, 53, 180, 15], "Introducción: ¿qué problema ambiental investigaste y por qué nos afecta?", { fontFamily: "nunito", fontSize: 11, color: "#166534", lineHeight: 1.4 })
    .text("author", [15, 70, 100, 6], "Por: tu nombre editorial", { fontSize: 8.5, fontWeight: 700, color: ink })
    .text("date", [115, 70, 80, 6], "Noviembre de 2026", { fontSize: 8.5, color: GRAY, align: "right" })
    .image("image-main", [15, 79, 110, 80], { radius: 4, placeholder: "Naturaleza o problema ambiental" })
    .text("caption", [15, 160, 110, 7], "Pie de foto: lugar y autor de la imagen.", { fontSize: 8, italic: true, color: GRAY })
    .rect([131, 79, 64, 80], green, { radius: 4 })
    .text("data-title", [135, 83, 56, 8], "En números", { fontFamily: "nunito", fontSize: 11, fontWeight: 700, color: "#ffffff" })
    .text("data", [135, 92, 56, 64], "Escribe aquí un dato importante con su fuente. Por ejemplo, cuánta agua se ahorra al cerrar la llave.", { fontFamily: "nunito", fontSize: 10, color: "#ffffff", lineHeight: 1.45 })
    .text("body", [15, 171, 87, 62], SAMPLE_BODY, { fontFamily: "nunito", fontSize: 9.5, align: "justify", lineHeight: 1.45 })
    .text("body-2", [108, 171, 87, 62], SAMPLE_BODY_2, { fontFamily: "nunito", fontSize: 9.5, align: "justify", lineHeight: 1.45 })
    .rect([15, 238, 180, 46], "#dcfce7", { radius: 4, stroke: green, strokeWidth: 0.4 })
    .text("tips-title", [20, 241, 170, 8], "¿Qué podemos hacer?", { fontFamily: "nunito", fontSize: 12, fontWeight: 700, color: green })
    .text("tips", [20, 250, 170, 32], "• Primera acción sencilla que todos pueden hacer\n• Segunda acción\n• Tercera acción", { fontFamily: "nunito", fontSize: 10, color: ink, lineHeight: 1.5 });
  return {
    id: "articulo-ambiente",
    name: "Medio ambiente",
    description: "Fotografía, datos en números, dos columnas y consejos para actuar.",
    category: "Medio ambiente",
    kind: "article",
    sortOrder: 180,
    page: b.page("#f0fdf4", "article"),
  };
}

function resena(): TemplateDefinition {
  const magenta = "#be185d";
  const ink = "#3b0764";
  const b = builder("articulo-resena");
  kicker(b, "Reseña", magenta, 28)
    .text("title", [15, 27, 180, 20], "Título del libro o película", { fontFamily: "playfair-display", fontSize: 24, fontWeight: 700, color: ink, lineHeight: 1.1 })
    .text("subtitle", [15, 48, 180, 10], "Una frase que resuma tu opinión.", { fontSize: 11, italic: true, color: "#6b21a8" })
    .text("author", [15, 59, 100, 6], "Reseña de: tu nombre editorial", { fontSize: 8.5, fontWeight: 700, color: ink })
    .image("image-main", [15, 68, 62, 90], { radius: 2, placeholder: "Portada del libro o cartel" })
    .rect([83, 68, 112, 56], "#fce7f3", { radius: 3 })
    .text("sheet-title", [88, 72, 102, 8], "Ficha técnica", { fontSize: 10.5, fontWeight: 700, color: magenta })
    .text("sheet", [88, 81, 102, 41], "Título: …\nAutor o director: …\nAño: …\nGénero: …\nRecomendado para: …", { fontSize: 9.5, color: ink, lineHeight: 1.5 })
    .text("rating-label", [83, 129, 112, 7], "Mi calificación", { fontSize: 9, fontWeight: 700, color: GRAY, uppercase: true, letterSpacing: 1 })
    .text("rating", [83, 136, 112, 18], "4 / 5", { fontFamily: "playfair-display", fontSize: 26, fontWeight: 700, color: magenta })
    .text("body", [15, 165, 87, 86], "¿De qué trata? Cuenta el inicio de la historia sin revelar el final.\n\nDescribe a los personajes principales y el lugar donde ocurre.", { fontSize: 9.5, align: "justify", lineHeight: 1.45 })
    .text("body-2", [108, 165, 87, 86], "¿Qué te gustó y qué no? Explica tus razones con ejemplos.\n\n¿Qué aprendiste? ¿Cambió tu forma de ver algo?", { fontSize: 9.5, align: "justify", lineHeight: 1.45 })
    .rect([15, 256, 180, 28], ink, { radius: 3 })
    .text("recommendation", [15, 256, 180, 28], "¿A quién se la recomendarías y por qué?", { fontSize: 10.5, fontWeight: 700, color: "#ffffff", align: "center" }, { padding: 4, verticalAlign: "middle" });
  return {
    id: "articulo-resena",
    name: "Reseña de libro o película",
    description: "Portada o cartel, ficha técnica, calificación y recomendación final.",
    category: "Reseñas",
    kind: "article",
    sortOrder: 190,
    page: b.page("#fff7f9", "article"),
  };
}

function pasatiempos(): TemplateDefinition {
  const ink = "#1f2937";
  const cards = [
    { title: "Curiosidad", text: "¿Sabías que los pulpos tienen tres corazones? Escribe aquí otra curiosidad.", color: "#f97316", bg: "#ffedd5" },
    { title: "Adivinanza", text: "Escribe una adivinanza. La respuesta va abajo, en letra pequeña.", color: "#0ea5e9", bg: "#e0f2fe" },
    { title: "Chiste", text: "Escribe un chiste blanco que haga reír a toda la escuela.", color: "#8b5cf6", bg: "#ede9fe" },
    { title: "Trabalenguas", text: "Tres tristes tigres tragaban trigo en un trigal… ¡Escribe el tuyo!", color: "#22c55e", bg: "#dcfce7" },
  ];
  const b = builder("articulo-pasatiempos")
    .text("title", [15, 15, 180, 20], "Pasatiempos y curiosidades", { fontFamily: "nunito", fontSize: 26, fontWeight: 700, color: ink, align: "center" })
    .text("subtitle", [15, 37, 180, 10], "¡Pon a prueba tu ingenio!", { fontFamily: "nunito", fontSize: 12, color: "#f97316", align: "center" });
  cards.forEach((c, i) => {
    const x = i % 2 === 0 ? 15 : 108;
    const y = i < 2 ? 54 : 132;
    b.rect([x, y, 87, 72], c.bg, { radius: 4 })
      .text(`card-title-${i + 1}`, [x + 5, y + 4, 77, 8], c.title, { fontFamily: "nunito", fontSize: 12, fontWeight: 700, color: c.color })
      .text(`card-${i + 1}`, [x + 5, y + 14, 77, 54], c.text, { fontFamily: "nunito", fontSize: 10, color: ink, lineHeight: 1.45 });
  });
  b.image("image-main", [15, 210, 87, 74], { radius: 4, placeholder: "Imagen para el reto" })
    .text("challenge-title", [108, 210, 87, 8], "Reto de observación", { fontFamily: "nunito", fontSize: 12, fontWeight: 700, color: ink })
    .text("challenge", [108, 219, 87, 40], "Describe el reto. Por ejemplo: encuentra cinco diferencias o cuenta cuántos objetos azules hay en la imagen.", { fontFamily: "nunito", fontSize: 10, color: ink, lineHeight: 1.45 })
    .text("answers", [108, 262, 87, 22], "Respuestas: escríbelas aquí en letra pequeña.", { fontFamily: "nunito", fontSize: 8, italic: true, color: GRAY });
  return {
    id: "articulo-pasatiempos",
    name: "Pasatiempos y curiosidades",
    description: "Tarjetas de colores para curiosidades, adivinanzas, chistes y un reto.",
    category: "Pasatiempos",
    kind: "article",
    sortOrder: 200,
    page: b.page("#fffdf5", "article"),
  };
}

export function articleTemplates(): TemplateDefinition[] {
  return [noticia(), entrevista(), reportaje(), ciencia(), cultura(), opinion(), deportes(), ambiente(), resena(), pasatiempos()];
}
