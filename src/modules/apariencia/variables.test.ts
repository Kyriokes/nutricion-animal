import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./color";
import {
  DEFAULT_PALETTES,
  MIN_TEXT_CONTRAST,
  onColorOf,
  type Palette,
} from "./paleta";
import { paletteCss, toCssVariables } from "./variables";

describe("apariencia/variables", () => {
  it("RN-070: mapea categorías a variables de shadcn", () => {
    const p = DEFAULT_PALETTES.light;
    const v = toCssVariables(p);
    expect(v["--background"]).toBe("#ffffff");
    expect(v["--card"]).toBe("#ffffff");
    expect(v["--sidebar-foreground"]).toBe(p.foreground);
    expect(v["--ring"]).toBe(p.primary);
    expect(v["--primary-foreground"]).toBe(onColorOf(p, "primary"));
    expect(v["--success"]).toBe("#008236");
    expect(v["--warning-foreground"]).toBe(onColorOf(p, "warning"));
  });

  it("no toca los colores de gráficos ni el radio", () => {
    const v = toCssVariables(DEFAULT_PALETTES.light);
    expect(Object.keys(v).some((k) => k.startsWith("--chart"))).toBe(false);
    expect(v).not.toHaveProperty("--radius");
  });

  it("RN-072: el texto atenuado siempre se lee", () => {
    for (const foreground of ["#595959", "#0a0a0a"]) {
      const p = { ...DEFAULT_PALETTES.light, foreground };
      const v = toCssVariables(p);
      expect(
        contrastRatio(v["--muted-foreground"], p.background),
      ).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
    }
  });

  it("arma el CSS de ambos modos, más específico que globals.css", () => {
    // html:root y html.dark ganan a :root y .dark sin depender del orden de carga.
    const css = paletteCss(DEFAULT_PALETTES);
    expect(css.startsWith("html:root{")).toBe(true);
    expect(css).toContain("html.dark{--accent:#262626;");
  });

  it("no deja inyectar CSS con un valor inválido", () => {
    const evil = { ...DEFAULT_PALETTES.light, primary: "red}body{display:none" };
    const css = paletteCss({ light: evil as Palette, dark: DEFAULT_PALETTES.dark });
    expect(css).not.toContain("body{");
    expect(css).toContain(`--primary:${DEFAULT_PALETTES.light.primary};`);
  });

  it("RN-074: globals.css coincide con la paleta base", () => {
    const css = readFileSync("src/app/globals.css", "utf8");
    for (const [mode, selector] of [
      ["light", ":root"],
      ["dark", ".dark"],
    ] as const) {
      const block = css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))![1];
      for (const [name, value] of Object.entries(
        toCssVariables(DEFAULT_PALETTES[mode]),
      )) {
        expect(block).toContain(`${name}: ${value};`);
      }
    }
  });
});
