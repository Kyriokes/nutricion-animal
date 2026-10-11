// RN-037: cómo encaja un producto con una mascota, según los alimentos de su
// composición y de su "puede contener" (RN-033, RN-034) y las listas de la
// mascota y de sus dietas (RN-036). Es una ayuda (RN-038): no reemplaza leer
// la etiqueta ni consultar al nutricionista.

type NamedFood = { id: string; name: string };

export type PetProfile = {
  name: string;
  allergies: readonly NamedFood[];
  forbidden: readonly NamedFood[];
  required: readonly NamedFood[];
  // Alimentos de sus dietas activas.
  dietFoods: readonly NamedFood[];
};

export type ProductFoods = { ingredients: readonly NamedFood[]; traces: readonly NamedFood[] };

export type Block = { food: string; reason: "allergy" | "forbidden"; how: "contains" | "may_contain" };

export type PetEvaluation = {
  // Contiene, o puede contener, algo a lo que es alérgica o que no tiene
  // permitido: se muestra tapado y no se puede agregar desde el filtro.
  blocked: Block[];
  // Alimentos de su dieta y de necesidad que aporta (en el orden de la etiqueta).
  dietFoods: string[];
  requiredFoods: string[];
  // Sin composición cargada no se puede asegurar nada: se avisa.
  unknownComposition: boolean;
};

export function evaluateForPet(product: ProductFoods, pet: PetProfile): PetEvaluation {
  const blocked: Block[] = [];
  const check = (foods: readonly NamedFood[], how: Block["how"]) => {
    for (const food of foods) {
      if (pet.allergies.some((a) => a.id === food.id)) blocked.push({ food: food.name, reason: "allergy", how });
      else if (pet.forbidden.some((x) => x.id === food.id)) blocked.push({ food: food.name, reason: "forbidden", how });
    }
  };
  check(product.ingredients, "contains");
  check(product.traces, "may_contain");
  const has = (list: readonly NamedFood[]) =>
    product.ingredients.filter((i) => list.some((x) => x.id === i.id)).map((i) => i.name);
  return {
    blocked,
    dietFoods: has(pet.dietFoods),
    requiredFoods: has(pet.required),
    unknownComposition: product.ingredients.length === 0,
  };
}

// RN-037 y decisión C: primero los que aportan más alimentos de su dieta o de
// necesidad; después los demás; los de composición desconocida, y al final
// los bloqueados. Dentro de cada grupo, se respeta el orden recibido.
export function rankForPet<T extends { foods: ProductFoods }>(
  items: readonly T[],
  pet: PetProfile,
): (T & { evaluation: PetEvaluation })[] {
  const group = (e: PetEvaluation) => (e.blocked.length > 0 ? 3 : e.unknownComposition ? 2 : 1);
  const score = (e: PetEvaluation) => e.dietFoods.length + e.requiredFoods.length;
  return items
    .map((item, index) => ({ item, evaluation: evaluateForPet(item.foods, pet), index }))
    .sort(
      (a, b) =>
        group(a.evaluation) - group(b.evaluation) ||
        score(b.evaluation) - score(a.evaluation) ||
        a.index - b.index,
    )
    .map(({ item, evaluation }) => ({ ...item, evaluation }));
}

// Texto de la advertencia: "Contiene pollo, alérgeno de Puppy."
export function describeBlock(b: Block, petName: string): string {
  const verb = b.how === "contains" ? "Contiene" : "Puede contener";
  const food = b.food.toLowerCase();
  return b.reason === "allergy"
    ? `${verb} ${food}, alérgeno de ${petName}.`
    : `${verb} ${food}, que ${petName} no tiene permitido.`;
}
