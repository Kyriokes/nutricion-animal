import { describe, expect, it } from "vitest";
import { applicationOptions, type Application } from "./postulaciones";
import { ROLES, ROLE_LABELS } from "./roles";
import { ProfileUpdateSchema } from "./schema";

const USER_ID = "550e8400-e29b-41d4-a716-446655440000";

function app(
  kind: "nutritionist" | "supplier",
  status: Application["status"],
): Application {
  return {
    id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
    userId: USER_ID,
    data:
      kind === "nutritionist"
        ? { kind, address: "Calle 1", phone: "+54 11 5555-1234", licenseNumber: "MP-1" }
        : { kind, businessName: "Natural Pet" },
    status,
    submittedAt: new Date("2026-10-08T12:00:00Z"),
  };
}

describe("usuarios/perfil: editar el nombre (VU-01)", () => {
  it("acepta un nombre y le quita espacios", () => {
    expect(ProfileUpdateSchema.parse({ name: "  Ana Pérez " })).toEqual({
      name: "Ana Pérez",
    });
  });

  it("rechaza un nombre vacío o demasiado largo", () => {
    expect(ProfileUpdateSchema.safeParse({ name: "   " }).success).toBe(false);
    expect(ProfileUpdateSchema.safeParse({ name: "a".repeat(81) }).success).toBe(
      false,
    );
    expect(ProfileUpdateSchema.safeParse({}).success).toBe(false);
  });
});

describe("usuarios/perfil: nombres de los roles", () => {
  it("todos los roles tienen nombre en español", () => {
    for (const role of ROLES) expect(ROLE_LABELS[role]).toBeTruthy();
    expect(ROLE_LABELS.nutritionist).toBe("Nutricionista");
  });
});

describe("usuarios/perfil: a qué se puede postular (RN-024)", () => {
  it("un cliente sin postulaciones puede postularse a las dos", () => {
    expect(applicationOptions(["customer"], [])).toEqual({
      nutritionist: "available",
      supplier: "available",
    });
  });

  it("con una pendiente espera; con el rol ya lo tiene", () => {
    expect(
      applicationOptions(["customer", "supplier"], [app("nutritionist", "pending")]),
    ).toEqual({ nutritionist: "pending", supplier: "has_role" });
  });

  it("tras un rechazo puede volver a postularse", () => {
    expect(
      applicationOptions(["customer"], [app("nutritionist", "rejected")]).nutritionist,
    ).toBe("available");
  });

  it("un usuario bloqueado (sin roles) no puede postularse", () => {
    expect(applicationOptions([], [])).toEqual({
      nutritionist: "blocked",
      supplier: "blocked",
    });
  });
});
