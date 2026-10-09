import { z } from "zod";
import type { Result } from "@/lib/result";
import { hasPermission, type Actor } from "@/modules/usuarios/roles";
import { activeAssignments, isVersionFrozen } from "./asignaciones";
import { authorize, latestVersion, versionsOf, type DietError } from "./base";
import type { Diet, DietAssignment, DietContent, DietVersion } from "./schema";

// RN-021: crea una dieta propia con su versión 1.
export function createDiet(input: {
  dietId: string;
  versionId: string;
  actor: Actor;
  name: string;
  content: DietContent;
  now: Date;
}): Result<{ diet: Diet; version: DietVersion }, DietError> {
  if (!hasPermission(input.actor.roles, "diet.manage")) {
    return { ok: false, error: "not_allowed" };
  }
  return {
    ok: true,
    diet: {
      id: input.dietId,
      nutritionistId: input.actor.id,
      name: input.name,
      createdAt: input.now,
    },
    version: {
      id: input.versionId,
      dietId: input.dietId,
      number: 1,
      content: input.content,
      createdAt: input.now,
    },
  };
}

// RN-027: clona una dieta propia en otra independiente, con la versión 1
// igual al contenido de la versión elegida.
export function cloneDiet(input: {
  source: Diet;
  sourceVersion: DietVersion;
  dietId: string;
  versionId: string;
  actor: Actor;
  name?: string;
  now: Date;
}): Result<{ diet: Diet; version: DietVersion }, DietError> {
  const denied = authorize(input.actor, input.source, "diet.manage");
  if (denied) return { ok: false, error: denied };
  if (input.sourceVersion.dietId !== input.source.id) {
    return { ok: false, error: "version_not_found" };
  }
  return createDiet({
    dietId: input.dietId,
    versionId: input.versionId,
    actor: input.actor,
    name: input.name ?? `${input.source.name} (copia)`,
    content: structuredClone(input.sourceVersion.content),
    now: input.now,
  });
}

export const DietNameSchema = z.string().trim().min(1).max(80);

// DT-025: el nombre vive en la dieta y no se versiona; renombrar no afecta a
// las mascotas asignadas.
export function renameDiet(input: {
  diet: Diet;
  name: string;
  actor: Actor;
}): Result<{ diet: Diet }, DietError | "invalid_name"> {
  const denied = authorize(input.actor, input.diet, "diet.manage");
  if (denied) return { ok: false, error: denied };
  const name = DietNameSchema.safeParse(input.name);
  if (!name.success) return { ok: false, error: "invalid_name" };
  return { ok: true, diet: { ...input.diet, name: name.data } };
}

// RN-025: una versión que nunca se asignó se edita en el lugar.
export function editVersion(input: {
  diet: Diet;
  version: DietVersion;
  content: DietContent;
  assignments: readonly DietAssignment[];
  actor: Actor;
}): Result<{ version: DietVersion }, DietError> {
  const denied = authorize(input.actor, input.diet, "diet.manage");
  if (denied) return { ok: false, error: denied };
  if (input.version.dietId !== input.diet.id) {
    return { ok: false, error: "version_not_found" };
  }
  if (isVersionFrozen(input.version.id, input.assignments)) {
    return { ok: false, error: "version_frozen" };
  }
  return { ok: true, version: { ...input.version, content: input.content } };
}

// RN-025: una versión que nunca se asignó se puede borrar, salvo la única
// que le queda a la dieta.
export function deleteVersion(input: {
  diet: Diet;
  versions: readonly DietVersion[];
  versionId: string;
  assignments: readonly DietAssignment[];
  actor: Actor;
}): Result<{ versions: DietVersion[] }, DietError> {
  const denied = authorize(input.actor, input.diet, "diet.manage");
  if (denied) return { ok: false, error: denied };

  const own = versionsOf(input.diet, input.versions);
  if (!own.some((v) => v.id === input.versionId)) {
    return { ok: false, error: "version_not_found" };
  }
  if (isVersionFrozen(input.versionId, input.assignments)) {
    return { ok: false, error: "version_frozen" };
  }
  if (own.length === 1) return { ok: false, error: "last_version" };

  return {
    ok: true,
    versions: input.versions.filter((v) => v.id !== input.versionId),
  };
}

// RN-026: qué hay que hacer al editar. Si la última versión nunca se asignó
// se edita en el lugar; si no, se crea una versión nueva y el nutricionista
// ve una alerta con las mascotas que hoy tienen esta dieta.
export function planEdit(input: {
  diet: Diet;
  versions: readonly DietVersion[];
  assignments: readonly DietAssignment[];
}): { mode: "in_place" } | { mode: "new_version"; activePetIds: string[] } {
  const latest = latestVersion(versionsOf(input.diet, input.versions));
  if (!latest || !isVersionFrozen(latest.id, input.assignments)) {
    return { mode: "in_place" };
  }
  return {
    mode: "new_version",
    activePetIds: activeAssignments(
      input.diet,
      input.versions,
      input.assignments,
    ).map((a) => a.petId),
  };
}

// RN-026: crea la versión siguiente y mueve a ella las mascotas elegidas
// ("all" = todas las que hoy tienen la dieta); el resto conserva su versión.
// Las asignaciones movidas se terminan y se crean nuevas, así queda historial.
export function publishVersion(input: {
  diet: Diet;
  versions: readonly DietVersion[];
  assignments: readonly DietAssignment[];
  content: DietContent;
  movePetIds: "all" | readonly string[];
  actor: Actor;
  newId: () => string;
  now: Date;
}): Result<
  {
    version: DietVersion;
    assignments: DietAssignment[];
    movedPetIds: string[];
  },
  DietError
> {
  const denied = authorize(input.actor, input.diet, "diet.manage");
  if (denied) return { ok: false, error: denied };

  const latest = latestVersion(versionsOf(input.diet, input.versions));
  if (!latest) return { ok: false, error: "version_not_found" };

  const active = activeAssignments(
    input.diet,
    input.versions,
    input.assignments,
  );
  const activePetIds = new Set(active.map((a) => a.petId));
  if (
    input.movePetIds !== "all" &&
    input.movePetIds.some((petId) => !activePetIds.has(petId))
  ) {
    return { ok: false, error: "pet_not_assigned" };
  }
  const moving =
    input.movePetIds === "all"
      ? active
      : active.filter((a) => input.movePetIds.includes(a.petId));
  const movingIds = new Set(moving.map((a) => a.id));

  const version: DietVersion = {
    id: input.newId(),
    dietId: input.diet.id,
    number: latest.number + 1,
    content: input.content,
    createdAt: input.now,
  };

  return {
    ok: true,
    version,
    assignments: [
      ...input.assignments.map((a) =>
        movingIds.has(a.id) ? { ...a, endedAt: input.now } : a,
      ),
      ...moving.map((a) => ({
        id: input.newId(),
        petId: a.petId,
        dietVersionId: version.id,
        assignedAt: input.now,
      })),
    ],
    movedPetIds: moving.map((a) => a.petId),
  };
}
