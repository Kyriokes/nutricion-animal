import { PawPrint } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { describeSize, formatPrice, stockLabel } from "@/modules/catalogo/presentacion";
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
