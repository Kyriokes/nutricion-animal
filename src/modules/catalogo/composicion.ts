import { z } from "zod";
import { parseArgentineNumber } from "@/lib/numeros";

// RN-033: composición de un producto, como en la etiqueta: alimentos de mayor
// a menor peso, con porcentaje optativo (obligatorio para el principal).
// RN-034: alimentos que "puede contener" (trazas), aparte.
export type Ingredient = { foodId: string; percentage?: number };
export type Composition = { ingredients: Ingredient[]; traces: string[] };

// Lo que manda el formulario: el porcentaje como texto ("60", "4,5" o vacío).
const FormSchema = z.object({
  ingredients: z.array(z.object({ foodId: z.uuid(), percentage: z.string().max(10) })).max(40),
  traces: z.array(z.uuid()).max(40),
});

const ordinal = (n: number) => `${n}.º`;

export function parseCompositionForm(
  input: unknown,
): { ok: true; composition: Composition } | { ok: false; message: string } {
  const form = FormSchema.safeParse(input);
  if (!form.success) return { ok: false, message: "Datos de composición inválidos." };

  const ingredients: Ingredient[] = [];
  for (const [i, row] of form.data.ingredients.entries()) {
    const n = parseArgentineNumber(row.percentage);
    if (n === "invalid" || (n !== undefined && (n <= 0 || n > 100))) {
      return {
        ok: false,
        message: `Porcentaje inválido en el ${ordinal(i + 1)} ingrediente: usá un número entre 0 y 100.`,
      };
    }
    ingredients.push(n === undefined ? { foodId: row.foodId } : { foodId: row.foodId, percentage: n });
  }

  if (new Set(ingredients.map((x) => x.foodId)).size !== ingredients.length) {
    return { ok: false, message: "Un alimento aparece dos veces en la composición." };
  }
  if (ingredients.length > 0 && ingredients[0].percentage === undefined) {
    return { ok: false, message: "Indicá el porcentaje del ingrediente principal (el primero)." };
  }
  // De mayor a menor: ningún porcentaje informado supera a uno anterior.
  let previous = Infinity;
  for (const [i, x] of ingredients.entries()) {
    if (x.percentage === undefined) continue;
    if (x.percentage > previous) {
      return {
        ok: false,
        message: `Los ingredientes van de mayor a menor: el ${ordinal(i + 1)} no puede tener más porcentaje que uno anterior.`,
      };
    }
    previous = x.percentage;
  }
  // En centésimas, para no arrastrar errores de punto flotante.
  const total = ingredients.reduce((sum, x) => sum + Math.round((x.percentage ?? 0) * 100), 0);
  if (total > 100 * 100) return { ok: false, message: "Los porcentajes no pueden sumar más de 100." };

  const traces = [...new Set(form.data.traces)];
  if (traces.some((t) => ingredients.some((x) => x.foodId === t))) {
    return { ok: false, message: 'Un alimento no puede estar a la vez en la composición y en "puede contener".' };
  }
  return { ok: true, composition: { ingredients, traces } };
}

const percent = new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 });

// "Pollo (60 %), arroz, zanahoria (4,5 %)": el primero con mayúscula, como
// se lee en una etiqueta.
export function describeComposition(ingredients: readonly { name: string; percentage?: number }[]): string {
  return ingredients
    .map((x, i) => {
      const name = i === 0 ? x.name : x.name.toLowerCase();
      return x.percentage === undefined ? name : `${name} (${percent.format(x.percentage)} %)`;
    })
    .join(", ");
}
