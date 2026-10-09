"use server";

import { ContactMessageSchema, isSpamTrap, MAX_MESSAGES_PER_HOUR } from "@/modules/contacto/mensajes";
import { saveContactMessage } from "@/modules/contacto/repositorio";
import { getCurrentUser } from "@/modules/usuarios/sesion";

export type ContactActionResult = { ok: true } | { ok: false; message: string };

// RN-080, RN-082: enviar un mensaje de contacto. Lo puede usar cualquiera,
// incluso una cuenta suspendida (es su forma de llegar a soporte, RN-046).
export async function sendContactMessageAction(input: unknown): Promise<ContactActionResult> {
  const data = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  // Un bot completó el campo trampa: se responde "listo" sin guardar nada.
  if (isSpamTrap(data)) return { ok: true };
  const parsed = ContactMessageSchema.safeParse(data);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Revisá los datos." };
  try {
    const user = await getCurrentUser();
    const r = await saveContactMessage(parsed.data, user?.id ?? null);
    if (!r.ok) {
      return {
        ok: false,
        message: `Ya recibimos ${MAX_MESSAGES_PER_HOUR} mensajes tuyos en la última hora. Probá más tarde.`,
      };
    }
  } catch {
    return { ok: false, message: "No se pudo enviar. Probá de nuevo." };
  }
  return { ok: true };
}
