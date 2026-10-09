import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { LoginDialog } from "@/components/login-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { navigationFor } from "@/modules/usuarios/navegacion";
import { isSuspended } from "@/modules/usuarios/roles";
import { getCurrentUser } from "@/modules/usuarios/sesion";

// Lee la sesión: con Cache Components va dentro de <Suspense> y se resuelve en
// cada pedido, mientras el resto del encabezado queda estático.
async function UserArea() {
  // Supabase compara Date.now() con el vencimiento del token. Con Partial
  // Prefetching, Next intentaría preparar esto de antemano con las cookies y
  // rechaza valores que cambian en cada render; connection() lo deja siempre
  // para el momento del pedido, así un bloqueo se nota enseguida.
  await connection();
  const user = await getCurrentUser();
  if (!user) return <LoginDialog />;
  // RN-046: una cuenta suspendida solo puede cerrar sesión.
  if (isSuspended(user.roles)) {
    return (
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Salir
        </Button>
      </form>
    );
  }
  return (
    <UserMenu
      name={user.name}
      photoUrl={user.photoUrl ?? null}
      groups={navigationFor(user.roles)}
    />
  );
}

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
      <nav className="flex items-center gap-4">
        <Link href="/" className="font-semibold">
          Nutrición animal
        </Link>
        <Link href="/catalogo" className="text-sm underline-offset-4 hover:underline">
          Catálogo
        </Link>
      </nav>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Suspense fallback={<div className="h-9 w-24" aria-hidden />}>
          <UserArea />
        </Suspense>
      </div>
    </header>
  );
}
