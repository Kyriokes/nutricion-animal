"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// VP-09: ingresar con Google (RN-003). No hay registro aparte: el primer
// ingreso crea la cuenta como Cliente (RN-024).
export function LoginDialog() {
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function signInWithGoogle() {
    setPending(true);
    setError(false);
    // Después de ingresar se vuelve a la página actual; el servidor valida
    // que sea una ruta interna (safeRedirectPath).
    const next = window.location.pathname + window.location.search;
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
      },
    });
    if (error) {
      setError(true);
      setPending(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger render={<Button />}>Ingresar</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ingresar</DialogTitle>
          <DialogDescription>
            Usá tu cuenta de Google. Si es tu primera vez, se crea tu cuenta.
          </DialogDescription>
        </DialogHeader>
        <Button onClick={signInWithGoogle} disabled={pending}>
          {pending ? "Abriendo Google…" : "Continuar con Google"}
        </Button>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            No se pudo iniciar el ingreso. Probá de nuevo.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
