import { describe, expect, it } from "vitest";
import { bestTextOn, contrastRatio, mix, normalizeHex } from "./color";

describe("apariencia/color", () => {
  it("normaliza hex", () => {
    expect(normalizeHex("2A9D8F")).toBe("#2a9d8f");
    expect(normalizeHex("#2a9d8f")).toBe("#2a9d8f");
    expect(normalizeHex(" #2A9D8F ")).toBe("#2a9d8f");
    expect(normalizeHex("#abc")).toBeNull();
    expect(normalizeHex("zzzzzz")).toBeNull();
  });

  it("RN-072: contraste WCAG", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
    expect(contrastRatio("#ffffff", "#000000")).toBe(
      contrastRatio("#000000", "#ffffff"),
    );
  });

  it("mezcla", () => {
    expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mix("#ff0000", "#0000ff", 1)).toBe("#ff0000");
    expect(mix("#ff0000", "#0000ff", 0)).toBe("#0000ff");
  });

  it("elige el texto más legible", () => {
    expect(bestTextOn("#ffffff", ["#0a0a0a", "#fafafa"])).toBe("#0a0a0a");
    expect(bestTextOn("#0a0a0a", ["#0a0a0a", "#fafafa"])).toBe("#fafafa");
  });
});
