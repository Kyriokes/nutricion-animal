import { describe, expect, it } from "vitest";
import { PAGE_SLUGS, PageContentSchema, parseContentBlocks } from "./paginas";

describe("contenido/paginas (VA-09)", () => {
  it("las páginas editables son FAQ, quiénes somos y términos", () => {
    expect(PAGE_SLUGS).toEqual(["faq", "nosotros", "terminos"]);
  });

  it("convierte el texto en subtítulos y párrafos", () => {
    const text = "Intro de la página.\nSigue en la misma línea.\n\n## ¿Hacen envíos?\nSí, a todo el país.\n\n\n## Pagos\nCon tarjeta.";
    expect(parseContentBlocks(text)).toEqual([
      { type: "paragraph", text: "Intro de la página.\nSigue en la misma línea." },
      { type: "heading", text: "¿Hacen envíos?" },
      { type: "paragraph", text: "Sí, a todo el país." },
      { type: "heading", text: "Pagos" },
      { type: "paragraph", text: "Con tarjeta." },
    ]);
  });

  it("acepta saltos de línea de Windows y texto vacío", () => {
    expect(parseContentBlocks("## Título\r\nTexto\r\n")).toEqual([
      { type: "heading", text: "Título" },
      { type: "paragraph", text: "Texto" },
    ]);
    expect(parseContentBlocks("   \n\n")).toEqual([]);
  });

  it("valida título y largo del cuerpo", () => {
    expect(PageContentSchema.safeParse({ title: " Preguntas ", body: "x" })).toEqual({
      success: true,
      data: { title: "Preguntas", body: "x" },
    });
    expect(PageContentSchema.safeParse({ title: "", body: "x" }).success).toBe(false);
    expect(PageContentSchema.safeParse({ title: "T", body: "a".repeat(20_001) }).success).toBe(false);
  });
});
