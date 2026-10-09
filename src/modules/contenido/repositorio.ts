import { eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { PAGE_DEFAULT_TITLES, type PageContent, type PageSlug } from "./paginas";
import { sitePages } from "./tables";

export const PAGES_TAG = "site-pages";

// VP-02, VP-10, VP-11: contenido para mostrar. Cambia poco: se cachea y se
// renueva al guardar (updateTag). Si nunca se cargó, título por defecto y
// cuerpo vacío.
export async function getPage(slug: PageSlug): Promise<PageContent> {
  "use cache";
  cacheTag(PAGES_TAG);
  cacheLife("max");
  const [row] = await db
    .select({ title: sitePages.title, body: sitePages.body })
    .from(sitePages)
    .where(eq(sitePages.slug, slug));
  return row ?? { title: PAGE_DEFAULT_TITLES[slug], body: "" };
}

// VA-09: lectura para editar, sin caché.
export async function getPageForEditing(slug: PageSlug): Promise<PageContent> {
  const [row] = await db
    .select({ title: sitePages.title, body: sitePages.body })
    .from(sitePages)
    .where(eq(sitePages.slug, slug));
  return row ?? { title: PAGE_DEFAULT_TITLES[slug], body: "" };
}

export async function savePage(slug: PageSlug, content: PageContent, userId: string) {
  await db
    .insert(sitePages)
    .values({ slug, ...content, updatedBy: userId })
    .onConflictDoUpdate({
      target: sitePages.slug,
      set: { title: content.title, body: content.body, updatedBy: userId, updatedAt: sql`now()` },
    });
}
