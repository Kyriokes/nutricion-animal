import { describe, expect, it } from "vitest";
import { CheckoutInputSchema, planOrder } from "./checkout";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const products = [
  { id: A, name: "Croquetas de pollo", price: 12500.5, stock: 10 },
  { id: B, name: "Snack de hígado", price: 0.1, stock: 3 },
];
const caba = { city: "CABA", verification: "verified" as const, provinceId: "02" };

const base = {
  lines: [
    { productId: A, quantity: 2 },
    { productId: B, quantity: 3 },
  ],
  products,
  address: caba,
  shippingCost: 3000,
  expectedTotal: 28001.3,
};

describe("pedidos/checkout (RN-062, RN-064, RN-068: armar el pedido)", () => {
  it("arma el pedido con los precios del servidor, más el envío", () => {
    expect(planOrder(base)).toEqual({
      ok: true,
      items: [
        { productId: A, name: "Croquetas de pollo", unitPrice: 12500.5, quantity: 2 },
        { productId: B, name: "Snack de hígado", unitPrice: 0.1, quantity: 3 },
      ],
      // En centavos no aparece 0,30000000000000004.
      subtotal: 25001.3,
      shippingCost: 3000,
      total: 28001.3,
    });
  });

  it("no arma un pedido vacío", () => {
    expect(planOrder({ ...base, lines: [] })).toEqual({ ok: false, error: "empty" });
  });

  it("solo entrega en Capital (RN-068)", () => {
    expect(
      planOrder({ ...base, address: { city: "Rosario", verification: "unverified", provinceId: null } }),
    ).toEqual({ ok: false, error: "out_of_zone" });
    expect(
      planOrder({ ...base, address: { city: "CABA", verification: "not_found", provinceId: null } }),
    ).toEqual({ ok: false, error: "out_of_zone" });
  });

  it("si un producto ya no está o no alcanza el stock, pide revisar el carrito en vez de ajustar solo", () => {
    expect(planOrder({ ...base, products: [products[0]] })).toEqual({ ok: false, error: "stock_changed" });
    expect(
      planOrder({ ...base, products: [products[0], { ...products[1], stock: 2 }] }),
    ).toEqual({ ok: false, error: "stock_changed" });
  });

  it("si el total cambió desde que el cliente lo vio (precio o envío), pide confirmarlo de nuevo", () => {
    expect(planOrder({ ...base, shippingCost: 3500 })).toEqual({ ok: false, error: "total_changed" });
    expect(
      planOrder({ ...base, products: [{ ...products[0], price: 13000 }, products[1]] }),
    ).toEqual({ ok: false, error: "total_changed" });
  });
});

describe("pedidos/checkout: datos que manda el navegador", () => {
  it("valida dirección, productos, cantidades y total", () => {
    const ok = CheckoutInputSchema.safeParse({ addressId: A, lines: base.lines, expectedTotal: 28001.3 });
    expect(ok.success).toBe(true);
    for (const bad of [
      { addressId: "x", lines: base.lines, expectedTotal: 1 },
      { addressId: A, lines: [{ productId: A, quantity: 0 }], expectedTotal: 1 },
      { addressId: A, lines: [{ productId: A, quantity: 100 }], expectedTotal: 1 },
      { addressId: A, lines: [], expectedTotal: 1 },
      { addressId: A, lines: base.lines, expectedTotal: -1 },
    ]) {
      expect(CheckoutInputSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("une productos repetidos", () => {
    const parsed = CheckoutInputSchema.parse({
      addressId: A,
      lines: [
        { productId: A, quantity: 1 },
        { productId: A, quantity: 2 },
      ],
      expectedTotal: 1,
    });
    expect(parsed.lines).toEqual([{ productId: A, quantity: 3 }]);
  });
});
