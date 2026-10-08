import { z } from "zod";
import { hasPermission, type Actor } from "@/modules/usuarios/roles";
import {
  MIN_TEXT_CONTRAST,
  PaletteSchema,
  validatePalette,
  type ContrastIssue,
  type Palette,
  type ThemeMode,
} from "./paleta";

const PalettesSchema = z.object({ light: PaletteSchema, dark: PaletteSchema });

export type PaletteUpdateResult =
  | { ok: true; palettes: Record<ThemeMode, Palette> }
  | { ok: false; error: "not_allowed" | "invalid" }
  | {
      ok: false;
      error: "low_contrast";
      issues: { mode: ThemeMode; issue: ContrastIssue }[];
    };

const MODE_LABELS: Record<ThemeMode, string> = {
  light: "Modo claro",
  dark: "Modo oscuro",
};

const ratio = (n: number) => `${n.toFixed(1).replace(".", ",")}:1`;

// RN-072: mensajes para el admin. Ej.: "Modo oscuro: texto sobre fondo
// (3,2:1; mínimo 4,5:1)".
export function describeContrastIssues(
  issues: readonly { mode: ThemeMode; issue: ContrastIssue }[],
): string[] {
  return issues.map(({ mode, issue: { pair, ratio: r } }) => {
    const [front, back] = pair;
    const what = front.startsWith("texto sobre ") ? front : `${front} sobre ${back}`;
    return `${MODE_LABELS[mode]}: ${what} (${ratio(r)}; mínimo ${ratio(MIN_TEXT_CONTRAST)})`;
  });
}

// RN-070 y RN-072: valida un cambio de paleta antes de guardarlo.
// Orden: permiso, forma de los datos, contraste.
export function preparePaletteUpdate(input: {
  actor: Actor;
  palettes: unknown;
}): PaletteUpdateResult {
  if (!hasPermission(input.actor.roles, "settings.manage")) {
    return { ok: false, error: "not_allowed" };
  }
  const parsed = PalettesSchema.safeParse(input.palettes);
  if (!parsed.success) return { ok: false, error: "invalid" };

  const issues = (["light", "dark"] as const).flatMap((mode) =>
    validatePalette(parsed.data[mode]).map((issue) => ({ mode, issue })),
  );
  if (issues.length > 0) return { ok: false, error: "low_contrast", issues };

  return { ok: true, palettes: parsed.data };
}
