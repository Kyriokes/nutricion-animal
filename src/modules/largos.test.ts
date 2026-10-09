import { describe, expect, it } from "vitest";
import { DietContentSchema } from "./dietas/schema";
import { PetSchema } from "./mascotas/schema";
import { ApplicationDataSchema } from "./usuarios/postulaciones";

// Límites de largo: evitan guardar textos o listas enormes en la base
// (revisión del 2026-10-08).
const long = (n: number) => "a".repeat(n);

const food = {
  name: "Pollo",
  quantity: 100,
  unit: "g" as const,
  pattern: { type: "weekly" as const, timesPerWeek: 3 },
};
const diet = { description: "x", foods: [food], duration: { type: "indefinite" as const } };
const pet = { ownerId: "550e8400-e29b-41d4-a716-446655440000", name: "Rocco", species: "perro" };
const nutri = { kind: "nutritionist", address: "Calle 1", phone: "+54 11 5555-1234", licenseNumber: "MP-1" };

describe("largos máximos", () => {
  it("dieta: descripción, notas, nombre de alimento y cantidad de alimentos", () => {
    expect(DietContentSchema.safeParse({ ...diet, description: long(2000) }).success).toBe(true);
    expect(DietContentSchema.safeParse({ ...diet, description: long(2001) }).success).toBe(false);
    expect(DietContentSchema.safeParse({ ...diet, notes: long(1001) }).success).toBe(false);
    expect(DietContentSchema.safeParse({ ...diet, foods: [{ ...food, name: long(81) }] }).success).toBe(false);
    expect(DietContentSchema.safeParse({ ...diet, foods: Array(51).fill(food) }).success).toBe(false);
  });

  it("mascota: nombre, especie, raza y listas", () => {
    expect(PetSchema.safeParse({ ...pet, name: long(61) }).success).toBe(false);
    expect(PetSchema.safeParse({ ...pet, species: long(41) }).success).toBe(false);
    expect(PetSchema.safeParse({ ...pet, breed: long(61) }).success).toBe(false);
    expect(PetSchema.safeParse({ ...pet, allergies: [long(61)] }).success).toBe(false);
    expect(PetSchema.safeParse({ ...pet, allergies: Array(31).fill("x") }).success).toBe(false);
  });

  it("postulaciones: dirección, matrícula y nombre del negocio", () => {
    expect(ApplicationDataSchema.safeParse({ ...nutri, address: long(201) }).success).toBe(false);
    expect(ApplicationDataSchema.safeParse({ ...nutri, licenseNumber: long(41) }).success).toBe(false);
    expect(
      ApplicationDataSchema.safeParse({ kind: "supplier", businessName: long(121) }).success,
    ).toBe(false);
  });
});
