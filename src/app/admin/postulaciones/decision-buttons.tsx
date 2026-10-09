"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { decideAction } from "./actions";

// Aprobar es directo; rechazar pide un motivo corto que ve el postulante (RN-044).
export function DecisionButtons({ applicationId }: { applicationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [pending, start] = useTransition();

  function decide(decision: "approve" | "reject") {
    start(async () => {
      const r = await decideAction({ applicationId, decision, note });
      setError(r.ok ? null : r.message);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      {rejecting ? (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            decide("reject");
          }}
        >
          <label className="flex flex-col gap-1 text-sm">
            Motivo del rechazo (lo ve el postulante)
            <input
              className="h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              maxLength={200}
              required
              autoFocus
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          <div className="flex gap-2">
            <Button type="submit" variant="outline" disabled={pending || !note.trim()}>
              Confirmar rechazo
            </Button>
            <Button type="button" variant="ghost" onClick={() => setRejecting(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex gap-2">
          <Button disabled={pending} onClick={() => decide("approve")}>
            Aprobar
          </Button>
          <Button variant="outline" disabled={pending} onClick={() => setRejecting(true)}>
            Rechazar
          </Button>
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
