-- DT-072: la paleta base del código pasa de gris a "Zapallo". Si la paleta
-- guardada es idéntica a la base anterior (nadie la personalizó), se quita
-- para que rija la base nueva (RN-074). Una paleta personalizada no se toca.
DELETE FROM theme_palettes
WHERE mode = 'light'
  AND colors = '{"background":"#ffffff","foreground":"#0a0a0a","primary":"#171717","secondary":"#f5f5f5","accent":"#f5f5f5","destructive":"#c10007","success":"#008236","warning":"#a65f00"}'::jsonb;
--> statement-breakpoint
DELETE FROM theme_palettes
WHERE mode = 'dark'
  AND colors = '{"background":"#0a0a0a","foreground":"#fafafa","primary":"#e5e5e5","secondary":"#262626","accent":"#262626","destructive":"#ff6467","success":"#05df72","warning":"#ffb900"}'::jsonb;
