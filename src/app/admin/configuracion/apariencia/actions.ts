"use server";

import { sql } from "drizzle-orm";
import { updateTag } from "next/cache";
import { db } from "@/lib/db";
import {
  describeContrastIssues,
  preparePaletteUpdate,
} from "@/modules/apariencia/guardar";
import { PALETTES_TAG } from "@/modules/apariencia/repositorio";
import { themePalettes } from "@/modules/apariencia/tables";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type SavePalettesResult =
  | { ok: true }
  | { ok: false; message: string; details?: string[] };

// VA-08, RN-070: guarda las dos paletas. El permiso y el contraste se
// verifican acá, en el servidor, aunque el formulario ya los muestre.
export async function savePalettes(input: unknown): Promise<SavePalettesResult> {
  const actor = await getCurrentActor();
  if (!actor) return { ok: false, message: "Tenés que ingresar para guardar." };

  const result = preparePaletteUpdate({ actor, palettes: input });
  if (!result.ok) {
    if (result.error === "low_contrast") {
      return {
        ok: false,
        message: "Algunos textos no se leerían bien (RN-072).",
        details: describeContrastIssues(result.issues),
      };
    }
    return {
      ok: false,
      message:
        result.error === "not_allowed"
          ? "No tenés permiso para cambiar la paleta."
          : "Hay colores inválidos.",
    };
  }

  await db
    .insert(themePalettes)
    .values(
      (["light", "dark"] as const).map((mode) => ({
        mode,
        colors: result.palettes[mode],
        updatedBy: actor.id,
      })),
    )
    .onConflictDoUpdate({
      target: themePalettes.mode,
      set: {
        colors: sql`excluded.colors`,
        updatedBy: sql`excluded.updated_by`,
        updatedAt: sql`now()`,
      },
    });

  // El admin y los visitantes ven la paleta nueva en el próximo pedido.
  updateTag(PALETTES_TAG);
  return { ok: true };
}
