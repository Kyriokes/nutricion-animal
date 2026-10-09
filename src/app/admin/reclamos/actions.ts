"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { ResolveClaimSchema } from "@/modules/pedidos/reclamos";
import { changeClaim } from "@/modules/pedidos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type ClaimActionResult = { ok: true } | { ok: false; message: string };

const ERRORS = {
  not_found: "No encontramos ese reclamo.",
  invalid_transition: "El reclamo cambió mientras tanto. Revisalo y probá de nuevo.",
} as const;

async function adminId(): Promise<string | null> {
  const actor = await getCurrentActor();
  return actor && hasPermission(actor.roles, "claim.manage") ? actor.id : null;
}

async function run(change: Parameters<typeof changeClaim>[2], claimId: string, by: string): Promise<ClaimActionResult> {
  try {
    const r = await changeClaim(by, claimId, change);
    refresh();
    return r.ok ? r : { ok: false, message: ERRORS[r.error] };
  } catch {
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
}

// RN-066: pasar el reclamo a revisión.
export async function reviewClaimAction(claimId: unknown): Promise<ClaimActionResult> {
  const by = await adminId();
  if (!by) return { ok: false, message: "No tenés permiso para gestionar reclamos." };
  const id = z.uuid().safeParse(claimId);
  if (!id.success) return { ok: false, message: "Datos inválidos." };
  return run({ to: "in_review" }, id.data, by);
}

// RN-066: resolver el reclamo con una resolución y una nota opcional.
export async function resolveClaimAction(claimId: unknown, input: unknown): Promise<ClaimActionResult> {
  const by = await adminId();
  if (!by) return { ok: false, message: "No tenés permiso para gestionar reclamos." };
  const id = z.uuid().safeParse(claimId);
  const data = ResolveClaimSchema.safeParse(input);
  if (!id.success) return { ok: false, message: "Datos inválidos." };
  if (!data.success) return { ok: false, message: data.error.issues[0]?.message ?? "Datos inválidos." };
  return run({ to: "resolved", ...data.data }, id.data, by);
}
