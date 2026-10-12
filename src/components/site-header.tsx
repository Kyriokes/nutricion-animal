import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { CartButton } from "@/components/cart/cart-button";
import { HeaderSearch, SearchForm } from "@/components/header-search";
import { LoginDialog } from "@/components/login-dialog";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { speciesLabel } from "@/modules/catalogo/presentacion";
import { getStoreSpecies } from "@/modules/catalogo/repositorio";
import { accountShortcuts, navigationFor } from "@/modules/usuarios/navegacion";
import { isSuspended } from "@/modules/usuarios/roles";
import { getCurrentUser } from "@/modules/usuarios/sesion";

const bandLink = "shrink-0 rounded-md px-2 py-1 hover:bg-primary-foreground/10";

// La cuenta: quién soy y mis cosas. Lee la sesión: con Cache Components va
// dentro de <Suspense> y se resuelve en cada pedido, mientras el resto del
// encabezado queda estático.
async function AccountArea() {
  // Supabase compara Date.now() con el vencimiento del token. Con Partial
  // Prefetching, Next intentaría preparar esto de antemano con las cookies y
  // rechaza valores que cambian en cada render; connection() lo deja siempre
  // para el momento del pedido, así un bloqueo se nota enseguida.
  await connection();
  const user = await getCurrentUser();
  if (!user) return <LoginDialog triggerVariant="onBrand" />;
  // RN-046: una cuenta suspendida solo puede cerrar sesión.
  if (isSuspended(user.roles)) {
    return (
      <form action={signOut}>
        <Button type="submit" variant="onBrand">
          Salir
        </Button>
      </form>
    );
  }
  return (
    <>
      <UserMenu name={user.name} photoUrl={user.photoUrl ?? null} groups={navigationFor(user.roles)} />
      {accountShortcuts(user.roles).map((item) => (
        <Link key={item.href} href={item.href} className={`${bandLink} hidden md:inline`}>
          {item.label}
        </Link>
      ))}
    </>
  );
}

// Encabezado en dos filas sobre el color de la tienda. Arriba: nombre,
// buscador y carrito. Abajo: la tienda a la izquierda (igual para todos) y la
// cuenta a la derecha (DT-072).
export async function SiteHeader() {
  // Si la base no responde, el encabezado sale sin los enlaces por especie.
  const species = await getStoreSpecies().catch(() => []);
  const store = [
    { href: "/catalogo", label: "Catálogo" },
    ...species.map((s) => ({ href: `/catalogo?especie=${encodeURIComponent(s)}`, label: speciesLabel(s) })),
    { href: "/nutricionistas", label: "Nutricionistas" },
    { href: "/faq", label: "Ayuda" },
  ];
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 pt-3 pb-2">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link href="/" className="font-heading text-xl font-bold tracking-tight">
            Nutrición animal
          </Link>
          <div className="order-last w-full sm:order-none sm:w-auto sm:flex-1">
            <Suspense fallback={<SearchForm />}>
              <HeaderSearch />
            </Suspense>
          </div>
          <div className="ml-auto flex items-center gap-1 sm:ml-0">
            <ThemeToggle />
            <CartButton />
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 text-sm">
          <nav aria-label="Tienda" className="-mx-2 flex min-w-0 items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {store.map((item) => (
              <Link key={item.href} href={item.href} className={bandLink}>
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-1">
            <Suspense fallback={<div className="h-8 w-24" aria-hidden />}>
              <AccountArea />
            </Suspense>
          </div>
        </div>
      </div>
    </header>
  );
}
