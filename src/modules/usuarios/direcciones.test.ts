import { describe, expect, it } from "vitest";
import { AddressSchema, MAX_ADDRESSES, canAddAddress, formatAddress } from "./direcciones";

const base = { city: "CABA", street: "Av. Corrientes", number: "1234" };

describe("usuarios/direcciones (RN-017)", () => {
  it("ciudad, calle y altura son obligatorias; piso y depto opcionales", () => {
    expect(AddressSchema.parse({ ...base, floor: " 4 ", apartment: "B" })).toEqual({
      ...base,
      floor: "4",
      apartment: "B",
    });
    expect(AddressSchema.parse({ ...base, floor: "", apartment: "  " })).toEqual(base);
    for (const field of ["city", "street", "number"] as const) {
      expect(AddressSchema.safeParse({ ...base, [field]: "  " }).success).toBe(false);
    }
  });

  it("rechaza textos demasiado largos", () => {
    expect(AddressSchema.safeParse({ ...base, street: "a".repeat(121) }).success).toBe(false);
    expect(AddressSchema.safeParse({ ...base, floor: "a".repeat(11) }).success).toBe(false);
  });

  it("arma la dirección como en un delivery", () => {
    expect(formatAddress(base)).toBe("Av. Corrientes 1234, CABA");
    expect(formatAddress({ ...base, floor: "4", apartment: "B" })).toBe(
      "Av. Corrientes 1234, piso 4, depto. B, CABA",
    );
  });

  it("hay un máximo de direcciones por usuario", () => {
    expect(canAddAddress(0)).toBe(true);
    expect(canAddAddress(MAX_ADDRESSES - 1)).toBe(true);
    expect(canAddAddress(MAX_ADDRESSES)).toBe(false);
  });
});
