import type { Product } from "./schema";

const wholePesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const withCents = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" });
const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

// Precio en pesos argentinos: sin centavos si es entero ("$ 1.900"); si no,
// siempre con dos decimales ("$ 12.500,50").
export function formatPrice(price: number): string {
  return Number.isInteger(price) ? wholePesos.format(price) : withCents.format(price);
}

// Ej.: "3 kg" o "500 g · 500 ml".
export function describeSize(p: Pick<Product, "weight" | "volume">): string {
  const parts = [`${number.format(p.weight.value)} ${p.weight.unit}`];
  if (p.volume) parts.push(`${number.format(p.volume.value)} ${p.volume.unit}`);
  return parts.join(" · ");
}

const LOW_STOCK = 5;

export function stockLabel(stock: number): string {
  if (stock === 0) return "Sin stock";
  if (stock <= LOW_STOCK) return `Últimas ${stock} unidades`;
  return "En stock";
}
