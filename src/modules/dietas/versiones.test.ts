import { describe, expect, it } from "vitest";
import {
  cloneDiet,
  createDiet,
  deleteVersion,
  editVersion,
  planEdit,
  publishVersion,
} from "./versiones";
import {
  NOW,
  assignment,
  blocked,
  content,
  customer,
  diet,
  idGenerator,
  newContent,
  otherNutritionist,
  owner,
  v1,
} from "./fixtures";
import type { DietVersion } from "./schema";

const v2: DietVersion = { ...v1, id: "v2", number: 2, content: newContent };

describe("dietas/versiones: crear y clonar", () => {
  it("RN-021: el nutricionista crea una dieta propia con la versión 1", () => {
    const result = createDiet({
      dietId: "d1",
      versionId: "ver1",
      actor: owner,
      name: "Mi dieta",
      content,
      now: NOW,
    });
    expect(result).toMatchObject({
      ok: true,
      diet: { id: "d1", nutritionistId: owner.id, name: "Mi dieta" },
      version: { id: "ver1", dietId: "d1", number: 1, content },
    });
  });

  it("un cliente o un usuario sin roles no pueden crear dietas", () => {
    for (const actor of [customer, blocked]) {
      const result = createDiet({
        dietId: "d1",
        versionId: "ver1",
        actor,
        name: "Mi dieta",
        content,
        now: NOW,
      });
      expect(result).toEqual({ ok: false, error: "not_allowed" });
    }
  });

  it("RN-027: clonar crea una dieta nueva e independiente con el mismo contenido", () => {
    const result = cloneDiet({
      source: diet,
      sourceVersion: v1,
      dietId: "d2",
      versionId: "ver2",
      actor: owner,
      now: NOW,
    });
    expect(result).toMatchObject({
      ok: true,
      diet: { id: "d2", name: "Dieta proteica (copia)", nutritionistId: owner.id },
      version: { id: "ver2", dietId: "d2", number: 1 },
    });
    if (result.ok) {
      expect(result.version.content).toEqual(v1.content);
      expect(result.version.content).not.toBe(v1.content);
    }
  });

  it("RN-021: no se puede clonar la dieta de otro nutricionista", () => {
    const result = cloneDiet({
      source: diet,
      sourceVersion: v1,
      dietId: "d2",
      versionId: "ver2",
      actor: otherNutritionist,
      now: NOW,
    });
    expect(result).toEqual({ ok: false, error: "not_owner" });
  });
});

describe("dietas/versiones: editar y borrar", () => {
  const edit = { diet, version: v1, content: newContent };

  it("RN-025: una versión que nunca se asignó se edita en el lugar", () => {
    const result = editVersion({ ...edit, assignments: [], actor: owner });
    expect(result).toEqual({
      ok: true,
      version: { ...v1, content: newContent },
    });
  });

  it("RN-025: una versión asignada no se edita en el lugar, ni siquiera si la asignación terminó", () => {
    for (const a of [
      assignment("a1", "pet-1", "v1"),
      assignment("a1", "pet-1", "v1", NOW),
    ]) {
      const result = editVersion({ ...edit, assignments: [a], actor: owner });
      expect(result).toEqual({ ok: false, error: "version_frozen" });
    }
  });

  it("editar exige ser el dueño con permiso", () => {
    expect(
      editVersion({ ...edit, assignments: [], actor: otherNutritionist }),
    ).toEqual({ ok: false, error: "not_owner" });
    expect(editVersion({ ...edit, assignments: [], actor: blocked })).toEqual({
      ok: false,
      error: "not_allowed",
    });
  });

  it("RN-025: una versión sin asignar se borra, salvo la única de la dieta", () => {
    const input = { diet, assignments: [], actor: owner };
    const removed = deleteVersion({
      ...input,
      versions: [v1, v2],
      versionId: "v2",
    });
    expect(removed).toEqual({ ok: true, versions: [v1] });
    expect(
      deleteVersion({ ...input, versions: [v1], versionId: "v1" }),
    ).toEqual({ ok: false, error: "last_version" });
  });

  it("RN-025: una versión asignada alguna vez no se borra", () => {
    const result = deleteVersion({
      diet,
      versions: [v1, v2],
      versionId: "v1",
      assignments: [assignment("a1", "pet-1", "v1", NOW)],
      actor: owner,
    });
    expect(result).toEqual({ ok: false, error: "version_frozen" });
  });
});

