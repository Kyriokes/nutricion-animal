// RN-031: productos de prueba para la primera versión del catálogo.
// Uso: npm run db:seed. Se puede correr varias veces: no duplica (por nombre).
import postgres from "postgres";

const products = [
  ["Croquetas naturales de pollo", "Pollo, arroz integral y zanahoria. Sin conservantes artificiales.", 18500, "NutriCan", 3, "kg", null, 40, ["perro"], ["mantenimiento"], { protein: 26, fat: 14, fiber: 3 }],
  ["Croquetas de cordero hipoalergénicas", "Una sola fuente de proteína para perros con alergias alimentarias.", 24900, "NutriCan", 3, "kg", null, 25, ["perro"], ["hipoalergénica"], { protein: 24, fat: 12, fiber: 4 }],
  ["Alimento crudo BARF de vaca", "Carne, vísceras y verduras, listo para servir. Mantener congelado.", 9800, "BarfVida", 1, "kg", null, 30, ["perro"], ["barf", "proteica"], { protein: 18, fat: 10 }],
  ["Alimento crudo BARF de pollo para gatos", "Pollo con hueso molido, corazón e hígado. Mantener congelado.", 8900, "BarfVida", 500, "g", null, 30, ["gato"], ["barf", "proteica"], { protein: 20, fat: 9 }],
  ["Croquetas para gatos adultos de pescado", "Pescado de mar y arroz. Ayuda a la salud urinaria.", 15600, "MichiNatural", 1.5, "kg", null, 35, ["gato"], ["mantenimiento"], { protein: 32, fat: 15, fiber: 2.5 }],
  ["Croquetas light para perros", "Menos grasa y más fibra para perros con sobrepeso.", 19900, "NutriCan", 3, "kg", null, 20, ["perro"], ["control de peso"], { protein: 25, fat: 8, fiber: 6 }],
  ["Paté de pavo para gatos", "Alimento húmedo de pavo con zapallo.", 1900, "MichiNatural", 85, "g", null, 120, ["gato"], ["mantenimiento"], { protein: 11, fat: 5, moisture: 78 }],
  ["Guiso de ternera para perros", "Alimento húmedo cocido a baja temperatura con verduras.", 2600, "Cocina Canina", 400, "g", null, 80, ["perro"], ["mantenimiento", "proteica"], { protein: 10, fat: 6, moisture: 75 }],
  ["Caldo de huesos", "Caldo natural para hidratar y complementar la comida.", 3200, "Cocina Canina", 500, "g", [500, "ml"], 60, ["perro", "gato"], ["hidratación"], null],
  ["Snacks de hígado deshidratado", "Premios de un solo ingrediente.", 4500, "BarfVida", 150, "g", null, 90, ["perro", "gato"], ["premios"], { protein: 60, fat: 8 }],
  ["Mezcla de semillas para conejos", "Heno, avena y semillas para conejos y cobayos.", 5600, "Granja Feliz", 1, "kg", null, 25, ["conejo", "cobayo"], ["mantenimiento"], { protein: 14, fiber: 18 }],
  ["Croquetas para cachorros", "Pollo y huevo para el crecimiento. Croqueta chica.", 21500, "NutriCan", 3, "kg", null, 0, ["perro"], ["cachorros"], { protein: 30, fat: 18, fiber: 3 }],
];

