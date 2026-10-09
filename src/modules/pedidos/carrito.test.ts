import { describe, expect, it } from "vitest";
import { MAX_QUANTITY, addToCart, parseStoredCart, priceCart, setQuantity } from "./carrito";

const A = "550e8400-e29b-41d4-a716-446655440000";
const B = "6ba7b810-9dad-41d1-80b4-00c04fd430c8";

describe("pedidos/carrito (VP-07)", () => {
  it("agrega productos y suma cantidades del mismo producto", () => {
    let cart = addToCart([], A);
    cart = addToCart(cart, A, 2);
    cart = addToCart(cart, B);
    expect(cart).toEqual([
      { productId: A, quantity: 3 },
      { productId: B, quantity: 1 },
    ]);
  });

  it("cambia la cantidad; 0 o menos lo quita; tope máximo", () => {
    const cart = [{ productId: A, quantity: 3 }, { productId: B, quantity: 1 }];
    expect(setQuantity(cart, A, 5)).toEqual([{ productId: A, quantity: 5 }, { productId: B, quantity: 1 }]);
    expect(setQuantity(cart, A, 0)).toEqual([{ productId: B, quantity: 1 }]);
    expect(setQuantity(cart, A, 1000)[0].quantity).toBe(MAX_QUANTITY);
    expect(addToCart([{ productId: A, quantity: MAX_QUANTITY }], A)[0].quantity).toBe(MAX_QUANTITY);
  });

  it("lee lo guardado en el navegador descartando lo inválido", () => {
    expect(
      parseStoredCart([
        { productId: A, quantity: 2 },
        { productId: "no-es-uuid", quantity: 1 },
        { productId: B, quantity: -3 },
        { productId: A, quantity: 1 },
        "basura",
      ]),
    ).toEqual([{ productId: A, quantity: 3 }]);
    expect(parseStoredCart("texto")).toEqual([]);
    expect(parseStoredCart(null)).toEqual([]);
  });

  it("calcula subtotales y total con los precios del servidor", () => {
    const r = priceCart(
      [{ productId: A, quantity: 2 }, { productId: B, quantity: 1 }],
      [
        { id: A, price: 1000.5, stock: 10 },
        { id: B, price: 300, stock: 5 },
      ],
    );
    expect(r.total).toBe(2301);
    expect(r.lines.map((l) => [l.productId, l.quantity, l.subtotal, l.issue])).toEqual([
      [A, 2, 2001, undefined],
      [B, 1, 300, undefined],
    ]);
  });

  it("avisa si un producto ya no está o si no hay stock suficiente", () => {
    const r = priceCart(
      [{ productId: A, quantity: 5 }, { productId: B, quantity: 1 }],
      [{ id: A, price: 100, stock: 2 }],
    );
    expect(r.lines).toEqual([
      { productId: A, quantity: 2, subtotal: 200, issue: "stock_reduced" },
      { productId: B, quantity: 0, subtotal: 0, issue: "unavailable" },
    ]);
    expect(r.total).toBe(200);
    expect(priceCart([{ productId: A, quantity: 1 }], [{ id: A, price: 100, stock: 0 }]).lines[0]).toMatchObject({
      quantity: 0,
      issue: "out_of_stock",
    });
  });
});
