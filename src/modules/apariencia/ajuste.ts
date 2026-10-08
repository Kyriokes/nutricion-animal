import { contrastRatio, mix, type Hex } from "./color";
import {
  MIN_TEXT_CONTRAST,
  TEXT_ON_BACKGROUND,
  onColorOf,
  type Palette,
  type PaletteCategory,
} from "./paleta";

// RN-072: ¿cumplen el contraste los pares en los que participa esta categoría?
// - texto y fondo: entre sí;
// - primario, secundario, acento: con el texto que va encima;
// - error, éxito, advertencia: además, contra el fondo (se usan como texto).
export function categoryMeetsContrast(p: Palette, c: PaletteCategory): boolean {
  const ok = (a: Hex, b: Hex) => contrastRatio(a, b) >= MIN_TEXT_CONTRAST;
  if (c === "background" || c === "foreground") {
    return ok(p.foreground, p.background);
  }
  if (!ok(onColorOf(p, c), p[c])) return false;
  return !TEXT_ON_BACKGROUND.includes(c) || ok(p[c], p.background);
}

const STEPS = 100;

// RN-075: oscurece o aclara el color (mezclándolo con negro o blanco) lo
// mínimo necesario para que su categoría cumpla el contraste. Prueba de a 1 %
// en ambas direcciones y se queda con el menor cambio. Devuelve el mismo color
// si ya cumple, o null si ninguna mezcla alcanza.
export function fixContrast(p: Palette, c: PaletteCategory): Hex | null {
  if (categoryMeetsContrast(p, c)) return p[c];
  for (let step = 1; step <= STEPS; step++) {
    for (const target of ["#000000", "#ffffff"]) {
      const candidate = mix(target, p[c], step / STEPS);
      if (categoryMeetsContrast({ ...p, [c]: candidate }, c)) return candidate;
    }
  }
  return null;
}
