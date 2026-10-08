import { describe, expect, it } from "vitest";
import { parseCoolorsUrl, toCoolorsUrl } from "./coolors";

describe("apariencia/coolors", () => {
  it("RN-071: lee los colores de un enlace", () => {
    expect(
      parseCoolorsUrl("https://coolors.co/264653-2a9d8f-e9c46a-f4a261-e76f51"),
    ).toEqual({
      ok: true,
      colors: ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"],
    });
  });

  it("acepta /palette/, mayúsculas, www, query y hash", () => {
    for (const url of [
      "https://coolors.co/palette/264653-2A9D8F",
      "https://www.coolors.co/264653-2a9d8f?ref=x",
      "https://coolors.co/264653-2a9d8f#top",
      "  https://coolors.co/264653-2a9d8f/  ",
    ]) {
      expect(parseCoolorsUrl(url)).toEqual({
        ok: true,
        colors: ["#264653", "#2a9d8f"],
      });
    }
  });

  it("rechaza dominios ajenos y textos que no son URL", () => {
    for (const url of [
      "https://evil.com/264653-2a9d8f",
      "https://coolors.co.evil.com/264653-2a9d8f",
      "no es un link",
      "",
    ]) {
      expect(parseCoolorsUrl(url)).toEqual({ ok: false, error: "invalid_url" });
    }
  });

  it("rechaza enlaces sin colores válidos o con cantidad fuera de rango", () => {
    for (const url of [
      "https://coolors.co/generate",
      "https://coolors.co/abc-2a9d8f",
      "https://coolors.co/264653",
      `https://coolors.co/${Array(11).fill("264653").join("-")}`,
    ]) {
      expect(parseCoolorsUrl(url)).toEqual({ ok: false, error: "no_colors" });
    }
  });

  it("RN-071: arma el enlace para editar en coolors", () => {
    expect(toCoolorsUrl(["#264653", "#2A9D8F", "#264653"])).toBe(
      "https://coolors.co/264653-2a9d8f",
    );
  });
});
