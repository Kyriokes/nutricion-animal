import { DEFAULT_PALETTES, sanitizePalette, type Palette, type ThemeMode } from "./paleta";

export type LoadedPalettes = {
  palettes: Record<ThemeMode, Palette>;
  // "fallback" = la base no respondió a tiempo: se usa la paleta base y quien
  // llama la cachea poco tiempo, para reintentar pronto (RN-074).
  source: "database" | "fallback";
};

const TIMEOUT = Symbol("timeout");

// RN-074: lee las paletas guardadas con un tiempo máximo. Nunca lanza: si la
// base falla o tarda, devuelve la paleta base.
export async function loadPalettes(
  loader: () => Promise<unknown>,
  timeoutMs: number,
): Promise<LoadedPalettes> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const stored = await Promise.race([
      loader(),
      new Promise<typeof TIMEOUT>((resolve) => {
        timer = setTimeout(() => resolve(TIMEOUT), timeoutMs);
      }),
    ]);
    if (stored === TIMEOUT) {
      return { palettes: DEFAULT_PALETTES, source: "fallback" };
    }
    const byMode =
      stored && typeof stored === "object"
        ? (stored as Record<string, unknown>)
        : {};
    return {
      palettes: {
        light: sanitizePalette(byMode.light, "light"),
        dark: sanitizePalette(byMode.dark, "dark"),
      },
      source: "database",
    };
  } catch {
    return { palettes: DEFAULT_PALETTES, source: "fallback" };
  } finally {
    clearTimeout(timer);
  }
}
