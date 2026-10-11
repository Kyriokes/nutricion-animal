import type { NutritionalInfo, Product } from "./schema";

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

const ROWS = [
  ["protein", "Proteína (mín.)"],
  ["fat", "Grasa (mín.)"],
  ["fiber", "Fibra (máx.)"],
  ["moisture", "Humedad (máx.)"],
  ["ash", "Cenizas"],
] as const;

// RN-035: filas de la tabla nutricional, como el análisis garantizado de los
// alimentos para mascotas (cada 100 g), con las calorías al final.
export function nutritionRows(info: NutritionalInfo | undefined): [string, string][] {
  if (!info) return [];
  const rows: [string, string][] = ROWS.flatMap(([key, label]) =>
    info[key] === undefined ? [] : [[label, `${number.format(info[key])} %`] as [string, string]],
  );
  if (info.kcalPerKg !== undefined) rows.push(["Calorías", `${number.format(info.kcalPerKg)} kcal/kg`]);
  return rows;
}
