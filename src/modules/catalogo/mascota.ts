import { foodsLookAlike } from "@/modules/alimentos/nombres";
import { normalizeTag } from "./schema";

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

// `similarTo`: el alimento del producto no es el mismo de la lista, pero se
// parece a uno que la mascota no puede comer (por ejemplo, un duplicado).
export type Block = {
  food: string;
  reason: "allergy" | "forbidden";
  how: "contains" | "may_contain";
  similarTo?: string;
};

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
  // Primero por id; si no, por nombre parecido (más vale avisar de más).
  const match = (food: NamedFood, list: readonly NamedFood[]) =>
    list.find((x) => x.id === food.id) ?? list.find((x) => foodsLookAlike(x.name, food.name));
  const check = (foods: readonly NamedFood[], how: Block["how"]) => {
    for (const food of foods) {
      for (const [reason, list] of [["allergy", pet.allergies], ["forbidden", pet.forbidden]] as const) {
        const hit = match(food, list);
        if (!hit) continue;
        blocked.push({ food: food.name, reason, how, ...(hit.id !== food.id ? { similarTo: hit.name } : {}) });
        break;
      }
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

// Texto de la advertencia: "Contiene pollo, alérgeno de Puppy." o, si es por
// parecido, "Contiene hígado de pollo, parecido a pollo, alérgeno de Puppy."
export function describeBlock(b: Block, petName: string): string {
  const verb = b.how === "contains" ? "Contiene" : "Puede contener";
  const food = b.food.toLowerCase();
  const similar = b.similarTo ? `, parecido a ${b.similarTo.toLowerCase()}` : "";
  return b.reason === "allergy"
    ? `${verb} ${food}${similar}, alérgeno de ${petName}.`
    : `${verb} ${food}${similar}, que ${petName} no tiene permitido.`;
}

// RN-039 (solución provisoria): cómo encaja un producto del carrito con las
// mascotas del cliente. Cuentan las mascotas de la especie del producto (un
// snack para perros con leche no avisa por la gata alérgica a la leche) y,
// para no dejar pasar nada, también las de una especie que no está en el
// catálogo (por ejemplo, cargada como "felino"). "Encaja" si aporta alimentos
// de su dieta o de necesidad y no tiene nada que no pueda comer. Sin
// composición cargada no se puede verificar: se avisa si la mascota tiene
// alergias o no permitidos.
export function annotateForPets(
  product: { petTypes: readonly string[]; foods: ProductFoods },
  pets: readonly { name: string; species: string; profile: PetProfile }[],
  knownSpecies: ReadonlySet<string>,
): { fitsPets: string[]; warnings: string[] } {
  const species = new Set(product.petTypes.map(normalizeTag));
  const fitsPets: string[] = [];
  const warnings: string[] = [];
  for (const pet of pets) {
    const petSpecies = normalizeTag(pet.species);
    if (!species.has(petSpecies) && knownSpecies.has(petSpecies)) continue;
    const e = evaluateForPet(product.foods, pet.profile);
    if (e.blocked.length > 0) warnings.push(...e.blocked.map((b) => describeBlock(b, pet.name)));
    else if (e.unknownComposition && pet.profile.allergies.length + pet.profile.forbidden.length > 0) {
      warnings.push(`Composición no informada: no podemos verificar las alergias y restricciones de ${pet.name}.`);
    } else if (e.dietFoods.length + e.requiredFoods.length > 0) fitsPets.push(pet.name);
  }
  return { fitsPets, warnings };
}

// RN-039: con alguna advertencia en el carrito, confirmar la compra exige
// marcar que se revisaron.
export function cartNeedsAllergyAck(notes: Record<string, { fitsPets: readonly string[]; warnings: readonly string[] }>): boolean {
  return Object.values(notes).some((n) => n.warnings.length > 0);
}
