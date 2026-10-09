"use server";

import { refresh } from "next/cache";
import { ApplicationDataSchema } from "@/modules/usuarios/postulaciones";
import {
  createApplication,
  markDecisionsSeen,
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
