import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildPreference,
  interpretPayment,
  parseSignatureHeader,
  paymentMode,
  PaymentSchema,
  verifyWebhookSignature,
  webhookManifest,
} from "./mercadopago";

const SECRET = "clave-de-prueba";
const sign = (manifest: string) => createHmac("sha256", SECRET).update(manifest).digest("hex");

describe("pedidos/mercadopago: firma de los avisos (webhooks)", () => {
  it("lee el encabezado x-signature", () => {
    expect(parseSignatureHeader("ts=1704908010,v1=abc123")).toEqual({ ts: "1704908010", v1: "abc123" });
    expect(parseSignatureHeader(" ts = 1 , v1 = x ")).toEqual({ ts: "1", v1: "x" });
    expect(parseSignatureHeader("basura")).toBeNull();
    expect(parseSignatureHeader(null)).toBeNull();
  });

  it("arma el texto firmado como indica Mercado Pago", () => {
    expect(webhookManifest({ dataId: "123", requestId: "req-1", ts: "1704908010" })).toBe(
      "id:123;request-id:req-1;ts:1704908010;",
    );
    // Los ids con letras van en minúscula.
    expect(webhookManifest({ dataId: "ORD01AB", requestId: "r", ts: "1" })).toBe("id:ord01ab;request-id:r;ts:1;");
  });

  it("acepta un aviso firmado con la clave y rechaza uno alterado o sin firma", () => {
    const manifest = "id:123;request-id:req-1;ts:1704908010;";
    const header = `ts=1704908010,v1=${sign(manifest)}`;
    const input = { signature: header, requestId: "req-1", dataId: "123", secret: SECRET };
    expect(verifyWebhookSignature(input)).toBe(true);
    expect(verifyWebhookSignature({ ...input, dataId: "124" })).toBe(false);
    expect(verifyWebhookSignature({ ...input, secret: "otra" })).toBe(false);
    expect(verifyWebhookSignature({ ...input, signature: null })).toBe(false);
    expect(verifyWebhookSignature({ ...input, requestId: null })).toBe(false);
    expect(verifyWebhookSignature({ ...input, signature: "ts=1704908010,v1=corta" })).toBe(false);
  });
});

describe("pedidos/mercadopago: cobro de un pedido (RN-067)", () => {
  const order = {
    id: "9f1c2a3b-4d5e-4f60-8a7b-1c2d3e4f5a6b",
    items: [
      { name: "Croquetas de pollo", unitPrice: 12500.5, quantity: 2 },
      { name: "Snack", unitPrice: 0.1, quantity: 3 },
    ],
    shippingCost: 3000,
    carrier: "Mensajería Mandrake",
    reservedUntil: new Date("2026-10-11T12:30:00Z"),
  };

  it("lista los productos y el envío en pesos, con el número de pedido como referencia", () => {
    const p = buildPreference(order, "https://nutricion-animal.vercel.app");
    expect(p.items).toEqual([
      { id: expect.any(String), title: "Croquetas de pollo", quantity: 2, unit_price: 12500.5, currency_id: "ARS" },
      { id: expect.any(String), title: "Snack", quantity: 3, unit_price: 0.1, currency_id: "ARS" },
      { id: "envio", title: "Envío (Mensajería Mandrake)", quantity: 1, unit_price: 3000, currency_id: "ARS" },
    ]);
    expect(p.external_reference).toBe(order.id);
  });

  it("vence con la reserva y solo admite medios de pago instantáneos", () => {
    const p = buildPreference(order, "https://nutricion-animal.vercel.app");
    expect(p.expires).toBe(true);
    // 5 minutos antes que la reserva: un pago aprobado al límite llega con el stock todavía reservado.
    expect(p.expiration_date_to).toBe("2026-10-11T12:25:00.000Z");
    expect(p.payment_methods.excluded_payment_types).toEqual([{ id: "ticket" }, { id: "atm" }]);
  });

  it("en el sitio publicado vuelve solo al pedido y recibe avisos; en local, sin avisos", () => {
    const prod = buildPreference(order, "https://nutricion-animal.vercel.app");
    const back = `https://nutricion-animal.vercel.app/pedidos/${order.id}`;
    expect(prod.back_urls).toEqual({ success: back, failure: back, pending: back });
    expect(prod.auto_return).toBe("approved");
    expect(prod.notification_url).toBe("https://nutricion-animal.vercel.app/api/mercadopago/webhook");

    const local = buildPreference(order, "http://localhost:3000");
    expect(local.back_urls.success).toBe(`http://localhost:3000/pedidos/${order.id}`);
    expect(local).not.toHaveProperty("auto_return");
    expect(local).not.toHaveProperty("notification_url");
  });
});

