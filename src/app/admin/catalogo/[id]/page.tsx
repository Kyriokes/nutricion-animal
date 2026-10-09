import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";
import { NoAccess } from "@/components/no-access";
import { ProductImage } from "@/components/product-card";
import { getProduct, type StoredProduct } from "@/modules/catalogo/repositorio";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";
import {
  DeleteProductButton,
  ProductForm,
  ProductImageForm,
  type ProductFormValues,
} from "../product-form";

const decimal = (n: number | undefined) => (n === undefined ? "" : String(n).replace(".", ","));

function toFormValues(p: StoredProduct): ProductFormValues {
  const n = p.nutritionalInfo;
  return {
    name: p.name,
    description: p.description,
    price: decimal(p.price),
    brand: p.brand,
    weightValue: decimal(p.weight.value),
    weightUnit: p.weight.unit,
    volumeValue: decimal(p.volume?.value),
    volumeUnit: p.volume?.unit ?? "ml",
    stock: String(p.stock),
    petTypes: p.petTypes.join(", "),
    dietTypes: p.dietTypes.join(", "),
    protein: decimal(n?.protein),
    fat: decimal(n?.fat),
    fiber: decimal(n?.fiber),
    ash: decimal(n?.ash),
    moisture: decimal(n?.moisture),
  };
}

// VA-02: editar un producto, su imagen, o borrarlo.
async function Content({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const actor = await getCurrentActor();
  if (!actor || !hasPermission(actor.roles, "catalog.manage")) return <NoAccess />;
  const id = z.uuid().safeParse((await params).id);
  const product = id.success ? await getProduct(id.data) : null;
  if (!product) return <p className="text-muted-foreground">No encontramos ese producto.</p>;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{product.name}</h1>
        {product.status === "approved" && (
          <Link href={`/catalogo/${product.id}`} className="text-sm underline underline-offset-4">
            Ver en el catálogo
          </Link>
        )}
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Imagen</h2>
        <div className="w-40">
          <ProductImage product={product} size={160} />
        </div>
        <ProductImageForm productId={product.id} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Datos</h2>
        <ProductForm key={product.id} productId={product.id} initial={toFormValues(product)} />
      </section>
      <DeleteProductButton productId={product.id} />
    </div>
  );
}

export default function EditProductPage({ params }: PageProps<"/admin/catalogo/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-8">
      <Link href="/admin/catalogo" className="text-sm underline-offset-4 hover:underline">
        ← Catálogo
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Cargando…</p>}>
        <Content params={params} />
      </Suspense>
    </main>
  );
}
