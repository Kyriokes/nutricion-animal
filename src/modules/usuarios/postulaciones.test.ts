import { describe, expect, it } from "vitest";
import {
  ApplicationDataSchema,
  approveApplication,
  rejectApplication,
  submitApplication,
  unseenDecisions,
  type Application,
  type ApplicationData,
} from "./postulaciones";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";
const APP_ID = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";
const ADMIN_ID = "6ba7b811-9dad-41d1-80b4-00c04fd430c8";
const NOW = new Date("2026-10-07T12:00:00Z");

const nutritionistData: ApplicationData = {
  kind: "nutritionist",
  address: "Av. Siempre Viva 742",
  phone: "+54 11 5555-1234",
  licenseNumber: "MP-12345",
};

const pending: Application = {
  id: APP_ID,
  userId: USER_ID,
  data: nutritionistData,
  status: "pending",
  submittedAt: NOW,
};

const admin = { id: ADMIN_ID, roles: ["admin" as const] };
const auditor = { id: ADMIN_ID, roles: ["auditor" as const] };

describe("usuarios/postulaciones: formulario", () => {
  it("RN-024: valida los datos del nutricionista (dirección, teléfono, matrícula)", () => {
    expect(ApplicationDataSchema.safeParse(nutritionistData).success).toBe(true);
    for (const bad of [
      { ...nutritionistData, address: "  " },
      { ...nutritionistData, phone: "abc" },
      { ...nutritionistData, licenseNumber: "" },
    ]) {
      expect(ApplicationDataSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("valida el mínimo del proveedor", () => {
    const ok = { kind: "supplier", businessName: "Natural Pet" };
    expect(ApplicationDataSchema.safeParse(ok).success).toBe(true);
    expect(
      ApplicationDataSchema.safeParse({ kind: "supplier", businessName: "" })
        .success,
    ).toBe(false);
  });
});

describe("usuarios/postulaciones: enviar", () => {
  const base = {
    id: APP_ID,
    userId: USER_ID,
    existing: [] as Application[],
    data: nutritionistData,
    now: NOW,
  };

  it("RN-024: queda pendiente y no cambia los roles", () => {
    const result = submitApplication({ ...base, userRoles: ["customer"] });
    expect(result).toMatchObject({
      ok: true,
      application: { status: "pending", submittedAt: NOW },
    });
    expect(result).not.toHaveProperty("roles");
  });

  it("un usuario bloqueado (sin roles) no puede postularse", () => {
    expect(submitApplication({ ...base, userRoles: [] })).toEqual({
      ok: false,
      error: "blocked",
    });
  });

  it("rechaza si el usuario ya tiene ese rol", () => {
    const result = submitApplication({
      ...base,
      userRoles: ["customer", "nutritionist"],
    });
    expect(result).toEqual({ ok: false, error: "already_has_role" });
  });

  it("rechaza una segunda postulación pendiente del mismo tipo", () => {
    const result = submitApplication({
      ...base,
      userRoles: ["customer"],
      existing: [pending],
    });
    expect(result).toEqual({ ok: false, error: "already_pending" });
  });

  it("permite postularse de nuevo tras un rechazo", () => {
    const rejected: Application = { ...pending, status: "rejected" };
    const result = submitApplication({
      ...base,
      userRoles: ["customer"],
      existing: [rejected],
    });
    expect(result.ok).toBe(true);
  });

  it("permite postularse a otro tipo con una pendiente", () => {
    const result = submitApplication({
      ...base,
      userRoles: ["customer"],
      existing: [pending],
      data: { kind: "supplier", businessName: "Natural Pet" },
    });
    expect(result.ok).toBe(true);
  });
});

describe("usuarios/postulaciones: decidir", () => {
  it("RN-024: aprobar agrega el rol y conserva los anteriores", () => {
    const result = approveApplication({
      application: pending,
      applicantRoles: ["customer"],
      decider: admin,
      now: NOW,
    });
    expect(result).toMatchObject({
      ok: true,
      application: { status: "approved", decidedAt: NOW, decidedBy: ADMIN_ID },
      roles: ["customer", "nutritionist"],
    });
  });

  it("RN-024: aprobar no desbloquea a un usuario bloqueado (sin roles)", () => {
    for (const decider of [admin, auditor]) {
      expect(
        approveApplication({
          application: pending,
          applicantRoles: [],
          decider,
          now: NOW,
        }),
      ).toEqual({ ok: false, error: "blocked" });
    }
  });

  it("RN-043: el auditor también puede aprobar", () => {
    const result = approveApplication({
      application: pending,
      applicantRoles: ["customer"],
      decider: auditor,
      now: NOW,
    });
    expect(result.ok).toBe(true);
  });

  it("aprobar una de proveedor agrega el rol supplier", () => {
    const result = approveApplication({
      application: {
        ...pending,
        data: { kind: "supplier", businessName: "Natural Pet" },
      },
      applicantRoles: ["customer"],
      decider: admin,
      now: NOW,
    });
    expect(result).toMatchObject({ ok: true, roles: ["customer", "supplier"] });
  });

  it("RN-044: rechazar guarda la nota corta del motivo", () => {
    const result = rejectApplication({
      application: pending,
      decider: admin,
      note: "  Falta la matrícula vigente ",
      now: NOW,
    });
    expect(result).toMatchObject({
      ok: true,
      application: {
        status: "rejected",
        decidedBy: ADMIN_ID,
        decisionNote: "Falta la matrícula vigente",
      },
    });
  });

  it("RN-044: rechazar exige una nota corta (1 a 200 caracteres)", () => {
    for (const note of ["", "   ", "a".repeat(201)]) {
      expect(
        rejectApplication({ application: pending, decider: admin, note, now: NOW }),
      ).toEqual({ ok: false, error: "invalid_note" });
    }
  });

  it("RN-045: las decisiones sin leer son las decididas sin seenAt", () => {
    const approved: Application = { ...pending, id: "a", status: "approved", decidedAt: NOW };
    const seen: Application = { ...approved, id: "b", seenAt: NOW };
    expect(unseenDecisions([pending, approved, seen]).map((a) => a.id)).toEqual(["a"]);
  });

  it("un cliente o un nutricionista no pueden decidir", () => {
    for (const roles of [["customer"], ["nutritionist"], []] as const) {
      const decider = { id: USER_ID, roles };
      expect(
        approveApplication({
          application: pending,
          applicantRoles: ["customer"],
          decider,
          now: NOW,
        }),
      ).toEqual({ ok: false, error: "not_allowed" });
      expect(
        rejectApplication({ application: pending, decider, note: "Motivo", now: NOW }),
      ).toEqual({ ok: false, error: "not_allowed" });
    }
  });

  it("un auditor no puede decidir su propia postulación; el admin sí", () => {
    const own = { id: USER_ID, roles: ["auditor" as const] };
    expect(
      approveApplication({
        application: pending,
        applicantRoles: ["customer", "auditor"],
        decider: own,
        now: NOW,
      }),
    ).toEqual({ ok: false, error: "self_decision" });
    expect(
      rejectApplication({ application: pending, decider: own, note: "Motivo", now: NOW }),
    ).toEqual({ ok: false, error: "self_decision" });

    const ownAdmin = { id: USER_ID, roles: ["admin" as const] };
    expect(
      approveApplication({
        application: pending,
        applicantRoles: ["admin"],
        decider: ownAdmin,
        now: NOW,
      }).ok,
    ).toBe(true);
  });

  it("no se decide dos veces una postulación", () => {
    for (const status of ["approved", "rejected"] as const) {
      const decided: Application = { ...pending, status };
      expect(
        approveApplication({
          application: decided,
          applicantRoles: ["customer"],
          decider: admin,
          now: NOW,
        }),
      ).toEqual({ ok: false, error: "already_decided" });
      expect(
        rejectApplication({ application: decided, decider: admin, note: "Motivo", now: NOW }),
      ).toEqual({ ok: false, error: "already_decided" });
    }
  });

  it("aprobar no duplica un rol que ya estaba", () => {
    const result = approveApplication({
      application: pending,
      applicantRoles: ["customer", "nutritionist"],
      decider: admin,
      now: NOW,
    });
    expect(result).toMatchObject({ ok: true, roles: ["customer", "nutritionist"] });
  });
});