describe("pedidos/mercadopago: qué hacer con un pago", () => {
  const payment = PaymentSchema.parse({
    id: 1234567,
    status: "approved",
    external_reference: "9f1c2a3b-4d5e-4f60-8a7b-1c2d3e4f5a6b",
    transaction_amount: 28001.3,
    currency_id: "ARS",
  });
  const order = {
    id: "9f1c2a3b-4d5e-4f60-8a7b-1c2d3e4f5a6b",
    status: "pending_payment" as const,
    total: 28001.3,
    paymentRef: null,
  };

  it("aprobado y con el monto del pedido: pagado", () => {
    expect(interpretPayment(payment, order)).toEqual({ action: "paid", paymentRef: "1234567" });
  });

  it("rechazado: el pedido sigue esperando el pago (el cliente puede reintentar hasta que venza la reserva)", () => {
    expect(interpretPayment({ ...payment, status: "rejected" }, order)).toEqual({ action: "payment_failed" });
    expect(interpretPayment({ ...payment, status: "cancelled" }, order)).toEqual({ action: "payment_failed" });
  });

  it("todavía en proceso: no cambia nada", () => {
    expect(interpretPayment({ ...payment, status: "in_process" }, order)).toEqual({ action: "ignore" });
    expect(interpretPayment({ ...payment, status: "pending" }, order)).toEqual({ action: "ignore" });
  });

  it("de otro pedido, en otra moneda o por otro monto: se ignora y se avisa", () => {
    expect(interpretPayment({ ...payment, external_reference: "otro" }, order)).toEqual({ action: "mismatch" });
    expect(interpretPayment({ ...payment, currency_id: "USD" }, order)).toEqual({ action: "mismatch" });
    expect(interpretPayment({ ...payment, transaction_amount: 1 }, order)).toEqual({ action: "mismatch" });
  });

  it("aprobado sobre un pedido cancelado o rechazado: reembolso pendiente", () => {
    for (const status of ["cancelled", "rejected"] as const) {
      expect(interpretPayment(payment, { ...order, status })).toEqual({ action: "refund_needed", paymentRef: "1234567" });
    }
  });

  it("aprobado sobre un pedido ya pagado: el mismo pago no cambia nada; otro pago es un cobro doble", () => {
    const paid = { ...order, status: "paid" as const, paymentRef: "1234567" };
    expect(interpretPayment(payment, paid)).toEqual({ action: "ignore" });
    expect(interpretPayment(payment, { ...paid, paymentRef: "999" })).toEqual({
      action: "refund_needed",
      paymentRef: "1234567",
    });
  });

  it("devuelto, contracargo o en disputa sobre el pago del pedido: revisar antes de enviar", () => {
    const paid = { ...order, status: "preparing" as const, paymentRef: "1234567" };
    for (const status of ["refunded", "charged_back", "in_mediation"]) {
      expect(interpretPayment({ ...payment, status }, paid)).toEqual({
        action: "payment_reversed",
        paymentRef: "1234567",
        status,
      });
    }
    // De otro pago (por ejemplo, el cobro doble ya devuelto): no afecta al pedido.
    expect(interpretPayment({ ...payment, status: "refunded" }, { ...paid, paymentRef: "999" })).toEqual({
      action: "ignore",
    });
  });
});

describe("pedidos/mercadopago: modo de pago (RN-067, DT-055)", () => {
  it("con el token de Mercado Pago cargado, se paga con Mercado Pago", () => {
    expect(paymentMode({ MERCADOPAGO_ACCESS_TOKEN: "TEST-x", NODE_ENV: "production" })).toBe("mercadopago");
  });

  it("sin token: pago de prueba en desarrollo o si se activa; si no, no hay pago", () => {
    expect(paymentMode({ NODE_ENV: "development" })).toBe("simulated");
    expect(paymentMode({ NODE_ENV: "production", PAYMENTS_SIMULATED: "true" })).toBe("simulated");
    expect(paymentMode({ NODE_ENV: "production" })).toBe("unavailable");
  });
});
