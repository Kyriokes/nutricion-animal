import { describe, expect, it } from "vitest";
import { planUserUpdate } from "./gestion";
import type { Actor } from "./roles";

const admin: Actor = { id: "admin-1", roles: ["customer", "admin"] };
const target = { id: "user-1", roles: ["customer"] as const };

describe("usuarios/gestion: cambiar roles y nota (VA-10)", () => {
  it("RN-001: el admin cambia roles y nota", () => {
    expect(
      planUserUpdate({
        actor: admin,
        target,
        input: { roles: ["customer", "auditor"], adminNote: " Revisa productos " },
      }),
    ).toEqual({
      ok: true,
      update: { roles: ["customer", "auditor"], adminNote: "Revisa productos" },
    });
  });

  it("DT-019: bloquear es dejar sin roles; la nota explica el motivo", () => {
    expect(
      planUserUpdate({
        actor: admin,
        target,
        input: { roles: [], adminNote: "Reclamos fraudulentos" },
      }),
    ).toEqual({
      ok: true,
      update: { roles: [], adminNote: "Reclamos fraudulentos" },
    });
  });

  it("una nota vacía se guarda como sin nota; roles repetidos se unifican", () => {
    expect(
      planUserUpdate({
        actor: admin,
        target,
        input: { roles: ["customer", "customer"], adminNote: "   " },
      }),
    ).toEqual({ ok: true, update: { roles: ["customer"], adminNote: null } });
  });

  it("solo quien tiene user.manage_roles puede cambiar", () => {
    for (const roles of [["auditor"], ["customer", "nutritionist"], []] as const) {
      expect(
        planUserUpdate({
          actor: { id: "x", roles },
          target,
          input: { roles: ["customer"], adminNote: "" },
        }),
      ).toEqual({ ok: false, error: "not_allowed" });
    }
  });

  it("el admin no puede quitarse a sí mismo el rol de admin", () => {
    expect(
      planUserUpdate({
        actor: admin,
        target: { id: admin.id, roles: admin.roles },
        input: { roles: ["customer"], adminNote: "" },
      }),
    ).toEqual({ ok: false, error: "self_demotion" });
  });

  it("rechaza roles desconocidos y notas demasiado largas", () => {
    for (const input of [
      { roles: ["superusuario"], adminNote: "" },
      { roles: ["customer"], adminNote: "a".repeat(501) },
      { roles: "customer", adminNote: "" },
    ]) {
      expect(planUserUpdate({ actor: admin, target, input })).toEqual({
        ok: false,
        error: "invalid",
      });
    }
  });
});
