import {
  CABA_PROVINCE_ID,
  isCabaCityText,
  type AddressVerificationStatus,
} from "@/modules/usuarios/georef";

// RN-068: envío simulado de la primera versión. El repartidor es ficticio.
export const CARRIER = "Mensajería Mandrake";

export type ZoneCheckable = {
  city: string;
  verification: AddressVerificationStatus;
  provinceId: string | null;
};

// RN-068: solo se entrega en Capital. Manda lo que dijo Georef; si no se pudo
// consultar, se acepta la ciudad escrita como Capital.
export function isInDeliveryZone(a: ZoneCheckable): boolean {
  if (a.verification === "verified") return a.provinceId === CABA_PROVINCE_ID;
  if (a.verification === "not_found") return false;
  return isCabaCityText(a.city);
}

// RN-068: cómo se muestra cada dirección en el perfil. "canVerify": volver a
// consultar Georef puede cambiar el resultado (solo si no se pudo consultar).
export function describeAddressZone(a: ZoneCheckable): { ok: boolean; text: string; canVerify: boolean } {
  if (a.verification === "verified" && isInDeliveryZone(a)) {
    return { ok: true, text: "Verificada: dentro de la zona de entrega", canVerify: false };
  }
  if (a.verification === "not_found") {
    return {
      ok: false,
      text: "No encontramos esta dirección en Capital: revisá la calle y la altura y cargala de nuevo",
      canVerify: false,
    };
  }
  if (!isInDeliveryZone(a)) {
    return { ok: false, text: "Fuera de la zona de entrega: por ahora solo enviamos dentro de Capital", canVerify: false };
  }
  return { ok: true, text: "Sin verificar", canVerify: true };
}
