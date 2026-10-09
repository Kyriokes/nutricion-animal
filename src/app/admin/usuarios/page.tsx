import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { listUsers } from "@/modules/usuarios/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { UserRowForm } from "./user-row-form";

const dateFormat = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" });

// VA-10: gestión de usuarios y roles. Solo el admin (user.manage_roles).
async function Content() {
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "user.manage_roles")) {
    // VP-13: acceso sin permisos.
    return (
      <div className="flex flex-col gap-2">
        <p>No tenés permisos para ver esta página.</p>
        <Link href="/" className="text-primary underline underline-offset-4">
          Volver al inicio
        </Link>
      </div>
    );
  }

  const users = await listUsers();
  return (
    <ul className="flex flex-col gap-4">
      {users.map((u) => (
        <li key={u.id} className="flex flex-col gap-3 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            {u.photoUrl && (
              <Image src={u.photoUrl} alt="" width={40} height={40} className="rounded-full" />
            )}
            <div>
              <p className="font-medium">
                {u.name}
                {u.id === actor.id && " (vos)"}
              </p>
              <p className="text-sm text-muted-foreground">
                {u.email} · desde el {dateFormat.format(u.createdAt)}
              </p>
            </div>
          </div>
          <UserRowForm userId={u.id} roles={u.roles} adminNote={u.adminNote} />
        </li>
      ))}
    </ul>
  );
}

export default function UsersPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold">Usuarios y roles</h1>
        <p className="text-muted-foreground">
          Nombrá auditores, ajustá roles o bloqueá una cuenta dejándola sin roles,
          con una nota del motivo.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
