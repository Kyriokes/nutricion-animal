import { describe, expect, it } from "vitest";
import { describeSize, formatPrice, nutritionRows, speciesLabel, stockLabel } from "./presentacion";

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

  it("especie en plural para los menús", () => {
    expect(speciesLabel("perro")).toBe("Perros");
    expect(speciesLabel("gato")).toBe("Gatos");
    expect(speciesLabel("pez")).toBe("Peces");
    expect(speciesLabel("hurón")).toBe("Hurones");
    expect(speciesLabel("ave")).toBe("Aves");
  });

  it("stock", () => {
    expect(stockLabel(0)).toBe("Sin stock");
    expect(stockLabel(3)).toBe("Últimas 3 unidades");
    expect(stockLabel(40)).toBe("En stock");
  });
});

describe("catalogo/presentacion: información nutricional (RN-035)", () => {
  it("como el análisis garantizado: mínimos, máximos y calorías", () => {
    expect(nutritionRows({ protein: 26, fat: 14.5, fiber: 3, moisture: 10, ash: 7, kcalPerKg: 3650 })).toEqual([
      ["Proteína (mín.)", "26 %"],
      ["Grasa (mín.)", "14,5 %"],
      ["Fibra (máx.)", "3 %"],
      ["Humedad (máx.)", "10 %"],
      ["Cenizas", "7 %"],
      ["Calorías", "3.650 kcal/kg"],
    ]);
  });

  it("solo lo que está cargado", () => {
    expect(nutritionRows({ protein: 20 })).toEqual([["Proteína (mín.)", "20 %"]]);
    expect(nutritionRows(undefined)).toEqual([]);
  });
});
