import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { LoginDialog } from "@/components/login-dialog";
import { listPublicNutritionists } from "@/modules/usuarios/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

// VU-08, RN-012: buscar nutricionistas. Vista con sesión (sección 4.2).
async function Content() {
  // Lee la sesión: siempre en el momento del pedido (DT-036).
  await connection();
  const actor = await getCurrentActor();
  if (!actor) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p>Ingresá para ver los nutricionistas.</p>
        <LoginDialog />
      </div>
    );
  }
  if (!hasPermission(actor.roles, "nutritionist.search")) {
    return <p>No tenés permisos para ver esta página.</p>;
  }

  const nutritionists = await listPublicNutritionists();
  if (nutritionists.length === 0) {
    return <p className="text-muted-foreground">Todavía no hay nutricionistas.</p>;
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {nutritionists.map((n) => (
        <li key={n.userId}>
          <Link
            href={`/nutricionistas/${n.userId}`}
            className="flex items-center gap-3 rounded-lg border p-4 hover:bg-muted"
          >
            {n.photoUrl && (
              <Image src={n.photoUrl} alt="" width={48} height={48} className="rounded-full" />
            )}
            <div>
              <p className="font-medium">{n.name}</p>
              <p className="text-sm text-muted-foreground">{n.address}</p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function NutritionistsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Nutricionistas</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
