import { asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { Food } from "@/modules/alimentos/repositorio";
import { foods } from "@/modules/alimentos/tables";
import type { Pet } from "./schema";
import { petFoods, pets } from "./tables";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type FoodListKey = "allergies" | "forbiddenFoods" | "requiredFoods";

// Una mascota guardada, con los alimentos de sus listas con nombre (RN-036).
export type StoredPet = Omit<Pet, FoodListKey> & { id: string } & Record<FoodListKey, Food[]>;

const KINDS = { allergy: "allergies", forbidden: "forbiddenFoods", required: "requiredFoods" } as const;
type Kind = keyof typeof KINDS;

// Alimentos de las listas de varias mascotas, agrupados por mascota.
async function loadFoodLists(petIds: readonly string[]) {
  const byPet = new Map<string, Record<FoodListKey, Food[]>>();
  for (const id of petIds) byPet.set(id, { allergies: [], forbiddenFoods: [], requiredFoods: [] });
  if (petIds.length === 0) return byPet;
  const rows = await db
    .select({ petId: petFoods.petId, kind: petFoods.kind, id: foods.id, name: foods.name })
    .from(petFoods)
    .innerJoin(foods, eq(foods.id, petFoods.foodId))
    .where(inArray(petFoods.petId, [...petIds]))
    .orderBy(asc(foods.name));
  for (const r of rows) byPet.get(r.petId)?.[KINDS[r.kind as Kind]].push({ id: r.id, name: r.name });
  return byPet;
}

function toPet(row: typeof pets.$inferSelect, lists: Record<FoodListKey, Food[]>): StoredPet {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    species: row.species,
    ...(row.breed ? { breed: row.breed } : {}),
    ...(row.birthDate ? { birthDate: row.birthDate } : {}),
    ...(row.weightKg != null ? { weightKg: row.weightKg } : {}),
    healthConditions: row.healthConditions,
    ...lists,
  };
}

function columns(pet: Pet) {
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? null,
    birthDate: pet.birthDate ?? null,
    weightKg: pet.weightKg ?? null,
    healthConditions: pet.healthConditions,
  };
}

// RN-036: reemplaza las listas de alimentos de la mascota.
async function saveFoodLists(tx: Tx, petId: string, pet: Pet) {
  await tx.delete(petFoods).where(eq(petFoods.petId, petId));
  const rows = (Object.entries(KINDS) as [Kind, FoodListKey][]).flatMap(([kind, key]) =>
    pet[key].map((foodId) => ({ petId, foodId, kind })),
  );
  if (rows.length) await tx.insert(petFoods).values(rows);
}

// VU-03: mascotas de un cliente.
export async function listPetsByOwner(ownerId: string): Promise<StoredPet[]> {
  const rows = await db
    .select()
    .from(pets)
    .where(eq(pets.ownerId, ownerId))
    .orderBy(asc(pets.name));
  const lists = await loadFoodLists(rows.map((r) => r.id));
  return rows.map((r) => toPet(r, lists.get(r.id)!));
}

// VU-04: una mascota. Quien llama verifica permisos con canManagePet.
export async function getPet(id: string): Promise<StoredPet | null> {
  const [row] = await db.select().from(pets).where(eq(pets.id, id));
  if (!row) return null;
  return toPet(row, (await loadFoodLists([row.id])).get(row.id)!);
}

// RN-010: alta (ya validada con parsePetForm).
// Si algún alimento ya no existe en la lista, la base lo rechaza y no se
// guarda nada (todo va en una transacción).
export async function createPet(pet: Pet): Promise<string> {
  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(pets)
      .values({ ownerId: pet.ownerId, ...columns(pet) })
      .returning({ id: pets.id });
    await saveFoodLists(tx, row.id, pet);
    return row.id;
  });
}

export async function updatePet(id: string, pet: Pet) {
  await db.transaction(async (tx) => {
    await tx.update(pets).set(columns(pet)).where(eq(pets.id, id));
    await saveFoodLists(tx, id, pet);
  });
}

export async function deletePet(id: string) {
  await db.delete(pets).where(eq(pets.id, id));
}

// DT-024: especies ya cargadas, para sugerirlas y evitar "Perro" y "perro".
// Las más usadas primero; se agrupa en la base (DT-002). Solo las que cargaron
// al menos 2 mascotas: así un texto de un único usuario (que puede ser
// personal o inadecuado) no se les muestra a los demás.
export async function listKnownSpecies(): Promise<string[]> {
  const species = sql<string>`lower(${pets.species})`;
  const rows = await db
    .select({ species })
    .from(pets)
    .groupBy(species)
    .having(sql`count(*) >= 2`)
    .orderBy(desc(sql`count(*)`), asc(species))
    .limit(30);
  return rows.map((r) => r.species);
}
