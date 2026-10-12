import { and, arrayContains, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { pageWithin } from "@/lib/paginas";
import { NutritionalInfoSchema, normalizeTag, type Product } from "./schema";
import { foods } from "@/modules/alimentos/tables";
import type { Food } from "@/modules/alimentos/repositorio";
import type { Composition } from "./composicion";
import { productIngredients, products, productTraces } from "./tables";

export type StoredProduct = Product & {
  id: string;
  status: "pending" | "approved" | "rejected";
  updatedAt: Date;
};

type Row = typeof products.$inferSelect;

function toProduct(r: Row): StoredProduct {
  const nutrition = NutritionalInfoSchema.safeParse(r.nutritionalInfo);
  return {
    id: r.id,
    status: r.status as StoredProduct["status"],
    updatedAt: r.updatedAt,
    name: r.name,
    description: r.description,
    price: r.price,
    brand: r.brand,
    weight: { value: r.weightValue, unit: r.weightUnit as "g" | "kg" },
    ...(r.volumeValue != null && r.volumeUnit
      ? { volume: { value: r.volumeValue, unit: r.volumeUnit as "ml" | "l" } }
      : {}),
    ...(r.imageUrl ? { image: r.imageUrl } : {}),
    stock: r.stock,
    petTypes: r.petTypes,
    dietTypes: r.dietTypes,
    ...(r.nutritionalInfo && nutrition.success ? { nutritionalInfo: nutrition.data } : {}),
  };
}

function columns(p: Product) {
  return {
    name: p.name,
    description: p.description,
    price: p.price,
    brand: p.brand,
    weightValue: p.weight.value,
    weightUnit: p.weight.unit,
    volumeValue: p.volume?.value ?? null,
    volumeUnit: p.volume?.unit ?? null,
    imageUrl: p.image ?? null,
    stock: p.stock,
    petTypes: p.petTypes,
    dietTypes: p.dietTypes,
    nutritionalInfo: p.nutritionalInfo ?? null,
  };
}

export const PAGE_SIZE = 24;

export type CatalogFilters = { q?: string; species?: string; dietType?: string; page?: number };

// VP-04, RN-013 y RN-014: catálogo público (solo aprobados), con búsqueda por
// texto y filtros por especie y tipo de dieta. Se filtra en la base (DT-002).
function catalogWhere(filters: CatalogFilters) {
  const conditions: SQL[] = [eq(products.status, "approved")];
  const q = filters.q?.trim();
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    conditions.push(
      or(ilike(products.name, pattern), ilike(products.brand, pattern), ilike(products.description, pattern))!,
    );
  }
  if (filters.species) conditions.push(arrayContains(products.petTypes, [normalizeTag(filters.species)]));
  if (filters.dietType) conditions.push(arrayContains(products.dietTypes, [normalizeTag(filters.dietType)]));
  return and(...conditions);
}

export async function listCatalog(filters: CatalogFilters) {
  const where = catalogWhere(filters);
  const page = Math.max(1, filters.page ?? 1);

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(products).where(where).orderBy(asc(products.name)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(products).where(where),
  ]);
  return { items: rows.map(toProduct), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const CATALOG_TAG = "catalog";

// VP-01: productos destacados de la landing (con stock). Se cachea por horas y
// se renueva al cambiar el catálogo (updateTag(CATALOG_TAG) en VA-02).
export async function getFeaturedProducts(limit = 4): Promise<StoredProduct[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  const rows = await db
    .select()
    .from(products)
    .where(and(eq(products.status, "approved"), sql`${products.stock} > 0`))
    .orderBy(desc(products.updatedAt))
    .limit(limit);
  return rows.map(toProduct);
}

// VP-05: un producto del catálogo público (solo si está aprobado).
export async function getCatalogProduct(id: string): Promise<StoredProduct | null> {
  const [row] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.status, "approved")));
  return row ? toProduct(row) : null;
}

