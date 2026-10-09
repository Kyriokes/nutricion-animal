"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { RESOLUTION_LABELS, RESOLUTIONS, type ClaimStatus, type Resolution } from "@/modules/pedidos/reclamos";
import { resolveClaimAction, reviewClaimAction, type ClaimActionResult } from "./actions";

const fieldClass =
  "rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// RN-066: pasar a revisión o resolver un reclamo.
export function ClaimActions({ claimId, status }: { claimId: string; status: ClaimStatus }) {
  const [resolution, setResolution] = useState<Resolution>("refund");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<ClaimActionResult | null>(null);
  const [pending, start] = useTransition();
  if (status === "resolved") return null;

  return (
    <div className="flex flex-col gap-4">
      {status === "open" && (
        <Button
          variant="outline"
          className="w-fit"
          disabled={pending}
          onClick={() => start(async () => setResult(await reviewClaimAction(claimId)))}
        >
          Pasar a revisión
        </Button>
      )}
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => setResult(await resolveClaimAction(claimId, { resolution, note })));
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Resolución
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value as Resolution)}
            className={`${fieldClass} h-8 w-fit`}
          >
            {RESOLUTIONS.map((r) => (
              <option key={r} value={r}>
                {RESOLUTION_LABELS[r]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Nota para el cliente (opcional)
          <textarea
            maxLength={500}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`${fieldClass} min-h-20 py-1`}
          />
        </label>
        <Button type="submit" className="w-fit" disabled={pending}>
          {pending ? "Guardando…" : "Resolver reclamo"}
        </Button>
      </form>
      {result && !result.ok && (
        <p role="alert" className="text-sm text-destructive">
          {result.message}
        </p>
      )}
    </div>
  );
}
