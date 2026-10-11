import { z } from "zod";

// RN-032: nombres de alimentos. La lista es única y la comparten productos,
// dietas y mascotas, así que hay que evitar duplicados ("Zanahoria" y
// "zanahorias") sin bloquear a quien carga uno nuevo: se lo avisa.

// Forma con la que se comparan y se guardan como únicos: minúsculas, sin
// tildes y sin espacios de más. Tiene que coincidir con food_normalize() en
// la base (migración de alimentos), que hace lo mismo con unaccent.
export function normalizeFoodName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Letras (con tildes y ñ), números, espacios y guiones: "Omega 3", "Arroz
// integral", "Hígado vacuno".
export const FoodNameSchema = z
  .string()
  .trim()
  .min(2, "El alimento: al menos 2 caracteres.")
  .max(60, "El alimento: hasta 60 caracteres.")
  .regex(/^[\p{L}\p{N}][\p{L}\p{N} '-]*$/u, "El alimento solo puede tener letras, números y espacios.");

// Singular aproximado en castellano, palabra por palabra, para comparar:
// "nueces" → "nuez", "limones" → "limon", "zanahorias" → "zanahoria".
function singularWord(w: string): string {
  if (w.length <= 4) return w;
  if (w.endsWith("ces")) return `${w.slice(0, -3)}z`;
  if (/[^aeiou]es$/.test(w)) return w.slice(0, -2);
  if (w.endsWith("s")) return w.slice(0, -1);
  return w;
}

export function singularKey(name: string): string {
  return normalizeFoodName(name).split(" ").map(singularWord).join(" ");
}

function levenshtein(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return row[b.length];
}

const STOPWORDS = new Set(["de", "del", "con", "y", "en", "la", "el", "los", "las", "a", "al"]);
const words = (key: string) => key.split(" ").filter((w) => !STOPWORDS.has(w));

// Dos nombres "se parecen" si son el mismo en singular, si difieren en una
// letra (dos si son largos), o si todas las palabras de uno están en el otro
// ("arroz" y "arroz integral", "pollo" y "muslo de pollo").
function looksAlike(a: string, b: string): boolean {
  if (a === b) return true;
  const max = Math.min(a.length, b.length) >= 9 ? 2 : Math.min(a.length, b.length) >= 5 ? 1 : 0;
  if (max > 0 && levenshtein(a, b) <= max) return true;
  const wa = words(a);
  const wb = words(b);
  if (wa.length === 0 || wb.length === 0) return false;
  const [short, long] = wa.length <= wb.length ? [wa, wb] : [wb, wa];
  return short.every((w) => long.includes(w));
}

export type FoodCandidate = { id: string; name: string; aliases: readonly string[] };

// Alimentos existentes que se parecen al nombre nuevo (por su nombre o por
// algún sinónimo), para avisar antes de crear un duplicado.
export function findSimilarFoods<T extends FoodCandidate>(name: string, foods: readonly T[]): T[] {
  const key = singularKey(name);
  return foods.filter((f) => [f.name, ...f.aliases].some((n) => looksAlike(key, singularKey(n))));
}
