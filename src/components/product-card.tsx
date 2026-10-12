import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { ProductIllustration } from "@/components/product-illustration";
import { illustrationFor, illustrationVariant } from "@/modules/catalogo/ilustracion";
import { describeSize, formatPrice, stockLabel } from "@/modules/catalogo/presentacion";
import { describeBlock, type PetEvaluation } from "@/modules/catalogo/mascota";
import type { StoredProduct } from "@/modules/catalogo/repositorio";

// Imagen del producto, o un dibujo según el tipo de producto si no tiene
// (productos de prueba, RN-031).
export function ProductImage({
  product,
  size,
  className = "rounded-md",
}: {
  product: StoredProduct;
  size: number;
  className?: string;
}) {
  if (product.image) {
    return (
      <Image
        src={product.image}
        alt={product.name}
        width={size}
        height={size}
        className={`aspect-square w-full object-cover ${className}`}
      />
    );
  }
  return (
    <ProductIllustration
      kind={illustrationFor(product.name)}
      variant={illustrationVariant(product.name, 4)}
      label={product.name}
      className={className}
    />
  );
}

// Todas las tarjetas miden lo mismo: imagen cuadrada, marca en una línea,
// nombre en dos líneas fijas y el precio abajo.
const cardClass = "flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card text-card-foreground";
const linkClass = `${cardClass} transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`;

function CardImage({ product }: { product: StoredProduct }) {
  return (
    <div className="relative border-b">
      <ProductImage product={product} size={320} className="" />
      {product.stock === 0 && (
        <span className="absolute left-2 top-2 rounded-md bg-foreground px-2 py-0.5 text-xs font-medium text-background">
          Sin stock
        </span>
      )}
    </div>
  );
}

function CardBody({ product, children }: { product: StoredProduct; children?: ReactNode }) {
  const stock = stockLabel(product.stock);
  return (
    <div className="flex flex-1 flex-col gap-1 p-3">
      <span className="truncate text-xs text-muted-foreground">{product.brand}</span>
      <span className="line-clamp-2 min-h-10 text-sm font-medium leading-5">{product.name}</span>
      <span className="text-xs text-muted-foreground">{describeSize(product)}</span>
      {children}
      <div className="mt-auto flex flex-wrap items-baseline justify-between gap-x-2 pt-2">
        <span className={`font-heading text-xl font-bold ${product.stock === 0 ? "text-muted-foreground" : ""}`}>
          {formatPrice(product.price)}
        </span>
        {product.stock > 0 && stock !== "En stock" && <span className="text-xs text-warning">{stock}</span>}
      </div>
    </div>
  );
}

// VP-04: tarjeta de un producto en el catálogo.
export function ProductCard({ product }: { product: StoredProduct }) {
  return (
    <Link href={`/catalogo/${product.id}`} className={linkClass}>
      <CardImage product={product} />
      <CardBody product={product} />
    </Link>
  );
}

// RN-037: qué aporta el producto para la mascota, en dos líneas fijas para
// que todas las tarjetas midan lo mismo.
function petNote(evaluation: PetEvaluation): { text: string; good: boolean } | null {
  const parts = [
    evaluation.dietFoods.length > 0 && `Aporta de su dieta: ${evaluation.dietFoods.join(", ").toLowerCase()}.`,
    evaluation.requiredFoods.length > 0 && `De necesidad: ${evaluation.requiredFoods.join(", ").toLowerCase()}.`,
  ].filter((p): p is string => Boolean(p));
  if (parts.length > 0) return { text: parts.join(" "), good: true };
  if (evaluation.unknownComposition) return { text: "Composición no informada: verificá la etiqueta.", good: false };
  return null;
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
  const note = petNote(evaluation);
  const noteLine = (
    <span
      title={note?.text}
      className={`line-clamp-2 min-h-8 text-xs leading-4 ${note?.good ? "text-success" : "text-muted-foreground"}`}
    >
      {note?.text}
    </span>
  );
  if (evaluation.blocked.length > 0) {
    return (
      <div className={`${cardClass} relative`} aria-disabled>
        <div className="flex flex-1 flex-col opacity-30" aria-hidden>
          <CardImage product={product} />
          <CardBody product={product}>{noteLine}</CardBody>
        </div>
        <div
          role="note"
          className="absolute inset-0 flex flex-col justify-center gap-1 bg-background/80 p-3 text-sm backdrop-blur-[1px]"
        >
          <span className="font-heading font-bold text-destructive">No apto para {pet.name}</span>
          <span className="text-xs text-muted-foreground">{product.name}</span>
          {evaluation.blocked.map((b) => (
            <span key={`${b.food}-${b.how}`}>{describeBlock(b, pet.name)}</span>
          ))}
        </div>
      </div>
    );
  }
  return (
    <Link href={`/catalogo/${product.id}?mascota=${pet.id}`} className={linkClass}>
      <CardImage product={product} />
      <CardBody product={product}>{noteLine}</CardBody>
    </Link>
  );
}
