"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { decideAction } from "./actions";

export function DecisionButtons({ applicationId }: { applicationId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function decide(decision: "approve" | "reject") {
    start(async () => {
      const r = await decideAction({ applicationId, decision });
      setError(r.ok ? null : r.message);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-2">
        <Button disabled={pending} onClick={() => decide("approve")}>
          Aprobar
        </Button>
        <Button variant="outline" disabled={pending} onClick={() => decide("reject")}>
          Rechazar
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
