import { describe, expect, it } from "vitest";
import { categoryMeetsContrast, fixContrast } from "./ajuste";
import { contrastRatio } from "./color";
import {
  DEFAULT_PALETTES,
  MIN_TEXT_CONTRAST,
  PALETTE_CATEGORIES,
  onColorOf,
  validatePalette,
  type Palette,
} from "./paleta";

const light = DEFAULT_PALETTES.light;

describe("apariencia/ajuste: qué categorías fallan", () => {
  it("la paleta base cumple en todas las categorías", () => {
    for (const mode of ["light", "dark"] as const) {
      for (const c of PALETTE_CATEGORIES) {
        expect(categoryMeetsContrast(DEFAULT_PALETTES[mode], c)).toBe(true);
      }
    }
  });

  it("RN-072: marca la categoría cuyo par falla", () => {
    const p = { ...light, warning: "#ffe066" };
    expect(categoryMeetsContrast(p, "warning")).toBe(false);
    expect(categoryMeetsContrast(p, "primary")).toBe(true);
  });

  it("texto y fondo fallan juntos si no contrastan entre sí", () => {
    const p = { ...light, foreground: "#eeeeee" };
    expect(categoryMeetsContrast(p, "foreground")).toBe(false);
    expect(categoryMeetsContrast(p, "background")).toBe(false);
  });
});

describe("apariencia/ajuste: adaptar un color", () => {
  it("si ya cumple, no lo cambia", () => {
    expect(fixContrast(light, "primary")).toBe(light.primary);
  });

  it("RN-075: oscurece un texto demasiado claro lo justo para cumplir", () => {
    const p = { ...light, foreground: "#eeeeee" };
    const fixed = fixContrast(p, "foreground")!;
    const ratio = contrastRatio(fixed, p.background);
    expect(ratio).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    // Cambio mínimo: queda cerca del umbral, no salta a negro.
    expect(ratio).toBeLessThan(5);
  });

  it("RN-075: una advertencia clara pasa a leerse sobre el fondo y con su texto", () => {
    const p = { ...light, warning: "#ffe066" };
    const fixed = fixContrast(p, "warning")!;
    const after: Palette = { ...p, warning: fixed };
    expect(contrastRatio(fixed, p.background)).toBeGreaterThanOrEqual(
      MIN_TEXT_CONTRAST,
    );
    expect(
      contrastRatio(onColorOf(after, "warning"), fixed),
    ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    expect(categoryMeetsContrast(after, "warning")).toBe(true);
  });

  it("RN-075: un primario de gris medio se ajusta para que su texto se lea", () => {
    // Con texto #333333 y fondo blanco, ninguno de los dos se lee sobre #7a7a7a.
    const p = { ...light, foreground: "#333333", primary: "#7a7a7a" };
    expect(categoryMeetsContrast(p, "primary")).toBe(false);
    const after: Palette = { ...p, primary: fixContrast(p, "primary")! };
    expect(categoryMeetsContrast(after, "primary")).toBe(true);
  });

  it("RN-075: también ajusta el fondo contra el texto en modo oscuro", () => {
    const p = { ...DEFAULT_PALETTES.dark, background: "#9a9a9a" };
    const after: Palette = {
      ...p,
      background: fixContrast(p, "background")!,
    };
    expect(categoryMeetsContrast(after, "background")).toBe(true);
  });

  it("conserva el tono: un rojo sigue siendo rojizo", () => {
    const p = { ...light, destructive: "#ff9999" };
    const fixed = fixContrast(p, "destructive")!;
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(fixed.slice(i, i + 2), 16));
    expect(r).toBeGreaterThan(g);
    expect(r).toBeGreaterThan(b);
  });

  it("después de ajustar, esa categoría ya no aparece en los problemas", () => {
    const p = { ...light, success: "#9be7b4" };
    const after: Palette = { ...p, success: fixContrast(p, "success")! };
    expect(
      validatePalette(after).some((i) => i.pair.includes("éxito")),
    ).toBe(false);
  });
});
