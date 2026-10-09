import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { LoginDialog } from "@/components/login-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentUser } from "@/modules/usuarios/sesion";

// Lee la sesión: con Cache Components va dentro de <Suspense> y se resuelve en
// cada pedido, mientras el resto del encabezado queda estático.
async function UserMenu() {
  // Supabase compara Date.now() con el vencimiento del token. Con Partial
  // Prefetching, Next intentaría preparar esto de antemano con las cookies y
  // rechaza valores que cambian en cada render; connection() lo deja siempre
  // para el momento del pedido, así un bloqueo se nota enseguida.
  await connection();
  const user = await getCurrentUser();
  if (!user) return <LoginDialog />;

  return (
    <div className="flex items-center gap-2">
      {hasPermission(user.roles, "application.decide") && (
        <Link
          href="/admin/postulaciones"
          className="text-sm underline-offset-4 hover:underline"
        >
          Postulaciones
        </Link>
      )}
      {hasPermission(user.roles, "settings.manage") && (
        <Link
          href="/admin/configuracion/apariencia"
          className="text-sm underline-offset-4 hover:underline"
        >
          Apariencia
        </Link>
      )}
      <Link
        href="/perfil"
        className="flex items-center gap-2 rounded-lg underline-offset-4 hover:underline"
        aria-label="Mi perfil"
      >
        {user.photoUrl && (
          <Image
            src={user.photoUrl}
            alt=""
            width={32}
            height={32}
            className="rounded-full"
          />
        )}
        <span className="hidden text-sm sm:inline">{user.name}</span>
      </Link>
      <form action={signOut}>
        <Button type="submit" variant="outline">
          Salir
        </Button>
      </form>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="flex items-center justify-between gap-4 border-b px-4 py-3">
      <Link href="/" className="font-semibold">
        Nutrición animal
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Suspense fallback={<div className="h-8 w-24" aria-hidden />}>
          <UserMenu />
        </Suspense>
      </div>
    </header>
  );
}
