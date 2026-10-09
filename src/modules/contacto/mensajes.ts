import { z } from "zod";

// RN-080: mensaje del formulario de contacto. Lo puede mandar cualquiera,
// con o sin sesión (también una cuenta suspendida, RN-046 y RN-082).
export const ContactMessageSchema = z.object({
  name: z.string().trim().min(1, "Escribí tu nombre.").max(80, "El nombre: hasta 80 caracteres."),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Revisá el email.").max(254, "Revisá el email.")),
  subject: z.string().trim().min(1, "Contanos el motivo.").max(120, "El motivo: hasta 120 caracteres."),
  message: z
    .string()
    .trim()
    .min(10, "El mensaje es muy corto (al menos 10 caracteres).")
    .max(4000, "El mensaje: hasta 4000 caracteres."),
});

export type ContactMessage = z.infer<typeof ContactMessageSchema>;

// Campo oculto que una persona no ve ni completa; los bots que llenan todo,
// sí. Si viene con algo, el mensaje se descarta en silencio.
export function isSpamTrap(input: { website?: unknown }): boolean {
  return typeof input.website === "string" && input.website.trim() !== "";
}

// Freno al abuso, sin servicios externos:
// - hasta 5 mensajes por hora por remitente: con sesión, por cuenta (así
//   nadie puede agotarle el cupo a otro escribiendo su email, por ejemplo a
//   una cuenta suspendida, cuyo único canal es este); sin sesión, por email;
// - sin sesión, además, un tope total por hora para frenar envíos masivos
//   con emails inventados. No afecta a quien escribe con su cuenta.
export const MAX_MESSAGES_PER_HOUR = 5;
export const MAX_ANONYMOUS_PER_HOUR = 50;

export function canSendMore(sent: { bySender: number; anonymousTotal: number }, signedIn: boolean): boolean {
  if (sent.bySender >= MAX_MESSAGES_PER_HOUR) return false;
  return signedIn || sent.anonymousTotal < MAX_ANONYMOUS_PER_HOUR;
}

// RN-081: email y WhatsApp de contacto. Datos de prueba en la primera versión.
export const CONTACT_CHANNELS = {
  email: "contacto@nutricion-animal.test",
  whatsapp: "5491100000000",
} as const;

export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}
