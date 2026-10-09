"use server";

import { z } from "zod";
import { getCatalogProductsByIds } from "@/modules/catalogo/repositorio";

// VP-07: datos actuales de los productos del carrito (precio, stock, nombre).
// Público: es la misma información que muestra el catálogo.
export async function getCartProductsAction(ids: unknown) {
  const parsed = z.array(z.uuid()).max(100).safeParse(ids);
  if (!parsed.success) return [];
  try {
    const products = await getCatalogProductsByIds(parsed.data);
    return products.map((p) => ({
      id: p.id,
      name: p.name,
      brand: p.brand,
      price: p.price,
      stock: p.stock,
      image: p.image ?? null,
    }));
  } catch {
    return null;
  }
}
