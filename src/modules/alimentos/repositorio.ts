import { asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { pageWithin } from "@/lib/paginas";
import { findSimilarFoods, normalizeFoodName } from "./nombres";
import { productIngredients, productTraces } from "@/modules/catalogo/tables";
import { foodAliases, foods } from "./tables";

export type Food = { id: string; name: string };
export type FoodWithAliases = Food & { aliases: { id: string; alias: string }[] };

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// Escapa % y _ para usar texto del usuario dentro de un LIKE.
const likeEscape = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);

// Todos los alimentos con sus sinónimos (para detectar parecidos). La lista es
// chica (cientos), así que se compara en memoria.
export async function listAllFoods(): Promise<FoodWithAliases[]> {
  const [rows, aliases] = await Promise.all([
    db.select({ id: foods.id, name: foods.name }).from(foods).orderBy(asc(foods.name)),
    db.select({ id: foodAliases.id, foodId: foodAliases.foodId, alias: foodAliases.alias }).from(foodAliases),
  ]);
  const byFood = new Map<string, { id: string; alias: string }[]>();
  for (const a of aliases) byFood.set(a.foodId, [...(byFood.get(a.foodId) ?? []), { id: a.id, alias: a.alias }]);
  return rows.map((f) => ({ ...f, aliases: byFood.get(f.id) ?? [] }));
}

// RN-032: búsqueda para el selector. Por nombre o sinónimo; primero los que
// empiezan con lo escrito.
export async function searchFoods(query: string, limit = 10): Promise<Food[]> {
  const q = normalizeFoodName(query);
  if (!q) return [];
  const contains = `%${likeEscape(q)}%`;
  const starts = `${likeEscape(q)}%`;
  const rows = await db
    .selectDistinct({
      id: foods.id,
      name: foods.name,
      starts: sql<boolean>`(${foods.normalized} like ${starts} or ${foodAliases.normalized} like ${starts})`,
    })
    .from(foods)
    .leftJoin(foodAliases, eq(foodAliases.foodId, foods.id))
    .where(or(ilike(foods.normalized, contains), ilike(foodAliases.normalized, contains)))
    .orderBy(sql`3 desc`, asc(foods.name))
    .limit(limit * 2);
  // Un alimento puede aparecer dos veces (por nombre y por sinónimo).
  const seen = new Set<string>();
  return rows
    .filter((r) => (seen.has(r.id) ? false : (seen.add(r.id), true)))
    .slice(0, limit)
    .map(({ id, name }) => ({ id, name }));
}

// El alimento con ese nombre exacto (por nombre o sinónimo), si existe.
export async function findFoodByName(name: string, tx: Tx | typeof db = db): Promise<Food | null> {
  const n = normalizeFoodName(name);
  const [byName] = await tx.select({ id: foods.id, name: foods.name }).from(foods).where(eq(foods.normalized, n));
  if (byName) return byName;
  const [byAlias] = await tx
    .select({ id: foods.id, name: foods.name })
    .from(foodAliases)
    .innerJoin(foods, eq(foods.id, foodAliases.foodId))
    .where(eq(foodAliases.normalized, n));
  return byAlias ?? null;
}

export type AddFoodResult =
  | { status: "existing"; food: Food }
  | { status: "similar"; similar: Food[] }
  | { status: "created"; food: Food };

// RN-032: agregar un alimento. Si ya existe (por nombre o sinónimo), lo
// devuelve. Si se parece a otros, los devuelve para avisar, salvo que se
// confirme igual (`force`). La unicidad la garantiza la base.
export async function addFood(name: string, userId: string, force = false): Promise<AddFoodResult> {
  const existing = await findFoodByName(name);
  if (existing) return { status: "existing", food: existing };
  if (!force) {
    const similar = findSimilarFoods(name, (await listAllFoods()).map((f) => ({ ...f, aliases: f.aliases.map((a) => a.alias) })));
    if (similar.length > 0) return { status: "similar", similar: similar.map(({ id, name }) => ({ id, name })) };
  }
  const [created] = await db
    .insert(foods)
    .values({ name, normalized: normalizeFoodName(name), createdBy: userId })
    .onConflictDoNothing()
    .returning({ id: foods.id, name: foods.name });
  // Otro lo creó en el mismo instante: se usa ese.
  return created ? { status: "created", food: created } : { status: "existing", food: (await findFoodByName(name))! };
}

export const FOODS_PAGE_SIZE = 30;

// /admin/alimentos: lista paginada, con búsqueda.
export async function listFoodsForAdmin(query: string, requestedPage: number) {
  const q = normalizeFoodName(query);
  const where = q ? ilike(foods.normalized, `%${likeEscape(q)}%`) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(foods).where(where);
  const { page, pages } = pageWithin(requestedPage, total, FOODS_PAGE_SIZE);
  const rows = await db
    .select({ id: foods.id, name: foods.name })
    .from(foods)
    .where(where)
    .orderBy(asc(foods.name), asc(foods.id))
    .limit(FOODS_PAGE_SIZE)
    .offset((page - 1) * FOODS_PAGE_SIZE);
  const aliases = rows.length
    ? await db
        .select({ id: foodAliases.id, foodId: foodAliases.foodId, alias: foodAliases.alias })
        .from(foodAliases)
        .where(inArray(foodAliases.foodId, rows.map((r) => r.id)))
        .orderBy(asc(foodAliases.alias))
    : [];
  return {
    foods: rows.map((f) => ({
      ...f,
      aliases: aliases.filter((a) => a.foodId === f.id).map(({ id, alias }) => ({ id, alias })),
    })),
    total,
    page,
    pages,
  };
}

