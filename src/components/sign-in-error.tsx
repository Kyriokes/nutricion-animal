"use client";

import { useSearchParams } from "next/navigation";

// /auth/callback vuelve con ?ingreso=error si no se pudo completar el ingreso.
export function SignInError() {
  const params = useSearchParams();
  if (params.get("ingreso") !== "error") return null;
  return (
    <p role="alert" className="bg-destructive px-4 py-2 text-sm text-destructive-foreground">
      No se pudo completar el ingreso con Google. Probá de nuevo; si sigue
      pasando, avisanos.
    </p>
  );
}
