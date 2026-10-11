"use server";

import { z } from "zod";
import { annotateForPets } from "@/modules/catalogo/mascota";
import { getCatalogProductsByIds, getProductFoods } from "@/modules/catalogo/repositorio";
import { listPetProfiles } from "@/modules/mascotas/repositorio";
import { CheckoutInputSchema, MAX_ORDER_LINES, type CheckoutError } from "@/modules/pedidos/checkout";
import { paymentMode } from "@/modules/pedidos/mercadopago";
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

export type CartPetNotes = Record<string, { fitsPets: string[]; warnings: string[] }>;

// RN-039: para cada producto del carrito, para qué mascotas del cliente
// encaja y qué advertencias hay.
async function cartPetNotes(userId: string, productIds: readonly string[]): Promise<CartPetNotes> {
  const [products, foods, pets] = await Promise.all([
    getCatalogProductsByIds(productIds),
    getProductFoods(productIds),
    listPetProfiles(userId),
  ]);
  const petInfo = pets.map((p) => ({ name: p.pet.name, species: p.pet.species, profile: p.profile }));
  return Object.fromEntries(
    products.map((p) => [p.id, annotateForPets({ petTypes: p.petTypes, foods: foods.get(p.id)! }, petInfo)]),
  );
}

// RN-039: notas por mascota del carrito. Sin sesión, ninguna.
export async function getCartPetNotesAction(ids: unknown): Promise<CartPetNotes | null> {
  const parsed = z.array(z.uuid()).max(100).safeParse(ids);
  if (!parsed.success) return null;
  const actor = await getCurrentActor();
  if (!actor) return null;
  try {
    return await cartPetNotes(actor.id, parsed.data);
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
  // Sin forma de pagar, el pedido solo bloquearía stock (DT-055).
  if (paymentMode() === "unavailable") return { ok: false, message: "El pago en línea todavía no está disponible." };
  const parsed = CheckoutInputSchema.safeParse(input);
  if (!parsed.success && parsed.error.issues.some((i) => i.path[0] === "lines" && i.code === "too_big")) {
    return { ok: false, message: `Podés comprar hasta ${MAX_ORDER_LINES} productos distintos por pedido.` };
  }
  if (!parsed.success) return { ok: false, message: "Revisá el carrito y la dirección." };
  try {
    // RN-039: si hay advertencias de alergias, hay que confirmar que se vieron.
    const notes = await cartPetNotes(actor.id, parsed.data.lines.map((l) => l.productId));
    if (Object.values(notes).some((n) => n.warnings.length > 0) && !parsed.data.allergyWarningsAcknowledged) {
      return { ok: false, message: "Marcá que revisaste las advertencias de alergias para confirmar la compra." };
    }
    const r = await createOrder(actor.id, parsed.data);
    return r.ok ? r : { ok: false, ...CHECKOUT_ERRORS[r.error] };
  } catch {
    return { ok: false, message: "No se pudo crear el pedido. Probá de nuevo." };
  }
}
