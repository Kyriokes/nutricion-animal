import { describe, expect, it } from "vitest";
import { planUserSync, profileFromGoogle, safeRedirectPath } from "./ingreso";
import type { User } from "./schema";

const ID = "550e8400-e29b-41d4-a716-446655440000";

describe("usuarios/ingreso: perfil de Google", () => {
  it("RN-003: toma email, nombre y foto de Google", () => {
    const r = profileFromGoogle({
      id: ID,
      email: "Ana@Example.com",
      user_metadata: {
        full_name: "Ana Pérez",
        avatar_url: "https://lh3.googleusercontent.com/a/foto",
      },
    });
    expect(r).toEqual({
      ok: true,
      profile: {
        id: ID,
        email: "ana@example.com",
        name: "Ana Pérez",
        photoUrl: "https://lh3.googleusercontent.com/a/foto",
      },
    });
  });

  it("usa name y picture si no vienen full_name ni avatar_url", () => {
    const r = profileFromGoogle({
      id: ID,
      email: "ana@example.com",
      user_metadata: { name: "Ana", picture: "https://example.com/p.png" },
    });
    expect(r).toMatchObject({
      ok: true,
      profile: { name: "Ana", photoUrl: "https://example.com/p.png" },
    });
  });

  it("sin nombre usa la parte local del email; sin foto válida la omite", () => {
    const r = profileFromGoogle({
      id: ID,
      email: "ana.perez@example.com",
      user_metadata: { full_name: "  ", avatar_url: "no-es-url" },
    });
    expect(r).toEqual({
      ok: true,
      profile: { id: ID, email: "ana.perez@example.com", name: "ana.perez" },
    });
  });

  it("rechaza un usuario sin email válido o sin id", () => {
    expect(profileFromGoogle({ id: ID, user_metadata: {} })).toEqual({
      ok: false,
      error: "invalid_profile",
    });
    expect(profileFromGoogle({ id: "x", email: "ana@example.com" })).toEqual({
      ok: false,
      error: "invalid_profile",
    });
  });
});

describe("usuarios/ingreso: alta en el primer ingreso", () => {
  const profile = { id: ID, email: "ana@example.com", name: "Ana" };

  it("RN-024: en el primer ingreso se crea como Cliente", () => {
    expect(planUserSync(null, profile)).toEqual({
      action: "create",
      user: { ...profile, roles: ["customer"] },
    });
  });

  it("RN-024: un usuario existente no cambia sus roles ni sus datos", () => {
    const existing: User = {
      ...profile,
      name: "Ana editada",
      roles: ["customer", "nutritionist"],
    };
    expect(planUserSync(existing, { ...profile, name: "Otro" })).toEqual({
      action: "none",
    });
  });

  it("RN-024: un usuario bloqueado (sin roles) sigue bloqueado al volver a entrar", () => {
    const blocked: User = { ...profile, roles: [], adminNote: "Fraude" };
    expect(planUserSync(blocked, profile)).toEqual({ action: "none" });
  });
});

describe("usuarios/ingreso: volver después del ingreso", () => {
  it("acepta rutas internas", () => {
    expect(safeRedirectPath("/carrito")).toBe("/carrito");
    expect(safeRedirectPath("/productos?mascota=perro#lista")).toBe(
      "/productos?mascota=perro#lista",
    );
  });

  it("evita redirigir a otro sitio", () => {
    for (const next of [
      "https://evil.com",
      "//evil.com",
      "/\\evil.com",
      "\\\\evil.com",
      "javascript:alert(1)",
      "carrito",
      "",
      null,
      undefined,
    ]) {
      expect(safeRedirectPath(next)).toBe("/");
    }
  });
});
