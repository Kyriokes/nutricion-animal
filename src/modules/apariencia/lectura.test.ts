import { describe, expect, it } from "vitest";
import { loadPalettes } from "./lectura";
import { DEFAULT_PALETTES } from "./paleta";

describe("apariencia/lectura", () => {
  it("RN-074: si la base falla, usa la paleta base y lo indica", async () => {
    await expect(
      loadPalettes(() => Promise.reject(new Error("down")), 50),
    ).resolves.toEqual({ palettes: DEFAULT_PALETTES, source: "fallback" });
  });

  it("RN-074: si la base tarda, usa la paleta base", async () => {
    const slow = () => new Promise((r) => setTimeout(() => r({}), 200));
    await expect(loadPalettes(slow, 50)).resolves.toEqual({
      palettes: DEFAULT_PALETTES,
      source: "fallback",
    });
  });

  it("usa lo guardado para cada modo", async () => {
    const stored = {
      light: { primary: "#264653" },
      dark: { primary: "#e9c46a" },
    };
    const r = await loadPalettes(async () => stored, 50);
    expect(r.source).toBe("database");
    expect([r.palettes.light.primary, r.palettes.dark.primary]).toEqual([
      "#264653",
      "#e9c46a",
    ]);
    expect(r.palettes.light.background).toBe(
      DEFAULT_PALETTES.light.background,
    );
  });

  it("sin paletas guardadas usa la base, pero la base de datos respondió", async () => {
    await expect(loadPalettes(async () => ({}), 50)).resolves.toEqual({
      palettes: DEFAULT_PALETTES,
      source: "database",
    });
  });

  it("tolera datos con forma inesperada", async () => {
    for (const stored of [null, "texto", { light: "rojo", dark: 3 }]) {
      await expect(loadPalettes(async () => stored, 50)).resolves.toEqual({
        palettes: DEFAULT_PALETTES,
        source: "database",
      });
    }
  });
});
