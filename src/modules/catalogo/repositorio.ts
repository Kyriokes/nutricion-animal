import { and, arrayContains, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/lib/db";
import { NutritionalInfoSchema, normalizeTag, type Product } from "./schema";
import { products } from "./tables";

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
export async function listCatalog(filters: CatalogFilters) {
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
  const where = and(...conditions);
  const page = Math.max(1, filters.page ?? 1);

  const [rows, [{ total }]] = await Promise.all([
    db.select().from(products).where(where).orderBy(asc(products.name)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(products).where(where),
  ]);
  return { items: rows.map(toProduct), total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
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

export async function listAllProducts(): Promise<StoredProduct[]> {
  const rows = await db.select().from(products).orderBy(desc(products.updatedAt)).limit(500);
  return rows.map(toProduct);
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
