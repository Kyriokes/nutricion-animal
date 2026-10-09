import { z } from "zod";
import { addToCart, MAX_QUANTITY, priceCart, type CartLine } from "./carrito";
import { isInDeliveryZone, type ZoneCheckable } from "./envio";

// VP-08: lo que manda el navegador al confirmar la compra. Solo qué y
// cuánto, la dirección elegida y el total que vio el cliente; los precios se
// toman siempre de la base. Productos repetidos se unen.
export const CheckoutInputSchema = z.object({
  addressId: z.uuid(),
  lines: z
    .array(z.object({ productId: z.uuid(), quantity: z.int().min(1).max(MAX_QUANTITY) }))
    .min(1)
    .max(50)
    .transform((lines) => lines.reduce<CartLine[]>((cart, l) => addToCart(cart, l.productId, l.quantity), [])),
  expectedTotal: z.number().nonnegative().max(1e10),
});

export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

export type OrderItemPlan = { productId: string; name: string; unitPrice: number; quantity: number };

// empty: carrito vacío. out_of_zone: la dirección no está en Capital
// (RN-068). stock_changed: un producto ya no está o no alcanza el stock.
// total_changed: cambió un precio o el envío desde que el cliente lo vio.
export type CheckoutError = "empty" | "out_of_zone" | "stock_changed" | "total_changed";

export type OrderPlan =
  | { ok: true; items: OrderItemPlan[]; subtotal: number; shippingCost: number; total: number }
  | { ok: false; error: CheckoutError };

const cents = (n: number) => Math.round(n * 100);

// RN-062, RN-064, RN-068: arma el pedido con los productos publicados y su
// stock actual. No ajusta nada solo: ante cualquier diferencia con lo que vio
// el cliente, le pide revisar.
export function planOrder(input: {
  lines: readonly CartLine[];
  products: readonly { id: string; name: string; price: number; stock: number }[];
  address: ZoneCheckable;
  shippingCost: number;
  expectedTotal: number;
}): OrderPlan {
  if (input.lines.length === 0) return { ok: false, error: "empty" };
  if (!isInDeliveryZone(input.address)) return { ok: false, error: "out_of_zone" };

  const priced = priceCart(input.lines, input.products);
  if (priced.lines.some((l) => l.issue)) return { ok: false, error: "stock_changed" };

  const totalCents = cents(priced.total) + cents(input.shippingCost);
  if (totalCents !== cents(input.expectedTotal)) return { ok: false, error: "total_changed" };

  const byId = new Map(input.products.map((p) => [p.id, p]));
  return {
    ok: true,
    items: priced.lines.map((l) => {
      const p = byId.get(l.productId)!;
      return { productId: p.id, name: p.name, unitPrice: p.price, quantity: l.quantity };
    }),
    subtotal: priced.total,
    shippingCost: input.shippingCost,
    total: totalCents / 100,
  };
}
