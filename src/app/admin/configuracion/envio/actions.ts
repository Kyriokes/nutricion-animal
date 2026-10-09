"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { parseShippingCost } from "@/modules/pedidos/envio";
import { saveShippingCost } from "@/modules/pedidos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type ShippingActionResult = { ok: true } | { ok: false; message: string };

// VA-08, RN-068: cambiar el costo fijo de envío. Solo quien tiene settings.manage.
export async function saveShippingCostAction(input: unknown): Promise<ShippingActionResult> {
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "settings.manage")) {
    return { ok: false, message: "No tenés permiso para cambiar la configuración." };
  }
  const text = z.string().max(20).safeParse(input);
  if (!text.success) return { ok: false, message: "Monto inválido." };
  const cost = parseShippingCost(text.data);
  if (!cost.ok) return cost;
  try {
    await saveShippingCost(cost.value, actor.id);
  } catch {
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
  refresh();
  return { ok: true };
}
