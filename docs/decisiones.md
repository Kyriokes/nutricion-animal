# Decisiones de diseño

Formato: fecha, decisión, porqué.

## Heredadas de las reglas de negocio
- DT-001: la lógica de negocio vive en el backend.
- DT-002: SQL directo, delegando procesamiento a la base cuando corresponda, sin depender por completo del ORM.
- DT-003: toda consulta SQL directa es parametrizada.
- DT-004: los datos de tarjeta los guarda la pasarela de pago.
- RN-003: ingreso con Google en primera instancia.

## Estrategia de pruebas
- DT-005 (2026-10-07): el almacenamiento correcto de datos se valida con tests de integración por módulo de dominio contra una base Postgres de prueba (local o rama de Neon), consultando con SQL. Porqué: son rápidos y exactos, y es la única forma de probar de verdad el SQL directo (DT-002, DT-003); un test de navegador solo ve el dato de forma indirecta. No se usan mocks de la base.
- DT-006 (2026-10-07): Playwright se incorpora recién cuando exista el flujo de compra, y se limita a 3 a 5 tests de humo de caminos críticos (ingreso, ver dieta, armar carrito, hacer pedido). Porqué: los tests de punta a punta son lentos y frágiles; si se prueba todo, el mantenimiento supera el beneficio. Costos a resolver antes: base de prueba con datos controlados, ingreso con Google simulado (Google real bloquea bots, RN-003), pasarela en modo de prueba, y navegadores en CI. Hoy no se instala.
