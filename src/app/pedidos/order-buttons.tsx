"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { cancelOrderAction, openClaimAction, simulatePaymentAction } from "./actions";

// VU-07 (simulada): botones del pago de prueba. Después de responder, se ve
// el resultado del pedido (VU-10).
export function SimulatedPaymentButtons({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pay = (approved: boolean) =>
    start(async () => {
      const r = await simulatePaymentAction(orderId, approved);
      if (r.ok) router.push(`/pedidos/${orderId}`);
      else setMessage(r.message);
    });
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button disabled={pending} onClick={() => pay(true)}>
          Simular pago aprobado
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => pay(false)}>
          Simular pago rechazado
        </Button>
      </div>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}

// RN-065: cancelar el pedido antes del envío, con confirmación.
export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();
  if (!confirming) {
    return (
      <Button variant="outline" onClick={() => setConfirming(true)}>
        Cancelar pedido
      </Button>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm">¿Cancelar el pedido? Los productos vuelven al stock.</p>
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await cancelOrderAction(orderId);
              if (!r.ok) setMessage(r.message);
              else setConfirming(false);
            })
          }
        >
          Sí, cancelar
        </Button>
        <Button variant="ghost" disabled={pending} onClick={() => setConfirming(false)}>
          No
        </Button>
      </div>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}

// RN-066: formulario para abrir un reclamo sobre el pedido.
export function ClaimForm({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  if (!open) {
    return (
      <div className="flex flex-col gap-2">
        {message?.ok && (
          <p role="status" className="text-sm text-success">
            {message.text}
          </p>
        )}
        <Button variant="outline" className="w-fit" onClick={() => setOpen(true)}>
          Tengo un problema con este pedido
        </Button>
      </div>
    );
  }
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const r = await openClaimAction(orderId, { description });
          if (r.ok) {
            setDescription("");
            setOpen(false);
            setMessage({ ok: true, text: "Recibimos tu reclamo. Te vamos a responder acá." });
          } else {
            setMessage({ ok: false, text: r.message });
          }
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        ¿Qué pasó?
        <textarea
          required
          minLength={10}
          maxLength={2000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="min-h-28 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar reclamo"}
        </Button>
        <Button type="button" variant="ghost" disabled={pending} onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
      {message && !message.ok && (
        <p role="alert" className="text-sm text-destructive">
          {message.text}
        </p>
      )}
    </form>
  );
}
