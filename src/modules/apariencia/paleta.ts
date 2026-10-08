import { z } from "zod";
import { bestTextOn, contrastRatio, normalizeHex, type Hex } from "./color";

// RN-070: categorías de color que el administrador asigna. La lista puede
// crecer; una paleta guardada sin la categoría nueva usa la base (RN-074).
export const PALETTE_CATEGORIES = [
  "background",
  "foreground",
  "primary",
  "secondary",
  "accent",
  "destructive",
  "success",
  "warning",
] as const;

export type PaletteCategory = (typeof PALETTE_CATEGORIES)[number];
export type Palette = Record<PaletteCategory, Hex>;
export type ThemeMode = "light" | "dark";

// Nombres en español para la interfaz y los mensajes de contraste.
export const CATEGORY_LABELS: Record<PaletteCategory, string> = {
  background: "fondo",
  foreground: "texto",
  primary: "primario",
  secondary: "secundario",
  accent: "acento",
  destructive: "error",
  success: "éxito",
  warning: "advertencia",
};

const hexField = z.string().transform((value, ctx) => {
  const hex = normalizeHex(value);
  if (!hex) {
    ctx.addIssue({ code: "custom", message: "El color no es válido" });
    return z.NEVER;
  }
  return hex;
});

export const PaletteSchema = z.object(
  Object.fromEntries(PALETTE_CATEGORIES.map((c) => [c, hexField])) as Record<
    PaletteCategory,
    typeof hexField
  >,
);

// RN-074: paleta base, equivalente a los neutros de shadcn más estados.
export const DEFAULT_PALETTES: Record<ThemeMode, Palette> = {
  light: {
    background: "#ffffff",
    foreground: "#0a0a0a",
    primary: "#171717",
    secondary: "#f5f5f5",
    accent: "#f5f5f5",
    destructive: "#c10007",
    success: "#008236",
    warning: "#a65f00",
  },
  dark: {
    background: "#0a0a0a",
    foreground: "#fafafa",
    primary: "#e5e5e5",
    secondary: "#262626",
    accent: "#262626",
    destructive: "#ff6467",
    success: "#05df72",
    warning: "#ffb900",
  },
};

// RN-074: arma una paleta segura a partir de datos de cualquier forma (por
// ejemplo, lo guardado en la base). Cada categoría usa el valor si es un color
// válido y, si no, el de la paleta base. Así una categoría nueva o un valor
// roto no rompen el sitio, y nada que no sea un hex llega al CSS.
export function sanitizePalette(stored: unknown, mode: ThemeMode): Palette {
  const source =
    stored && typeof stored === "object"
      ? (stored as Record<string, unknown>)
      : {};
  const base = DEFAULT_PALETTES[mode];
  return Object.fromEntries(
    PALETTE_CATEGORIES.map((c) => {
      const value = source[c];
      return [c, (typeof value === "string" && normalizeHex(value)) || base[c]];
    }),
  ) as Palette;
}

// RN-072: WCAG AA para texto normal, confirmado por el desarrollador.
export const MIN_TEXT_CONTRAST = 4.5;

export type ColorCategory = Exclude<PaletteCategory, "background" | "foreground">;
const COLOR_CATEGORIES = PALETTE_CATEGORIES.filter(
  (c): c is ColorCategory => c !== "background" && c !== "foreground",
);
// Se usan también como color de texto sobre el fondo.
export const TEXT_ON_BACKGROUND: readonly ColorCategory[] = [
  "destructive",
  "success",
  "warning",
];

// Texto que va encima de un color: el más legible entre texto y fondo.
export function onColorOf(palette: Palette, category: ColorCategory): Hex {
  return bestTextOn(palette[category], [palette.foreground, palette.background]);
}

export type ContrastIssue = { pair: [string, string]; ratio: number };

export function validatePalette(p: Palette): ContrastIssue[] {
  const pairs: { pair: [string, string]; a: Hex; b: Hex }[] = [
    { pair: ["texto", "fondo"], a: p.foreground, b: p.background },
    ...COLOR_CATEGORIES.map((c) => ({
      pair: [`texto sobre ${CATEGORY_LABELS[c]}`, CATEGORY_LABELS[c]] as [
        string,
        string,
      ],
      a: onColorOf(p, c),
      b: p[c],
    })),
    ...TEXT_ON_BACKGROUND.map((c) => ({
      pair: [CATEGORY_LABELS[c], "fondo"] as [string, string],
      a: p[c],
      b: p.background,
    })),
  ];
  return pairs
    .map(({ pair, a, b }) => ({ pair, ratio: contrastRatio(a, b) }))
    .filter((issue) => issue.ratio < MIN_TEXT_CONTRAST);
}