// VP-07: productos del carrito, con precio y stock actuales (solo aprobados).
export async function getCatalogProductsByIds(ids: readonly string[]): Promise<StoredProduct[]> {
  if (ids.length === 0) return [];
  const rows = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, [...ids]), eq(products.status, "approved")));
  return rows.map(toProduct);
}

// Las especies con más productos, para los enlaces de la tienda (encabezado
// y portada). Cacheado: se renueva cuando cambia el catálogo.
export async function getStoreSpecies(limit = 4): Promise<string[]> {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");
  const value = sql<string>`unnest(${products.petTypes})`;
  const rows = await db
    .select({ value })
    .from(products)
    .where(eq(products.status, "approved"))
    .groupBy(value)
    .orderBy(desc(sql`count(*)`), asc(value))
    .limit(limit);
  return rows.map((r) => r.value);
}

// Especies y tipos de dieta presentes en el catálogo, para los filtros.
export async function listCatalogFacets() {
  const facet = async (column: typeof products.petTypes) => {
    const value = sql<string>`unnest(${column})`;
    const rows = await db
      .select({ value })
      .from(products)
      .where(eq(products.status, "approved"))
      .groupBy(value)
      .orderBy(desc(sql`count(*)`), asc(value))
      .limit(30);
    return rows.map((r) => r.value);
  };
  const [species, dietTypes] = await Promise.all([facet(products.petTypes), facet(products.dietTypes)]);
  return { species, dietTypes };
}

// ---- VA-02: gestión del catálogo (admin) ----

export const ADMIN_PAGE_SIZE = 25;
export type AdminProductSort = "stock" | "recientes";

// VA-02, RN-090: todos los productos para el admin, paginados. Por defecto,
// de menor a mayor stock, para ver primero los que no hay.
export async function listProductsForAdmin(sort: AdminProductSort, requestedPage: number) {
  const [{ total }] = await db.select({ total: count() }).from(products);
  const { page, pages } = pageWithin(requestedPage, total, ADMIN_PAGE_SIZE);
  const order =
    sort === "stock"
      ? [asc(products.stock), asc(products.name), asc(products.id)]
      : [desc(products.updatedAt), asc(products.id)];
  const rows = await db
    .select()
    .from(products)
    .orderBy(...order)
    .limit(ADMIN_PAGE_SIZE)
    .offset((page - 1) * ADMIN_PAGE_SIZE);
  return { items: rows.map(toProduct), total, page, pages };
}

// Dashboard (RN-090): productos sin stock.
export async function countOutOfStockProducts(): Promise<number> {
  const [{ n }] = await db.select({ n: count() }).from(products).where(eq(products.stock, 0));
  return n;
}

export async function getProduct(id: string): Promise<StoredProduct | null> {
  const [row] = await db.select().from(products).where(eq(products.id, id));
  return row ? toProduct(row) : null;
}

// Lo que crea el admin queda aprobado (RN-001). Cuando haya proveedores, sus
// productos entrarán como "pending" hasta que el auditor los acepte (RN-041).
export async function createProduct(p: Product): Promise<string> {
  const [row] = await db
    .insert(products)
    .values({ ...columns(p), status: "approved" })
    .returning({ id: products.id });
  return row.id;
}

export async function updateProduct(id: string, p: Product) {
  await db.update(products).set({ ...columns(p), updatedAt: new Date() }).where(eq(products.id, id));
}

export async function setProductImage(id: string, imageUrl: string | null) {
  await db.update(products).set({ imageUrl, updatedAt: new Date() }).where(eq(products.id, id));
}

export async function deleteProduct(id: string) {
  await db.delete(products).where(eq(products.id, id));
}

export type ProductComposition = {
  ingredients: { food: Food; percentage?: number }[];
  traces: Food[];
};

