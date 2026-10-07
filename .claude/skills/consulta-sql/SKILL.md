---
name: consulta-sql
description: Usar al escribir o modificar consultas SQL directas, estadísticas o agregaciones sobre la base de datos.
---

# Consultas SQL directas

Reglas del proyecto (DT-002 y DT-003 de `docs/reglas-de-negocio.md`):

- Siempre parametrizadas con el mecanismo de parámetros del cliente de base de datos. Nunca interpolar ni concatenar texto dentro del SQL.
- Delegar a la base lo que ella hace mejor: filtros, `GROUP BY`, conteos, ordenamientos y límites. No traer filas para agregarlas en JavaScript.
- Pedir solo las columnas necesarias y limitar los resultados.
- Si una consulta se usa en estadísticas o listados grandes, revisar si necesita un índice y proponerlo.
- Dejar la consulta en el módulo de dominio que corresponde, con un nombre claro.

## Búsquedas (RN-050 a RN-052)

Una búsqueda sin coincidencia es una con `results_count = 0`. El texto se guarda normalizado (minúsculas, sin tildes) para agrupar variantes.

Ejemplo de forma (ajustar a los nombres reales de tablas y columnas):

```sql
SELECT normalized_query, COUNT(*) AS searches
FROM search_logs
WHERE results_count = 0
GROUP BY normalized_query
ORDER BY searches DESC
LIMIT 50;
```
