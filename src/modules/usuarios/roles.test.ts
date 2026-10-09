import { describe, expect, it } from "vitest";
import { PERMISSIONS, ROLE_PERMISSIONS, hasPermission, isSuspended } from "./roles";

describe("usuarios/roles", () => {
  it("RN-001: el admin tiene todos los permisos", () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission(["admin"], permission)).toBe(true);
    }
  });

  it("RN-002: los permisos de varios roles se suman", () => {
    expect(hasPermission(["customer"], "product.publish")).toBe(false);
    expect(hasPermission(["customer", "supplier"], "product.publish")).toBe(
      true,
    );
    expect(hasPermission(["customer", "supplier"], "order.create")).toBe(true);
  });

  it("RN-020: el nutricionista tiene todos los permisos del cliente", () => {
    for (const permission of ROLE_PERMISSIONS.customer) {
      expect(ROLE_PERMISSIONS.nutritionist).toContain(permission);
    }
  });

  it("RN-021 y RN-023: solo el nutricionista maneja y asigna dietas", () => {
    for (const permission of ["diet.manage", "diet.assign"] as const) {
      expect(hasPermission(["nutritionist"], permission)).toBe(true);
      expect(hasPermission(["customer"], permission)).toBe(false);
    }
  });

  it("RN-040, RN-041 y RN-043: el auditor revisa productos y decide postulaciones, con menos permisos que el admin", () => {
    expect(hasPermission(["auditor"], "product.review")).toBe(true);
    expect(hasPermission(["auditor"], "application.decide")).toBe(true);
    expect(hasPermission(["auditor"], "user.manage_roles")).toBe(false);
    expect(hasPermission(["auditor"], "order.view_all")).toBe(false);
  });

  it("VA-08, RN-070: solo el admin cambia la configuración del sistema", () => {
    expect(hasPermission(["admin"], "settings.manage")).toBe(true);
    for (const role of ["auditor", "customer", "nutritionist", "supplier"] as const) {
      expect(hasPermission([role], "settings.manage")).toBe(false);
    }
  });

  it("RN-061: solo el admin ve todos los pedidos", () => {
    expect(hasPermission(["admin"], "order.view_all")).toBe(true);
    expect(hasPermission(["customer", "nutritionist"], "order.view_all")).toBe(
      false,
    );
  });

  it("RN-065: solo el admin avanza los estados de los pedidos", () => {
    expect(hasPermission(["admin"], "order.manage")).toBe(true);
    for (const role of ["auditor", "customer", "nutritionist", "supplier"] as const) {
      expect(hasPermission([role], "order.manage")).toBe(false);
    }
  });

  it("RN-066: el cliente abre reclamos y solo el admin los resuelve", () => {
    expect(hasPermission(["customer"], "claim.open")).toBe(true);
    expect(hasPermission(["nutritionist"], "claim.open")).toBe(true);
    expect(hasPermission(["admin"], "claim.manage")).toBe(true);
    for (const role of ["auditor", "customer", "nutritionist", "supplier"] as const) {
      expect(hasPermission([role], "claim.manage")).toBe(false);
    }
  });

  it("RN-080: solo el admin lee los mensajes de contacto", () => {
    expect(hasPermission(["admin"], "contact.manage")).toBe(true);
    for (const role of ["auditor", "customer", "nutritionist", "supplier"] as const) {
      expect(hasPermission([role], "contact.manage")).toBe(false);
    }
  });

  it("RN-046: una cuenta sin roles está suspendida", () => {
    expect(isSuspended([])).toBe(true);
    expect(isSuspended(["customer"])).toBe(false);
    expect(isSuspended(["auditor"])).toBe(false);
  });

  it("un usuario sin roles no tiene ningún permiso", () => {
    for (const permission of PERMISSIONS) {
      expect(hasPermission([], permission)).toBe(false);
    }
  });
});
