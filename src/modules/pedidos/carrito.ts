import { z } from "zod";

// VP-07: el carrito guarda solo qué productos y cuántos. Precio y stock se
// toman siempre del servidor al mostrarlo (priceCart), nunca del navegador.
export type CartLine = { productId: string; quantity: number };

export const MAX_QUANTITY = 99;

const clamp = (n: number) => Math.min(MAX_QUANTITY, Math.max(0, Math.floor(n)));

export function addToCart(cart: readonly CartLine[], productId: string, quantity = 1): CartLine[] {
  const existing = cart.find((l) => l.productId === productId);
  if (!existing) return [...cart, { productId, quantity: clamp(quantity) }];
  return cart.map((l) =>
    l.productId === productId ? { ...l, quantity: clamp(l.quantity + quantity) } : l,
  );
}

// Cantidad nueva; 0 o menos quita el producto.
export function setQuantity(cart: readonly CartLine[], productId: string, quantity: number): CartLine[] {
  const q = clamp(quantity);
  if (q === 0) return cart.filter((l) => l.productId !== productId);
  return cart.map((l) => (l.productId === productId ? { ...l, quantity: q } : l));
}

const StoredLineSchema = z.object({
  productId: z.uuid(),
  quantity: z.number().int().min(1),
});

// Lo guardado en el navegador puede estar viejo o manipulado: se descarta lo
// inválido y se unifican productos repetidos.
export function parseStoredCart(stored: unknown): CartLine[] {
  if (!Array.isArray(stored)) return [];
  return stored.reduce<CartLine[]>((cart, item) => {
    const line = StoredLineSchema.safeParse(item);
    return line.success ? addToCart(cart, line.data.productId, line.data.quantity) : cart;
  }, []);
}

export type PricedLine = CartLine & {
  subtotal: number;
  // unavailable: ya no está en el catálogo; out_of_stock: sin stock;
  // stock_reduced: se ajustó la cantidad al stock disponible.
  issue?: "unavailable" | "out_of_stock" | "stock_reduced";
};

// Subtotales y total con los precios y el stock actuales del servidor. Se
// calcula en centavos para no arrastrar errores de punto flotante.
export function priceCart(
  cart: readonly CartLine[],
  products: readonly { id: string; price: number; stock: number }[],
): { lines: PricedLine[]; total: number } {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines = cart.map((line): PricedLine => {
    const product = byId.get(line.productId);
    if (!product) return { ...line, quantity: 0, subtotal: 0, issue: "unavailable" };
    if (product.stock === 0) return { ...line, quantity: 0, subtotal: 0, issue: "out_of_stock" };
    const quantity = Math.min(line.quantity, product.stock);
    const subtotal = (Math.round(product.price * 100) * quantity) / 100;
    return {
      productId: line.productId,
      quantity,
      subtotal,
      ...(quantity < line.quantity ? { issue: "stock_reduced" as const } : {}),
    };
  });
  const totalCents = lines.reduce((sum, l) => sum + Math.round(l.subtotal * 100), 0);
  return { lines, total: totalCents / 100 };
}
