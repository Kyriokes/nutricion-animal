"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ROLES, ROLE_LABELS, type Role } from "@/modules/usuarios/roles";
import { updateUserAction, type UpdateUserResult } from "./actions";

// VA-10: roles y nota de un usuario. Solo presenta: las reglas están en
// src/modules/usuarios/gestion.ts y se verifican en el servidor.
export function UserRowForm({
  userId,
  roles,
  adminNote,
}: {
  userId: string;
  roles: Role[];
  adminNote: string | null;
}) {
  const [selected, setSelected] = useState<Role[]>(roles);
  const [note, setNote] = useState(adminNote ?? "");
  const [result, setResult] = useState<UpdateUserResult | null>(null);
  const [pending, start] = useTransition();

  const changed =
    note !== (adminNote ?? "") ||
    selected.length !== roles.length ||
    selected.some((r) => !roles.includes(r));

  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () =>
          setResult(await updateUserAction(userId, { roles: selected, adminNote: note })),
        );
      }}
    >
      <fieldset className="flex flex-wrap gap-x-4 gap-y-1">
        <legend className="sr-only">Roles</legend>
        {ROLES.map((role) => (
          <label key={role} className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(role)}
              onChange={(e) => {
                setResult(null);
                setSelected((s) =>
                  e.target.checked ? [...s, role] : s.filter((r) => r !== role),
                );
              }}
            />
            {ROLE_LABELS[role]}
          </label>
        ))}
      </fieldset>
      {selected.length === 0 && (
        <p className="self-start rounded bg-warning px-1.5 py-0.5 text-sm text-warning-foreground">
          Sin roles: la cuenta queda bloqueada.
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm">
        Nota del administrador (no la ve el usuario)
        <textarea
          className="min-h-16 rounded-lg border border-input bg-background px-2 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          maxLength={500}
          value={note}
          onChange={(e) => {
            setResult(null);
            setNote(e.target.value);
          }}
        />
      </label>
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" disabled={pending || !changed}>
          {pending ? "Guardando…" : "Guardar"}
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
