"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  deleteProductAction,
  saveProductAction,
  uploadProductImageAction,
  type CatalogActionResult,
} from "./actions";

const inputClass =
  "h-8 w-full rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export type ProductFormValues = Record<
  | "name" | "description" | "price" | "brand" | "weightValue" | "weightUnit"
  | "volumeValue" | "volumeUnit" | "stock" | "petTypes" | "dietTypes"
  | "protein" | "fat" | "fiber" | "ash" | "moisture",
  string
>;

export const EMPTY_PRODUCT: ProductFormValues = {
  name: "", description: "", price: "", brand: "", weightValue: "", weightUnit: "kg",
  volumeValue: "", volumeUnit: "ml", stock: "0", petTypes: "", dietTypes: "",
  protein: "", fat: "", fiber: "", ash: "", moisture: "",
};

function Message({ result }: { result: CatalogActionResult | null }) {
  if (!result) return null;
  return result.ok ? (
    <span role="status" className="text-sm text-success">Guardado.</span>
  ) : (
    <span role="alert" className="text-sm text-destructive">{result.message}</span>
  );
}

const field = (name: keyof ProductFormValues, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => ({ name, label, extra });

const MAIN = [
  field("name", "Nombre", { required: true, maxLength: 120 }),
  field("brand", "Marca", { required: true, maxLength: 80 }),
  field("price", "Precio en pesos (coma decimal)", { required: true, inputMode: "decimal", placeholder: "12500,50" }),
  field("stock", "Stock", { required: true, type: "number", min: 0, step: 1 }),
];

const NUTRIENTS = [
  field("protein", "Proteína %"),
  field("fat", "Grasa %"),
  field("fiber", "Fibra %"),
  field("ash", "Cenizas %"),
  field("moisture", "Humedad %"),
];

// VA-02, RN-030: alta o edición de un producto. Solo presenta: la validación
// está en src/modules/catalogo/formulario.ts y se hace en el servidor.
export function ProductForm({ productId = null, initial = EMPTY_PRODUCT }: { productId?: string | null; initial?: ProductFormValues }) {
  const [result, setResult] = useState<CatalogActionResult | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        const values = Object.fromEntries(Object.keys(EMPTY_PRODUCT).map((k) => [k, String(data.get(k) ?? "")]));
        start(async () => setResult(await saveProductAction(productId, values)));
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {MAIN.map((f) => (
          <label key={f.name} className="flex flex-col gap-1 text-sm">
            {f.label}
            <input name={f.name} className={inputClass} defaultValue={initial[f.name]} {...f.extra} />
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Descripción
        <textarea name="description" required maxLength={2000} className={`${inputClass} h-auto min-h-20 py-1`} defaultValue={initial.description} />
      </label>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-sm">
          Peso
          <span className="flex gap-1">
            <input name="weightValue" required inputMode="decimal" className={`${inputClass} w-24`} defaultValue={initial.weightValue} />
            <select name="weightUnit" className={`${inputClass} w-20`} defaultValue={initial.weightUnit}>
              <option value="g">g</option>
              <option value="kg">kg</option>
            </select>
          </span>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Volumen (opcional)
          <span className="flex gap-1">
            <input name="volumeValue" inputMode="decimal" className={`${inputClass} w-24`} defaultValue={initial.volumeValue} />
            <select name="volumeUnit" className={`${inputClass} w-20`} defaultValue={initial.volumeUnit}>
              <option value="ml">ml</option>
              <option value="l">l</option>
            </select>
          </span>
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        Apto para (especies, separadas por coma)
        <input name="petTypes" required placeholder="perro, gato" className={inputClass} defaultValue={initial.petTypes} />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Tipos de dieta (separados por coma, opcional)
        <input name="dietTypes" placeholder="proteica, mantenimiento" className={inputClass} defaultValue={initial.dietTypes} />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Información nutricional (opcional)</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {NUTRIENTS.map((f) => (
            <label key={f.name} className="flex flex-col gap-1 text-sm">
              {f.label}
              <input name={f.name} inputMode="decimal" className={inputClass} defaultValue={initial[f.name]} />
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Guardando…" : productId ? "Guardar cambios" : "Crear producto"}
        </Button>
        <Message result={result} />
      </div>
    </form>
  );
}

// Imagen del producto (JPG, PNG o WebP, hasta 1 MB).
export function ProductImageForm({ productId }: { productId: string }) {
  const [result, setResult] = useState<CatalogActionResult | null>(null);
  const [pending, start] = useTransition();
  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const formEl = e.currentTarget;
        const data = new FormData(formEl);
        const file = data.get("image");
        if (file instanceof File && file.size > 1024 * 1024) {
          setResult({ ok: false, message: "La imagen puede pesar hasta 1 MB." });
          return;
        }
        start(async () => {
          const r = await uploadProductImageAction(productId, data);
          setResult(r);
          if (r.ok) formEl.reset();
        });
      }}
    >
      <input
        name="image"
        type="file"
        required
        accept="image/jpeg,image/png,image/webp"
        aria-label="Imagen del producto"
        className="text-sm file:mr-2 file:rounded-lg file:border file:bg-background file:px-2 file:py-1 file:text-sm"
        onChange={() => setResult(null)}
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Subiendo…" : "Subir imagen"}
      </Button>
      <Message result={result} />
    </form>
  );
}

export function DeleteProductButton({ productId }: { productId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<CatalogActionResult | null>(null);
  const [pending, start] = useTransition();
  if (!confirming) {
    return (
      <Button variant="outline" onClick={() => setConfirming(true)}>
        Borrar producto
      </Button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-2 text-sm">
      ¿Seguro? Se borra del catálogo.
      <Button variant="destructive" disabled={pending} onClick={() => start(async () => setResult(await deleteProductAction(productId)))}>
        Sí, borrar
      </Button>
      <Button variant="ghost" onClick={() => setConfirming(false)}>
        Cancelar
      </Button>
      <Message result={result} />
    </span>
  );
}
