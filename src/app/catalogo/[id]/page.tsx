import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { ProductImage } from "@/components/product-card";
import { describeSize, formatPrice, stockLabel } from "@/modules/catalogo/presentacion";
import { getCatalogProduct } from "@/modules/catalogo/repositorio";

const NUTRIENT_LABELS = {
  protein: "Proteína",
  fat: "Grasa",
  fiber: "Fibra",
  ash: "Cenizas",
  moisture: "Humedad",
} as const;

// VP-05: detalle del producto (solo productos aprobados).
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  const product = id.success ? await getCatalogProduct(id.data) : null;
  if (!product) notFound();

  const nutrients = Object.entries(NUTRIENT_LABELS).flatMap(([key, label]) => {
    const value = product.nutritionalInfo?.[key as keyof typeof NUTRIENT_LABELS];
    return value === undefined ? [] : [[label, `${String(value).replace(".", ",")} %`] as const];
  });

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <ProductImage product={product} size={560} />
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm text-muted-foreground">{product.brand}</p>
          <h1 className="text-2xl font-semibold">{product.name}</h1>
          <p className="text-muted-foreground">{describeSize(product)}</p>
        </div>
        <p className="text-2xl font-semibold">{formatPrice(product.price)}</p>
        <p className={product.stock === 0 ? "text-destructive" : "text-muted-foreground"}>
          {stockLabel(product.stock)}
        </p>
        <p>{product.description}</p>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">Apto para</dt>
          <dd>{product.petTypes.join(", ")}</dd>
          {product.dietTypes.length > 0 && (
            <>
              <dt className="text-muted-foreground">Tipo de dieta</dt>
              <dd>{product.dietTypes.join(", ")}</dd>
            </>
          )}
        </dl>
        {nutrients.length > 0 && (
          <section className="flex flex-col gap-1">
            <h2 className="font-medium">Información nutricional</h2>
            <table className="w-full max-w-xs text-sm">
              <tbody>
                {nutrients.map(([label, value]) => (
                  <tr key={label} className="border-b">
                    <td className="py-1 text-muted-foreground">{label}</td>
                    <td className="py-1 text-right">{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {product.nutritionalInfo?.notes && (
              <p className="text-sm text-muted-foreground">{product.nutritionalInfo.notes}</p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

export default function ProductPage({ params }: PageProps<"/catalogo/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/catalogo" className="text-sm underline-offset-4 hover:underline">
        ← Catálogo
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Detail params={params} />
      </Suspense>
    </main>
  );
}
