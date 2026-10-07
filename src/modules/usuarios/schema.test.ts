import { describe, expect, it } from "vitest";
import { UserSchema } from "./schema";
import { PERMISSIONS, hasPermission } from "./roles";

const base = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  email: "ana@example.com",
  name: "Ana",
  roles: ["customer"],
};

describe("usuarios/schema", () => {
  it("valida un usuario con foto y nota del admin", () => {
    const result = UserSchema.safeParse({
      ...base,
      photoUrl: "https://example.com/ana.jpg",
      adminNote: "Verificó su identidad por teléfono",
    });
    expect(result.success).toBe(true);
  });

  it("un usuario sin roles es válido y no tiene permisos; la nota explica el motivo", () => {
    const result = UserSchema.safeParse({
      ...base,
      roles: [],
      adminNote: "Bloqueado por reclamos fraudulentos",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      for (const permission of PERMISSIONS) {
        expect(hasPermission(result.data.roles, permission)).toBe(false);
      }
    }
  });

  it("rechaza email inválido, nombre vacío y roles desconocidos", () => {
    for (const bad of [
      { ...base, email: "no-es-email" },
      { ...base, name: "  " },
      { ...base, roles: ["superusuario"] },
    ]) {
      expect(UserSchema.safeParse(bad).success).toBe(false);
    }
  });
});
