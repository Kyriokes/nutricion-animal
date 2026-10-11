import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { z } from "zod";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import { ProductImage } from "@/components/product-card";
import { describeComposition } from "@/modules/catalogo/composicion";
import { describeSize, formatPrice, nutritionRows, stockLabel } from "@/modules/catalogo/presentacion";
import { getCatalogProduct, getProductComposition } from "@/modules/catalogo/repositorio";

// VP-05: detalle del producto (solo productos aprobados).
async function Detail({ params }: { params: Promise<{ id: string }> }) {
  const id = z.uuid().safeParse((await params).id);
  const product = id.success ? await getCatalogProduct(id.data) : null;
  if (!product) notFound();

  const nutrients = nutritionRows(product.nutritionalInfo);
  const composition = await getProductComposition(product.id);

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
        <AddToCartButton productId={product.id} stock={product.stock} />
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
        {composition.ingredients.length > 0 && (
          <section className="flex flex-col gap-1 text-sm">
            <h2 className="font-medium">Composición</h2>
            <p>
              {describeComposition(
                composition.ingredients.map((x) => ({ name: x.food.name, percentage: x.percentage })),
              )}
            </p>
            {composition.traces.length > 0 && (
              <p className="text-muted-foreground">
                Puede contener: {composition.traces.map((t) => t.name.toLowerCase()).join(", ")}.
              </p>
            )}
          </section>
        )}
        {nutrients.length > 0 && (
          <section className="flex flex-col gap-1">
            <h2 className="font-medium">Información nutricional (cada 100 g)</h2>
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
