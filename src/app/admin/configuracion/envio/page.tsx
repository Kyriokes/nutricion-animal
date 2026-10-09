import { connection } from "next/server";
import { Suspense } from "react";
import { NoAccess } from "@/components/no-access";
import { CARRIER } from "@/modules/pedidos/envio";
import { getShippingCost } from "@/modules/pedidos/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import { ShippingForm } from "./shipping-form";

// Muestra el monto como se escribe en el formulario: "3.000" o "2.500,50".
const toInput = (n: number) =>
  n.toLocaleString("es-AR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

// VA-08, RN-068: configuración del envío.
async function Content() {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "settings.manage")) return <NoAccess />;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Envío simulado: solo dentro de Capital, con un costo fijo por pedido. Reparte {CARRIER}.
        El cambio rige para los pedidos nuevos.
      </p>
      <ShippingForm initial={toInput(await getShippingCost())} />
    </div>
  );
}

export default function ShippingSettingsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="text-2xl font-semibold">Envío</h1>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content />
      </Suspense>
    </main>
  );
}
