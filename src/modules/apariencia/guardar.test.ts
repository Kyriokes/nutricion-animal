import { describe, expect, it } from "vitest";
import type { Actor } from "@/modules/usuarios/roles";
import { preparePaletteUpdate } from "./guardar";
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
