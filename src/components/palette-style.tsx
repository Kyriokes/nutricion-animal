import type { Palette, ThemeMode } from "@/modules/apariencia/paleta";
import { paletteCss } from "@/modules/apariencia/variables";

// RN-070: aplica la paleta como variables CSS. Se renderiza en el servidor,
// así los colores llegan con el HTML y no hay parpadeo. Los valores son hex
// ya normalizados, no texto libre.
export function PaletteStyle({
  palettes,
}: {
  palettes: Record<ThemeMode, Palette>;
}) {
  return <style>{paletteCss(palettes)}</style>;
}
