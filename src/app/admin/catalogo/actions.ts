"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { parseProductForm } from "@/modules/catalogo/formulario";
import {
  CATALOG_TAG,
  createProduct,
  deleteProduct,
  getProduct,
  setProductImage,
  updateProduct,
} from "@/modules/catalogo/repositorio";
import { ownedStoragePath, validatePhoto } from "@/modules/usuarios/foto";
import { hasPermission } from "@/modules/usuarios/roles";
import { getCurrentActor } from "@/modules/usuarios/sesion";

export type CatalogActionResult = { ok: true } | { ok: false; message: string };

const BUCKET = "products";
const NOT_ALLOWED: CatalogActionResult = { ok: false, message: "No tenés permiso para gestionar el catálogo." };
const SAVE_FAILED: CatalogActionResult = { ok: false, message: "No se pudo guardar. Probá de nuevo." };
const NOT_FOUND: CatalogActionResult = { ok: false, message: "El producto no existe." };

// VA-02: solo quien tiene catalog.manage (el admin).
async function canManage() {
  const actor = await getCurrentActor();
  return actor !== null && hasPermission(actor.roles, "catalog.manage");
}

// RN-030: alta (productId null) o edición de un producto.
export async function saveProductAction(productId: string | null, input: unknown): Promise<CatalogActionResult> {
  if (!(await canManage())) return NOT_ALLOWED;
  const form = z.record(z.string(), z.string()).safeParse(input);
  if (!form.success) return { ok: false, message: "Datos inválidos." };
  const parsed = parseProductForm(form.data);
  if (!parsed.ok) return parsed;

  let createdId: string | null = null;
  try {
    if (productId) {
      const existing = z.uuid().safeParse(productId).success ? await getProduct(productId) : null;
      if (!existing) return NOT_FOUND;
      // La imagen se maneja aparte (subir/quitar); al editar se conserva.
      await updateProduct(productId, { ...parsed.product, image: existing.image });
    } else {
      createdId = await createProduct({ ...parsed.product, image: undefined });
    }
  } catch {
    return SAVE_FAILED;
  }
  updateTag(CATALOG_TAG);
  if (createdId) redirect(`/admin/catalogo/${createdId}`);
  refresh();
  return { ok: true };
}

const PHOTO_ERRORS = {
  empty: "Elegí una imagen.",
  too_large: "La imagen puede pesar hasta 1 MB.",
  unsupported_type: "Usá una imagen JPG, PNG o WebP.",
  content_mismatch: "El archivo no es una imagen JPG, PNG o WebP válida.",
} as const;

// Imagen del producto: se valida en el servidor y la anterior se borra.
export async function uploadProductImageAction(productId: string, formData: FormData): Promise<CatalogActionResult> {
  if (!(await canManage())) return NOT_ALLOWED;
  const product = z.uuid().safeParse(productId).success ? await getProduct(productId) : null;
  if (!product) return NOT_FOUND;
  const file = formData.get("image");
  if (!(file instanceof File)) return { ok: false, message: PHOTO_ERRORS.empty };
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const check = validatePhoto({ type: file.type, size: file.size, head });
  if (!check.ok) return { ok: false, message: PHOTO_ERRORS[check.error] };

  const storage = createSupabaseAdminClient().storage.from(BUCKET);
  const path = `${product.id}/${crypto.randomUUID()}.${check.ext}`;
  const { error } = await storage.upload(path, file, { contentType: file.type });
  if (error) return { ok: false, message: "No se pudo subir la imagen. Probá de nuevo." };
  try {
    await setProductImage(product.id, storage.getPublicUrl(path).data.publicUrl);
  } catch {
    await storage.remove([path]);
    return SAVE_FAILED;
  }
  const previous = ownedStoragePath(product.image, process.env.NEXT_PUBLIC_SUPABASE_URL!, BUCKET, product.id);
  if (previous) await storage.remove([previous]);
  updateTag(CATALOG_TAG);
  refresh();
  return { ok: true };
}

// Borra el producto y su imagen.
export async function deleteProductAction(productId: unknown): Promise<CatalogActionResult> {
  if (!(await canManage())) return NOT_ALLOWED;
  const id = z.uuid().safeParse(productId);
  const product = id.success ? await getProduct(id.data) : null;
  if (!product) return NOT_FOUND;
  try {
    await deleteProduct(product.id);
  } catch {
    return SAVE_FAILED;
  }
  const image = ownedStoragePath(product.image, process.env.NEXT_PUBLIC_SUPABASE_URL!, BUCKET, product.id);
  if (image) await createSupabaseAdminClient().storage.from(BUCKET).remove([image]);
  updateTag(CATALOG_TAG);
  redirect("/admin/catalogo");
}
