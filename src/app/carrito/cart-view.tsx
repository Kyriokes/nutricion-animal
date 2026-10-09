"use client";

import { PawPrint, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { readCart, useCart, writeCart } from "@/components/cart/cart-store";
import { LoginDialog } from "@/components/login-dialog";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/modules/catalogo/presentacion";
import { MAX_QUANTITY, priceCart, setQuantity } from "@/modules/pedidos/carrito";
import { getCartProductsAction } from "./actions";
import { CheckoutPanel, type CheckoutAddress } from "./checkout-panel";

type CartProduct = NonNullable<Awaited<ReturnType<typeof getCartProductsAction>>>[number];

const ISSUES = {
  unavailable: "Este producto ya no está en el catálogo.",
  out_of_stock: "Sin stock por ahora.",
  stock_reduced: "Ajustamos la cantidad al stock disponible.",
} as const;

// Campo de cantidad con borrador propio: mientras se escribe (por ejemplo, al
// borrar "2" para poner "3") el campo puede quedar vacío sin que el producto
// se quite del carrito. Se aplica cuando hay un número válido de 1 o más; al
// salir del campo, si quedó vacío o inválido, vuelve a la cantidad anterior.
// Para quitar el producto está el botón de la papelera.
function QuantityInput({
  quantity,
  max,
  onChange,
}: {
  quantity: number;
  max: number;
  onChange: (quantity: number) => void;
}) {
  const [draft, setDraft] = useState(String(quantity));
  // Si la cantidad cambia desde afuera (otra pestaña, ajuste por stock), se
  // refleja en el campo. Se hace al renderizar y no con una key, porque
  // remontar el campo le saca el foco a quien está escribiendo.
  const [shown, setShown] = useState(quantity);
  if (quantity !== shown) {
    setShown(quantity);
    if (Number(draft) !== quantity) setDraft(String(quantity));
  }
  return (
    <label className="flex items-center gap-1 text-sm">
      Cantidad
      <input
        type="number"
        min={1}
        max={max}
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== "" && Number.isInteger(n) && n >= 1) onChange(Math.min(n, max));
        }}
        onBlur={() => setDraft(String(quantity))}
        className="h-8 w-16 rounded-lg border border-input bg-background px-2 text-sm"
      />
    </label>
  );
}

// VP-07: carrito. VP-08: para continuar hay que ingresar; con sesión se
// elige la dirección y se confirma la compra (RN-062, RN-068).
export function CartView({
  shippingCost,
  addresses,
}: {
  shippingCost: number;
  // null: sin sesión.
  addresses: CheckoutAddress[] | null;
}) {
  const cart = useCart();
  const [products, setProducts] = useState<CartProduct[] | null>(null);
  const [error, setError] = useState(false);
  // Se incrementa para volver a pedir precios y stock (por ejemplo, si al
  // confirmar cambiaron).
  const [reload, setReload] = useState(0);
  const ids = cart.map((l) => l.productId).join(",");

  useEffect(() => {
    let cancelled = false;
    const list = ids ? ids.split(",") : [];
    getCartProductsAction(list).then((r) => {
      if (cancelled) return;
      setError(r === null);
      setProducts(r ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, [ids, reload]);

  if (cart.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-muted-foreground">Tu carrito está vacío.</p>
        <Link href="/catalogo" className="text-primary underline underline-offset-4">
          Ver el catálogo
        </Link>
      </div>
    );
  }
  if (error) return <p role="alert" className="text-destructive">No se pudo cargar el carrito. Probá de nuevo.</p>;
  if (!products) return <p className="text-muted-foreground">Cargando…</p>;

  const byId = new Map(products.map((p) => [p.id, p]));
  const { lines, total } = priceCart(cart, products);
  const update = (productId: string, quantity: number) => writeCart(setQuantity(readCart(), productId, quantity));
  // RN-068: costo fijo por pedido. Se suma en centavos.
  const grandTotal = (Math.round(total * 100) + Math.round(shippingCost * 100)) / 100;

  return (
    <div className="flex flex-col gap-6">
      <ul className="flex flex-col gap-3">
        {lines.map((line) => {
          const p = byId.get(line.productId);
          return (
            <li key={line.productId} className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
              <div className="size-16 shrink-0">
                {p?.image ? (
                  <Image src={p.image} alt="" width={64} height={64} className="size-16 rounded-md object-cover" />
                ) : (
                  <div className="flex size-16 items-center justify-center rounded-md bg-muted text-muted-foreground">
                    <PawPrint aria-hidden />
                  </div>
                )}
              </div>
              <div className="min-w-40 flex-1">
                {p ? (
                  <Link href={`/catalogo/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                    {p.name}
                  </Link>
                ) : (
                  <span className="font-medium text-muted-foreground">Producto no disponible</span>
                )}
                {p && <p className="text-sm text-muted-foreground">{p.brand} · {formatPrice(p.price)} c/u</p>}
                {line.issue && <p className="text-sm text-destructive">{ISSUES[line.issue]}</p>}
              </div>
              {p && p.stock > 0 && (
                <QuantityInput
                  quantity={line.quantity}
                  max={Math.min(MAX_QUANTITY, p.stock)}
                  onChange={(q) => update(line.productId, q)}
                />
              )}
              <span className="w-24 text-right font-medium">{formatPrice(line.subtotal)}</span>
              <Button variant="ghost" size="icon" aria-label="Quitar del carrito" onClick={() => update(line.productId, 0)}>
                <Trash2 />
              </Button>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col items-end gap-3">
        <p className="text-sm">Productos: {formatPrice(total)}</p>
        <p className="text-sm">
          Envío: {formatPrice(shippingCost)}{" "}
          <span className="text-muted-foreground">(solo dentro de Capital)</span>
        </p>
        <p className="text-lg">
          Total: <span className="font-semibold">{formatPrice(grandTotal)}</span>
        </p>
        {addresses ? (
          <CheckoutPanel
            lines={cart}
            total={grandTotal}
            addresses={addresses}
            blocked={lines.some((l) => l.issue)}
            onStale={() => setReload((n) => n + 1)}
          />
        ) : (
          <div className="flex flex-col items-end gap-2">
            <p className="text-sm">Para continuar, ingresá con tu cuenta.</p>
            <LoginDialog />
          </div>
        )}
      </div>
    </div>
  );
}
