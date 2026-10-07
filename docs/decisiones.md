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

## Proyecto base
- DT-007 (2026-10-07): Next.js 16 con App Router, TypeScript, Tailwind 4, ESLint, carpeta `src/`, alias `@/*`, npm. Porqué: App Router es la arquitectura vigente; `src/` deja la raíz para configuración y documentación (`docs/`, `.claude/`); ESLint es el linter más documentado y el que asume shadcn/ui; npm ya está instalado y es lo más simple. Se descartaron por ahora React Compiler, Cache Components y Rspack: agregan complejidad sin una necesidad concreta todavía.
- DT-008 (2026-10-07): shadcn/ui inicializado con la configuración por defecto (estilo `base-nova`, color neutral, íconos lucide). Cada componente se agrega cuando se necesita.
- DT-009 (2026-10-07): script `typecheck` = `next typegen && tsc --noEmit`. Porqué: Next genera tipos globales (por ejemplo `LayoutProps`) durante el build; sin generarlos antes, `tsc` falla en un árbol limpio.
- Nota (2026-10-07): `npm audit` informa 5 vulnerabilidades altas, todas por una cadena de dependencias de desarrollo de ESLint (`braces`, DoS por patrones anidados). No llegan a producción. No se aplica `npm audit fix --force` porque bajaría `eslint-config-next` a la versión 14. Revisar cuando salga una versión corregida.
- Nota (2026-10-07): Node local es 20.17.0 y la CLI de shadcn pide >= 20.18.1. Funcionó con advertencia; conviene actualizar Node.
