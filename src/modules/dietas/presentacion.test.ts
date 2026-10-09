import { describe, expect, it } from "vitest";
import { describeDuration, describeFood, describePattern } from "./presentacion";

describe("dietas/presentacion", () => {
  it("describe el patrón de consumo", () => {
    expect(describePattern({ type: "weekly", timesPerWeek: 1 })).toBe("1 vez por semana");
    expect(describePattern({ type: "weekly", timesPerWeek: 3 })).toBe("3 veces por semana");
    expect(describePattern({ type: "weekly", timesPerWeek: 7 })).toBe("todos los días");
    expect(describePattern({ type: "daily_cycle", cycleDays: 1 })).toBe("todos los días");
    expect(describePattern({ type: "daily_cycle", cycleDays: 3 })).toBe("cada 3 días");
  });

  it("describe la duración", () => {
    expect(describeDuration({ type: "days", days: 1 })).toBe("1 día");
    expect(describeDuration({ type: "days", days: 30 })).toBe("30 días");
    expect(describeDuration({ type: "indefinite" })).toBe("Indefinida");
  });

  it("describe un alimento completo", () => {
    expect(
      describeFood({ name: "Pollo", quantity: 150, unit: "g", pattern: { type: "weekly", timesPerWeek: 3 } }),
    ).toBe("Pollo: 150 g, 3 veces por semana");
    expect(
      describeFood({ name: "Arroz", quantity: 0.5, unit: "taza", pattern: { type: "daily_cycle", cycleDays: 2 } }),
    ).toBe("Arroz: 0,5 taza, cada 2 días");
  });
});
