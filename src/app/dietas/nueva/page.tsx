import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { DietEditor } from "../diet-editor";

// VN-03: crear una dieta (RN-021).
async function Content() {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "diet.manage")) {
    return <p>Esta sección es para nutricionistas.</p>;
  }
  return <DietEditor mode="create" />;
}

export default function NewDietPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/dietas" className="text-sm underline-offset-4 hover:underline">
        ← Mis dietas
      </Link>
      <h1 className="text-2xl font-semibold">Nueva dieta</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
