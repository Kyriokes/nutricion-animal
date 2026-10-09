import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { getFeaturedProducts } from "@/modules/catalogo/repositorio";

// VP-01: landing. Los destacados están cacheados (getFeaturedProducts), así la
// página queda en el HTML estático y se renueva cuando cambia el catálogo.
async function Featured() {
  const featured = await getFeaturedProducts(4);
  if (featured.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-xl font-semibold">Del catálogo</h2>
        <Link href="/catalogo" className="text-sm underline underline-offset-4">
          Ver todo
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {featured.map((p) => (
          <li key={p.id} className="flex">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-12 px-4 py-12">
      <section className="flex flex-col items-start gap-4">
        <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">
          Comida natural para tu mascota, con el respaldo de nutricionistas
        </h1>
        <p className="max-w-xl text-muted-foreground">
          Encontrá alimentos naturales para perros, gatos y más. Si un
          nutricionista le armó una dieta a tu mascota, la ves en tu cuenta.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/catalogo"
            className="inline-flex h-9 items-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
          >
            Ver el catálogo
          </Link>
          <Link
            href="/nutricionistas"
            className="inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            Buscar un nutricionista
          </Link>
        </div>
      </section>

      <Featured />

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          ["Alimentos naturales", "Productos con ingredientes reales, filtrados por especie y tipo de dieta."],
          ["Dietas de nutricionistas", "Tu nutricionista asigna la dieta y la ves en el perfil de tu mascota."],
          ["Todo en un lugar", "Cargá tus mascotas, sus alergias y lo que no pueden comer."],
        ].map(([title, text]) => (
          <div key={title} className="rounded-lg border p-4">
            <h2 className="font-medium">{title}</h2>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
