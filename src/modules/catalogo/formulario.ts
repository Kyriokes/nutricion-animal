import { normalizeTag, ProductSchema, type Product } from "./schema";

export { normalizeTag };

// Números como se escriben en Argentina. Solo dos formatos, para no
// interpretar mal "12.5" (¿decimal o miles?):
// - entero o con coma decimal: "12500", "0,5";
// - con punto de miles (solo el precio): "12.500,50", "1.234.567".
const PLAIN = /^\d+(,\d+)?$/;
const WITH_THOUSANDS = /^\d{1,3}(\.\d{3})+(,\d+)?$/;

// Vacío → undefined; formato no válido → "invalid".
function parseNumber(
  text: string | undefined,
  allowThousands = false,
): number | undefined | "invalid" {
  const t = text?.trim() ?? "";
  if (!t) return undefined;
  if (!PLAIN.test(t) && !(allowThousands && WITH_THOUSANDS.test(t))) return "invalid";
  return Number(t.replace(/\./g, "").replace(",", "."));
}

const FORMAT_ERRORS = {
  price: "El precio no es válido: usá coma para los decimales (ej.: 12.500,50)",
  weight: "El peso no es válido: usá coma para los decimales (ej.: 0,5)",
  volume: "El volumen no es válido: usá coma para los decimales (ej.: 0,5)",
  stock: "El stock debe ser un número entero, 0 o más",
  nutrients: "Los valores nutricionales no son válidos: usá coma para los decimales (ej.: 3,5)",
} as const;

const splitTags = (text: string | undefined) =>
  (text ?? "").split(",").map((s) => s.trim()).filter(Boolean);

const NUTRIENTS = ["protein", "fat", "fiber", "ash", "moisture"] as const;

// RN-030: convierte el formulario del catálogo (todo texto) en un producto.
export function parseProductForm(
  form: Record<string, string | undefined>,
): { ok: true; product: Product } | { ok: false; message: string } {
  const text = (k: string) => form[k]?.trim() ?? "";
  const price = parseNumber(form.price, true);
  const weight = parseNumber(form.weightValue);
  const volume = parseNumber(form.volumeValue);
  const stock = parseNumber(form.stock);
  const nutrientValues = NUTRIENTS.map((k) => [k, parseNumber(form[k])] as const);

  if (price === "invalid") return { ok: false, message: FORMAT_ERRORS.price };
  if (weight === "invalid") return { ok: false, message: FORMAT_ERRORS.weight };
  if (volume === "invalid") return { ok: false, message: FORMAT_ERRORS.volume };
  if (stock === "invalid") return { ok: false, message: FORMAT_ERRORS.stock };
  if (nutrientValues.some(([, n]) => n === "invalid")) {
    return { ok: false, message: FORMAT_ERRORS.nutrients };
  }
  const nutrients = Object.fromEntries(nutrientValues.filter(([, n]) => n !== undefined));

  const candidate = {
    name: text("name"),
    description: text("description"),
    price,
    brand: text("brand"),
    weight: { value: weight, unit: text("weightUnit") || "g" },
    ...(volume !== undefined ? { volume: { value: volume, unit: text("volumeUnit") || "ml" } } : {}),
    ...(text("imageUrl") ? { image: text("imageUrl") } : {}),
    stock: stock ?? 0,
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
