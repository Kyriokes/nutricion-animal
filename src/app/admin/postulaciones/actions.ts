"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { decideApplicationInDb } from "@/modules/usuarios/repositorio";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type DecideResult = { ok: true } | { ok: false; message: string };

const DecisionSchema = z.object({
  applicationId: z.uuid(),
  decision: z.enum(["approve", "reject"]),
  note: z.string().optional(),
});

const ERRORS: Record<string, string> = {
  not_allowed: "No tenés permiso para decidir postulaciones.",
  self_decision: "No podés decidir tu propia postulación.",
  invalid_note: "Escribí un motivo corto (hasta 200 caracteres).",
  blocked: "La cuenta del postulante está suspendida: no se puede aprobar. Podés rechazarla.",
  already_decided: "Esa postulación ya fue decidida.",
  not_found: "La postulación no existe.",
};

// VA-06, RN-024 y RN-043: aprobar o rechazar. El permiso se verifica en el
// servidor (application.decide: admin y auditor) dentro de las reglas.
export async function decideAction(input: unknown): Promise<DecideResult> {
  const actor = await getCurrentActor();
  if (!actor) return { ok: false, message: "Tenés que ingresar." };
  const parsed = DecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Datos inválidos." };

  try {
    const result = await decideApplicationInDb({ ...parsed.data, decider: actor });
    if (!result.ok) {
      return { ok: false, message: ERRORS[result.error] ?? "No se pudo decidir." };
    }
  } catch {
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}
