import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { ProductForm } from "../product-form";

async function Content() {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "catalog.manage")) return <NoAccess />;
  return <ProductForm />;
}

// VA-02: nuevo producto. La imagen se sube después de crearlo.
export default function NewProductPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/admin/catalogo" className="text-sm underline-offset-4 hover:underline">
        ← Catálogo
      </Link>
      <h1 className="text-2xl font-semibold">Nuevo producto</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