// RN-033, RN-034: composición y "puede contener" de un producto, con nombres.
export async function getProductComposition(productId: string): Promise<ProductComposition> {
  const [ingredients, traces] = await Promise.all([
    db
      .select({ id: foods.id, name: foods.name, percentage: productIngredients.percentage })
      .from(productIngredients)
      .innerJoin(foods, eq(foods.id, productIngredients.foodId))
      .where(eq(productIngredients.productId, productId))
      .orderBy(asc(productIngredients.position)),
    db
      .select({ id: foods.id, name: foods.name })
      .from(productTraces)
      .innerJoin(foods, eq(foods.id, productTraces.foodId))
      .where(eq(productTraces.productId, productId))
      .orderBy(asc(foods.name)),
  ]);
  return {
    ingredients: ingredients.map(({ id, name, percentage }) => ({
      food: { id, name },
      ...(percentage != null ? { percentage } : {}),
    })),
    traces,
  };
}

// RN-033, RN-034: reemplaza la composición de un producto (ya validada con
// parseCompositionForm). Todo o nada, en una transacción.
export async function saveProductComposition(
  productId: string,
  c: Composition,
): Promise<{ ok: true } | { ok: false; error: "not_found" | "unknown_food" }> {
  return db.transaction(async (tx) => {
    const [product] = await tx.select({ id: products.id }).from(products).where(eq(products.id, productId)).for("update");
    if (!product) return { ok: false as const, error: "not_found" as const };
    const ids = [...c.ingredients.map((x) => x.foodId), ...c.traces];
    if (ids.length) {
      const found = await tx.select({ id: foods.id }).from(foods).where(inArray(foods.id, ids));
      if (found.length !== new Set(ids).size) return { ok: false as const, error: "unknown_food" as const };
    }
    await tx.delete(productIngredients).where(eq(productIngredients.productId, productId));
    await tx.delete(productTraces).where(eq(productTraces.productId, productId));
    if (c.ingredients.length) {
      await tx.insert(productIngredients).values(
        c.ingredients.map((x, position) => ({
          productId,
          foodId: x.foodId,
          position,
          percentage: x.percentage ?? null,
        })),
      );
    }
    if (c.traces.length) await tx.insert(productTraces).values(c.traces.map((foodId) => ({ productId, foodId })));
    return { ok: true as const };
  });
}

// RN-037: con el filtro por mascota se ordena por cómo encaja cada producto,
// así que se traen todos los que pasan los filtros (el catálogo es chico) y
// se ordenan y paginan después. Tope de seguridad: 500.
export async function listCatalogForPet(filters: Omit<CatalogFilters, "page">): Promise<StoredProduct[]> {
  const rows = await db.select().from(products).where(catalogWhere(filters)).orderBy(asc(products.name)).limit(500);
  return rows.map(toProduct);
}

// RN-037: composición y "puede contener" de varios productos, por producto.
export async function getProductFoods(
  productIds: readonly string[],
): Promise<Map<string, { ingredients: Food[]; traces: Food[] }>> {
  const result = new Map<string, { ingredients: Food[]; traces: Food[] }>();
  for (const id of productIds) result.set(id, { ingredients: [], traces: [] });
  if (productIds.length === 0) return result;
  const ids = [...productIds];
  const [ingredients, traces] = await Promise.all([
    db
      .select({ productId: productIngredients.productId, id: foods.id, name: foods.name })
      .from(productIngredients)
      .innerJoin(foods, eq(foods.id, productIngredients.foodId))
      .where(inArray(productIngredients.productId, ids))
      .orderBy(asc(productIngredients.position)),
    db
      .select({ productId: productTraces.productId, id: foods.id, name: foods.name })
      .from(productTraces)
      .innerJoin(foods, eq(foods.id, productTraces.foodId))
      .where(inArray(productTraces.productId, ids)),
  ]);
  for (const r of ingredients) result.get(r.productId)?.ingredients.push({ id: r.id, name: r.name });
  for (const r of traces) result.get(r.productId)?.traces.push({ id: r.id, name: r.name });
  return result;
}
