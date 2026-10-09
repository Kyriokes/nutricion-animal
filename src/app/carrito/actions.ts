"use server";

import { z } from "zod";
import { getCatalogProductsByIds } from "@/modules/catalogo/repositorio";
import { CheckoutInputSchema, type CheckoutError } from "@/modules/pedidos/checkout";
import { createOrder } from "@/modules/pedidos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

// VP-07: datos actuales de los productos del carrito (precio, stock, nombre).
// Público: es la misma información que muestra el catálogo.
export async function getCartProductsAction(ids: unknown) {
  const parsed = z.array(z.uuid()).max(100).safeParse(ids);
  if (!parsed.success) return [];
  try {
    const products = await getCatalogProductsByIds(parsed.data);
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      stock: p.stock,
      image: p.image ?? null,
    }));
  } catch {
    return null;
  }
}

export type CheckoutActionResult = { ok: true; orderId: string } | { ok: false; message: string; stale?: boolean };

const CHECKOUT_ERRORS: Record<CheckoutError | "address_not_found", { message: string; stale?: boolean }> = {
  empty: { message: "Tu carrito está vacío." },
  address_not_found: { message: "Elegí una de tus direcciones." },
  out_of_zone: { message: "Esa dirección está fuera de la zona de entrega: por ahora solo enviamos dentro de Capital." },
  stock_changed: { message: "Cambió la disponibilidad de algún producto. Revisá el carrito.", stale: true },
  total_changed: { message: "Cambió un precio o el costo de envío. Revisá el total y confirmá de nuevo.", stale: true },
};

// VP-08, RN-064: confirmar la compra. Crea el pedido, que reserva el stock
// por 30 minutos mientras se paga. `stale`: hay que volver a pedir precios.
export async function createOrderAction(input: unknown): Promise<CheckoutActionResult> {
  const actor = await getCurrentActor();
  if (!actor) return { ok: false, message: "Tenés que ingresar para comprar." };
  if (!hasPermission(actor.roles, "order.create")) return { ok: false, message: "Tu cuenta no puede hacer compras." };
  const parsed = CheckoutInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Revisá el carrito y la dirección." };
  try {
    const r = await createOrder(actor.id, parsed.data);
    return r.ok ? r : { ok: false, ...CHECKOUT_ERRORS[r.error] };
  } catch {
    return { ok: false, message: "No se pudo crear el pedido. Probá de nuevo." };
  }
}
