import type { Result } from "@/lib/result";
import type { Actor } from "@/modules/usuarios/roles";
import { authorize, latestVersion, versionsOf, type DietError } from "./base";
import type { Diet, DietAssignment, DietVersion } from "./schema";

// RN-025: una versión que alguna vez se asignó queda fija, aunque la
// asignación ya haya terminado.
export function isVersionFrozen(
  versionId: string,
  assignments: readonly DietAssignment[],
): boolean {
  return assignments.some((a) => a.dietVersionId === versionId);
}

// Asignaciones vigentes (sin terminar) sobre cualquier versión de la dieta.
export function activeAssignments(
  diet: Diet,
  versions: readonly DietVersion[],
  assignments: readonly DietAssignment[],
): DietAssignment[] {
  const ids = new Set(versionsOf(diet, versions).map((v) => v.id));
  return assignments.filter((a) => !a.endedAt && ids.has(a.dietVersionId));
}

// RN-023: asigna la versión indicada (por defecto la última) a una mascota.
// Una misma dieta se puede asignar a varias mascotas.
export function assignDiet(input: {
  id: string;
  diet: Diet;
  versions: readonly DietVersion[];
  assignments: readonly DietAssignment[];
  petId: string;
  versionId?: string;
  actor: Actor;
  now: Date;
}): Result<{ assignment: DietAssignment }, DietError> {
  const denied = authorize(input.actor, input.diet, "diet.assign");
  if (denied) return { ok: false, error: denied };

  const own = versionsOf(input.diet, input.versions);
  const version = input.versionId
    ? own.find((v) => v.id === input.versionId)
    : latestVersion(own);
  if (!version) return { ok: false, error: "version_not_found" };

  const alreadyAssigned = activeAssignments(
    input.diet,
    input.versions,
    input.assignments,
  ).some((a) => a.petId === input.petId);
  if (alreadyAssigned) return { ok: false, error: "already_assigned" };

  return {
    ok: true,
    assignment: {
      id: input.id,
      petId: input.petId,
      dietVersionId: version.id,
      assignedAt: input.now,
    },
  };
}

// Termina una asignación sin borrarla, para conservar el historial.
export function unassignDiet(input: {
  assignment: DietAssignment;
  diet: Diet;
  versions: readonly DietVersion[];
  actor: Actor;
  now: Date;
}): Result<{ assignment: DietAssignment }, DietError> {
  const denied = authorize(input.actor, input.diet, "diet.assign");
  if (denied) return { ok: false, error: denied };

  const belongs = versionsOf(input.diet, input.versions).some(
    (v) => v.id === input.assignment.dietVersionId,
  );
  if (!belongs) return { ok: false, error: "version_not_found" };
  if (input.assignment.endedAt) return { ok: false, error: "already_ended" };

  return { ok: true, assignment: { ...input.assignment, endedAt: input.now } };
}
