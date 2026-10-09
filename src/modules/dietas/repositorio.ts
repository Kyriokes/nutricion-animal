import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pets } from "@/modules/mascotas/tables";
import type { Actor } from "@/modules/usuarios/roles";
import { users } from "@/modules/usuarios/tables";
import { assignDiet, unassignDiet } from "./asignaciones";
import { latestVersion, type DietError } from "./base";
import {
  DietContentSchema,
  type Diet,
  type DietAssignment,
  type DietContent,
  type DietVersion,
} from "./schema";
import { dietAssignments, diets, dietVersions } from "./tables";
import {
  cloneDiet,
  createDiet,
  deleteVersion,
  editVersion,
  planEdit,
  publishVersion,
  renameDiet,
} from "./versiones";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Outcome<T = object> = ({ ok: true } & T) | { ok: false; error: DietError | "not_found" | "invalid_name" };

const toDiet = (r: typeof diets.$inferSelect): Diet => ({
  id: r.id,
  nutritionistId: r.nutritionistId,
  name: r.name,
  createdAt: r.createdAt,
});

const toVersion = (r: typeof dietVersions.$inferSelect): DietVersion => ({
  id: r.id,
  dietId: r.dietId,
  number: r.number,
  // Se guarda solo contenido validado; si algo raro llegara, que falle acá.
  content: DietContentSchema.parse(r.content),
  createdAt: r.createdAt,
});

const toAssignment = (r: typeof dietAssignments.$inferSelect): DietAssignment => ({
  id: r.id,
  petId: r.petId,
  dietVersionId: r.dietVersionId,
  assignedAt: r.assignedAt,
  ...(r.endedAt ? { endedAt: r.endedAt } : {}),
});

type Aggregate = { diet: Diet; versions: DietVersion[]; assignments: DietAssignment[] };

// Dieta con sus versiones y asignaciones. Con `lock`, bloquea la dieta para
// que dos cambios simultáneos no se pisen.
async function loadAggregate(tx: Tx, dietId: string, lock: boolean): Promise<Aggregate | null> {
  const query = tx.select().from(diets).where(eq(diets.id, dietId));
  const [row] = lock ? await query.for("update") : await query;
  if (!row) return null;
  const versionRows = await tx
    .select()
    .from(dietVersions)
    .where(eq(dietVersions.dietId, dietId))
    .orderBy(asc(dietVersions.number));
  const ids = versionRows.map((v) => v.id);
  const assignmentRows = ids.length
    ? await tx.select().from(dietAssignments).where(inArray(dietAssignments.dietVersionId, ids))
    : [];
  return {
    diet: toDiet(row),
    versions: versionRows.map(toVersion),
    assignments: assignmentRows.map(toAssignment),
  };
}

const newId = () => crypto.randomUUID();

// RN-021: crear una dieta propia con su versión 1.
export async function createDietInDb(actor: Actor, name: string, content: DietContent): Promise<Outcome<{ dietId: string }>> {
  const result = createDiet({ dietId: newId(), versionId: newId(), actor, name, content, now: new Date() });
  if (!result.ok) return result;
  const named = renameDiet({ diet: result.diet, name, actor });
  if (!named.ok) return named;
  await db.transaction(async (tx) => {
    await tx.insert(diets).values(named.diet);
    await tx.insert(dietVersions).values(result.version);
  });
  return { ok: true, dietId: result.diet.id };
}

export async function renameDietInDb(actor: Actor, dietId: string, name: string): Promise<Outcome> {
  return db.transaction(async (tx) => {
    const agg = await loadAggregate(tx, dietId, true);
    if (!agg) return { ok: false, error: "not_found" };
    const r = renameDiet({ diet: agg.diet, name, actor });
    if (!r.ok) return r;
    await tx.update(diets).set({ name: r.diet.name }).where(eq(diets.id, dietId));
    return { ok: true };
  });
}

// RN-027: clonar la última versión de una dieta propia en una dieta nueva.
export async function cloneDietInDb(actor: Actor, dietId: string): Promise<Outcome<{ dietId: string }>> {
  return db.transaction(async (tx) => {
    const agg = await loadAggregate(tx, dietId, false);
    const source = agg && latestVersion(agg.versions);
    if (!agg || !source) return { ok: false, error: "not_found" };
    const r = cloneDiet({ source: agg.diet, sourceVersion: source, dietId: newId(), versionId: newId(), actor, now: new Date() });
    if (!r.ok) return r;
    await tx.insert(diets).values(r.diet);
    await tx.insert(dietVersions).values(r.version);
    return { ok: true, dietId: r.diet.id };
  });
}

// RN-025 y RN-026: guardar cambios de contenido. Si la última versión nunca
// se asignó, se edita en el lugar; si no, se crea una versión nueva y se
// mueven a ella solo las mascotas elegidas.
export async function saveDietContentInDb(input: {
  actor: Actor;
  dietId: string;
  content: DietContent;
  movePetIds: "all" | string[];
}): Promise<Outcome<{ mode: "in_place" | "new_version"; movedPetIds: string[] }>> {
  return db.transaction(async (tx) => {
    const agg = await loadAggregate(tx, input.dietId, true);
    if (!agg) return { ok: false, error: "not_found" };
    const plan = planEdit(agg);
    const latest = latestVersion(agg.versions);
    if (plan.mode === "in_place" && latest) {
      const r = editVersion({ diet: agg.diet, version: latest, content: input.content, assignments: agg.assignments, actor: input.actor });
      if (!r.ok) return r;
      await tx.update(dietVersions).set({ content: r.version.content }).where(eq(dietVersions.id, latest.id));
      return { ok: true, mode: "in_place", movedPetIds: [] };
    }
    const now = new Date();
    const r = publishVersion({ ...agg, content: input.content, movePetIds: input.movePetIds, actor: input.actor, newId, now });
    if (!r.ok) return r;
    await tx.insert(dietVersions).values(r.version);
    const before = new Map(agg.assignments.map((a) => [a.id, a]));
    for (const a of r.assignments) {
      const old = before.get(a.id);
      if (!old) await tx.insert(dietAssignments).values({ ...a, endedAt: a.endedAt ?? null });
      else if (!old.endedAt && a.endedAt) {
        await tx.update(dietAssignments).set({ endedAt: a.endedAt }).where(eq(dietAssignments.id, a.id));
      }
    }
    return { ok: true, mode: "new_version", movedPetIds: r.movedPetIds };
  });
}

