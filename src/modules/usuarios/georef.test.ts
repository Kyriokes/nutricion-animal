import { describe, expect, it } from "vitest";
import { buildGeorefQuery, interpretGeorefResponse, isCabaCityText, verifyAddress } from "./georef";

const corrientes = { city: "CABA", street: "Av. Corrientes", number: "1234" };
const found = {
  cantidad: 1,
  direcciones: [{ provincia_id: "02", nomenclatura: "AV CORRIENTES 1234, Comuna 1, Ciudad Autónoma de Buenos Aires" }],
};
const respond = (body: unknown, ok = true) =>
  (async () => ({ ok, json: async () => body })) as unknown as typeof fetch;

describe("usuarios/georef (RN-068: validar direcciones de Capital)", () => {
  it("reconoce las formas de escribir Capital", () => {
    for (const city of ["CABA", "C.A.B.A.", " caba ", "Capital Federal", "Ciudad de Buenos Aires", "Ciudad Autónoma de Buenos Aires"]) {
      expect(isCabaCityText(city)).toBe(true);
    }
    for (const city of ["Rosario", "Buenos Aires", "La Plata", "Palermo"]) {
      expect(isCabaCityText(city)).toBe(false);
    }
  });

  it("consulta la dirección solo dentro de Capital", () => {
    const q = buildGeorefQuery(corrientes);
    expect(q.get("direccion")).toBe("Av. Corrientes 1234");
    expect(q.get("provincia")).toBe("02");
    expect(q.get("max")).toBe("1");
  });

  it("interpreta las respuestas de Georef", () => {
    expect(interpretGeorefResponse(found)).toEqual({
      status: "verified",
      provinceId: "02",
      label: "AV CORRIENTES 1234, Comuna 1, Ciudad Autónoma de Buenos Aires",
    });
    expect(interpretGeorefResponse({ cantidad: 0, direcciones: [] })).toEqual({ status: "not_found" });
    // Un formato que no esperamos no es culpa del cliente: queda sin verificar.
    expect(interpretGeorefResponse({ error: "algo" })).toEqual({ status: "unverified" });
    expect(interpretGeorefResponse(null)).toEqual({ status: "unverified" });
  });

  it("verifica una dirección de Capital", async () => {
    expect(await verifyAddress(corrientes, respond(found))).toMatchObject({ status: "verified" });
    expect(await verifyAddress(corrientes, respond({ direcciones: [] }))).toEqual({ status: "not_found" });
  });

  it("si Georef falla o tarda, la dirección queda sin verificar", async () => {
    expect(await verifyAddress(corrientes, respond({}, false))).toEqual({ status: "unverified" });
    const failing = (async () => {
      throw new Error("timeout");
    }) as unknown as typeof fetch;
    expect(await verifyAddress(corrientes, failing)).toEqual({ status: "unverified" });
  });

  it("no consulta direcciones fuera de Capital", async () => {
    let called = false;
    const spy = (async () => {
      called = true;
      return { ok: true, json: async () => found };
    }) as unknown as typeof fetch;
    expect(await verifyAddress({ ...corrientes, city: "Rosario" }, spy)).toEqual({ status: "unverified" });
    expect(called).toBe(false);
  });
});
