"use client";

import { useState, useTransition } from "react";
import { FoodListPicker } from "@/components/food-picker";
import { Button } from "@/components/ui/button";
import type { Food } from "@/modules/alimentos/repositorio";
import { deletePetAction, savePetAction, type PetActionResult } from "./actions";

const inputClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type PetFormValues = Record<
  "name" | "species" | "breed" | "birthDate" | "weightKg" | "healthConditions",
  string
> & { foods: PetFoodLists };

// RN-036: listas de alimentos elegidos de la lista única.
type FoodListKey = "allergies" | "forbiddenFoods" | "requiredFoods";
export type PetFoodLists = Record<FoodListKey, Food[]>;

const NO_FOODS: PetFoodLists = { allergies: [], forbiddenFoods: [], requiredFoods: [] };

const EMPTY: PetFormValues = {
  name: "", species: "", breed: "", birthDate: "", weightKg: "", healthConditions: "", foods: NO_FOODS,
};

const TEXT_FIELDS = ["name", "species", "breed", "birthDate", "weightKg", "healthConditions"] as const;

const FOOD_LISTS: { name: FoodListKey; label: string }[] = [
  { name: "allergies", label: "Alergias (opcional)" },
  { name: "forbiddenFoods", label: "Alimentos no permitidos (opcional)" },
  { name: "requiredFoods", label: "Alimentos de necesidad (opcional)" },
];

// RN-010: alta o edición de una mascota. Solo presenta: la validación está en
// src/modules/mascotas/formulario.ts y se hace en el servidor.
export function PetForm({
  petId = null,
  initial = EMPTY,
  species,
  onDone,
}: {
  petId?: string | null;
  initial?: PetFormValues;
  species: string[];
  onDone?: () => void;
}) {
  const [foods, setFoods] = useState<PetFoodLists>(initial.foods);
  const [result, setResult] = useState<PetActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        const formEl = e.currentTarget;
        const form = new FormData(formEl);
        const data = {
          ...Object.fromEntries(TEXT_FIELDS.map((k) => [k, String(form.get(k) ?? "")])),
          // Ids de la lista de alimentos, separados por coma.
          ...Object.fromEntries(FOOD_LISTS.map((l) => [l.name, foods[l.name].map((f) => f.id).join(",")])),
        };
        start(async () => {
          const r = await savePetAction(petId, data);
          setResult(r);
          if (r.ok) {
            if (!petId) {
              formEl.reset();
              setFoods(NO_FOODS);
            }
            onDone?.();
          }
        });
      }}
    >
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input name="name" required maxLength={60} className={inputClass} defaultValue={initial.name} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Especie
        <input
          name="species"
          required
          maxLength={40}
          list="pet-species"
          placeholder="perro, gato…"
          className={inputClass}
          defaultValue={initial.species}
        />
        {/* DT-024: sugerencias de especies ya cargadas. */}
        <datalist id="pet-species">
          {species.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Raza (opcional)
        <input name="breed" maxLength={60} className={inputClass} defaultValue={initial.breed} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Fecha de nacimiento (opcional)
        <input name="birthDate" type="date" className={inputClass} defaultValue={initial.birthDate} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Peso en kg (opcional)
        <input name="weightKg" inputMode="decimal" placeholder="12,5" className={inputClass} defaultValue={initial.weightKg} />
      </label>
      <label className="flex flex-col gap-1 text-sm sm:col-span-2">
        Condiciones de salud (separadas por coma, opcional)
        <input
          name="healthConditions"
          placeholder="displasia de cadera"
          className={inputClass}
          defaultValue={initial.healthConditions}
        />
      </label>
      {FOOD_LISTS.map((l) => (
        <div key={l.name} className="sm:col-span-2">
          <FoodListPicker
            label={l.label}
            value={foods[l.name]}
            onChange={(list) => {
              setFoods((f) => ({ ...f, [l.name]: list }));
              setResult(null);
            }}
          />
        </div>
      ))}
      <div className="flex items-center gap-2 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : petId ? "Guardar cambios" : "Agregar mascota"}
        </Button>
        {result && !result.ok && (
          <span role="alert" className="text-sm text-destructive">
            {result.message}
          </span>
        )}
        {result?.ok && (
          <span role="status" className="text-sm text-success">
            Guardado.
          </span>
        )}
      </div>
    </form>
  );
}

export function DeletePetButton({ petId }: { petId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!confirming) {
    return (
      <Button variant="outline" onClick={() => setConfirming(true)}>
        Borrar mascota
      </Button>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm">¿Seguro? Se borran también sus dietas asignadas.</span>
      <Button
        variant="destructive"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await deletePetAction(petId);
            if (!r.ok) setError(r.message);
          })
        }
      >
        Sí, borrar
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
      {error && <span role="alert" className="text-sm text-destructive">{error}</span>}
    </div>
  );
}
