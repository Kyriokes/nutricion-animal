import type { Result } from "@/lib/result";
import { NutritionistApplicationDataSchema, type Application } from "./postulaciones";
import { hasPermission, type Actor } from "./roles";

// RN-029: datos del perfil profesional del nutricionista. Mismas reglas que el
// formulario de postulación (dirección, teléfono, matrícula).
export const ProfessionalProfileSchema = NutritionistApplicationDataSchema.omit({
  kind: true,
});

export type ProfessionalProfile = {
  address: string;
  phone: string;
  licenseNumber: string;
};

// RN-029: al aprobarse una postulación de nutricionista, sus datos pasan al
// perfil profesional. Otras postulaciones no generan perfil.
export function professionalProfileFromApplication(
  application: Application,
): ProfessionalProfile | null {
  if (application.data.kind !== "nutritionist") return null;
  const { address, phone, licenseNumber } = application.data;
  return { address, phone, licenseNumber };
}

// VN-05: el nutricionista edita su perfil profesional.
export function planProfessionalProfileUpdate(input: {
  actor: Actor;
  input: unknown;
}): Result<{ profile: ProfessionalProfile }, "not_allowed" | "invalid"> {
  if (!hasPermission(input.actor.roles, "nutritionist.edit_profile")) {
    return { ok: false, error: "not_allowed" };
  }
  const parsed = ProfessionalProfileSchema.safeParse(input.input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  return { ok: true, profile: parsed.data };
}

export type PublicProfile = {
  userId: string;
  name: string;
  photoUrl: string | null;
  address: string;
  phone: string;
};

// VU-09: lo que ven los clientes. La matrícula es privada (sección 7).
export function toPublicProfile(
  row: PublicProfile & { licenseNumber?: string },
): PublicProfile {
  return {
    userId: row.userId,
    name: row.name,
    photoUrl: row.photoUrl,
    address: row.address,
    phone: row.phone,
  };
}
