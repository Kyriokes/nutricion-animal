import { describe, expect, it } from "vitest";
import {
  activeAssignments,
  assignDiet,
  isVersionFrozen,
  unassignDiet,
} from "./asignaciones";
import {
  NOW,
  assignment,
  blocked,
  customer,
  diet,
  otherNutritionist,
  owner,
  v1,
} from "./fixtures";
import type { DietVersion } from "./schema";

const v2: DietVersion = { ...v1, id: "v2", number: 2 };
const base = { diet, versions: [v1, v2], now: NOW };

describe("dietas/asignaciones: asignar", () => {
  it("RN-023: asigna la última versión por defecto", () => {
    const result = assignDiet({
      ...base,
      id: "a1",
      assignments: [],
      petId: "pet-1",
      actor: owner,
    });
    expect(result).toEqual({
      ok: true,
      assignment: {
        id: "a1",
        petId: "pet-1",
        dietVersionId: "v2",
        assignedAt: NOW,
      },
    });
  });

  it("asigna una versión concreta si se indica", () => {
    const result = assignDiet({
      ...base,
      id: "a1",
      assignments: [],
      petId: "pet-1",
      versionId: "v1",
      actor: owner,
    });
    expect(result).toMatchObject({
      ok: true,
      assignment: { dietVersionId: "v1" },
    });
  });

  it("RN-021: la misma dieta se asigna a varias mascotas", () => {
    const first = assignment("a1", "pet-1", "v2");
    const result = assignDiet({
      ...base,
      id: "a2",
      assignments: [first],
      petId: "pet-2",
      actor: owner,
    });
    expect(result.ok).toBe(true);
  });

  it("no asigna dos veces la misma dieta a una mascota, pero sí tras terminarla", () => {
    const active = assignment("a1", "pet-1", "v1");
    const input = { ...base, id: "a2", petId: "pet-1", actor: owner };
    expect(assignDiet({ ...input, assignments: [active] })).toEqual({
      ok: false,
      error: "already_assigned",
    });
    const ended = assignment("a1", "pet-1", "v1", NOW);
    expect(assignDiet({ ...input, assignments: [ended] }).ok).toBe(true);
  });

  it("RN-001: el admin puede actuar sobre cualquier dieta", () => {
    const result = assignDiet({
      ...base,
      id: "a1",
      assignments: [],
      petId: "pet-1",
      actor: { id: "admin-1", roles: ["admin"] },
    });
    expect(result.ok).toBe(true);
  });

  it("RN-021: otro nutricionista no puede asignar una dieta ajena", () => {
    const result = assignDiet({
      ...base,
      id: "a1",
      assignments: [],
      petId: "pet-1",
      actor: otherNutritionist,
    });
    expect(result).toEqual({ ok: false, error: "not_owner" });
  });

  it("un cliente o un usuario sin roles no pueden asignar, aunque sean el dueño", () => {
    for (const actor of [customer, blocked]) {
      const result = assignDiet({
        ...base,
        id: "a1",
        assignments: [],
        petId: "pet-1",
        actor,
      });
      expect(result).toEqual({ ok: false, error: "not_allowed" });
    }
  });

  it("rechaza una versión que no es de la dieta", () => {
    const result = assignDiet({
      ...base,
      id: "a1",
      assignments: [],
      petId: "pet-1",
      versionId: "otra",
      actor: owner,
    });
    expect(result).toEqual({ ok: false, error: "version_not_found" });
  });
});

describe("dietas/asignaciones: terminar y congelar", () => {
  it("terminar una asignación conserva el registro con la fecha de fin", () => {
    const result = unassignDiet({
      assignment: assignment("a1", "pet-1", "v1"),
      diet,
      versions: [v1],
      actor: owner,
      now: NOW,
    });
    expect(result).toMatchObject({
      ok: true,
      assignment: { id: "a1", endedAt: NOW },
    });
  });

  it("no se termina dos veces ni por otro nutricionista", () => {
    const input = { diet, versions: [v1], now: NOW };
    expect(
      unassignDiet({
        ...input,
        assignment: assignment("a1", "pet-1", "v1", NOW),
        actor: owner,
      }),
    ).toEqual({ ok: false, error: "already_ended" });
    expect(
      unassignDiet({
        ...input,
        assignment: assignment("a1", "pet-1", "v1"),
        actor: otherNutritionist,
      }),
    ).toEqual({ ok: false, error: "not_owner" });
  });

  it("RN-025: una versión asignada alguna vez queda fija, aunque la asignación haya terminado", () => {
    expect(isVersionFrozen("v1", [])).toBe(false);
    expect(isVersionFrozen("v1", [assignment("a1", "pet-1", "v1")])).toBe(true);
    expect(isVersionFrozen("v1", [assignment("a1", "pet-1", "v1", NOW)])).toBe(
      true,
    );
  });

  it("las asignaciones vigentes excluyen las terminadas y las de otras dietas", () => {
    const list = [
      assignment("a1", "pet-1", "v1"),
      assignment("a2", "pet-2", "v2"),
      assignment("a3", "pet-3", "v1", NOW),
      assignment("a4", "pet-4", "otra-dieta"),
    ];
    const result = activeAssignments(diet, [v1, v2], list);
    expect(result.map((a) => a.id)).toEqual(["a1", "a2"]);
  });
});
