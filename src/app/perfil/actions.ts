"use server";

import { refresh } from "next/cache";
import { ApplicationDataSchema } from "@/modules/usuarios/postulaciones";
import { z } from "zod";
import { AddressSchema, MAX_ADDRESSES } from "@/modules/usuarios/direcciones";
import { planProfessionalProfileUpdate } from "@/modules/usuarios/perfil-profesional";
import {
  addAddress,
  createApplication,
  deleteAddress,
  markDecisionsSeen,
  saveProfessionalProfile,
  updateUserName,
} from "@/modules/usuarios/repositorio";
import { ProfileUpdateSchema } from "@/modules/usuarios/schema";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type ActionResult = { ok: true } | { ok: false; message: string };

const NOT_SIGNED_IN: ActionResult = {
  ok: false,
  message: "Tenés que ingresar para hacer esto.",
};

// VU-01: cambiar el nombre. Cualquier usuario con sesión, incluso bloqueado:
// es su propio dato y no da acceso a nada.
export async function updateNameAction(input: unknown): Promise<ActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const parsed = ProfileUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Nombre inválido." };
  }
  try {
    await updateUserName(actor.id, parsed.data.name);
  } catch {
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}

// VN-05, RN-029: el nutricionista edita su perfil profesional.
export async function saveProfessionalProfileAction(input: unknown): Promise<ActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const plan = planProfessionalProfileUpdate({ actor, input });
  if (!plan.ok) {
    return {
      ok: false,
      message:
        plan.error === "not_allowed"
          ? "Solo un nutricionista puede editar su perfil profesional."
          : "Revisá los datos: dirección, teléfono y matrícula son obligatorios.",
    };
  }
  try {
    await saveProfessionalProfile(actor.id, plan.profile);
  } catch {
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}

// RN-017: agregar una dirección de entrega.
export async function addAddressAction(input: unknown): Promise<ActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const parsed = AddressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Dirección inválida." };
  }
  try {
    const result = await addAddress(actor.id, parsed.data);
    if (!result.ok) {
      return { ok: false, message: `Podés guardar hasta ${MAX_ADDRESSES} direcciones.` };
    }
  } catch {
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}

// RN-017: borrar una dirección propia.
export async function deleteAddressAction(addressId: unknown): Promise<ActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const id = z.uuid().safeParse(addressId);
  if (!id.success) return { ok: false, message: "Dirección inválida." };
  try {
    await deleteAddress(actor.id, id.data);
  } catch {
    return { ok: false, message: "No se pudo borrar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}

// RN-045: el postulante marca como leídos los resultados de sus postulaciones.
export async function markDecisionsSeenAction(): Promise<ActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  try {
    await markDecisionsSeen(actor.id);
  } catch {
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}

const APPLY_ERRORS = {
  blocked: "Tu cuenta no puede postularse.",
  already_has_role: "Ya tenés ese rol.",
  already_pending: "Ya tenés una postulación de ese tipo en revisión.",
} as const;

// RN-024: postularse como nutricionista o proveedor.
export async function submitApplicationAction(input: unknown): Promise<ActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return NOT_SIGNED_IN;
  const parsed = ApplicationDataSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  try {
    const result = await createApplication(actor, parsed.data);
    if (!result.ok) {
      const message =
        result.error in APPLY_ERRORS
          ? APPLY_ERRORS[result.error as keyof typeof APPLY_ERRORS]
          : "No se pudo enviar la postulación.";
      return { ok: false, message };
    }
  } catch {
    return { ok: false, message: "No se pudo enviar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}
