import { describe, expect, it } from "vitest";
import { annotateForPets, cartNeedsAllergyAck, describeBlock, evaluateForPet, rankForPet, type PetProfile, type ProductFoods } from "./mascota";

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

describe("catalogo/mascota: carrito con varias mascotas (RN-039)", () => {
  const rene: PetProfile = { name: "Rene", allergies: [f("leche")], forbidden: [], required: [], dietFoods: [f("pollo")] };
  const pets = [
    { name: "Puppy", species: "perro", profile: puppy },
    { name: "Rene", species: "Gato", profile: rene },
  ];

  it("dice para qué mascotas encaja (de su especie y con alimentos de su dieta o de necesidad)", () => {
    expect(annotateForPets({ petTypes: ["perro", "gato"], foods: product(["carne"]) }, pets, new Set(["perro", "gato"])).fitsPets).toEqual(["Puppy"]);
    expect(annotateForPets({ petTypes: ["gato"], foods: product(["pollo"]) }, pets, new Set(["perro", "gato"])).fitsPets).toEqual(["Rene"]);
    // Si encaja con varias mascotas, las nombra a todas.
    expect(
      annotateForPets({ petTypes: ["perro", "gato"], foods: product(["carne", "arroz"]) }, [
        ...pets,
        { name: "Toby", species: "perro", profile: { ...puppy, name: "Toby", allergies: [] } },
      ], new Set(["perro", "gato"])).fitsPets,
    ).toEqual(["Puppy", "Toby"]);
    expect(annotateForPets({ petTypes: ["gato"], foods: product(["carne"]) }, pets, new Set(["perro", "gato"])).fitsPets).toEqual([]);
  });

  it("advierte solo por las mascotas de la especie del producto", () => {
    // Snack para perros con leche: no avisa por Rene (gata).
    expect(annotateForPets({ petTypes: ["perro"], foods: product(["leche"]) }, pets, new Set(["perro", "gato"])).warnings).toEqual([]);
    expect(annotateForPets({ petTypes: ["perro", "gato"], foods: product(["leche"]) }, pets, new Set(["perro", "gato"])).warnings).toEqual([
      "Contiene leche, alérgeno de Rene.",
    ]);
  });

  it("una mascota de la especie que no puede comerlo no figura como \"encaja\"", () => {
    const r = annotateForPets({ petTypes: ["perro"], foods: product(["carne", "pollo"]) }, pets, new Set(["perro", "gato"]));
    expect(r.fitsPets).toEqual([]);
    expect(r.warnings).toEqual(["Contiene pollo, alérgeno de Puppy."]);
  });
});

describe("catalogo/mascota: casos que no pueden escaparse (revisión)", () => {
  it("bloquea por nombre parecido aunque sea otro alimento de la lista (duplicados)", () => {
    const pet = { ...puppy, allergies: [{ id: "a1", name: "Pollo" }] };
    const p = { ingredients: [{ id: "otro", name: "Hígado de pollo" }], traces: [] };
    expect(evaluateForPet(p, pet).blocked).toEqual([
      { food: "Hígado de pollo", reason: "allergy", how: "contains", similarTo: "Pollo" },
    ]);
    expect(describeBlock(evaluateForPet(p, pet).blocked[0], "Puppy")).toBe(
      "Contiene hígado de pollo, parecido a pollo, alérgeno de Puppy.",
    );
  });

  const rene: PetProfile = { name: "Rene", allergies: [f("leche")], forbidden: [], required: [], dietFoods: [] };
  const known = new Set(["perro", "gato"]);

  it("si la especie de la mascota no es una del catálogo, avisa igual", () => {
    const pets = [{ name: "Rene", species: "Felino", profile: rene }];
    expect(annotateForPets({ petTypes: ["perro"], foods: product(["leche"]) }, pets, known).warnings).toEqual([
      "Contiene leche, alérgeno de Rene.",
    ]);
  });

  it("compara la especie como el catálogo (mayúsculas y espacios)", () => {
    const pets = [{ name: "Rene", species: "  GATO ", profile: rene }];
    expect(annotateForPets({ petTypes: ["gato"], foods: product(["leche"]) }, pets, known).warnings).toEqual([
      "Contiene leche, alérgeno de Rene.",
    ]);
  });

  it("sin composición, avisa que no se pueden verificar las alergias", () => {
    const pets = [{ name: "Rene", species: "gato", profile: rene }];
    expect(annotateForPets({ petTypes: ["gato"], foods: product([]) }, pets, known).warnings).toEqual([
      "Composición no informada: no podemos verificar las alergias y restricciones de Rene.",
    ]);
    // Si la mascota no tiene alergias ni no permitidos, no hay nada que verificar.
    const sinAlergias = [{ name: "Toby", species: "gato", profile: { ...rene, allergies: [] } }];
    expect(annotateForPets({ petTypes: ["gato"], foods: product([]) }, sinAlergias, known).warnings).toEqual([]);
  });

  it("con alguna advertencia, la compra pide confirmar", () => {
    expect(cartNeedsAllergyAck({ a: { fitsPets: [], warnings: [] } })).toBe(false);
    expect(cartNeedsAllergyAck({ a: { fitsPets: [], warnings: ["x"] } })).toBe(true);
  });
});
