import { describe, expect, it } from "vitest";
import { DietSchema, FoodItemSchema } from "./schema";

describe("dietas/schema", () => {
  it("valida una dieta válida con duración en días", () => {
    const dieta = {
      nutritionistId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Dieta Proteica",
      description: "Dieta alta en proteína para perros activos",
      foods: [
        {
          name: "Pollo",
          quantity: 100,
          unit: "g" as const,
          pattern: { type: "weekly" as const, timesPerWeek: 3 },
        },
      ],
      duration: { type: "days" as const, days: 30 },
    };
    const result = DietSchema.safeParse(dieta);
    expect(result.success).toBe(true);
  });

  it("valida una dieta con duración indefinida", () => {
    const dieta = {
      nutritionistId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Dieta Base",
      description: "Mantenimiento",
      foods: [
        {
          name: "Croquetas",
          quantity: 200,
          unit: "g" as const,
          pattern: { type: "daily_cycle" as const, cycleDays: 3 },
        },
      ],
      duration: { type: "indefinite" as const },
    };
    const result = DietSchema.safeParse(dieta);
    expect(result.success).toBe(true);
  });

  it("rechaza una dieta sin alimentos", () => {
    const dieta = {
      nutritionistId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Inválida",
      description: "Sin comida",
      foods: [],
      duration: { type: "days" as const, days: 10 },
    };
    const result = DietSchema.safeParse(dieta);
    expect(result.success).toBe(false);
  });

  it("rechaza un alimento con cantidad negativa", () => {
    const food = {
      name: "Inválido",
      quantity: -50,
      unit: "g" as const,
      pattern: { type: "weekly" as const, timesPerWeek: 1 },
    };
    const result = FoodItemSchema.safeParse(food);
    expect(result.success).toBe(false);
  });

  it("rechaza duración en días > 999", () => {
    const dieta = {
      nutritionistId: "550e8400-e29b-41d4-a716-446655440000",
      name: "Demasiado larga",
      description: "Más de 999 días",
      foods: [
        {
          name: "Algo",
          quantity: 100,
          unit: "g" as const,
          pattern: { type: "weekly" as const, timesPerWeek: 1 },
        },
      ],
      duration: { type: "days" as const, days: 1000 },
    };
    const result = DietSchema.safeParse(dieta);
    expect(result.success).toBe(false);
  });
});
