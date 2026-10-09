"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { DietContent } from "@/modules/dietas/schema";
import {
  createDietAction,
  saveDietContentAction,
  type DietActionResult,
} from "./actions";

const UNITS = ["g", "kg", "ml", "l", "taza", "cucharada"] as const;
const inputClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type FoodRow = {
  name: string;
  quantity: string;
  unit: (typeof UNITS)[number];
  patternType: "weekly" | "daily_cycle";
  patternValue: string;
};

const emptyFood = (): FoodRow => ({
  name: "",
  quantity: "",
  unit: "g",
  patternType: "weekly",
  patternValue: "7",
});

function toRows(content?: DietContent): FoodRow[] {
  if (!content) return [emptyFood()];
  return content.foods.map((f) => ({
    name: f.name,
    quantity: String(f.quantity).replace(".", ","),
    unit: f.unit,
    patternType: f.pattern.type,
    patternValue: String(
      f.pattern.type === "weekly" ? f.pattern.timesPerWeek : f.pattern.cycleDays,
    ),
  }));
}

// El servidor valida con DietContentSchema; acá solo se arma el objeto.
function buildContent(s: {
  description: string;
  foods: FoodRow[];
  durationType: "days" | "indefinite";
  days: string;
  notes: string;
}) {
  return {
    description: s.description.trim(),
    foods: s.foods.map((f) => ({
      name: f.name.trim(),
      quantity: Number(f.quantity.replace(",", ".")),
      unit: f.unit,
      pattern:
        f.patternType === "weekly"
          ? { type: "weekly", timesPerWeek: Number(f.patternValue) }
          : { type: "daily_cycle", cycleDays: Number(f.patternValue) },
    })),
    duration:
      s.durationType === "indefinite"
        ? { type: "indefinite" }
        : { type: "days", days: Number(s.days) },
    ...(s.notes.trim() ? { notes: s.notes.trim() } : {}),
  };
}

export type EditPlan =
  | { mode: "in_place" }
  | { mode: "new_version"; activePets: { id: string; label: string }[] };

// VN-03: crear una dieta, o editar la última versión de una existente
// (RN-025, RN-026). Solo presenta y junta datos.
export function DietEditor(
  props:
    | { mode: "create" }
    | { mode: "edit"; dietId: string; initial: DietContent; plan: EditPlan },
) {
  const initial = props.mode === "edit" ? props.initial : undefined;
  const [name, setName] = useState("");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [foods, setFoods] = useState<FoodRow[]>(toRows(initial));
  const [durationType, setDurationType] = useState<"days" | "indefinite">(
    initial?.duration.type ?? "indefinite",
  );
  const [days, setDays] = useState(
    initial?.duration.type === "days" ? String(initial.duration.days) : "30",
  );
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const activePets = props.mode === "edit" && props.plan.mode === "new_version" ? props.plan.activePets : [];
  // RN-026: por defecto pasan todas las mascotas a la versión nueva.
  const [move, setMove] = useState<string[]>(activePets.map((p) => p.id));
  const [result, setResult] = useState<DietActionResult | null>(null);
  const [pending, start] = useTransition();

  const updateFood = (i: number, patch: Partial<FoodRow>) => {
    setResult(null);
    setFoods((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  };

  function submit() {
    const content = buildContent({ description, foods, durationType, days, notes });
    start(async () => {
      const r =
        props.mode === "create"
          ? await createDietAction({ name, content })
          : await saveDietContentAction({
              dietId: props.dietId,
              content,
              movePetIds: props.plan.mode === "new_version" ? move : "all",
            });
      setResult(r);
    });
  }

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {props.mode === "create" && (
        <label className="flex flex-col gap-1 text-sm">
          Nombre de la dieta
          <input required maxLength={80} className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Descripción
        <textarea
          required
          className={`${inputClass} h-auto min-h-16 py-1`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Alimentos</legend>
        {foods.map((f, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 rounded-lg border p-2 sm:grid-cols-[2fr_1fr_1fr_1.5fr_1fr_auto]">
            <input aria-label="Alimento" placeholder="Pollo" required className={inputClass} value={f.name} onChange={(e) => updateFood(i, { name: e.target.value })} />
            <input aria-label="Cantidad" placeholder="100" inputMode="decimal" required className={inputClass} value={f.quantity} onChange={(e) => updateFood(i, { quantity: e.target.value })} />
            <select aria-label="Unidad" className={inputClass} value={f.unit} onChange={(e) => updateFood(i, { unit: e.target.value as FoodRow["unit"] })}>
              {UNITS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <select
              aria-label="Frecuencia"
              className={inputClass}
              value={f.patternType}
              onChange={(e) => {
                const patternType = e.target.value as FoodRow["patternType"];
                updateFood(i, { patternType, patternValue: patternType === "weekly" ? "7" : "2" });
              }}
            >
              <option value="weekly">veces por semana</option>
              <option value="daily_cycle">cada N días</option>
            </select>
            <input
              aria-label={f.patternType === "weekly" ? "Veces por semana (1 a 7)" : "Cada cuántos días (1 a 9)"}
              type="number"
              min={1}
              max={f.patternType === "weekly" ? 7 : 9}
              required
              className={inputClass}
              value={f.patternValue}
              onChange={(e) => updateFood(i, { patternValue: e.target.value })}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Quitar alimento"
              disabled={foods.length === 1}
              onClick={() => setFoods((fs) => fs.filter((_, j) => j !== i))}
            >
              <Trash2 />
            </Button>
          </div>
        ))}
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => setFoods((fs) => [...fs, emptyFood()])}>
            <Plus /> Agregar alimento
          </Button>
        </div>
      </fieldset>

      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          Duración
          <select className={inputClass} value={durationType} onChange={(e) => setDurationType(e.target.value as "days" | "indefinite")}>
            <option value="indefinite">Indefinida</option>
            <option value="days">Una cantidad de días</option>
          </select>
        </label>
        {durationType === "days" && (
          <label className="flex flex-col gap-1 text-sm">
            Días (1 a 999)
            <input type="number" min={1} max={999} required className={`${inputClass} w-24`} value={days} onChange={(e) => setDays(e.target.value)} />
          </label>
        )}
      </div>

      <label className="flex flex-col gap-1 text-sm">
        Notas (opcional)
        <textarea className={`${inputClass} h-auto min-h-12 py-1`} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>

      {props.mode === "edit" && props.plan.mode === "new_version" && (
        <div role="alert" className="flex flex-col gap-2 rounded-lg border border-warning p-3 text-sm">
          <p className="font-medium">
            Esta dieta ya está asignada: al guardar se crea una versión nueva (RN-026).
          </p>
          {activePets.length > 0 ? (
            <>
              <p>Elegí qué mascotas pasan a la versión nueva; las demás siguen con la actual.</p>
              {activePets.map((p) => (
                <label key={p.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={move.includes(p.id)}
                    onChange={(e) =>
                      setMove((m) => (e.target.checked ? [...m, p.id] : m.filter((x) => x !== p.id)))
                    }
                  />
                  {p.label}
                </label>
              ))}
            </>
          ) : (
            <p>Hoy ninguna mascota la tiene activa.</p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : props.mode === "create" ? "Crear dieta" : "Guardar cambios"}
        </Button>
        {result && (
          <span role={result.ok ? "status" : "alert"} className={`text-sm ${result.ok ? "text-success" : "text-destructive"}`}>
            {result.ok ? (result.message ?? "Listo.") : result.message}
          </span>
        )}
      </div>
    </form>
  );
}
