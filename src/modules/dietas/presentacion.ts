import type { DietDuration, FoodConsumptionPattern, FoodItem } from "./schema";

// Textos para mostrar una dieta al cliente (RN-015) y al nutricionista.
export function describePattern(p: FoodConsumptionPattern): string {
  if (p.type === "weekly") {
    if (p.timesPerWeek === 7) return "todos los días";
    return `${p.timesPerWeek} ${p.timesPerWeek === 1 ? "vez" : "veces"} por semana`;
  }
  return p.cycleDays === 1 ? "todos los días" : `cada ${p.cycleDays} días`;
}

export function describeDuration(d: DietDuration): string {
  if (d.type === "indefinite") return "Indefinida";
  return `${d.days} ${d.days === 1 ? "día" : "días"}`;
}

const number = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

export function describeFood(f: FoodItem): string {
  return `${f.name}: ${number.format(f.quantity)} ${f.unit}, ${describePattern(f.pattern)}`;
}
