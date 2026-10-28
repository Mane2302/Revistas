import { builder, type TemplateDefinition } from "./builders";

function indice(): TemplateDefinition {
  const ink = "#1d1b33";
  const accent = "#3d5afe";
  const b = builder("pagina-indice")
    .text("title", [15, 20, 180, 22], "Índice", { fontFamily: "montserrat", fontSize: 36, fontWeight: 700, color: ink })
    .line([15, 44, 40, 3], accent, 1.5)
    .text("index-titles", [15, 56, 150, 215], "Editorial\nNoticias de la escuela\nEntrevista\nCiencia y tecnología\nCultura e historia\nDeportes\nMedio ambiente\nReseñas\nPasatiempos\nCréditos", { fontSize: 13, color: ink, lineHeight: 2 })
    .text("index-pages", [165, 56, 30, 215], "2\n3\n4\n5\n6\n7\n8\n9\n10\n11", { fontSize: 13, fontWeight: 700, color: accent, align: "right", lineHeight: 2 })
    .rect([0, 282, 210, 15], accent);
  return {
    id: "pagina-indice",
    name: "Índice",
    description: "Lista de secciones con su número de página.",
    category: "Páginas especiales",
    kind: "extra",
    sortOrder: 300,
    page: b.page("#ffffff", "index"),
  };
}

function editorial(): TemplateDefinition {
  const red = "#c2410c";
  const b = builder("pagina-editorial")
    .text("kicker", [15, 18, 180, 7], "Editorial", { fontSize: 9, fontWeight: 700, color: red, uppercase: true, letterSpacing: 3 })
    .text("title", [15, 27, 180, 28], "Bienvenidos a nuestra revista", { fontFamily: "playfair-display", fontSize: 28, fontWeight: 700, color: "#1c1917", lineHeight: 1.1 })
    .text(
      "body",
      [15, 62, 180, 170],
      "Querida comunidad escolar:\n\nEsta revista es el resultado del trabajo de todo el grupo. Durante varias semanas investigamos, entrevistamos, escribimos y diseñamos cada página.\n\nEn este número encontrarás noticias de la escuela, entrevistas, ciencia, cultura, deportes y muchas curiosidades.\n\nEscribe aquí el mensaje del equipo editorial: ¿qué quisieron compartir con sus lectores? ¿Qué aprendieron al hacer la revista?",
      { fontFamily: "merriweather", fontSize: 10.5, color: "#292524", align: "justify", lineHeight: 1.6 },
    )
    .text("signature", [15, 240, 180, 9], "El equipo editorial", { fontFamily: "playfair-display", fontSize: 13, italic: true, color: red, align: "right" })
    .text("signature-2", [15, 250, 180, 6], "1.° de secundaria · Ciclo escolar 2026–2027", { fontSize: 8.5, color: "#78716c", align: "right" });
  return {
    id: "pagina-editorial",
    name: "Editorial",
    description: "Mensaje del equipo editorial a los lectores.",
    category: "Páginas especiales",
    kind: "extra",
    sortOrder: 310,
    page: b.page("#fffaf2", "editorial"),
  };
}

function creditos(): TemplateDefinition {
  const yellow = "#fbbf24";
  const b = builder("pagina-creditos")
    .text("title", [15, 20, 180, 22], "Créditos", { fontFamily: "montserrat", fontSize: 32, fontWeight: 700, color: "#ffffff" })
    .line([15, 44, 40, 3], yellow, 1.5)
    .text("credit-roles", [15, 60, 80, 190], "Dirección\nRedacción\nDiseño\nFotografía\nCorrección\nAsesoría", { fontSize: 11, fontWeight: 700, color: yellow, lineHeight: 2.4 })
    .text("credit-names", [100, 60, 95, 190], "Nombres editoriales\nNombres editoriales\nNombres editoriales\nNombres editoriales\nNombres editoriales\nProfesor o profesora de Tecnología", { fontSize: 11, color: "#ffffff", lineHeight: 2.4 })
    .text("note", [15, 262, 180, 20], "Esta revista fue elaborada por estudiantes de primer grado de secundaria en la asignatura de Tecnología.", { fontSize: 9, color: "#9ca3af", lineHeight: 1.45 });
  return {
    id: "pagina-creditos",
    name: "Créditos",
    description: "Quién dirigió, escribió, diseñó y fotografió la revista.",
    category: "Páginas especiales",
    kind: "extra",
    sortOrder: 320,
    page: b.page("#111827", "credits"),
  };
}

function contraportada(): TemplateDefinition {
  const accent = "#ff5a5f";
  const b = builder("pagina-contraportada")
    .image("image-main", [0, 0, 210, 150], { placeholder: "Imagen de cierre" })
    .text("message", [20, 164, 170, 40], "Gracias por leer. ¡Nos vemos en el próximo número!", { fontFamily: "playfair-display", fontSize: 24, fontWeight: 700, color: "#ffffff", align: "center", lineHeight: 1.2 })
    .line([80, 209, 50, 2], accent, 1)
    .text("magazine-name", [20, 219, 170, 14], "Mi Revista", { fontFamily: "montserrat", fontSize: 22, fontWeight: 700, color: accent, align: "center", uppercase: true, letterSpacing: 4 })
    .text("school", [20, 238, 170, 8], "Nombre de la escuela · Ciclo escolar 2026–2027", { fontSize: 10, color: "#cbd5e1", align: "center" })
    .text("credits", [20, 272, 170, 8], "Hecha con Revista Escolar Digital", { fontSize: 8, color: "#94a3b8", align: "center" });
  return {
    id: "pagina-contraportada",
    name: "Contraportada",
    description: "Imagen de cierre, despedida y nombre de la revista.",
    category: "Páginas especiales",
    kind: "extra",
    sortOrder: 330,
    page: b.page("#1d1b33", "back_cover"),
  };
}

function agradecimientos(): TemplateDefinition {
  const rose = "#e11d48";
  const b = builder("pagina-agradecimientos")
    .ellipse([-20, -20, 70, 70], "#fecdd3", { opacity: 0.7 })
    .ellipse([160, 250, 70, 70], "#fecdd3", { opacity: 0.7 })
    .text("title", [15, 40, 180, 24], "Agradecimientos", { fontFamily: "playfair-display", fontSize: 32, fontWeight: 700, color: rose, align: "center" })
    .text("body", [30, 78, 150, 140], "Queremos agradecer a todas las personas que nos ayudaron a hacer esta revista:\n\na nuestras familias, a las personas que entrevistamos, a nuestros profesores y a toda la comunidad escolar.\n\nEscribe aquí tus propios agradecimientos.", { fontFamily: "nunito", fontSize: 12, color: "#4c0519", align: "center", lineHeight: 1.7 })
    .text("signature", [30, 230, 150, 10], "Con cariño, el equipo de la revista", { fontFamily: "nunito", fontSize: 12, italic: true, color: rose, align: "center" });
  return {
    id: "pagina-agradecimientos",
    name: "Agradecimientos",
    description: "Página para agradecer a quienes ayudaron.",
    category: "Páginas especiales",
    kind: "extra",
    sortOrder: 340,
    page: b.page("#fff1f2", "thanks"),
  };
}

export function extraTemplates(): TemplateDefinition[] {
  return [indice(), editorial(), creditos(), contraportada(), agradecimientos()];
}