describe("dietas/versiones: alerta y nueva versión", () => {
  it("RN-026: sin asignaciones se edita en el lugar", () => {
    expect(planEdit({ diet, versions: [v1], assignments: [] })).toEqual({
      mode: "in_place",
    });
  });

  it("RN-026: con mascotas asignadas se crea una versión nueva y se avisa a cuáles afecta", () => {
    const assignments = [
      assignment("a1", "pet-1", "v1"),
      assignment("a2", "pet-2", "v1"),
      assignment("a3", "pet-3", "v1", NOW),
    ];
    expect(planEdit({ diet, versions: [v1], assignments })).toEqual({
      mode: "new_version",
      activePetIds: ["pet-1", "pet-2"],
    });
  });

  it("RN-026: si solo quedan asignaciones terminadas, la alerta no lista mascotas", () => {
    const assignments = [assignment("a1", "pet-1", "v1", NOW)];
    expect(planEdit({ diet, versions: [v1], assignments })).toEqual({
      mode: "new_version",
      activePetIds: [],
    });
  });

  const publishBase = {
    diet,
    versions: [v1],
    content: newContent,
    actor: owner,
    now: NOW,
  };

  it("RN-026: mueve a todas las mascotas a la versión nueva y conserva el historial", () => {
    const assignments = [
      assignment("a1", "pet-1", "v1"),
      assignment("a2", "pet-2", "v1"),
    ];
    const result = publishVersion({
      ...publishBase,
      assignments,
      movePetIds: "all",
      newId: idGenerator(),
    });
    expect(result).toMatchObject({
      ok: true,
      version: { id: "id1", number: 2, content: newContent },
      movedPetIds: ["pet-1", "pet-2"],
    });
    if (result.ok) {
      expect(result.assignments).toEqual([
        { ...assignments[0], endedAt: NOW },
        { ...assignments[1], endedAt: NOW },
        { id: "id2", petId: "pet-1", dietVersionId: "id1", assignedAt: NOW },
        { id: "id3", petId: "pet-2", dietVersionId: "id1", assignedAt: NOW },
      ]);
    }
  });

  it("RN-026: solo mueve a las mascotas elegidas; las demás conservan la versión anterior", () => {
    const assignments = [
      assignment("a1", "pet-1", "v1"),
      assignment("a2", "pet-2", "v1"),
    ];
    const result = publishVersion({
      ...publishBase,
      assignments,
      movePetIds: ["pet-2"],
      newId: idGenerator(),
    });
    expect(result).toMatchObject({ ok: true, movedPetIds: ["pet-2"] });
    if (result.ok) {
      expect(result.assignments[0]).toEqual(assignments[0]);
      expect(result.assignments[1]).toEqual({ ...assignments[1], endedAt: NOW });
      expect(result.assignments).toHaveLength(3);
      expect(result.assignments[2]).toMatchObject({
        petId: "pet-2",
        dietVersionId: "id1",
      });
    }
  });

  it("no mueve a ninguna mascota si la lista elegida está vacía", () => {
    const assignments = [assignment("a1", "pet-1", "v1")];
    const result = publishVersion({
      ...publishBase,
      assignments,
      movePetIds: [],
      newId: idGenerator(),
    });
    expect(result).toMatchObject({ ok: true, movedPetIds: [] });
    if (result.ok) expect(result.assignments).toEqual(assignments);
  });

  it("la versión nueva sigue a la última, también si ya hay una v2", () => {
    const result = publishVersion({
      ...publishBase,
      versions: [v1, v2],
      assignments: [assignment("a1", "pet-1", "v2")],
      movePetIds: "all",
      newId: idGenerator(),
    });
    expect(result).toMatchObject({ ok: true, version: { number: 3 } });
  });

  it("rechaza mover una mascota que no tiene la dieta (o ya la terminó)", () => {
    const assignments = [
      assignment("a1", "pet-1", "v1"),
      assignment("a2", "pet-2", "v1", NOW),
    ];
    for (const movePetIds of [["pet-9"], ["pet-2"]]) {
      const result = publishVersion({
        ...publishBase,
        assignments,
        movePetIds,
        newId: idGenerator(),
      });
      expect(result).toEqual({ ok: false, error: "pet_not_assigned" });
    }
  });

  it("solo el dueño con permiso crea versiones", () => {
    const input = {
      ...publishBase,
      assignments: [],
      movePetIds: "all" as const,
      newId: idGenerator(),
    };
    expect(publishVersion({ ...input, actor: otherNutritionist })).toEqual({
      ok: false,
      error: "not_owner",
    });
    expect(publishVersion({ ...input, actor: blocked })).toEqual({
      ok: false,
      error: "not_allowed",
    });
  });
});
