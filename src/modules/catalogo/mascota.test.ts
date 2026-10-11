import { describe, expect, it } from "vitest";
import { describeBlock, evaluateForPet, rankForPet, type PetProfile, type ProductFoods } from "./mascota";

const f = (id: string) => ({ id, name: id[0].toUpperCase() + id.slice(1) });

const puppy: PetProfile = {
  name: "Puppy",
  allergies: [f("pollo")],
  forbidden: [f("uva")],
  required: [f("pescado")],
  dietFoods: [f("carne"), f("arroz")],
};

const product = (ingredients: string[], traces: string[] = []): ProductFoods => ({
  ingredients: ingredients.map(f),
  traces: traces.map(f),
});

describe("catalogo/mascota (RN-037: productos para una mascota)", () => {
  it("bloquea lo que contiene un alérgeno o algo no permitido, y dice cuál", () => {
    expect(evaluateForPet(product(["pollo", "arroz"]), puppy).blocked).toEqual([
      { food: "Pollo", reason: "allergy", how: "contains" },
    ]);
    expect(evaluateForPet(product(["carne"], ["uva"]), puppy).blocked).toEqual([
      { food: "Uva", reason: "forbidden", how: "may_contain" },
    ]);
  });

  it("también bloquea lo que \"puede contener\" un alérgeno", () => {
    expect(evaluateForPet(product(["carne"], ["pollo"]), puppy).blocked).toEqual([
      { food: "Pollo", reason: "allergy", how: "may_contain" },
    ]);
  });

  it("dice qué aporta de su dieta y de sus alimentos de necesidad", () => {
    expect(evaluateForPet(product(["carne", "arroz", "pescado"]), puppy)).toEqual({
      blocked: [],
      dietFoods: ["Carne", "Arroz"],
      requiredFoods: ["Pescado"],
      unknownComposition: false,
    });
  });

  it("avisa si el producto no tiene composición cargada (no se puede asegurar nada)", () => {
    expect(evaluateForPet(product([]), puppy)).toEqual({
      blocked: [],
      dietFoods: [],
      requiredFoods: [],
      unknownComposition: true,
    });
  });
});

describe("catalogo/mascota: orden (RN-037, decisión C)", () => {
  it("primero los que más aportan de su dieta y necesidades; los bloqueados al final", () => {
    const items = [
      { id: "nada", foods: product(["avena"]) },
      { id: "bloqueado", foods: product(["carne", "arroz", "pollo"]) },
      { id: "dos", foods: product(["carne", "arroz"]) },
      { id: "uno", foods: product(["pescado"]) },
      { id: "sin-datos", foods: product([]) },
    ];
    expect(rankForPet(items, puppy).map((x) => x.id)).toEqual(["dos", "uno", "nada", "sin-datos", "bloqueado"]);
  });
});

describe("catalogo/mascota: advertencia (RN-037)", () => {
  it("dice qué alimento y por qué", () => {
    expect(describeBlock({ food: "Pollo", reason: "allergy", how: "contains" }, "Puppy")).toBe(
      "Contiene pollo, alérgeno de Puppy.",
    );
    expect(describeBlock({ food: "Uva", reason: "forbidden", how: "may_contain" }, "Rene")).toBe(
      "Puede contener uva, que Rene no tiene permitido.",
    );
  });
});
