import { describe, expect, it } from "vitest";
import {
  planProfessionalProfileUpdate,
  professionalProfileFromApplication,
  toPublicProfile,
} from "./perfil-profesional";
import type { Application } from "./postulaciones";
import { hasPermission } from "./roles";

const nutritionist = { id: "n-1", roles: ["customer", "nutritionist"] as const };
const profile = {
  address: "Av. Siempre Viva 742",
  phone: "+54 11 5555-1234",
  licenseNumber: "MP-12345",
};

describe("usuarios/perfil-profesional (RN-029)", () => {
  it("al aprobar una postulación de nutricionista, sus datos pasan al perfil", () => {
    const app: Application = {
      id: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
      userId: "550e8400-e29b-41d4-a716-446655440000",
      data: { kind: "nutritionist", ...profile },
      status: "approved",
      submittedAt: new Date(),
    };
    expect(professionalProfileFromApplication(app)).toEqual(profile);
    expect(
      professionalProfileFromApplication({
        ...app,
        data: { kind: "supplier", businessName: "Natural Pet" },
      }),
    ).toBeNull();
  });

  it("VN-05: el nutricionista edita su perfil; se valida como el formulario", () => {
    expect(
      planProfessionalProfileUpdate({ actor: nutritionist, input: { ...profile, phone: " +54 11 4444-0000 " } }),
    ).toEqual({ ok: true, profile: { ...profile, phone: "+54 11 4444-0000" } });
    expect(
      planProfessionalProfileUpdate({ actor: nutritionist, input: { ...profile, phone: "abc" } }),
    ).toEqual({ ok: false, error: "invalid" });
  });

  it("solo un nutricionista (o el admin) puede editar un perfil profesional", () => {
    for (const roles of [["customer"], ["auditor"], []] as const) {
      expect(planProfessionalProfileUpdate({ actor: { id: "x", roles }, input: profile })).toEqual({
        ok: false,
        error: "not_allowed",
      });
    }
    expect(hasPermission(["admin"], "nutritionist.edit_profile")).toBe(true);
  });

  it("VU-09: la vista pública no incluye la matrícula", () => {
    const pub = toPublicProfile({
      userId: "n-1",
      name: "Ana",
      photoUrl: null,
      ...profile,
    });
    expect(pub).toEqual({
      userId: "n-1",
      name: "Ana",
      photoUrl: null,
      address: profile.address,
      phone: profile.phone,
    });
    expect(pub).not.toHaveProperty("licenseNumber");
  });

  it("RN-012: los clientes pueden buscar nutricionistas", () => {
    expect(hasPermission(["customer"], "nutritionist.search")).toBe(true);
    expect(hasPermission([], "nutritionist.search")).toBe(false);
  });
});
