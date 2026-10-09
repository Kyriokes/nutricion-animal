import { describe, expect, it } from "vitest";
import { canManagePet, parsePetForm, splitList } from "./formulario";

const OWNER = "550e8400-e29b-41d4-a716-446655440000";
const base = { name: "Rocco", species: "perro" };

describe("mascotas/formulario (RN-010)", () => {
  it("separa listas por coma o por línea, sin vacíos ni repetidos", () => {
    expect(splitList("pollo, chocolate\nuvas,, Pollo ")).toEqual(["pollo", "chocolate", "uvas"]);
    expect(splitList("")).toEqual([]);
  });

  it("convierte el formulario en una mascota", () => {
    const r = parsePetForm(
      {
        ...base,
        breed: " Labrador ",
        birthDate: "2020-03-01",
        weightKg: "28,5",
        healthConditions: "displasia",
        allergies: "pollo",
        forbiddenFoods: "chocolate, uvas",
        requiredFoods: "pescado",
      },
      OWNER,
    );
    expect(r).toEqual({
      ok: true,
      pet: {
        ownerId: OWNER,
        name: "Rocco",
        species: "perro",
        breed: "Labrador",
        birthDate: new Date("2020-03-01T00:00:00Z"),
        weightKg: 28.5,
        healthConditions: ["displasia"],
        allergies: ["pollo"],
        forbiddenFoods: ["chocolate", "uvas"],
        requiredFoods: ["pescado"],
      },
    });
  });

  it("los campos opcionales vacíos quedan sin cargar", () => {
    const r = parsePetForm({ ...base, breed: "", birthDate: "", weightKg: "" }, OWNER);
    expect(r).toEqual({
      ok: true,
      pet: {
        ownerId: OWNER,
        name: "Rocco",
        species: "perro",
        healthConditions: [],
        allergies: [],
        forbiddenFoods: [],
        requiredFoods: [],
      },
    });
  });

  it("explica en español qué está mal", () => {
    expect(parsePetForm({ ...base, name: " " }, OWNER)).toEqual({
      ok: false,
      message: "El nombre es requerido",
    });
    expect(parsePetForm({ ...base, weightKg: "mucho" }, OWNER)).toMatchObject({ ok: false });
    expect(parsePetForm({ ...base, birthDate: "2999-01-01" }, OWNER)).toEqual({
      ok: false,
      message: "La fecha de nacimiento no puede ser futura",
    });
    expect(
      parsePetForm({ ...base, allergies: "pollo", requiredFoods: "Pollo" }, OWNER),
    ).toEqual({
      ok: false,
      message: "Un alimento no puede ser a la vez necesario y prohibido o alergénico",
    });
  });

  it("solo el dueño o el admin manejan una mascota", () => {
    const pet = { ownerId: OWNER };
    expect(canManagePet({ id: OWNER, roles: ["customer"] }, pet)).toBe(true);
    expect(canManagePet({ id: "otro", roles: ["customer"] }, pet)).toBe(false);
    expect(canManagePet({ id: "otro", roles: ["admin"] }, pet)).toBe(true);
    // Sin roles (bloqueado) ni siquiera el dueño.
    expect(canManagePet({ id: OWNER, roles: [] }, pet)).toBe(false);
  });
});