// RN-025: borrar una versión que nunca se asignó.
export async function deleteVersionInDb(actor: Actor, dietId: string, versionId: string): Promise<Outcome> {
  return db.transaction(async (tx) => {
    const agg = await loadAggregate(tx, dietId, true);
    if (!agg) return { ok: false, error: "not_found" };
    const r = deleteVersion({ ...agg, versionId, actor });
    if (!r.ok) return r;
    await tx.delete(dietVersions).where(eq(dietVersions.id, versionId));
    return { ok: true };
  });
}

// RN-023: asignar la última versión de una dieta a una mascota.
export async function assignDietInDb(actor: Actor, dietId: string, petId: string): Promise<Outcome> {
  return db.transaction(async (tx) => {
    const [pet] = await tx.select({ id: pets.id }).from(pets).where(eq(pets.id, petId));
    const agg = await loadAggregate(tx, dietId, true);
    if (!agg || !pet) return { ok: false, error: "not_found" };
    const r = assignDiet({ ...agg, id: newId(), petId, actor, now: new Date() });
    if (!r.ok) return r;
    await tx.insert(dietAssignments).values({ ...r.assignment, endedAt: null });
    return { ok: true };
  });
}

// Terminar una asignación (queda como historial).
export async function unassignDietInDb(actor: Actor, dietId: string, assignmentId: string): Promise<Outcome> {
  return db.transaction(async (tx) => {
    const agg = await loadAggregate(tx, dietId, true);
    const assignment = agg?.assignments.find((a) => a.id === assignmentId);
    if (!agg || !assignment) return { ok: false, error: "not_found" };
    const r = unassignDiet({ assignment, diet: agg.diet, versions: agg.versions, actor, now: new Date() });
    if (!r.ok) return r;
    await tx.update(dietAssignments).set({ endedAt: r.assignment.endedAt }).where(eq(dietAssignments.id, assignmentId));
    return { ok: true };
  });
}

// ---- Lecturas ----

// VN-01: dietas del nutricionista, con su última versión y cuántas mascotas
// la tienen hoy. Se cuenta en la base (DT-002).
export async function listDietsOfNutritionist(nutritionistId: string) {
  return db
    .select({
      id: diets.id,
      name: diets.name,
      latestVersion: sql<number>`max(${dietVersions.number})`.mapWith(Number),
      activePets: sql<number>`count(distinct ${dietAssignments.petId}) filter (where ${dietAssignments.endedAt} is null)`.mapWith(Number),
    })
    .from(diets)
    .leftJoin(dietVersions, eq(dietVersions.dietId, diets.id))
    .leftJoin(dietAssignments, eq(dietAssignments.dietVersionId, dietVersions.id))
    .where(eq(diets.nutritionistId, nutritionistId))
    .groupBy(diets.id)
    .orderBy(asc(diets.name));
}

// VN-03: detalle de una dieta, con los datos de las mascotas asignadas.
export async function getDietDetail(dietId: string) {
  const agg = await db.transaction((tx) => loadAggregate(tx, dietId, false));
  if (!agg) return null;
  const petIds = [...new Set(agg.assignments.map((a) => a.petId))];
  const petRows = petIds.length
    ? await db
        .select({ id: pets.id, name: pets.name, species: pets.species, ownerName: users.name })
        .from(pets)
        .innerJoin(users, eq(users.id, pets.ownerId))
        .where(inArray(pets.id, petIds))
    : [];
  return { ...agg, pets: new Map(petRows.map((p) => [p.id, p])) };
}

// RN-015, VU-04: dietas vigentes de una mascota, con la versión asignada.
export async function listActiveDietsForPet(petId: string) {
  const rows = await db
    .select({
      assignmentId: dietAssignments.id,
      assignedAt: dietAssignments.assignedAt,
      dietName: diets.name,
      versionNumber: dietVersions.number,
      content: dietVersions.content,
      nutritionistName: users.name,
    })
    .from(dietAssignments)
    .innerJoin(dietVersions, eq(dietVersions.id, dietAssignments.dietVersionId))
    .innerJoin(diets, eq(diets.id, dietVersions.dietId))
    .innerJoin(users, eq(users.id, diets.nutritionistId))
    .where(and(eq(dietAssignments.petId, petId), isNull(dietAssignments.endedAt)))
    .orderBy(desc(dietAssignments.assignedAt));
  return rows.map((r) => ({ ...r, content: DietContentSchema.parse(r.content) }));
}

// VN-04: buscar clientes por nombre o email para elegir una de sus mascotas.
// Por ahora cualquier nutricionista ve a todos (pregunta 5.1 pendiente).
export async function searchPetsForAssignment(query: string) {
  const q = `%${query.trim().replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
  return db
    .select({ petId: pets.id, petName: pets.name, species: pets.species, ownerName: users.name, ownerEmail: users.email })
    .from(pets)
    .innerJoin(users, eq(users.id, pets.ownerId))
    .where(or(ilike(users.name, q), ilike(users.email, q), ilike(pets.name, q)))
    .orderBy(asc(users.name), asc(pets.name))
    .limit(20);
}
