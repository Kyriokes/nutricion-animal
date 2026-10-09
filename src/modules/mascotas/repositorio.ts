import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import type { Pet } from "./schema";
import { pets } from "./tables";

export type StoredPet = Pet & { id: string };

function toPet(row: typeof pets.$inferSelect): StoredPet {
  return {
    id: row.id,
    ownerId: row.ownerId,
    name: row.name,
    species: row.species,
    ...(row.breed ? { breed: row.breed } : {}),
    ...(row.birthDate ? { birthDate: row.birthDate } : {}),
    ...(row.weightKg != null ? { weightKg: row.weightKg } : {}),
    healthConditions: row.healthConditions,
    allergies: row.allergies,
    forbiddenFoods: row.forbiddenFoods,
    requiredFoods: row.requiredFoods,
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
    allergies: pet.allergies,
    forbiddenFoods: pet.forbiddenFoods,
    requiredFoods: pet.requiredFoods,
  };
}

// VU-03: mascotas de un cliente.
export async function listPetsByOwner(ownerId: string): Promise<StoredPet[]> {
  const rows = await db
    .select()
    .from(pets)
    .where(eq(pets.ownerId, ownerId))
    .orderBy(asc(pets.name));
  return rows.map(toPet);
}

// VU-04: una mascota. Quien llama verifica permisos con canManagePet.
export async function getPet(id: string): Promise<StoredPet | null> {
  const [row] = await db.select().from(pets).where(eq(pets.id, id));
  return row ? toPet(row) : null;
}

// RN-010: alta (ya validada con parsePetForm).
export async function createPet(pet: Pet): Promise<string> {
  const [row] = await db
    .insert(pets)
    .values({ ownerId: pet.ownerId, ...columns(pet) })
    .returning({ id: pets.id });
  return row.id;
}

export async function updatePet(id: string, pet: Pet) {
  await db.update(pets).set(columns(pet)).where(eq(pets.id, id));
}

export async function deletePet(id: string) {
  await db.delete(pets).where(eq(pets.id, id));
}

// DT-024: especies ya cargadas, para sugerirlas y evitar "Perro" y "perro".
// Las más usadas primero; se agrupa en la base (DT-002).
export async function listKnownSpecies(): Promise<string[]> {
  const species = sql<string>`lower(${pets.species})`;
  const rows = await db
    .select({ species })
    .from(pets)
    .groupBy(species)
    .orderBy(desc(sql`count(*)`), asc(species))
    .limit(30);
  return rows.map((r) => r.species);
}
