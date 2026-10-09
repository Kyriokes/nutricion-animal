import { describe, expect, it } from "vitest";
import { describeSize, formatPrice, stockLabel } from "./presentacion";

// Intl usa espacios especiales (no separables) entre "$" y el número.
const plain = (s: string) => s.replace(/\s/g, " ");

describe("catalogo/presentacion", () => {
  it("precio en pesos argentinos", () => {
    expect(plain(formatPrice(12500.5))).toBe("$ 12.500,50");
    expect(plain(formatPrice(1900))).toBe("$ 1.900");
  });

  it("peso y volumen", () => {
    expect(describeSize({ weight: { value: 3, unit: "kg" } })).toBe("3 kg");
    expect(describeSize({ weight: { value: 1.5, unit: "kg" } })).toBe("1,5 kg");
    expect(describeSize({ weight: { value: 500, unit: "g" }, volume: { value: 500, unit: "ml" } })).toBe("500 g · 500 ml");
  });

  it("stock", () => {
    expect(stockLabel(0)).toBe("Sin stock");
    expect(stockLabel(3)).toBe("Últimas 3 unidades");
    expect(stockLabel(40)).toBe("En stock");
  });
});
