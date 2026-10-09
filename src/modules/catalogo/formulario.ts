import { normalizeTag, ProductSchema, type Product } from "./schema";

export { normalizeTag };

// Número escrito como en Argentina: punto de miles y coma decimal
// ("12.500,50" → 12500.5). Vacío → undefined; texto inválido → NaN.
function parseNumber(text: string | undefined): number | undefined {
  const t = text?.trim() ?? "";
  if (!t) return undefined;
  return Number(t.replace(/\./g, "").replace(",", "."));
}

const splitTags = (text: string | undefined) =>
  (text ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const NUTRIENTS = ["protein", "fat", "fiber", "ash", "moisture"] as const;

// RN-030: convierte el formulario del catálogo (todo texto) en un producto.
export function parseProductForm(
  form: Record<string, string | undefined>,
): { ok: true; product: Product } | { ok: false; message: string } {
  const text = (k: string) => form[k]?.trim() ?? "";
  const volume = parseNumber(form.volumeValue);
  const nutrients = Object.fromEntries(
    NUTRIENTS.flatMap((k) => {
      const n = parseNumber(form[k]);
      return n === undefined ? [] : [[k, n]];
    }),
  );

  const candidate = {
    name: text("name"),
    description: text("description"),
    price: parseNumber(form.price),
    brand: text("brand"),
    weight: { value: parseNumber(form.weightValue), unit: text("weightUnit") || "g" },
    ...(volume !== undefined ? { volume: { value: volume, unit: text("volumeUnit") || "ml" } } : {}),
    ...(text("imageUrl") ? { image: text("imageUrl") } : {}),
    stock: parseNumber(form.stock) ?? 0,
    petTypes: splitTags(form.petTypes),
    dietTypes: splitTags(form.dietTypes),
    ...(Object.keys(nutrients).length ? { nutritionalInfo: nutrients } : {}),
  };

  const parsed = ProductSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    const field = issue?.path[0];
    const message =
      field === "nutritionalInfo"
        ? "Los valores nutricionales son porcentajes entre 0 y 100"
        : (issue?.message ?? "Datos inválidos");
    return { ok: false, message };
  }
  return { ok: true, product: parsed.data };
}
