"use client";

import { ShoppingCart } from "lucide-react";
import Link from "next/link";
import { useCart } from "./cart-store";

// Acceso al carrito (VP-07) con la cantidad de unidades.
export function CartButton() {
  const count = useCart().reduce((n, l) => n + l.quantity, 0);
  return (
    <Link
      href="/carrito"
      className="relative inline-flex size-9 items-center justify-center rounded-lg hover:bg-muted"
      aria-label={count ? `Carrito: ${count} unidades` : "Carrito vacío"}
    >
      <ShoppingCart className="size-5" aria-hidden />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
