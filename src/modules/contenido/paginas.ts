import { z } from "zod";

// VA-09: páginas de texto que edita el admin. VP-10 (FAQ), VP-11 (quiénes
// somos) y VP-02 (términos y legales).
export const PAGE_SLUGS = ["faq", "nosotros", "terminos"] as const;
export type PageSlug = (typeof PAGE_SLUGS)[number];

export const PAGE_DEFAULT_TITLES: Record<PageSlug, string> = {
  faq: "Preguntas frecuentes",
  nosotros: "Quiénes somos",
  terminos: "Términos y condiciones",
};

export const PageContentSchema = z.object({
  title: z.string().trim().min(1, "El título es obligatorio").max(120, "El título puede tener hasta 120 caracteres"),
  body: z.string().max(20_000, "El texto puede tener hasta 20.000 caracteres"),
});

export type PageContent = z.infer<typeof PageContentSchema>;
export type ContentBlock = { type: "heading" | "paragraph"; text: string };

// Formato mínimo para que el admin no escriba HTML: una línea que empieza con
// "## " es un subtítulo y una línea en blanco separa párrafos. Se muestra como
// texto, así que no se puede inyectar código.
export function parseContentBlocks(text: string): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ type: "paragraph", text: paragraph.join("\n") });
    paragraph = [];
  };
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
    } else if (line.startsWith("## ")) {
      flush();
      blocks.push({ type: "heading", text: line.slice(3).trim() });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}
