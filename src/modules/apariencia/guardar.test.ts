import { describe, expect, it } from "vitest";
import type { Actor } from "@/modules/usuarios/roles";
import { describeContrastIssues, preparePaletteUpdate } from "./guardar";
import { DEFAULT_PALETTES } from "./paleta";

const admin: Actor = { id: "admin-1", roles: ["admin"] };

describe("apariencia/guardar", () => {
  it("VA-08: solo el admin puede cambiar la paleta", () => {
    for (const roles of [["auditor"], ["customer", "nutritionist"], []] as const) {
      expect(
        preparePaletteUpdate({ actor: { id: "u", roles }, palettes: DEFAULT_PALETTES }),
      ).toEqual({ ok: false, error: "not_allowed" });
    }
  });

  it("RN-070: acepta paletas válidas y normaliza los colores", () => {
    const input = {
      light: { ...DEFAULT_PALETTES.light, primary: "264653" },
      dark: DEFAULT_PALETTES.dark,
    };
    expect(preparePaletteUpdate({ actor: admin, palettes: input })).toMatchObject({
      ok: true,
      palettes: { light: { primary: "#264653" }, dark: DEFAULT_PALETTES.dark },
    });
  });

  it("rechaza datos mal formados", () => {
    for (const palettes of [
      { light: {} },
      { light: DEFAULT_PALETTES.light },
      { ...DEFAULT_PALETTES, dark: { ...DEFAULT_PALETTES.dark, primary: "rojo" } },
      null,
      "texto",
    ]) {
      expect(preparePaletteUpdate({ actor: admin, palettes })).toEqual({
        ok: false,
        error: "invalid",
      });
    }
  });

  it("RN-072: bloquea si algún modo no contrasta, indicando el modo y el par", () => {
    const input = {
      light: DEFAULT_PALETTES.light,
      dark: { ...DEFAULT_PALETTES.dark, foreground: "#111111" },
    };
    const r = preparePaletteUpdate({ actor: admin, palettes: input });
    expect(r).toMatchObject({ ok: false, error: "low_contrast" });
    if (!r.ok && r.error === "low_contrast") {
      expect(r.issues[0]).toMatchObject({
        mode: "dark",
        issue: { pair: ["texto", "fondo"] },
      });
      expect(r.issues.every((i) => i.mode === "dark")).toBe(true);
    }
  });

  it("RN-072: explica en español qué falla, en qué modo y por cuánto", () => {
    expect(
      describeContrastIssues([
        { mode: "dark", issue: { pair: ["texto", "fondo"], ratio: 3.21 } },
        {
          mode: "light",
          issue: { pair: ["texto sobre primario", "primario"], ratio: 1.5 },
        },
        { mode: "light", issue: { pair: ["advertencia", "fondo"], ratio: 2 } },
      ]),
    ).toEqual([
      "Modo oscuro: texto sobre fondo (3,2:1; mínimo 4,5:1)",
      "Modo claro: texto sobre primario (1,5:1; mínimo 4,5:1)",
      "Modo claro: advertencia sobre fondo (2,0:1; mínimo 4,5:1)",
    ]);
  });

  it("RN-072: también revisa el modo claro", () => {
    const input = {
      light: { ...DEFAULT_PALETTES.light, success: "#7fffa0" },
      dark: DEFAULT_PALETTES.dark,
    };
    const r = preparePaletteUpdate({ actor: admin, palettes: input });
    expect(r).toMatchObject({ ok: false, error: "low_contrast" });
    if (!r.ok && r.error === "low_contrast") {
      expect(r.issues).toContainEqual({
        mode: "light",
        issue: expect.objectContaining({ pair: ["éxito", "fondo"] }),
      });
    }
  });
});
