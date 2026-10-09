"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import type { ApplicationKind } from "@/modules/usuarios/postulaciones";
import { formatAddress, type Address } from "@/modules/usuarios/direcciones";
import {
  addAddressAction,
  deleteAddressAction,
  markDecisionsSeenAction,
  saveProfessionalProfileAction,
  submitApplicationAction,
  updateNameAction,
  type ActionResult,
} from "./actions";

const inputClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

function Message({ result }: { result: ActionResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <p role="status" className="text-sm text-success">
      Listo.
    </p>
  ) : (
    <p role="alert" className="text-sm text-destructive">
      {result.message}
    </p>
  );
}

// VU-01: editar el nombre.
export function NameForm({ name }: { name: string }) {
  const [value, setValue] = useState(name);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setResult(await updateNameAction({ name: value })));
      }}
    >
      <label htmlFor="name" className="text-sm font-medium">
        Nombre
      </label>
      <div className="flex gap-2">
        <input
          id="name"
          className={inputClass}
          value={value}
          maxLength={80}
          onChange={(e) => {
            setValue(e.target.value);
            setResult(null);
          }}
        />
        <Button type="submit" disabled={pending || value.trim() === name}>
          {pending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
      <Message result={result} />
    </form>
  );
}

// VN-05, RN-029: perfil profesional del nutricionista.
export function ProfessionalProfileForm({
  profile,
}: {
  profile: { address: string; phone: string; licenseNumber: string } | null;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const data = Object.fromEntries(
          FIELDS.nutritionist.map((f) => [f.name, String(form.get(f.name) ?? "")]),
        );
        start(async () => setResult(await saveProfessionalProfileAction(data)));
      }}
    >
      {FIELDS.nutritionist.map((f) => (
        <div key={f.name} className="flex flex-col gap-1">
          <label htmlFor={`pro-${f.name}`} className="text-sm">
            {f.label}
            {f.name === "licenseNumber" && " (no la ven los clientes)"}
          </label>
          <input
            id={`pro-${f.name}`}
            name={f.name}
            type={f.type ?? "text"}
            required
            className={inputClass}
            placeholder={f.placeholder}
            defaultValue={profile?.[f.name as keyof typeof profile] ?? ""}
            onChange={() => setResult(null)}
          />
        </div>
      ))}
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : "Guardar perfil profesional"}
        </Button>
      </div>
      <Message result={result} />
    </form>
  );
}

const ADDRESS_FIELDS = [
  { name: "city", label: "Ciudad", placeholder: "CABA", required: true },
  { name: "street", label: "Calle", placeholder: "Av. Corrientes", required: true },
  { name: "number", label: "Altura", placeholder: "1234", required: true },
  { name: "floor", label: "Piso (opcional)", placeholder: "4", required: false },
  { name: "apartment", label: "Depto. (opcional)", placeholder: "B", required: false },
] as const;

// RN-017: direcciones de entrega, como en un delivery de comida.
export function AddressesSection({
  addresses,
  max,
}: {
  addresses: (Address & { id: string })[];
  max: number;
}) {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {addresses.length === 0 ? (
        <p className="text-sm text-muted-foreground">Todavía no cargaste direcciones.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {addresses.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm">
              <span>{formatAddress(a)}</span>
              <Button
                size="sm"
                variant="ghost"
                disabled={pending}
                onClick={() => start(async () => setResult(await deleteAddressAction(a.id)))}
              >
                Eliminar
              </Button>
            </li>
          ))}
        </ul>
      )}

      {addresses.length < max && (
        <form
          className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_2fr_1fr_1fr_1fr]"
          onSubmit={(e) => {
            e.preventDefault();
            const formEl = e.currentTarget;
            const form = new FormData(formEl);
            const data = Object.fromEntries(
              ADDRESS_FIELDS.map((f) => [f.name, String(form.get(f.name) ?? "")]),
            );
            start(async () => {
              const r = await addAddressAction(data);
              setResult(r);
              if (r.ok) formEl.reset();
            });
          }}
        >
          {ADDRESS_FIELDS.map((f) => (
            <label key={f.name} className="flex flex-col gap-1 text-sm">
              {f.label}
              <input
                name={f.name}
                required={f.required}
                className={inputClass}
                placeholder={f.placeholder}
                maxLength={f.name === "street" ? 120 : f.name === "city" ? 80 : 10}
              />
            </label>
          ))}
          <div className="col-span-full">
            <Button type="submit" disabled={pending}>
              {pending ? "Guardando…" : "Agregar dirección"}
            </Button>
          </div>
        </form>
      )}
      <Message result={result} />
    </div>
  );
}

// RN-045: marcar como leídos los resultados de las postulaciones.
export function MarkSeenButton() {
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() => start(async () => setResult(await markDecisionsSeenAction()))}
      >
        Entendido
      </Button>
      {result && !result.ok && <Message result={result} />}
    </div>
  );
}

const FIELDS: Record<
  ApplicationKind,
  { name: string; label: string; placeholder: string; type?: string }[]
> = {
  // Sección 7 de las reglas: dirección, contacto y matrícula.
  nutritionist: [
    { name: "address", label: "Dirección", placeholder: "Av. Siempre Viva 742, CABA" },
    { name: "phone", label: "Teléfono de contacto", placeholder: "+54 11 5555-1234", type: "tel" },
    { name: "licenseNumber", label: "Matrícula o certificación", placeholder: "MP-12345" },
  ],
  // Primera versión: solo el nombre del negocio (campos a definir).
  supplier: [
    { name: "businessName", label: "Nombre del negocio", placeholder: "Natural Pet" },
  ],
};

const TITLES: Record<ApplicationKind, string> = {
  nutritionist: "Postularme como nutricionista",
  supplier: "Postularme como proveedor",
};

// RN-024: formulario de postulación. Se muestra cerrado; el usuario lo abre.
export function ApplicationForm({ kind }: { kind: ApplicationKind }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>
        {TITLES[kind]}
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-lg border p-4"
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        const data = Object.fromEntries(
          FIELDS[kind].map((f) => [f.name, String(form.get(f.name) ?? "")]),
        );
        start(async () => {
          const r = await submitApplicationAction({ kind, ...data });
          setResult(r);
        });
      }}
    >
      <p className="font-medium">{TITLES[kind]}</p>
      {FIELDS[kind].map((f) => (
        <div key={f.name} className="flex flex-col gap-1">
          <label htmlFor={`${kind}-${f.name}`} className="text-sm">
            {f.label}
          </label>
          <input
            id={`${kind}-${f.name}`}
            name={f.name}
            type={f.type ?? "text"}
            required
            className={inputClass}
            placeholder={f.placeholder}
          />
        </div>
      ))}
      <p className="text-sm text-muted-foreground">
        Un administrador o un auditor revisa tu postulación. Mientras tanto
        seguís usando tu cuenta como siempre.
      </p>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Enviando…" : "Enviar postulación"}
        </Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
          Cancelar
        </Button>
      </div>
      <Message result={result} />
    </form>
  );
}
