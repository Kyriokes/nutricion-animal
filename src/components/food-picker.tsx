"use client";

import { X } from "lucide-react";
import { useEffect, useId, useState, useTransition } from "react";
import { addFoodAction, searchFoodsAction } from "@/app/alimentos/actions";
import { Button } from "@/components/ui/button";
import type { Food } from "@/modules/alimentos/repositorio";
import { normalizeFoodName } from "@/modules/alimentos/nombres";

const inputClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

// RN-032: buscar un alimento de la lista o agregar uno nuevo. Si el nuevo se
// parece a otros, pregunta antes ("¿Es alguno de estos?").
export function FoodSearch({
  onPick,
  exclude = [],
  placeholder = "Buscá un alimento…",
  label,
  allowAdd = true,
}: {
  onPick: (food: Food) => void;
  exclude?: readonly string[];
  placeholder?: string;
  label: string;
  // false: solo elegir de la lista (por ejemplo, al unir duplicados).
  allowAdd?: boolean;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Food[]>([]);
  const [similar, setSimilar] = useState<Food[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Busca 250 ms después de dejar de escribir.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      const r = await searchFoodsAction(q);
      if (!cancelled) setResults(r);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const pick = (food: Food) => {
    onPick(food);
    setQuery("");
    setResults([]);
    setSimilar(null);
    setMessage(null);
  };

  const add = (force: boolean) =>
    start(async () => {
      setMessage(null);
      const r = await addFoodAction(query.trim(), force);
      if (r.status === "error") setMessage(r.message);
      else if (r.status === "similar") setSimilar(r.similar);
      else pick(r.food);
    });

  const q = query.trim();
  const visible = q.length >= 2 ? results.filter((f) => !exclude.includes(f.id)) : [];
  const exact = results.some((f) => normalizeFoodName(f.name) === normalizeFoodName(q));

  return (
    <div className="relative flex flex-col gap-1 text-sm">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={query}
        maxLength={60}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          setQuery(e.target.value);
          setSimilar(null);
          if (e.target.value.trim().length < 2) setResults([]);
        }}
        className={inputClass}
      />
      {similar ? (
        <div className="flex flex-col gap-1 rounded-lg border p-2">
          <span>¿Es alguno de estos?</span>
          {similar.map((f) => (
            <Button key={f.id} type="button" variant="ghost" size="sm" className="justify-start" onClick={() => pick(f)}>
              {f.name}
            </Button>
          ))}
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => add(true)}>
            No, agregar «{q}» igual
          </Button>
        </div>
      ) : (
        q.length >= 2 && (
          <ul className="flex flex-col rounded-lg border">
            {visible.map((f) => (
              <li key={f.id}>
                <button type="button" className="w-full px-2 py-1 text-left hover:bg-muted" onClick={() => pick(f)}>
                  {f.name}
                </button>
              </li>
            ))}
            {allowAdd && !exact && (
              <li>
                <button
                  type="button"
                  disabled={pending}
                  className="w-full px-2 py-1 text-left font-medium hover:bg-muted"
                  onClick={() => add(false)}
                >
                  {pending ? "Agregando…" : `Agregar «${q}» a la lista`}
                </button>
              </li>
            )}
          </ul>
        )
      )}
      {message && (
        <p role="alert" className="text-destructive">
          {message}
        </p>
      )}
    </div>
  );
}

// Varios alimentos, como etiquetas que se pueden quitar (alergias, alimentos
// no permitidos o de necesidad).
export function FoodListPicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: readonly Food[];
  onChange: (foods: Food[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FoodSearch
        label={label}
        exclude={value.map((f) => f.id)}
        onPick={(f) => onChange(value.some((v) => v.id === f.id) ? [...value] : [...value, f])}
      />
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1">
          {value.map((f) => (
            <li key={f.id} className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-sm">
              {f.name}
              <button
                type="button"
                aria-label={`Quitar ${f.name}`}
                onClick={() => onChange(value.filter((v) => v.id !== f.id))}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
