"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  assignDietAction,
  cloneDietAction,
  deleteDietAction,
  deleteVersionAction,
  renameDietAction,
  searchPetsAction,
  unassignDietAction,
  type DietActionResult,
} from "../actions";

const inputClass =
  "h-8 rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Feedback({ result }: { result: DietActionResult | null }) {
  if (!result || result.ok) return null;
  return (
    <span role="alert" className="text-sm text-destructive">
      {result.message}
    </span>
  );
}

// DT-025: renombrar no crea versión.
export function RenameForm({ dietId, name }: { dietId: string; name: string }) {
  const [value, setValue] = useState(name);
  const [result, setResult] = useState<DietActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await renameDietAction(dietId, value)));
      }}
    >
      <input aria-label="Nombre de la dieta" maxLength={80} className={`${inputClass} min-w-56`} value={value} onChange={(e) => setValue(e.target.value)} />
      <Button type="submit" size="sm" variant="outline" disabled={pending || value.trim() === name}>
        Renombrar
      </Button>
      <Feedback result={result} />
    </form>
  );
}

// Botón que ejecuta una acción simple y muestra el error si falla.
function ActionButton({
  label,
  run,
  variant = "outline",
}: {
  label: string;
  run: () => Promise<DietActionResult>;
  variant?: "outline" | "ghost" | "default";
}) {
  const [result, setResult] = useState<DietActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant={variant} disabled={pending} onClick={() => start(async () => setResult(await run()))}>
        {label}
      </Button>
      <Feedback result={result} />
    </span>
  );
}

// RN-027.
export function CloneButton({ dietId }: { dietId: string }) {
  return <ActionButton label="Clonar" run={() => cloneDietAction(dietId)} />;
}

// RN-021: borrar la dieta (solo si nunca se asignó). Pide confirmación.
export function DeleteDietButton({ dietId }: { dietId: string }) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return (
      <Button size="sm" variant="ghost" onClick={() => setConfirming(true)}>
        Borrar dieta
      </Button>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      ¿Seguro?
      <ActionButton label="Sí, borrar" variant="default" run={() => deleteDietAction(dietId)} />
      <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
    </span>
  );
}

// RN-025: solo versiones nunca asignadas, y no la única.
export function DeleteVersionButton({ dietId, versionId }: { dietId: string; versionId: string }) {
  return <ActionButton label="Borrar" variant="ghost" run={() => deleteVersionAction(dietId, versionId)} />;
}

export function UnassignButton({ dietId, assignmentId }: { dietId: string; assignmentId: string }) {
  return <ActionButton label="Terminar" variant="ghost" run={() => unassignDietAction(dietId, assignmentId)} />;
}

type PetResult = Awaited<ReturnType<typeof searchPetsAction>>[number];

// VN-04: buscar un cliente o mascota y asignarle la última versión (RN-023).
export function AssignPet({ dietId }: { dietId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PetResult[] | null>(null);
  const [searching, startSearch] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          startSearch(async () => setResults(await searchPetsAction(query)));
        }}
      >
        <input
          aria-label="Buscar por nombre o email del cliente, o nombre de la mascota"
          placeholder="Nombre, email o mascota"
          minLength={2}
          className={`${inputClass} min-w-64 flex-1`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <Button type="submit" size="sm" variant="secondary" disabled={searching}>
          Buscar
        </Button>
      </form>
      {results && results.length === 0 && (
        <p className="text-sm text-muted-foreground">Sin resultados.</p>
      )}
      {results && results.length > 0 && (
        <ul className="flex flex-col gap-1">
          {results.map((r) => (
            <li key={r.petId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
              <span>
                {r.petName} ({r.species}) · {r.ownerName} · {r.ownerEmail}
              </span>
              <ActionButton label="Asignar" variant="default" run={() => assignDietAction(dietId, r.petId)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
