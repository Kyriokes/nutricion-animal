"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { OrderStatus } from "@/modules/pedidos/estados";
import { ADMIN_ACTION_LABELS } from "@/modules/pedidos/presentacion";
import { changeOrderStatusAction } from "./actions";

// VA-04, RN-065: botones para avanzar el pedido. Cancelar pide confirmación.
export function AdminOrderActions({ orderId, actions }: { orderId: string; actions: OrderStatus[] }) {
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const run = (to: OrderStatus) =>
    start(async () => {
      setMessage(null);
      const r = await changeOrderStatusAction(orderId, to);
      setConfirmCancel(false);
      if (!r.ok) setMessage(r.message);
    });

  if (actions.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {actions
          .filter((to) => to !== "cancelled")
          .map((to) => (
            <Button key={to} disabled={pending} onClick={() => run(to)}>
              {ADMIN_ACTION_LABELS[to]}
            </Button>
          ))}
        {actions.includes("cancelled") && !confirmCancel && (
          <Button variant="outline" disabled={pending} onClick={() => setConfirmCancel(true)}>
            {ADMIN_ACTION_LABELS.cancelled}
          </Button>
        )}
      </div>
      {confirmCancel && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm">¿Cancelar el pedido? Los productos vuelven al stock.</span>
          <Button variant="destructive" disabled={pending} onClick={() => run("cancelled")}>
            Sí, cancelar
          </Button>
          <Button variant="ghost" disabled={pending} onClick={() => setConfirmCancel(false)}>
            No
          </Button>
        </div>
      )}
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}
