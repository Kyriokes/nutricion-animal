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

type CartProduct = NonNullable<Awaited<ReturnType<typeof getCartProductsAction>>>[number];

const ISSUES = {
  unavailable: "Este producto ya no está en el catálogo.",
  out_of_stock: "Sin stock por ahora.",
  stock_reduced: "Ajustamos la cantidad al stock disponible.",
} as const;

// VP-07: carrito. VP-08: para continuar hay que ingresar; el pago todavía no
// existe (pagos y estados del pedido: [A DEFINIR], preguntas 9 y 12).
export function CartView({ signedIn }: { signedIn: boolean }) {
  const cart = useCart();
  const [products, setProducts] = useState<CartProduct[] | null>(null);
  const [error, setError] = useState(false);
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
  }, [ids]);

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
                <label className="flex items-center gap-1 text-sm">
                  Cantidad
                  <input
                    type="number"
                    min={1}
                    max={Math.min(MAX_QUANTITY, p.stock)}
                    value={line.quantity}
                    onChange={(e) => update(line.productId, Number(e.target.value))}
                    className="h-8 w-16 rounded-lg border border-input bg-background px-2 text-sm"
                  />
                </label>
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
        <p className="text-lg">
          Total: <span className="font-semibold">{formatPrice(total)}</span>
        </p>
        <p className="text-sm text-muted-foreground">El costo de envío todavía no está definido.</p>
        {signedIn ? (
          <p role="status" className="rounded bg-warning px-2 py-1 text-sm text-warning-foreground">
            El pago en línea todavía no está disponible.
          </p>
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
