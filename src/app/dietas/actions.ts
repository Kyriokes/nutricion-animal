"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  assignDietInDb,
  cloneDietInDb,
  createDietInDb,
  deleteDietInDb,
  deleteVersionInDb,
  getCloneSource,
  listDietsOfNutritionist,
  renameDietInDb,
  saveDietContentInDb,
  searchPetsForAssignment,
  unassignDietInDb,
} from "@/modules/dietas/repositorio";
import { getFoodsByIds } from "@/modules/alimentos/repositorio";
import { EditorDietContentSchema, type DietContent } from "@/modules/dietas/schema";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type DietActionResult = { ok: true; message?: string } | { ok: false; message: string };

const MESSAGES: Record<string, string> = {
  not_allowed: "Tu cuenta no puede manejar dietas.",
  not_owner: "Esa dieta es de otro nutricionista.",
  not_found: "No encontramos la dieta o la mascota.",
  version_frozen: "Esa versión ya se asignó: no se puede cambiar ni borrar.",
  last_version: "No se puede borrar la única versión de la dieta.",
  pet_not_assigned: "Alguna mascota elegida ya no tiene esta dieta.",
  already_assigned: "Esa mascota ya tiene esta dieta.",
  other_patient: "Esta dieta es de otro paciente. Clonala para usarla con otra mascota.",
  already_ended: "Esa asignación ya había terminado.",
  invalid_name: "El nombre es obligatorio (hasta 80 caracteres).",
  diet_frozen: "La dieta ya se asignó alguna vez: no se puede borrar (se conserva el historial).",
  stale: "La dieta cambió mientras la editabas (por ejemplo, se asignó). Recargá la página.",
};

const fail = (error: string): DietActionResult => ({
  ok: false,
  message: MESSAGES[error] ?? "No se pudo completar la acción.",
});
const NOT_SIGNED_IN: DietActionResult = { ok: false, message: "Tenés que ingresar." };
const SAVE_FAILED: DietActionResult = { ok: false, message: "No se pudo guardar. Probá de nuevo." };
const INVALID_DIET: DietActionResult = { ok: false, message: "Revisá los datos de la dieta." };
const Id = z.uuid();
const UNKNOWN_FOOD: DietActionResult = { ok: false, message: "Algún alimento ya no está en la lista. Elegilo de nuevo." };

// RN-036: el nombre de cada alimento sale de la lista, no de lo que manda el
// navegador. null si alguno ya no existe.
async function withListNames(content: DietContent): Promise<DietContent | null> {
  const found = new Map((await getFoodsByIds(content.foods.map((f) => f.foodId!))).map((f) => [f.id, f.name]));
  if (content.foods.some((f) => !found.has(f.foodId!))) return null;
  return { ...content, foods: content.foods.map((f) => ({ ...f, name: found.get(f.foodId!)! })) };
}

// RN-021: crear una dieta con su versión 1.
export async function createDietAction(input: unknown): Promise<DietActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const parsed = z.object({ name: z.string(), content: EditorDietContentSchema }).safeParse(input);
  if (!parsed.success) return INVALID_DIET;
  let r;
  try {
    const content = await withListNames(parsed.data.content);
    if (!content) return UNKNOWN_FOOD;
    r = await createDietInDb(actor, parsed.data.name, content);
  } catch {
    return SAVE_FAILED;
  }
  if (!r.ok) return fail(r.error);
  redirect(`/dietas/${r.dietId}`);
}

// DT-025: renombrar no crea versión.
export async function renameDietAction(dietId: unknown, name: unknown): Promise<DietActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const id = Id.safeParse(dietId);
  if (!id.success || typeof name !== "string") return fail("not_found");
  let r;
  try {
    r = await renameDietInDb(actor, id.data, name);
  } catch {
    return SAVE_FAILED;
  }
  if (!r.ok) return fail(r.error);
  refresh();
  return { ok: true };
}

