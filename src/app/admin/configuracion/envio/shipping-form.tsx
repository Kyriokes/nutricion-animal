"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { saveShippingCostAction, type ShippingActionResult } from "./actions";

// VA-08: formulario del costo fijo de envío.
export function ShippingForm({ initial }: { initial: string }) {
  const [value, setValue] = useState(initial);
  const [result, setResult] = useState<ShippingActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-end gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await saveShippingCostAction(value)));
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Costo de envío ($)
        <input
          inputMode="decimal"
          maxLength={20}
          required
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setResult(null);
          }}
          className="h-8 w-40 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Guardando…" : "Guardar"}
      </Button>
      {result?.ok && <span role="status" className="text-sm text-success">Guardado.</span>}
      {result && !result.ok && <span role="alert" className="text-sm text-destructive">{result.message}</span>}
    </form>
  );
}
