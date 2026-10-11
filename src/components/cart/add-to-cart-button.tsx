"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addToCart, maxAddable } from "@/modules/pedidos/carrito";
import { readCart, useCart, writeCart } from "./cart-store";

// VP-05 → VP-07: elegir cuántas unidades y agregarlas al carrito. No deja
// pasar del stock, contando lo que ya está en el carrito.
export function AddToCartButton({ productId, stock }: { productId: string; stock: number }) {
  const cart = useCart();
  const inCart = cart.find((l) => l.productId === productId)?.quantity ?? 0;
  const max = maxAddable(stock, inCart);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState<number | null>(null);
  // Si el máximo baja (por ejemplo, se agregó desde otra pestaña), la cantidad lo sigue.
  const q = Math.min(quantity, Math.max(1, max));

  if (stock === 0) return <Button disabled>Sin stock</Button>;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border" role="group" aria-label="Cantidad">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Una unidad menos"
            disabled={q <= 1}
            onClick={() => setQuantity(q - 1)}
          >
            <Minus />
          </Button>
          <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">
            {q}
          </span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Una unidad más"
            disabled={q >= max}
            onClick={() => setQuantity(q + 1)}
          >
            <Plus />
          </Button>
        </div>
        <Button
          disabled={max === 0}
          onClick={() => {
            writeCart(addToCart(readCart(), productId, q));
            setAdded(q);
            setQuantity(1);
          }}
        >
          Agregar al carrito
        </Button>
      </div>
      {added !== null && (
        <span role="status" className="text-sm text-success">
          Agregaste {added} {added === 1 ? "unidad" : "unidades"}.
        </span>
      )}
      {inCart > 0 && (
        <span className="text-sm text-muted-foreground">
          Ya tenés {inCart} en el carrito
          {max === 0 ? ": no quedan más unidades disponibles." : "."}
        </span>
      )}
    </div>
  );
}
