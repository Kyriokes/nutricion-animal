import { parseArgentineNumber } from "@/lib/numeros";
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

// RN-068: costo fijo por pedido. Lo cambia el Administrador (VA-08); este es
// el valor de prueba mientras no lo haya cargado.
export const DEFAULT_SHIPPING_COST = 3000;
export const MAX_SHIPPING_COST = 1_000_000;

export function parseShippingCost(text: string): { ok: true; value: number } | { ok: false; message: string } {
  const n = parseArgentineNumber(text, true);
  // Los decimales se cuentan en el texto: con flotantes, 0,29 × 100 no da 29 exacto.
  if (n === undefined || n === "invalid" || n <= 0 || /,\d{3,}$/.test(text.trim())) {
    return { ok: false, message: "Escribí un monto mayor a 0, con hasta dos decimales (ej.: 3.500 o 2500,50)" };
  }
  if (n > MAX_SHIPPING_COST) return { ok: false, message: "El costo de envío no puede superar $1.000.000" };
  return { ok: true, value: n };
}
