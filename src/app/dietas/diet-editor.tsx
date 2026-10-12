"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { FoodSearch } from "@/components/food-picker";
import { Button } from "@/components/ui/button";
import type { Food } from "@/modules/alimentos/repositorio";
import type { DietContent } from "@/modules/dietas/schema";
import {
  createDietAction,
  getCloneSourceAction,
  searchOwnDietsAction,
  saveDietContentAction,
  type DietActionResult,
} from "./actions";

const UNITS = ["g", "kg", "ml", "l", "taza", "cucharada"] as const;
const inputClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

type FoodRow = {
  // RN-036: alimento de la lista única; null hasta elegirlo.
  food: Food | null;
  quantity: string;
  unit: (typeof UNITS)[number];
  patternType: "weekly" | "daily_cycle";
  patternValue: string;
};

const emptyFood = (): FoodRow => ({
  food: null,
  quantity: "",
  unit: "g",
  patternType: "weekly",
  patternValue: "7",
});

function toRows(content?: DietContent): FoodRow[] {
  if (!content) return [emptyFood()];
  return content.foods.map((f) => ({
    food: f.foodId ? { id: f.foodId, name: f.name } : null,
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
      // El nombre lo pone el servidor desde la lista.
      foodId: f.food?.id,
      name: f.food?.name ?? "",
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

type OwnDiet = Awaited<ReturnType<typeof searchOwnDietsAction>>[number];

// RN-027: buscar una dieta propia para cargarla en el formulario.
function CloneSourcePicker({ onPick }: { onPick: (source: { name: string; content: DietContent }) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<OwnDiet[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const search = () => start(async () => setResults(await searchOwnDietsAction(query)));
  const pick = (d: OwnDiet) =>
    start(async () => {
      const source = await getCloneSourceAction(d.id);
      if (!source) return setMessage("No se pudo cargar esa dieta.");
      onPick(source);
      setResults(null);
      setMessage(`Cargamos "${d.name}". Revisá y ajustá antes de crear la dieta.`);
    });

  return (
    <section className="flex flex-col gap-2 rounded-lg border p-3 text-sm">
      <p className="font-medium">Partir de una dieta mía (opcional)</p>
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Buscar por nombre de la dieta o del paciente"
          placeholder="Nombre de la dieta o del paciente"
          maxLength={80}
          className={`${inputClass} min-w-56 flex-1`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            // No envía el formulario de la dieta.
            e.preventDefault();
            search();
          }}
        />
        <Button type="button" size="sm" variant="secondary" disabled={pending} onClick={search}>
          Buscar
        </Button>
      </div>
      {results && results.length === 0 && <p className="text-muted-foreground">Sin resultados.</p>}
      {results && results.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.map((d) => (
            <li key={d.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2">
              <span>
                {d.name} · <span className="text-muted-foreground">{d.patientName ?? "sin paciente"}</span>
              </span>
              <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => pick(d)}>
                Usar
              </Button>
            </li>
          ))}
        </ul>
      )}
      {message && <p role="status">{message}</p>}
    </section>
  );
}

// VN-03: crear una dieta, o editar la última versión de una existente
// (RN-025, RN-026). Solo presenta y junta datos.
export function DietEditor(
  props:
    | { mode: "create" }
    | {
        mode: "edit";
        dietId: string;
        latestVersionId: string;
        initial: DietContent;
        plan: EditPlan;
      },
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
  // RN-026: por defecto el paciente pasa a la versión nueva.
  const [move, setMove] = useState<string[]>(activePets.map((p) => p.id));
  const [result, setResult] = useState<DietActionResult | null>(null);
  const [pending, start] = useTransition();

  // RN-027: reemplaza lo cargado por la dieta elegida.
  const loadSource = (source: { name: string; content: DietContent }) => {
    setResult(null);
    setName(source.name);
    setDescription(source.content.description);
    setFoods(toRows(source.content));
    setDurationType(source.content.duration.type);
    if (source.content.duration.type === "days") setDays(String(source.content.duration.days));
    setNotes(source.content.notes ?? "");
  };

  const updateFood = (i: number, patch: Partial<FoodRow>) => {
    setResult(null);
    setFoods((fs) => fs.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  };

  function submit() {
    if (foods.some((f) => !f.food)) {
      setResult({ ok: false, message: "Elegí cada alimento de la lista." });
      return;
    }
    const content = buildContent({ description, foods, durationType, days, notes });
    start(async () => {
      const r =
        props.mode === "create"
          ? await createDietAction({ name, content })
          : await saveDietContentAction({
              dietId: props.dietId,
              content,
              // En el lugar no se mueve ninguna mascota.
              movePetIds: props.plan.mode === "new_version" ? move : [],
              expectedLatestVersionId: props.latestVersionId,
              expectedMode: props.plan.mode,
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
      {props.mode === "create" && <CloneSourcePicker onPick={loadSource} />}
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
            {f.food ? (
              <span className="flex items-center gap-2 text-sm">
                {f.food.name}
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline underline-offset-2"
                  onClick={() => updateFood(i, { food: null })}
                >
                  cambiar
                </button>
              </span>
            ) : (
              <FoodSearch
                label="Alimento"
                exclude={foods.flatMap((x) => (x.food ? [x.food.id] : []))}
                onPick={(food) => updateFood(i, { food })}
              />
            )}
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
              <p>Marcá si el paciente pasa a la versión nueva; si no, sigue con la actual.</p>
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
            <p>Hoy el paciente no la tiene activa.</p>
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
