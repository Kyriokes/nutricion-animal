import { formatPrice } from "@/modules/catalogo/presentacion";
import type { CustomerOrder } from "@/modules/pedidos/repositorio";
import { formatAddress } from "@/modules/usuarios/direcciones";

// Detalle de un pedido: productos con el precio que se pagó, envío y total.
export function OrderSummary({ order }: { order: CustomerOrder }) {
  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y rounded-lg border">
        {order.items.map((i, n) => (
          <li key={`${i.productId}-${n}`} className="flex flex-wrap justify-between gap-2 px-3 py-2 text-sm">
            <span>
              {i.name} × {i.quantity}
            </span>
            <span>{formatPrice((Math.round(i.unitPrice * 100) * i.quantity) / 100)}</span>
          </li>
        ))}
      </ul>
      <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
        <dt>Productos</dt>
        <dd className="text-right">{formatPrice(order.subtotal)}</dd>
        <dt>Envío ({order.carrier})</dt>
        <dd className="text-right">{formatPrice(order.shippingCost)}</dd>
        <dt className="font-semibold">Total</dt>
        <dd className="text-right font-semibold">{formatPrice(order.total)}</dd>
      </dl>
      <p className="text-sm text-muted-foreground">Enviar a: {formatAddress(order.deliveryAddress)}</p>
    </div>
  );
}
