import { describe, expect, it } from "vitest";
import { DietContentSchema, DietSchema, EditorDietContentSchema, FoodItemSchema } from "./schema";

const food = {
  name: "Pollo",
  quantity: 100,
  unit: "g" as const,
  pattern: { type: "weekly" as const, timesPerWeek: 3 },
};

describe("dietas/schema", () => {
  it("valida un contenido con duración en días", () => {
    const result = DietContentSchema.safeParse({
      description: "Alta en proteína para perros activos",
      foods: [food],
      duration: { type: "days", days: 30 },
    });
    expect(result.success).toBe(true);
  });

  it("valida un contenido con duración indefinida y ciclo de días", () => {
    const result = DietContentSchema.safeParse({
      description: "Mantenimiento",
      foods: [{ ...food, pattern: { type: "daily_cycle", cycleDays: 3 } }],
      duration: { type: "indefinite" },
      notes: "Dividir en dos tomas",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un contenido sin alimentos", () => {
    const result = DietContentSchema.safeParse({
      description: "Sin comida",
      foods: [],
      duration: { type: "days", days: 10 },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza duración en días mayor a 999", () => {
    const result = DietContentSchema.safeParse({
      description: "Demasiado larga",
      foods: [food],
      duration: { type: "days", days: 1000 },
    });
    expect(result.success).toBe(false);
  });

  it("rechaza un alimento con cantidad negativa", () => {
    expect(FoodItemSchema.safeParse({ ...food, quantity: -50 }).success).toBe(
      false,
    );
  });

  it("rechaza una dieta con nombre vacío", () => {
    const result = DietSchema.safeParse({
      id: "550e8400-e29b-41d4-a716-446655440000",
      nutritionistId: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      name: "   ",
      createdAt: new Date(),
    });
    expect(result.success).toBe(false);
  });
});

describe("dietas/schema: alimentos de la lista (RN-036)", () => {
  const POLLO = "11111111-1111-4111-8111-111111111111";

  it("cada alimento puede llevar el id de la lista", () => {
    const r = DietContentSchema.safeParse({
      description: "x",
      foods: [{ ...food, foodId: POLLO }],
      duration: { type: "indefinite" },
    });
    expect(r.success && r.data.foods[0].foodId).toBe(POLLO);
  });

  it("al guardar desde el editor, todos los alimentos tienen que ser de la lista", () => {
    const content = { description: "x", duration: { type: "indefinite" } };
    expect(EditorDietContentSchema.safeParse({ ...content, foods: [{ ...food, foodId: POLLO }] }).success).toBe(true);
    expect(EditorDietContentSchema.safeParse({ ...content, foods: [food] }).success).toBe(false);
  });
});
