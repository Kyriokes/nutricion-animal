import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { loadPalettes } from "./lectura";
import type { Palette, ThemeMode } from "./paleta";
import { themePalettes } from "./tables";

export const PALETTES_TAG = "theme-palettes";
const DB_TIMEOUT_MS = 1500;

async function queryStoredPalettes(): Promise<Record<string, unknown>> {
  const rows = await db
    .select({ mode: themePalettes.mode, colors: themePalettes.colors })
    .from(themePalettes);
  return Object.fromEntries(rows.map((r) => [r.mode, r.colors]));
}

// VA-08: para editar se lee sin caché y con más margen. Si igual falla
// (source "fallback"), la pantalla no debe ofrecer guardar: el admin vería la
// paleta base como si fuera la actual y al guardar pisaría la personalizada.
export function readPalettesForEditing() {
  return loadPalettes(queryStoredPalettes, 5000);
}

// RN-070 y RN-074: paletas para el <style> del layout. Con Cache Components
// se calculan al hacer el build y quedan en el HTML estático:
// - si la base respondió, no vencen solas: se renuevan al guardar
//   (updateTag(PALETTES_TAG) en la pantalla de apariencia);
// - si falló o tardó, se usa la paleta base por pocos minutos, así el sitio
//   se corrige solo cuando la base vuelve.
export async function getPalettes(): Promise<Record<ThemeMode, Palette>> {
  "use cache";
  cacheTag(PALETTES_TAG);
  const { palettes, source } = await loadPalettes(
    queryStoredPalettes,
    DB_TIMEOUT_MS,
  );
  if (source === "database") {
    cacheLife("max");
  } else {
    cacheLife("minutes");
  }
  return palettes;
}
