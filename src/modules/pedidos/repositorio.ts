import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { DEFAULT_SHIPPING_COST } from "./envio";
import { shopSettings } from "./tables";

// RN-068: costo fijo de envío vigente. Si el admin nunca lo cargó, el de prueba.
export async function getShippingCost(): Promise<number> {
  const [row] = await db.select({ cost: shopSettings.shippingCost }).from(shopSettings);
  return row?.cost ?? DEFAULT_SHIPPING_COST;
}

// VA-08: el admin cambia el costo de envío. Rige para los pedidos nuevos; los
// ya creados conservan el que tenían.
export async function saveShippingCost(cost: number, userId: string) {
  await db
    .insert(shopSettings)
    .values({ id: 1, shippingCost: cost, updatedBy: userId })
    .onConflictDoUpdate({
      target: shopSettings.id,
      set: { shippingCost: cost, updatedBy: userId, updatedAt: sql`now()` },
    });
}
