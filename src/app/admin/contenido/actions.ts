"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { PAGE_SLUGS, PageContentSchema } from "@/modules/contenido/paginas";
import { PAGES_TAG, savePage } from "@/modules/contenido/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type ContentActionResult = { ok: true } | { ok: false; message: string };

// VA-09: guardar una página de texto. Solo quien tiene content.manage.
export async function savePageAction(slug: unknown, input: unknown): Promise<ContentActionResult> {
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "content.manage")) {
    return { ok: false, message: "No tenés permiso para editar el contenido." };
  }
  const s = z.enum(PAGE_SLUGS).safeParse(slug);
  const content = PageContentSchema.safeParse(input);
  if (!s.success) return { ok: false, message: "Página inválida." };
  if (!content.success) {
    return { ok: false, message: content.error.issues[0]?.message ?? "Datos inválidos." };
  }
  try {
    await savePage(s.data, content.data, actor.id);
  } catch {
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
  // La página pública muestra el cambio en el próximo pedido.
  updateTag(PAGES_TAG);
  return { ok: true };
}
