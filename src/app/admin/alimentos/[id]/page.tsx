import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { NoAccess } from "@/components/no-access";
import { getFood } from "@/modules/alimentos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { FoodAdminForms } from "../food-forms";

// RN-032: un alimento de la lista, para renombrarlo, cargar sinónimos o unirlo.
async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "food.manage")) return <NoAccess />;
  const id = z.uuid().safeParse((await params).id);
  const food = id.success ? await getFood(id.data) : null;
  if (!food) return <p className="text-muted-foreground">No encontramos ese alimento.</p>;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">{food.name}</h1>
      <FoodAdminForms key={food.id} food={food} />
    </div>
  );
}

export default function AdminFoodPage({ params }: PageProps<"/admin/alimentos/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/admin/alimentos" className="text-sm underline-offset-4 hover:underline">
        ← Alimentos
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
