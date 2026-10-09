import { z } from "zod";
import type { Address } from "./direcciones";

// RN-068: las direcciones se validan con Georef, la API pública de
// normalización geográfica del Gobierno argentino (gratuita, sin cuenta).
// Solo se consultan las de Capital, que es la única zona de entrega: fuera de
// Capital Georef no aporta nada para decidir el envío.

export const GEOREF_URL = "https://apis.datos.gob.ar/georef/api/direcciones";
export const CABA_PROVINCE_ID = "02";
const TIMEOUT_MS = 3000;

// "verified": Georef la encontró. "not_found": Georef respondió que no existe
// (por ejemplo, una altura que no hay). "unverified": no se pudo consultar
// (Georef caído o lento) o no es de Capital.
export type AddressVerification =
  | { status: "verified"; provinceId: string; label: string }
  | { status: "not_found" }
  | { status: "unverified" };

export type AddressVerificationStatus = AddressVerification["status"];

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[.,]/g, "")
    .replace(/\s+/g, " ")
    .trim();

const CABA_NAMES = new Set([
  "caba",
  "capital",
  "capital federal",
  "ciudad de buenos aires",
  "ciudad autonoma de buenos aires",
]);

// La ciudad escrita a mano es Capital ("CABA", "C.A.B.A.", "Capital Federal"...).
export function isCabaCityText(city: string): boolean {
  return CABA_NAMES.has(normalize(city));
}

export function buildGeorefQuery(address: Pick<Address, "street" | "number">): URLSearchParams {
  return new URLSearchParams({
    direccion: `${address.street} ${address.number}`,
    provincia: CABA_PROVINCE_ID,
    max: "1",
    aplanar: "true",
    campos: "provincia.id,nomenclatura",
  });
}

const GeorefResponse = z.object({
  direcciones: z.array(z.object({ provincia_id: z.string(), nomenclatura: z.string() })),
});

// Interpreta la respuesta de Georef. Un formato inesperado cuenta como "no se
// pudo consultar", no como "no existe": no culpamos al cliente por un cambio
// de la API.
export function interpretGeorefResponse(json: unknown): AddressVerification {
  const parsed = GeorefResponse.safeParse(json);
  if (!parsed.success) return { status: "unverified" };
  const first = parsed.data.direcciones[0];
  if (!first) return { status: "not_found" };
  return { status: "verified", provinceId: first.provincia_id, label: first.nomenclatura };
}

export async function verifyAddress(
  address: Pick<Address, "city" | "street" | "number">,
  fetchImpl: typeof fetch = fetch,
): Promise<AddressVerification> {
  if (!isCabaCityText(address.city)) return { status: "unverified" };
  try {
    const res = await fetchImpl(`${GEOREF_URL}?${buildGeorefQuery(address)}`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return { status: "unverified" };
    return interpretGeorefResponse(await res.json());
  } catch {
    return { status: "unverified" };
  }
}
