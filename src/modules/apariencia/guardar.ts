import { z } from "zod";
import { hasPermission, type Actor } from "@/modules/usuarios/roles";
import {
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
