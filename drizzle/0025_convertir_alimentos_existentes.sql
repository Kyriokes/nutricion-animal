-- RN-036 (DT-066): pasa los alimentos escritos a mano en mascotas y dietas a
-- la lista única (RN-032) y los vincula. Por agregado: las columnas de texto
-- de pets quedan como estaban hasta que se borren en una migración posterior.

-- Misma regla que normalizeFoodName (src/modules/alimentos/nombres.ts):
-- sin tildes, minúsculas y espacios simples.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.food_normalize(t text) RETURNS text
LANGUAGE sql STABLE
AS $$ SELECT btrim(regexp_replace(lower(extensions.unaccent(t)), '\s+', ' ', 'g')) $$;
--> statement-breakpoint

-- 1. Los alimentos escritos que todavía no están (ni como sinónimo).
INSERT INTO foods (name, normalized)
SELECT DISTINCT ON (public.food_normalize(n)) btrim(n), public.food_normalize(n)
FROM (
  SELECT unnest(allergies || forbidden_foods || required_foods) AS n FROM pets
  UNION ALL
  SELECT f->>'name' FROM diet_versions dv, jsonb_array_elements(dv.content->'foods') AS f
) x
WHERE public.food_normalize(n) <> ''
  AND NOT EXISTS (SELECT 1 FROM food_aliases a WHERE a.normalized = public.food_normalize(x.n))
ORDER BY public.food_normalize(n), btrim(n)
ON CONFLICT DO NOTHING;
--> statement-breakpoint

-- 2. Alergias, no permitidos y de necesidad de cada mascota.
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

-- 3. Cada alimento de cada versión de dieta suma el id de la lista
-- ("foodId"); el nombre queda como estaba (la versión es un registro).
UPDATE diet_versions dv
SET content = jsonb_set(dv.content, '{foods}', (
  SELECT jsonb_agg(
    CASE WHEN fo.id IS NULL THEN e.f ELSE e.f || jsonb_build_object('foodId', fo.id) END
    ORDER BY e.ord)
  FROM jsonb_array_elements(dv.content->'foods') WITH ORDINALITY AS e(f, ord)
  LEFT JOIN LATERAL (
    SELECT coalesce(
      (SELECT id FROM foods WHERE normalized = public.food_normalize(e.f->>'name')),
      (SELECT food_id FROM food_aliases WHERE normalized = public.food_normalize(e.f->>'name'))
    ) AS id
  ) fo ON true
))
WHERE jsonb_typeof(dv.content->'foods') = 'array' AND jsonb_array_length(dv.content->'foods') > 0;
