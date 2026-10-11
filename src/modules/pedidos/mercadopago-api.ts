import { z } from "zod";
import { PaymentSchema, type buildPreference, type Payment } from "./mercadopago";

// RN-067: llamadas a la API de Mercado Pago, sin librería (DT-062). Solo
// servidor: el Access Token es secreto y nunca llega al navegador. Cada
// respuesta se valida con Zod.

const API = "https://api.mercadopago.com";
const TIMEOUT_MS = 10_000;

function token(): string {
  const t = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!t) throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");
  return t;
}

async function call(path: string, init: RequestInit = {}): Promise<unknown> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, "Content-Type": "application/json", ...init.headers },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new MercadoPagoError(res.status, path);
  return res.json();
}

// Error de la API con su código HTTP: 404 es "no existe" (no tiene sentido
// reintentar); 5xx o un corte, una falla pasajera.
export class MercadoPagoError extends Error {
  constructor(
    readonly status: number,
    path: string,
  ) {
    super(`Mercado Pago respondió ${status} en ${path}`);
  }
}

const PreferenceResponse = z.object({ id: z.string(), init_point: z.url() });

// Crea el cobro y devuelve la dirección de pago de Mercado Pago.
export async function createPreference(body: ReturnType<typeof buildPreference>): Promise<string> {
  const json = await call("/checkout/preferences", { method: "POST", body: JSON.stringify(body) });
  return PreferenceResponse.parse(json).init_point;
}

// Consulta un pago. Es la única fuente de verdad sobre su estado y su monto.
export async function getPayment(paymentId: string): Promise<Payment> {
  if (!/^\d+$/.test(paymentId)) throw new Error("Id de pago inválido");
  return PaymentSchema.parse(await call(`/v1/payments/${paymentId}`));
}
