import { PawPrint } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { describeSize, formatPrice, stockLabel } from "@/modules/catalogo/presentacion";
import { describeBlock, type PetEvaluation } from "@/modules/catalogo/mascota";
import type { StoredProduct } from "@/modules/catalogo/repositorio";

// Imagen del producto o un ícono si no tiene (productos de prueba, RN-031).
export function ProductImage({ product, size }: { product: StoredProduct; size: number }) {
  if (product.image) {
    return (
      <Image
        src={product.image}
        alt={product.name}
        width={size}
        height={size}
        className="aspect-square w-full rounded-md object-cover"
      />
    );
  }
  return (
    <div className="flex aspect-square w-full items-center justify-center rounded-md bg-muted text-muted-foreground">
      <PawPrint className="size-10" aria-hidden />
    </div>
  );
}

// VP-04: tarjeta de un producto en el catálogo.
export function ProductCard({ product }: { product: StoredProduct }) {
  return (
    <Link
      href={`/catalogo/${product.id}`}
      className="flex flex-col gap-2 rounded-lg border p-3 hover:bg-muted"
    >
      <ProductImage product={product} size={240} />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{product.brand}</span>
        <span className="font-medium leading-snug">{product.name}</span>
        <span className="text-sm text-muted-foreground">{describeSize(product)}</span>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="font-semibold">{formatPrice(product.price)}</span>
        <span className={`text-xs ${product.stock === 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {stockLabel(product.stock)}
        </span>
      </div>
    </Link>
  );
}

// RN-037: tarjeta con el filtro por mascota. Si el producto contiene, o puede
// contener, algo que la mascota no puede comer, queda tapada por una capa
// con la advertencia y no lleva al producto (no se puede elegir desde acá).
// Si no, dice qué aporta de su dieta y de sus alimentos de necesidad.
export function PetProductCard({
  product,
  pet,
  evaluation,
}: {
  product: StoredProduct;
  pet: { id: string; name: string };
  evaluation: PetEvaluation;
}) {
  if (evaluation.blocked.length > 0) {
    return (
      <div className="relative flex w-full flex-col gap-2 rounded-lg border p-3" aria-disabled>
        <div className="flex flex-col gap-2 opacity-30" aria-hidden>
          <ProductImage product={product} size={240} />
          <span className="font-medium leading-snug">{product.name}</span>
          <span className="font-semibold">{formatPrice(product.price)}</span>
        </div>
        <div
          role="note"
          className="absolute inset-0 flex flex-col justify-center gap-1 rounded-lg bg-background/80 p-3 text-sm backdrop-blur-[1px]"
        >
          <span className="font-medium text-destructive">No apto para {pet.name}</span>
          <span className="text-xs text-muted-foreground">{product.name}</span>
          {evaluation.blocked.map((b) => (
            <span key={`${b.food}-${b.how}`}>{describeBlock(b, pet.name)}</span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <Link
      href={`/catalogo/${product.id}?mascota=${pet.id}`}
      className="flex w-full flex-col gap-2 rounded-lg border p-3 hover:bg-muted"
    >
      <ProductImage product={product} size={240} />
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-muted-foreground">{product.brand}</span>
        <span className="font-medium leading-snug">{product.name}</span>
        <span className="text-sm text-muted-foreground">{describeSize(product)}</span>
      </div>
      {evaluation.dietFoods.length > 0 && (
        <span className="text-xs text-success">Aporta de su dieta: {evaluation.dietFoods.join(", ").toLowerCase()}</span>
      )}
      {evaluation.requiredFoods.length > 0 && (
        <span className="text-xs text-success">
          Alimentos de necesidad: {evaluation.requiredFoods.join(", ").toLowerCase()}
        </span>
      )}
      {evaluation.unknownComposition && (
        <span className="text-xs text-muted-foreground">Composición no informada: verificá la etiqueta.</span>
      )}
      <div className="mt-auto flex items-center justify-between gap-2">
        <span className="font-semibold">{formatPrice(product.price)}</span>
        <span className={`text-xs ${product.stock === 0 ? "text-destructive" : "text-muted-foreground"}`}>
          {stockLabel(product.stock)}
        </span>
      </div>
    </Link>
  );
}
