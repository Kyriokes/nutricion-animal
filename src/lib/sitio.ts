import { headers } from "next/headers";

// Dirección pública del sitio, para armar enlaces que salen afuera (por
// ejemplo, la vuelta desde Mercado Pago). En producción, la dirección fija
// del proyecto en Vercel (no la que manda el navegador, que se podría
// falsear); en local o en vistas previas, la del pedido actual.
export async function siteUrl(): Promise<string> {
  if (process.env.VERCEL_ENV === "production" && process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
