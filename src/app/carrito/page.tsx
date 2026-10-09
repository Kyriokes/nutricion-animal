import { connection } from "next/server";
import { Suspense } from "react";
import { getCurrentUser } from "@/modules/usuarios/sesion";
import { CartView } from "./cart-view";

// Lee la sesión solo para saber si pedir ingresar (VP-08).
async function Content() {
  await connection();
  const user = await getCurrentUser();
  return <CartView signedIn={user !== null} />;
}

// VP-07: carrito de compras (funciona sin sesión).
export default function CartPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Carrito</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
