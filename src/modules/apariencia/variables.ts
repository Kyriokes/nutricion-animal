import { contrastRatio, mix, type Hex } from "./color";
import {
  MIN_TEXT_CONTRAST,
  onColorOf,
  type Palette,
  type ThemeMode,
} from "./paleta";

// RN-070: traduce una paleta a las variables CSS que usa shadcn/ui.
// Los colores de gráficos (--chart-*) y el radio no dependen de la paleta.
export function toCssVariables(p: Palette): Record<string, Hex> {
  const mutedText = mix(p.foreground, p.background, 0.65);
  const border = mix(p.background, p.foreground, 0.85);

  const vars: Record<string, Hex> = {
    "--background": p.background,
    "--card": p.background,
    "--popover": p.background,
    "--sidebar": p.background,
    "--foreground": p.foreground,
    "--card-foreground": p.foreground,
    "--popover-foreground": p.foreground,
    "--sidebar-foreground": p.foreground,
    "--primary": p.primary,
    "--primary-foreground": onColorOf(p, "primary"),
    "--sidebar-primary": p.primary,
    "--sidebar-primary-foreground": onColorOf(p, "primary"),
    "--ring": p.primary,
    "--sidebar-ring": p.primary,
    "--sidebar-accent": p.accent,
    "--sidebar-accent-foreground": onColorOf(p, "accent"),
    "--muted": mix(p.background, p.foreground, 0.92),
    // RN-072: si el gris calculado no se lee, se usa el texto normal.
    "--muted-foreground":
      contrastRatio(mutedText, p.background) >= MIN_TEXT_CONTRAST
        ? mutedText
        : p.foreground,
    "--border": border,
    "--input": border,
    "--sidebar-border": border,
  };
  for (const c of [
    "secondary",
    "accent",
    "destructive",
    "success",
    "warning",
  ] as const) {
    vars[`--${c}`] = p[c];
    vars[`--${c}-foreground`] = onColorOf(p, c);
  }
  return vars;
}

function block(selector: string, p: Palette): string {
  const body = Object.entries(toCssVariables(p))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, value]) => `${name}:${value};`)
    .join("");
  return `${selector}{${body}}`;
}

// CSS con las variables de ambos modos; el oscuro usa la clase .dark.
// html:root y html.dark son más específicos que :root y .dark de
// globals.css, así la paleta gana sin depender del orden de carga.
export function paletteCss(palettes: Record<ThemeMode, Palette>): string {
  return block("html:root", palettes.light) + block("html.dark", palettes.dark);
}