// RN-025 y RN-026: guardar cambios del contenido.
export async function saveDietContentAction(input: unknown): Promise<DietActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const parsed = z
    .object({
      dietId: Id,
      content: EditorDietContentSchema,
      movePetIds: z.union([z.literal("all"), z.array(Id)]),
      expectedLatestVersionId: Id,
      expectedMode: z.enum(["in_place", "new_version"]),
    })
    .safeParse(input);
  if (!parsed.success) return INVALID_DIET;
  let r;
  try {
    const content = await withListNames(parsed.data.content);
    if (!content) return UNKNOWN_FOOD;
    r = await saveDietContentInDb({ actor, ...parsed.data, content });
  } catch {
    return SAVE_FAILED;
  }
  if (!r.ok) return fail(r.error);
  refresh();
  return {
    ok: true,
    message:
      r.mode === "in_place"
        ? "Cambios guardados."
        : r.movedPetIds.length > 0
          ? "Se creó una versión nueva y el paciente pasó a ella."
          : "Se creó una versión nueva; el paciente sigue con la anterior.",
  };
}

// RN-027: clonar en una dieta nueva e independiente.
export async function cloneDietAction(dietId: unknown): Promise<DietActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const id = Id.safeParse(dietId);
  if (!id.success) return fail("not_found");
  let r;
  try {
    r = await cloneDietInDb(actor, id.data);
  } catch {
    return SAVE_FAILED;
  }
  if (!r.ok) return fail(r.error);
  redirect(`/dietas/${r.dietId}`);
}

// RN-027: buscar entre las dietas propias, por nombre de la dieta o del
// paciente, para empezar una nueva a partir de una.
export async function searchOwnDietsAction(query: unknown) {
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "diet.manage")) return [];
  const q = z.string().trim().max(80).safeParse(query);
  if (!q.success) return [];
  try {
    const rows = await listDietsOfNutritionist(actor.id, { q: q.data, limit: 20 });
    return rows.map(({ id, name, patientName }) => ({ id, name, patientName }));
  } catch {
    return [];
  }
}

// RN-027: nombre y contenido de una dieta propia para cargar en "Nueva
// dieta". No guarda nada: la dieta se crea al enviar el formulario.
export async function getCloneSourceAction(dietId: unknown) {
  const actor = await getCurrentActor();
  const id = Id.safeParse(dietId);
  if (!actor || !id.success) return null;
  try {
    return await getCloneSource(actor, id.data);
  } catch {
    return null;
  }
}

// RN-021: borrar una dieta que nunca se asignó.
export async function deleteDietAction(dietId: unknown): Promise<DietActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const id = Id.safeParse(dietId);
  if (!id.success) return fail("not_found");
  let r;
  try {
    r = await deleteDietInDb(actor, id.data);
  } catch {
    return SAVE_FAILED;
  }
  if (!r.ok) return fail(r.error);
  redirect("/dietas");
}

// RN-025: borrar una versión que nunca se asignó.
export async function deleteVersionAction(dietId: unknown, versionId: unknown): Promise<DietActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const d = Id.safeParse(dietId);
  const v = Id.safeParse(versionId);
  if (!d.success || !v.success) return fail("not_found");
  let r;
  try {
    r = await deleteVersionInDb(actor, d.data, v.data);
  } catch {
    return SAVE_FAILED;
  }
  if (!r.ok) return fail(r.error);
  refresh();
  return { ok: true };
}

// RN-023: asignar la última versión al paciente de la dieta.
export async function assignDietAction(dietId: unknown, petId: unknown): Promise<DietActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const d = Id.safeParse(dietId);
  const p = Id.safeParse(petId);
  if (!d.success || !p.success) return fail("not_found");
  let r;
  try {
    r = await assignDietInDb(actor, d.data, p.data);
  } catch {
    return SAVE_FAILED;
  }
  if (!r.ok) return fail(r.error);
  refresh();
  return { ok: true };
}

// Terminar una asignación (queda en el historial).
export async function unassignDietAction(dietId: unknown, assignmentId: unknown): Promise<DietActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const d = Id.safeParse(dietId);
  const a = Id.safeParse(assignmentId);
  if (!d.success || !a.success) return fail("not_found");
  let r;
  try {
    r = await unassignDietInDb(actor, d.data, a.data);
  } catch {
    return SAVE_FAILED;
  }
  if (!r.ok) return fail(r.error);
  refresh();
  return { ok: true };
}

// VN-04: buscar mascotas por nombre o email del dueño, o nombre de la mascota.
export async function searchPetsAction(query: unknown) {
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "diet.assign")) return [];
  const q = z.string().trim().min(2).max(80).safeParse(query);
  if (!q.success) return [];
  try {
    return await searchPetsForAssignment(q.data);
  } catch {
    return [];
  }
}