// RN-033 a RN-035: composición (de mayor a menor, porcentaje del principal),
// "puede contener" y calorías (kcal/kg) de cada producto de prueba.
const details = {
  "Croquetas naturales de pollo": [[["Pollo", 45], ["Arroz integral", 25], ["Zanahoria", 5]], [], 3600],
  "Croquetas de cordero hipoalergénicas": [[["Cordero", 50], ["Batata", 30], ["Arveja"]], [], 3500],
  "Alimento crudo BARF de vaca": [[["Carne vacuna", 70], ["Hígado vacuno", 10], ["Zapallo"], ["Zanahoria"]], [], 1500],
  "Alimento crudo BARF de pollo para gatos": [[["Pollo", 75], ["Corazón de pollo", 10], ["Hígado de pollo", 5]], [], 1400],
  "Croquetas para gatos adultos de pescado": [[["Pescado de mar", 40], ["Arroz", 30], ["Huevo"]], ["Pollo"], 3700],
  "Croquetas light para perros": [[["Pollo", 35], ["Arroz integral", 30], ["Avena"], ["Zanahoria"]], [], 3200],
  "Paté de pavo para gatos": [[["Pavo", 60], ["Zapallo", 10]], [], 900],
  "Guiso de ternera para perros": [[["Carne vacuna", 40], ["Papa"], ["Zanahoria"], ["Arveja"]], ["Leche"], 1000],
  "Caldo de huesos": [[["Hueso vacuno", 90]], [], 150],
  "Snacks de hígado deshidratado": [[["Hígado vacuno", 100]], [], 3800],
  "Mezcla de semillas para conejos": [[["Heno", 50], ["Avena", 25], ["Semillas de girasol"]], [], 2900],
  "Croquetas para cachorros": [[["Pollo", 40], ["Arroz", 25], ["Huevo", 15]], ["Leche"], 3900],
};

// Misma regla que normalizeFoodName (src/modules/alimentos/nombres.ts).
const normalize = (name) =>
  name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

async function foodId(name) {
  // Primero por nombre o sinónimo; solo si no existe, se crea.
  const find = async () => {
    const [row] = await sql`
      select f.id from foods f where f.normalized = ${normalize(name)}
      union all
      select a.food_id from food_aliases a where a.normalized = ${normalize(name)}
      limit 1`;
    return row?.id;
  };
  const found = await find();
  if (found) return found;
  await sql`insert into foods (name, normalized) values (${name}, ${normalize(name)}) on conflict do nothing`;
  return find();
}
try {
  let created = 0;
  for (const [name, description, price, brand, weightValue, weightUnit, volume, stock, petTypes, dietTypes, nutrition] of products) {
    const [exists] = await sql`select 1 from products where name = ${name}`;
    if (exists) continue;
    await sql`
      insert into products (name, description, price, brand, weight_value, weight_unit,
        volume_value, volume_unit, stock, pet_types, diet_types, nutritional_info, status)
      values (${name}, ${description}, ${price}, ${brand}, ${weightValue}, ${weightUnit},
        ${volume ? volume[0] : null}, ${volume ? volume[1] : null}, ${stock},
        ${petTypes}, ${dietTypes}, ${nutrition ? sql.json(nutrition) : null}, 'approved')`;
    created++;
  }
  console.log(`Productos de prueba: ${created} creados, ${products.length - created} ya existían.`);

  // Composición y calorías: solo si el producto todavía no las tiene, así no
  // se pisa lo que haya cargado el admin.
  let detailed = 0;
  for (const [name, [ingredients, traces, kcal]] of Object.entries(details)) {
    const [product] = await sql`select id from products where name = ${name}`;
    if (!product) continue;
    await sql`
      update products
      set nutritional_info = coalesce(nutritional_info, '{}'::jsonb) || jsonb_build_object('kcalPerKg', ${kcal}::int)
      where id = ${product.id} and not coalesce(nutritional_info ? 'kcalPerKg', false)`;
    const [has] = await sql`select 1 from product_ingredients where product_id = ${product.id} limit 1`;
    if (has) continue;
    // Los alimentos se resuelven antes: el script usa una sola conexión, y la
    // transacción la ocupa.
    const ingredientIds = [];
    for (const [food] of ingredients) ingredientIds.push(await foodId(food));
    const traceIds = [];
    for (const food of traces) traceIds.push(await foodId(food));
    await sql.begin(async (tx) => {
      for (const [position, [, percentage]] of ingredients.entries()) {
        await tx`insert into product_ingredients (product_id, food_id, position, percentage)
          values (${product.id}, ${ingredientIds[position]}, ${position}, ${percentage ?? null})`;
      }
      for (const id of traceIds) {
        await tx`insert into product_traces (product_id, food_id) values (${product.id}, ${id})`;
      }
    });
    detailed++;
  }
  console.log(`Composición cargada en ${detailed} productos.`);
} finally {
  await sql.end({ timeout: 5 });
}
