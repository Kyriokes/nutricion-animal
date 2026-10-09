"use client";

import { useState, useTransition } from "react";
import { sendContactMessageAction } from "@/app/contacto/actions";
import { Button } from "@/components/ui/button";

const fieldClass =
  "rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// RN-080, RN-082: formulario de contacto. Se usa en la página de contacto y
// en la pantalla de cuenta suspendida. Con sesión, nombre y email vienen
// precargados.
export function ContactForm({ defaults }: { defaults?: { name: string; email: string } }) {
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (sent) {
    return (
      <div role="status" className="flex flex-col gap-2 rounded-lg border p-4 text-sm">
        <p className="font-medium">¡Gracias! Recibimos tu mensaje.</p>
        <p className="text-muted-foreground">Te vamos a responder por email.</p>
        <Button variant="ghost" className="w-fit" onClick={() => setSent(false)}>
          Enviar otro mensaje
        </Button>
      </div>
    );
  }

  return (
    <form
      className="flex w-full flex-col gap-3 text-left"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = Object.fromEntries(new FormData(form));
        setMessage(null);
        start(async () => {
          const r = await sendContactMessageAction(data);
          if (r.ok) {
            form.reset();
            setSent(true);
          } else {
            setMessage(r.message);
          }
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          Nombre
          <input name="name" required maxLength={80} defaultValue={defaults?.name} className={`${fieldClass} h-8`} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            defaultValue={defaults?.email}
            // Con sesión se usa el email de la cuenta (el servidor lo impone igual).
            readOnly={!!defaults}
            className={`${fieldClass} h-8 read-only:bg-muted`}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Motivo
        <input name="subject" required maxLength={120} className={`${fieldClass} h-8`} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Mensaje
        <textarea name="message" required minLength={10} maxLength={4000} className={`${fieldClass} min-h-32 py-1`} />
      </label>
      {/* Campo trampa para bots: oculto para las personas y para los lectores de pantalla. */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      <Button type="submit" className="w-fit" disabled={pending}>
        {pending ? "Enviando…" : "Enviar"}
      </Button>
      {message && (
        <p role="alert" className="text-sm text-destructive">
          {message}
        </p>
      )}
    </form>
  );
}
