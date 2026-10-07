import { describe, expect, it } from "vitest";
import { PetSchema } from "./schema";

const base = {
  ownerId: "550e8400-e29b-41d4-a716-446655440000",
  name: "Rocco",
  species: "perro",
};

describe("mascotas/schema", () => {
  it("RN-010: valida una mascota completa", () => {
    const result = PetSchema.safeParse({
      ...base,
      breed: "Labrador",
      birthDate: new Date("2020-03-01"),
      weightKg: 28.5,
      healthConditions: ["displasia de cadera"],
      allergies: ["pollo"],
      forbiddenFoods: ["chocolate", "uvas"],
      requiredFoods: ["pescado"],
    });
    expect(result.success).toBe(true);
  });

  it("solo nombre y especie son obligatorios; las listas quedan vacías", () => {
    const result = PetSchema.safeParse(base);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.allergies).toEqual([]);
      expect(result.data.forbiddenFoods).toEqual([]);
      expect(result.data.requiredFoods).toEqual([]);
      expect(result.data.healthConditions).toEqual([]);
    }
  });

  it("rechaza nombre o especie vacíos", () => {
    expect(PetSchema.safeParse({ ...base, name: "  " }).success).toBe(false);
    expect(PetSchema.safeParse({ ...base, species: "" }).success).toBe(false);
  });

  it("rechaza peso no positivo y fecha de nacimiento futura", () => {
    expect(PetSchema.safeParse({ ...base, weightKg: 0 }).success).toBe(false);
    expect(PetSchema.safeParse({ ...base, weightKg: -3 }).success).toBe(false);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    expect(PetSchema.safeParse({ ...base, birthDate: future }).success).toBe(
      false,
    );
  });

  it("rechaza alimentos vacíos en las listas", () => {
    expect(PetSchema.safeParse({ ...base, allergies: ["pollo", " "] }).success).toBe(false);
  });

  it("rechaza un alimento a la vez necesario y prohibido o alergénico, sin importar mayúsculas", () => {
    expect(
      PetSchema.safeParse({ ...base, allergies: ["Pollo"], requiredFoods: [" pollo "] }).success,
    ).toBe(false);
    expect(
      PetSchema.safeParse({ ...base, forbiddenFoods: ["arroz"], requiredFoods: ["ARROZ"] }).success,
    ).toBe(false);
  });

  it("permite que un alimento sea alergénico y también esté prohibido", () => {
    const result = PetSchema.safeParse({
      ...base,
      allergies: ["pollo"],
      forbiddenFoods: ["pollo"],
    });
    expect(result.success).toBe(true);
  });
});
