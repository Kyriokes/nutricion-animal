"use client";

import { ArrowDown, ArrowUp, X } from "lucide-react";
import { useState, useTransition } from "react";
import { FoodListPicker, FoodSearch } from "@/components/food-picker";
import { Button } from "@/components/ui/button";
import type { Food } from "@/modules/alimentos/repositorio";
import type { ProductComposition } from "@/modules/catalogo/repositorio";
import { saveCompositionAction, type CatalogActionResult } from "./actions";

const pctClass =
  "h-8 w-20 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type Row = { food: Food; percentage: string };

const pctText = (n?: number) => (n === undefined ? "" : String(n).replace(".", ","));

// RN-033, RN-034: composición del producto (de mayor a menor peso, porcentaje
// del principal obligatorio) y "puede contener". La validación está en
// src/modules/catalogo/composicion.ts y se hace en el servidor.
export function CompositionForm({ productId, initial }: { productId: string; initial: ProductComposition }) {
  const [rows, setRows] = useState<Row[]>(
    initial.ingredients.map((x) => ({ food: x.food, percentage: pctText(x.percentage) })),
  );
  const [traces, setTraces] = useState<Food[]>(initial.traces);
  const [result, setResult] = useState<CatalogActionResult | null>(null);
  const [pending, start] = useTransition();

  const change = (next: Row[]) => {
    setRows(next);
    setResult(null);
  };
  const move = (i: number, by: -1 | 1) => {
    const next = [...rows];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    change(next);
  };

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () =>
          setResult(
            await saveCompositionAction(productId, {
              ingredients: rows.map((r) => ({ foodId: r.food.id, percentage: r.percentage })),
              traces: traces.map((t) => t.id),
            }),
          ),
        );
      }}
    >
      <p className="text-sm text-muted-foreground">
        Como en la etiqueta: de mayor a menor peso. El porcentaje es optativo, salvo el del ingrediente principal.
      </p>
      {rows.length > 0 && (
        <ol className="flex flex-col gap-1">
          {rows.map((r, i) => (
            <li key={r.food.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="w-6 text-right text-muted-foreground">{i + 1}.</span>
              <span className="min-w-32 flex-1">{r.food.name}</span>
              <label className="flex items-center gap-1">
                <input
                  aria-label={`Porcentaje de ${r.food.name}`}
                  inputMode="decimal"
                  maxLength={6}
                  required={i === 0}
                  placeholder={i === 0 ? "obligatorio" : "opcional"}
                  value={r.percentage}
                  onChange={(e) => change(rows.map((x, j) => (j === i ? { ...x, percentage: e.target.value } : x)))}
                  className={pctClass}
                />
                %
              </label>
              <Button type="button" variant="ghost" size="icon" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Bajar"
                disabled={i === rows.length - 1}
                onClick={() => move(i, 1)}
              >
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Quitar ${r.food.name}`}
                onClick={() => change(rows.filter((_, j) => j !== i))}
              >
                <X />
              </Button>
            </li>
          ))}
        </ol>
      )}
      <FoodSearch
        label="Agregar ingrediente"
        exclude={[...rows.map((r) => r.food.id), ...traces.map((t) => t.id)]}
        onPick={(food) => change([...rows, { food, percentage: "" }])}
      />
      <FoodListPicker
        label='Puede contener (trazas)'
        value={traces}
        onChange={(t) => {
          setTraces(t.filter((x) => !rows.some((r) => r.food.id === x.id)));
          setResult(null);
        }}
      />
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar composición"}
        </Button>
        {result?.ok && (
          <span role="status" className="text-sm text-success">
            Guardado.
          </span>
        )}
        {result && !result.ok && (
          <span role="alert" className="text-sm text-destructive">
            {result.message}
          </span>
        )}
      </div>
    </form>
  );
}
