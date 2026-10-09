"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { simulatedPaymentsEnabled } from "@/modules/pedidos/pago";
import {
  cancelOrderByCustomer,
  openClaim,
  simulatePayment,
  type TransitionError,
} from "@/modules/pedidos/repositorio";
import {
  CLAIM_WINDOW_HOURS,
  ClaimInputSchema,
  MAX_CLAIMS_PER_ORDER,
  type OpenClaimError,
} from "@/modules/pedidos/reclamos";
import { hasPermission, isSuspended } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type OrderActionResult = { ok: true } | { ok: false; message: string };

const ERRORS: Record<TransitionError, string> = {
  not_found: "No encontramos ese pedido.",
  expired: "Pasaron los 30 minutos de reserva y el pedido se canceló. Podés volver a comprar desde el catálogo.",
  invalid_transition: "El pedido ya no está en un estado que permita hacer esto.",
};

async function customerId(): Promise<string | null> {
  const actor = await getCurrentActor();
  return actor && !isSuspended(actor.roles) ? actor.id : null;
}

// VU-07 (simulada): aprobar o rechazar el pago de prueba de un pedido propio.
export async function simulatePaymentAction(orderId: unknown, approved: unknown): Promise<OrderActionResult> {
  if (!simulatedPaymentsEnabled()) return { ok: false, message: "El pago en línea todavía no está disponible." };
  const id = await customerId();
  if (!id) return { ok: false, message: "Tenés que ingresar para hacer esto." };
  const input = z.object({ orderId: z.uuid(), approved: z.boolean() }).safeParse({ orderId, approved });
  if (!input.success) return { ok: false, message: "Datos inválidos." };
  try {
    const r = await simulatePayment(id, input.data.orderId, input.data.approved);
    if (!r.ok) return { ok: false, message: ERRORS[r.error] };
  } catch {
    return { ok: false, message: "No se pudo registrar el pago. Probá de nuevo." };
  }
  return { ok: true };
}

// RN-065: el cliente cancela su pedido antes del envío.
export async function cancelOrderAction(orderId: unknown): Promise<OrderActionResult> {
  const id = await customerId();
  if (!id) return { ok: false, message: "Tenés que ingresar para hacer esto." };
  const order = z.uuid().safeParse(orderId);
  if (!order.success) return { ok: false, message: "Datos inválidos." };
  try {
    const r = await cancelOrderByCustomer(id, order.data);
    if (!r.ok) return { ok: false, message: ERRORS[r.error] };
  } catch {
    return { ok: false, message: "No se pudo cancelar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}

const CLAIM_ERRORS: Record<OpenClaimError | "not_found", string> = {
  not_found: "No encontramos ese pedido.",
  not_allowed: "Este pedido no admite reclamos.",
  window_closed: `Pasaron más de ${CLAIM_WINDOW_HOURS} horas desde que recibiste el pedido.`,
  too_many: `Llegaste al máximo de ${MAX_CLAIMS_PER_ORDER} reclamos para este pedido.`,
};

// RN-066: el cliente abre un reclamo sobre su pedido.
export async function openClaimAction(orderId: unknown, input: unknown): Promise<OrderActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return { ok: false, message: "Tenés que ingresar para hacer esto." };
  if (!hasPermission(actor.roles, "claim.open")) {
    return { ok: false, message: "Tu cuenta no puede abrir reclamos." };
  }
  const order = z.uuid().safeParse(orderId);
  const claim = ClaimInputSchema.safeParse(input);
  if (!order.success) return { ok: false, message: "Datos inválidos." };
  if (!claim.success) return { ok: false, message: claim.error.issues[0]?.message ?? "Datos inválidos." };
  try {
    const r = await openClaim(actor.id, order.data, claim.data.description);
    if (!r.ok) return { ok: false, message: CLAIM_ERRORS[r.error] };
  } catch {
    return { ok: false, message: "No se pudo enviar el reclamo. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}
