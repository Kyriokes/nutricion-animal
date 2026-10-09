"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { ORDER_STATUSES } from "@/modules/pedidos/estados";
import { transitionOrderByAdmin, type TransitionError } from "@/modules/pedidos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type AdminOrderActionResult = { ok: true } | { ok: false; message: string };

const ERRORS: Record<TransitionError, string> = {
  not_found: "No encontramos ese pedido.",
  expired: "La reserva del pedido venció sin pago y se canceló.",
  invalid_transition: "El pedido cambió de estado mientras tanto. Revisalo y probá de nuevo.",
};

// VA-04, RN-065: el admin avanza un pedido o lo cancela antes del envío.
export async function changeOrderStatusAction(orderId: unknown, to: unknown): Promise<AdminOrderActionResult> {
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "order.manage")) {
    return { ok: false, message: "No tenés permiso para cambiar pedidos." };
  }
  const input = z.object({ orderId: z.uuid(), to: z.enum(ORDER_STATUSES) }).safeParse({ orderId, to });
  if (!input.success) return { ok: false, message: "Datos inválidos." };
  try {
    const r = await transitionOrderByAdmin(actor.id, input.data.orderId, input.data.to);
    if (!r.ok) {
      refresh();
      return { ok: false, message: ERRORS[r.error] };
    }
  } catch {
    return { ok: false, message: "No se pudo cambiar el pedido. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}
