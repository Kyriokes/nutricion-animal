import { Bird, Cat, CreditCard, Dog, Fish, PawPrint, Rabbit, Stethoscope, Truck, Turtle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { ProductCard } from "@/components/product-card";
import { speciesLabel } from "@/modules/catalogo/presentacion";
import { getFeaturedProducts, getStoreSpecies } from "@/modules/catalogo/repositorio";

const SPECIES_ICONS: Record<string, LucideIcon> = {
  perro: Dog,
  gato: Cat,
  conejo: Rabbit,
  cobayo: Rabbit,
  ave: Bird,
  pez: Fish,
  tortuga: Turtle,
};

// Accesos por especie: las que tienen productos en el catálogo.
async function SpeciesTiles() {
  const species = await getStoreSpecies().catch(() => []);
  if (species.length === 0) return null;
  return (
    <ul className="grid grid-cols-2 gap-3">
      {species.map((s) => {
        const Icon = SPECIES_ICONS[s] ?? PawPrint;
        return (
          <li key={s}>
            <Link
              href={`/catalogo?especie=${encodeURIComponent(s)}`}
              className="flex h-full flex-col gap-3 rounded-2xl bg-primary p-5 text-primary-foreground transition-transform hover:-translate-y-0.5"
            >
              <Icon className="size-9" strokeWidth={1.75} aria-hidden />
              <span className="font-heading text-lg font-bold leading-tight">Para {speciesLabel(s).toLowerCase()}</span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

// VP-01: los productos están cacheados (getFeaturedProducts), así la página
// queda en el HTML estático y se renueva cuando cambia el catálogo.
async function Featured() {
  const featured = await getFeaturedProducts(8);
  if (featured.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-2">
        <h2 className="text-2xl font-bold">Novedades del catálogo</h2>
        <Link href="/catalogo" className="text-sm font-medium underline underline-offset-4">
          Ver todo
        </Link>
      </div>
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {featured.map((p) => (
          <li key={p.id} className="flex">
            <ProductCard product={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

// RN-067, RN-068: lo que se promete acá es lo que el sitio hace hoy.
const FACTS: [LucideIcon, string, string][] = [
  [Truck, "Envíos en Capital Federal", "Por mensajería, con costo fijo."],
  [CreditCard, "Pagás con Mercado Pago", "Con tarjeta o dinero en cuenta."],
  [Stethoscope, "Dietas de nutricionistas", "La de tu mascota, siempre en tu cuenta."],
];

// VP-01: portada de la tienda.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      <section className="border-b bg-secondary text-secondary-foreground">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.4fr_1fr] md:items-center md:py-14">
          <div className="flex flex-col items-start gap-5">
            <h1 className="max-w-xl text-4xl font-bold leading-[1.05] sm:text-5xl">
              Comida de verdad para tu mascota
            </h1>
            <p className="max-w-md">
              Alimentos naturales para perros, gatos y más. Si un nutricionista le armó una dieta, el catálogo te
              muestra qué le sirve y qué no puede comer.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/catalogo"
                className="inline-flex h-10 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/85"
              >
                Ver el catálogo
              </Link>
              <Link
                href="/nutricionistas"
                className="inline-flex h-10 items-center rounded-lg border border-secondary-foreground/30 px-4 text-sm font-medium hover:bg-secondary-foreground/5"
              >
                Buscar un nutricionista
              </Link>
            </div>
          </div>
          <SpeciesTiles />
        </div>
      </section>

      <section aria-label="Cómo compramos" className="border-b">
        <ul className="mx-auto grid w-full max-w-6xl gap-x-8 gap-y-4 px-4 py-5 sm:grid-cols-3">
          {FACTS.map(([Icon, title, text]) => (
            <li key={title} className="flex items-start gap-3">
              <Icon className="mt-0.5 size-6 shrink-0" strokeWidth={1.75} aria-hidden />
              <div>
                <p className="text-sm font-medium">{title}</p>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 py-10">
        <Featured />

        <section className="flex flex-col items-start gap-4 rounded-2xl border p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold">¿Tu mascota necesita una dieta a medida?</h2>
            <p className="max-w-xl text-sm text-muted-foreground">
              Un nutricionista se la arma y la ves en la ficha de tu mascota. Después, el catálogo te marca qué
              productos aportan a esa dieta.
            </p>
          </div>
          <Link
            href="/nutricionistas"
            className="inline-flex h-10 shrink-0 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/85"
          >
            Buscar un nutricionista
          </Link>
        </section>
      </div>
    </main>
  );
}
