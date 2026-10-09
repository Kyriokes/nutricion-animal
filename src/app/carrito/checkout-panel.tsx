"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { writeCart } from "@/components/cart/cart-store";
import { Button } from "@/components/ui/button";
import type { CartLine } from "@/modules/pedidos/carrito";
import { createOrderAction } from "./actions";

export type CheckoutAddress = { id: string; label: string; inZone: boolean };

// VP-08: con sesión, elegir la dirección y confirmar la compra. El pedido se
// crea en el servidor con sus precios; acá solo se manda qué, cuánto, a dónde
// y el total que vio el cliente.
export function CheckoutPanel({
  lines,
  total,
  addresses,
  blocked,
  onStale,
}: {
  lines: readonly CartLine[];
  total: number;
  addresses: readonly CheckoutAddress[];
  blocked: boolean;
  onStale: () => void;
}) {
  const router = useRouter();
  const usable = addresses.filter((a) => a.inZone);
  const [addressId, setAddressId] = useState(usable[0]?.id ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (usable.length === 0) {
    return (
      <p className="text-sm">
        Para comprar necesitás una dirección dentro de Capital.{" "}
        <Link href="/perfil" className="text-primary underline underline-offset-4">
          Cargala en tu perfil
        </Link>
        .
      </p>
    );
  }

  return (
    <form
      className="flex w-full max-w-md flex-col items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        setMessage(null);
        start(async () => {
          const r = await createOrderAction({ addressId, lines, expectedTotal: total });
          if (r.ok) {
            // RN-064: el stock ya está reservado; el carrito se vacía.
            writeCart([]);
            router.push(`/pedidos/${r.orderId}/pagar`);
            return;
          }
          setMessage(r.message);
          if (r.stale) {
            onStale();
            router.refresh();
          }
        });
      }}
    >
      <label className="flex w-full flex-col gap-1 text-sm">
        Enviar a
        <select
          value={addressId}
          onChange={(e) => setAddressId(e.target.value)}
          className="h-8 rounded-lg border border-input bg-background px-2 text-sm"
        >
          {addresses.map((a) => (
            <option key={a.id} value={a.id} disabled={!a.inZone}>
              {a.inZone ? a.label : `${a.label} (fuera de la zona de entrega)`}
            </option>
          ))}
        </select>
      </label>
      {blocked && (
        <p role="alert" className="text-sm text-destructive">
          Hay productos sin stock suficiente: quitalos o ajustá la cantidad para continuar.
        </p>
      )}
      <Button type="submit" disabled={pending || blocked}>
        {pending ? "Confirmando…" : "Confirmar compra"}
      </Button>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </form>
  );
}
