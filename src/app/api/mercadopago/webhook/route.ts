import { verifyWebhookSignature } from "@/modules/pedidos/mercadopago";
import { getPayment } from "@/modules/pedidos/mercadopago-api";
import { processPayment } from "@/modules/pedidos/repositorio";

// RN-067: aviso automático de Mercado Pago cuando cambia un pago. Así el
// pedido pasa a "Pagado" aunque el cliente cierre la pestaña antes de volver.
// - Solo se acepta si la firma coincide con la clave secreta (si no, 401).
// - No se confía en el contenido del aviso: se consulta el pago a Mercado Pago.
// - Responde 200 rápido; si algo falla, 500 y Mercado Pago reintenta.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "";

  const valid = verifyWebhookSignature({
    signature: request.headers.get("x-signature"),
    requestId: request.headers.get("x-request-id"),
    dataId,
    secret: process.env.MERCADOPAGO_WEBHOOK_SECRET ?? "",
  });
  if (!valid) return new Response(null, { status: 401 });

  // Solo interesan los pagos (los demás eventos no están activados).
  if (type !== "payment" || !/^\d+$/.test(dataId)) return new Response(null, { status: 200 });

  try {
    await processPayment(await getPayment(dataId));
  } catch (error) {
    console.error("No se pudo procesar el aviso de Mercado Pago", error);
    return new Response(null, { status: 500 });
  }
  return new Response(null, { status: 200 });
}
