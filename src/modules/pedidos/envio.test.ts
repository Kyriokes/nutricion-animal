import { describe, expect, it } from "vitest";
import { CARRIER, describeAddressZone, isInDeliveryZone } from "./envio";

describe("pedidos/envio (RN-068: envío simulado solo en Capital)", () => {
  it("reparte Mensajería Mandrake", () => {
    expect(CARRIER).toBe("Mensajería Mandrake");
  });

  it("entra en la zona una dirección verificada en Capital", () => {
    expect(isInDeliveryZone({ city: "CABA", verification: "verified", provinceId: "02" })).toBe(true);
  });

  it("no entra una dirección que Georef no encontró, aunque diga CABA", () => {
    expect(isInDeliveryZone({ city: "CABA", verification: "not_found", provinceId: null })).toBe(false);
  });

  it("no entra una dirección verificada en otra provincia", () => {
    expect(isInDeliveryZone({ city: "CABA", verification: "verified", provinceId: "06" })).toBe(false);
  });

  it("sin verificar (Georef no respondió), decide por la ciudad escrita", () => {
    expect(isInDeliveryZone({ city: "Capital Federal", verification: "unverified", provinceId: null })).toBe(true);
    expect(isInDeliveryZone({ city: "Rosario", verification: "unverified", provinceId: null })).toBe(false);
  });
});

describe("pedidos/envio: estado de la dirección en el perfil (RN-068)", () => {
  it("explica cada caso y ofrece verificar cuando sirve", () => {
    expect(describeAddressZone({ city: "CABA", verification: "verified", provinceId: "02" })).toEqual({
      ok: true,
      text: "Verificada: dentro de la zona de entrega",
      canVerify: false,
    });
    expect(describeAddressZone({ city: "CABA", verification: "not_found", provinceId: null })).toEqual({
      ok: false,
      text: "No encontramos esta dirección en Capital: revisá la calle y la altura y cargala de nuevo",
      canVerify: false,
    });
    expect(describeAddressZone({ city: "CABA", verification: "unverified", provinceId: null })).toEqual({
      ok: true,
      text: "Sin verificar",
      canVerify: true,
    });
    expect(describeAddressZone({ city: "Rosario", verification: "unverified", provinceId: null })).toEqual({
      ok: false,
      text: "Fuera de la zona de entrega: por ahora solo enviamos dentro de Capital",
      canVerify: false,
    });
  });
});
