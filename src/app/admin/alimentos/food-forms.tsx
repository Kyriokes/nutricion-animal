"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { FoodSearch } from "@/components/food-picker";
import { Button } from "@/components/ui/button";
import type { Food, FoodWithAliases } from "@/modules/alimentos/repositorio";
import { addAliasAction, mergeFoodAction, removeAliasAction, renameFoodAction, type FoodAdminResult } from "./actions";

const inputClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Message({ result }: { result: FoodAdminResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <span role="status" className="text-sm text-success">
      Guardado.
    </span>
  ) : (
    <span role="alert" className="text-sm text-destructive">
      {result.message}
    </span>
  );
}

// RN-032: renombrar, sinónimos y unir duplicados.
export function FoodAdminForms({ food }: { food: FoodWithAliases }) {
  const router = useRouter();
  const [name, setName] = useState(food.name);
  const [alias, setAlias] = useState("");
  const [into, setInto] = useState<Food | null>(null);
  const [result, setResult] = useState<FoodAdminResult | null>(null);
  const [pending, start] = useTransition();
  const act = (fn: () => Promise<FoodAdminResult>, after?: () => void) =>
    start(async () => {
      const r = await fn();
      setResult(r);
      if (r.ok) after?.();
    });

  return (
    <div className="flex flex-col gap-8">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          act(() => renameFoodAction(food.id, name));
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          Nombre
          <input value={name} maxLength={60} required onChange={(e) => setName(e.target.value)} className={inputClass} />
        </label>
        <Button type="submit" disabled={pending}>
          Renombrar
        </Button>
      </form>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Sinónimos</h2>
        <p className="text-sm text-muted-foreground">
          Otros nombres con los que se encuentra este alimento (por ejemplo, &quot;pechuga de pollo&quot; para pollo).
        </p>
        {food.aliases.length > 0 && (
          <ul className="flex flex-wrap gap-1">
            {food.aliases.map((a) => (
              <li key={a.id} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm">
                {a.alias}
                <button
                  type="button"
                  aria-label={`Quitar ${a.alias}`}
                  disabled={pending}
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() => act(() => removeAliasAction(a.id))}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            act(() => addAliasAction(food.id, alias), () => setAlias(""));
          }}
        >
          <input
            value={alias}
            maxLength={60}
            required
            placeholder="Nuevo sinónimo"
            onChange={(e) => setAlias(e.target.value)}
            className={inputClass}
          />
          <Button type="submit" variant="outline" disabled={pending}>
            Agregar sinónimo
          </Button>
        </form>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-medium">Unir con otro alimento</h2>
        <p className="text-sm text-muted-foreground">
          Si es un duplicado: desaparece y todo lo que lo usa pasa al alimento que elijas. Su nombre queda como sinónimo.
        </p>
        {into ? (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span>
              Unir «{food.name}» a «{into.name}»
            </span>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => act(() => mergeFoodAction(food.id, into.id), () => router.push(`/admin/alimentos/${into.id}`))}
            >
              Unir
            </Button>
            <Button variant="ghost" disabled={pending} onClick={() => setInto(null)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <FoodSearch label="Alimento que queda" allowAdd={false} exclude={[food.id]} onPick={setInto} />
        )}
      </section>
      <Message result={result} />
    </div>
  );
}
