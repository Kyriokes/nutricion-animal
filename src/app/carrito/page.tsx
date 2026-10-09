import { connection } from "next/server";
import { Suspense } from "react";
import { isInDeliveryZone } from "@/modules/pedidos/envio";
import { simulatedPaymentsEnabled } from "@/modules/pedidos/pago";
import { getShippingCost } from "@/modules/pedidos/repositorio";
import { formatAddress } from "@/modules/usuarios/direcciones";
import { listAddresses } from "@/modules/usuarios/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { CartView } from "./cart-view";

// Lee la sesión para saber si pedir ingresar (VP-08) o mostrar las
// direcciones para confirmar la compra; y el costo de envío vigente (RN-068).
async function Content() {
  await connection();
  const [actor, shippingCost] = await Promise.all([getCurrentActor(), getShippingCost()]);
  const addresses = actor
    ? (await listAddresses(actor.id)).map((a) => ({
        id: a.id,
        label: formatAddress(a),
        inZone: isInDeliveryZone(a),
      }))
    : null;
  // Por qué no puede comprar aunque haya ingresado, si es el caso.
  const blockedReason = !actor
    ? null
    : !hasPermission(actor.roles, "order.create")
      ? "Tu cuenta no puede hacer compras."
      : !simulatedPaymentsEnabled()
        ? "El pago en línea todavía no está disponible."
        : null;
  return <CartView shippingCost={shippingCost} addresses={addresses} blockedReason={blockedReason} />;
}

// VP-07: carrito de compras (funciona sin sesión).
export default function CartPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Carrito</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
