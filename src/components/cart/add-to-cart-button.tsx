"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { addToCart } from "@/modules/pedidos/carrito";
import { readCart, writeCart } from "./cart-store";

// VP-05 → VP-07: agregar un producto al carrito.
export function AddToCartButton({ productId, inStock }: { productId: string; inStock: boolean }) {
  const [added, setAdded] = useState(false);
  if (!inStock) {
    return <Button disabled>Sin stock</Button>;
  }
  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={() => {
          writeCart(addToCart(readCart(), productId));
          setAdded(true);
        }}
      >
        Agregar al carrito
      </Button>
      {added && (
        <span role="status" className="text-sm text-success">
          Agregado.
        </span>
      )}
    </div>
  );
}
