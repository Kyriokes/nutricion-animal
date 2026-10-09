import { describe, expect, it } from "vitest";
import { isIssuerActive } from "./emisor";

describe("dietas/emisor (RN-047)", () => {
  it("quien emitió la dieta sigue activo si es nutricionista o admin", () => {
    expect(isIssuerActive(["customer", "nutritionist"])).toBe(true);
    expect(isIssuerActive(["admin"])).toBe(true);
  });

  it("deja de formar parte si perdió el rol, si está bloqueado o si se dio de baja", () => {
    expect(isIssuerActive(["customer"])).toBe(false);
    expect(isIssuerActive([])).toBe(false);
    expect(isIssuerActive(null)).toBe(false);
  });
});
