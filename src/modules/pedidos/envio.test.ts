import { describe, expect, it } from "vitest";
import {
  CARRIER,
  DEFAULT_SHIPPING_COST,
  describeAddressZone,
  isInDeliveryZone,
  parseShippingCost,
} from "./envio";

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

describe("pedidos/envio: costo fijo de envío (RN-068, VA-08)", () => {
  it("arranca con un costo de prueba", () => {
    expect(DEFAULT_SHIPPING_COST).toBe(3000);
  });

  it("acepta montos escritos como en Argentina", () => {
    expect(parseShippingCost("3.500")).toEqual({ ok: true, value: 3500 });
    expect(parseShippingCost("2500,50")).toEqual({ ok: true, value: 2500.5 });
    expect(parseShippingCost("1000,29")).toEqual({ ok: true, value: 1000.29 });
  });

  it("rechaza montos vacíos, en cero, con más de dos decimales o desmedidos", () => {
    const invalid = { ok: false, message: "Escribí un monto mayor a 0, con hasta dos decimales (ej.: 3.500 o 2500,50)" };
    for (const text of ["", "0", "abc", "12.5", "100,555", "-3"]) {
      expect(parseShippingCost(text)).toEqual(invalid);
    }
    expect(parseShippingCost("1.000.001")).toEqual({ ok: false, message: "El costo de envío no puede superar $1.000.000" });
  });
});