export async function getFood(id: string): Promise<FoodWithAliases | null> {
  const [row] = await db.select({ id: foods.id, name: foods.name }).from(foods).where(eq(foods.id, id));
  if (!row) return null;
  const aliases = await db
    .select({ id: foodAliases.id, alias: foodAliases.alias })
    .from(foodAliases)
    .where(eq(foodAliases.foodId, id))
    .orderBy(asc(foodAliases.alias));
  return { ...row, aliases };
}

export type FoodAdminError = "not_found" | "taken";

// Un nombre está ocupado si ya es el de otro alimento o un sinónimo.
async function nameTaken(tx: Tx, normalized: string, exceptFoodId?: string): Promise<boolean> {
  const [food] = await tx.select({ id: foods.id }).from(foods).where(eq(foods.normalized, normalized));
  if (food && food.id !== exceptFoodId) return true;
  const [alias] = await tx.select({ id: foodAliases.id }).from(foodAliases).where(eq(foodAliases.normalized, normalized));
  return !!alias;
}

// Las operaciones del admin se serializan con un bloqueo, así dos cambios
// simultáneos no dejan un nombre repetido entre alimentos y sinónimos.
const lockFoods = (tx: Tx) => tx.execute(sql`select pg_advisory_xact_lock(hashtext('foods:admin'))`);

export async function renameFood(id: string, name: string): Promise<{ ok: true } | { ok: false; error: FoodAdminError }> {
  return db.transaction(async (tx) => {
    await lockFoods(tx);
    const normalized = normalizeFoodName(name);
    if (await nameTaken(tx, normalized, id)) return { ok: false as const, error: "taken" as const };
    const updated = await tx.update(foods).set({ name, normalized }).where(eq(foods.id, id)).returning({ id: foods.id });
    return updated.length ? { ok: true as const } : { ok: false as const, error: "not_found" as const };
  });
}

export async function addFoodAlias(foodId: string, alias: string): Promise<{ ok: true } | { ok: false; error: FoodAdminError }> {
  return db.transaction(async (tx) => {
    await lockFoods(tx);
    const normalized = normalizeFoodName(alias);
    if (await nameTaken(tx, normalized)) return { ok: false as const, error: "taken" as const };
    const [food] = await tx.select({ id: foods.id }).from(foods).where(eq(foods.id, foodId));
    if (!food) return { ok: false as const, error: "not_found" as const };
    await tx.insert(foodAliases).values({ foodId, alias, normalized });
    return { ok: true as const };
  });
}

export async function removeFoodAlias(aliasId: string) {
  await db.delete(foodAliases).where(eq(foodAliases.id, aliasId));
}

// RN-033, RN-034: en productos. Si un producto ya tenía los dos, queda el que
// sigue; un alimento que pasa a estar en la composición deja de figurar en
// "puede contener".
async function mergeProductReferences(tx: Tx, fromId: string, intoId: string) {
  await tx.execute(sql`
    delete from ${productIngredients} pi
    where pi.food_id = ${fromId}
      and exists (select 1 from ${productIngredients} o where o.product_id = pi.product_id and o.food_id = ${intoId})
  `);
  await tx.update(productIngredients).set({ foodId: intoId }).where(eq(productIngredients.foodId, fromId));
  await tx.execute(sql`
    delete from ${productTraces} pt
    where pt.food_id = ${fromId}
      and (exists (select 1 from ${productTraces} o where o.product_id = pt.product_id and o.food_id = ${intoId})
        or exists (select 1 from ${productIngredients} o where o.product_id = pt.product_id and o.food_id = ${intoId}))
  `);
  await tx.update(productTraces).set({ foodId: intoId }).where(eq(productTraces.foodId, fromId));
  await tx.execute(sql`
    delete from ${productTraces} pt
    where pt.food_id = ${intoId}
      and exists (select 1 from ${productIngredients} o where o.product_id = pt.product_id and o.food_id = ${intoId})
  `);
}

// RN-032: unir un duplicado a otro alimento. Sus sinónimos pasan al que
// queda, su nombre queda como sinónimo y sus referencias se mueven.
export async function mergeFoods(fromId: string, intoId: string): Promise<{ ok: true } | { ok: false; error: "not_found" | "same" }> {
  if (fromId === intoId) return { ok: false, error: "same" };
  return db.transaction(async (tx) => {
    await lockFoods(tx);
    const both = await tx.select().from(foods).where(inArray(foods.id, [fromId, intoId])).for("update");
    const from = both.find((f) => f.id === fromId);
    if (!from || !both.some((f) => f.id === intoId)) return { ok: false as const, error: "not_found" as const };
    // Acá se mueven las referencias del que desaparece al que queda: cada
    // parte que use alimentos (productos, dietas, mascotas) suma la suya.
    await mergeProductReferences(tx, fromId, intoId);
    await tx.update(foodAliases).set({ foodId: intoId }).where(eq(foodAliases.foodId, fromId));
    await tx.delete(foods).where(eq(foods.id, fromId));
    await tx.insert(foodAliases).values({ foodId: intoId, alias: from.name, normalized: from.normalized });
    return { ok: true as const };
  });
}
