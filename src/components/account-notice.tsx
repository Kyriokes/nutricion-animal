import Link from "next/link";
import { connection } from "next/server";
import { countUnseenDecisions } from "@/modules/usuarios/repositorio";
import { isSuspended } from "@/modules/usuarios/roles";
import { getCurrentUser } from "@/modules/usuarios/sesion";

// Avisos de la cuenta debajo del encabezado. Lee la sesión: va dentro de
// <Suspense> en el layout y se calcula en cada pedido (DT-036).
export async function AccountNotice() {
  await connection();
  const user = await getCurrentUser();
  // RN-046: una cuenta suspendida ya ve su propia pantalla (AccountGate).
  if (!user || isSuspended(user.roles)) return null;

  // RN-045: resultados de postulaciones sin leer.
  const unseen = await countUnseenDecisions(user.id);
  if (unseen === 0) return null;
  return (
    <p role="status" className="bg-accent px-4 py-2 text-sm text-accent-foreground">
      Hay novedades sobre tus postulaciones.{" "}
      <Link href="/perfil" className="font-medium underline underline-offset-4">
        Ver en mi perfil
      </Link>
    </p>
  );
}
