-- DT-066: cierre del cambio "por agregado" de RN-036. Se aplica después de
-- publicar el código que ya no usa las columnas de texto de pets.

-- La función de normalización no depende del search_path de quien la llama.
ALTER FUNCTION public.food_normalize(text) SET search_path = '';
--> statement-breakpoint

-- Por si alguien cargó una alergia o restricción con la versión anterior del
-- sitio, entre la migración 0025 y el deploy: se vuelve a copiar (no duplica).
INSERT INTO foods (name, normalized)
SELECT DISTINCT ON (public.food_normalize(n)) btrim(n), public.food_normalize(n)
FROM (SELECT unnest(allergies || forbidden_foods || required_foods) AS n FROM pets) x
WHERE public.food_normalize(n) <> ''
  AND NOT EXISTS (SELECT 1 FROM food_aliases a WHERE a.normalized = public.food_normalize(x.n))
ORDER BY public.food_normalize(n), btrim(n)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
INSERT INTO pet_foods (pet_id, food_id, kind)
SELECT p.id, coalesce(f.id, a.food_id), k.kind
FROM pets p
CROSS JOIN LATERAL (
  SELECT unnest(p.allergies) AS n, 'allergy' AS kind
  UNION ALL SELECT unnest(p.forbidden_foods), 'forbidden'
  UNION ALL SELECT unnest(p.required_foods), 'required'
) k
LEFT JOIN foods f ON f.normalized = public.food_normalize(k.n)
LEFT JOIN food_aliases a ON a.normalized = public.food_normalize(k.n)
WHERE coalesce(f.id, a.food_id) IS NOT NULL
ON CONFLICT DO NOTHING;
--> statement-breakpoint

ALTER TABLE "pets" DROP COLUMN "allergies";--> statement-breakpoint
ALTER TABLE "pets" DROP COLUMN "forbidden_foods";--> statement-breakpoint
ALTER TABLE "pets" DROP COLUMN "required_foods";
