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
- Nota (2026-10-07): `npm audit` informa 9 vulnerabilidades altas con una única causa: `braces` (DoS por patrones anidados), arrastrada por `fast-glob` en `eslint-config-next` y en el paquete `shadcn`. Es código de herramientas (lint y CLI de shadcn), no del sitio en ejecución; ojo que `shadcn` figura en `dependencies`, por eso `npm audit --omit=dev` también lo marca. Supabase no agrega ninguna. No se aplica `npm audit fix --force`: bajaría `eslint-config-next` a la 14 y `shadcn` a la 1.0. Revisar cuando salgan versiones corregidas.
- Nota (2026-10-07): Node local es 20.17.0 y la CLI de shadcn pide >= 20.18.1. Funcionó con advertencia; conviene actualizar Node.

## Base de datos y autenticación
- DT-010 (2026-10-07): se usa Supabase (PostgreSQL + autenticación) en lugar de Neon. Porqué: trae el ingreso con Google (RN-003) integrado, lo que evita sumar y mantener una librería de auth aparte; sigue siendo PostgreSQL estándar, así que el SQL directo parametrizado (DT-002, DT-003) funciona igual; y es más reconocido en el mercado, lo que suma para mostrar el proyecto. Contrapartida: más acoplamiento al proveedor; para mitigarlo, el acceso a datos queda dentro de los módulos de dominio y no en la UI. Paquetes instalados: `@supabase/supabase-js` y `@supabase/ssr` (sesión con cookies en el servidor, necesario con App Router). Falta crear el proyecto en supabase.com y configurar variables de entorno.

## Estructura y pruebas
- DT-011 (2026-10-07): la lógica de negocio vive en `src/modules/<dominio>/` (`catalogo`, `dietas`, `pedidos`, `busquedas`, `usuarios`), separado de `src/lib/` donde shadcn deja `utils.ts`. Cada módulo se crea cuando llega su primera regla real, no antes: Git no versiona carpetas vacías y crear esquemas sin reglas definidas sería abstraer "por si acaso". Hoy casi todo lo que iría dentro está **[A DEFINIR]** (ver preguntas 1, 9, 10 y 11 de las reglas).
- DT-012 (2026-10-07): Vitest como runner de tests (`npm test`) y Zod para validar en el borde. La configuración es `vitest.config.mts` (no `.ts`): con Node 20.17 la versión `.ts` falla con `ERR_REQUIRE_ESM`. Hay un test de humo en `src/tests/humo.test.ts` que se borra cuando exista el primer test real.
- DT-013 (2026-10-07): `.env.example` versionado con los nombres de las variables de Supabase y sin valores; `.env.local` queda ignorado. La clave `SUPABASE_SERVICE_ROLE_KEY` es solo de servidor y nunca lleva prefijo `NEXT_PUBLIC_`. El `.gitignore` ignora `.env*` con la excepción `!.env.example`.

## Definiciones de negocio (resueltas en sesión 2026-10-07)
- DT-014 (2026-10-07): roles únicos con permisos. Un usuario tiene un rol. Nutricionista: se registra con Google, postula vía formulario en perfil, admin/auditor aprueba/rechaza, recibe notificación. Mientras está pendiente actúa como Cliente. Perfil público: nombre, foto, dirección, teléfono. Privado: matrícula (no se valida al dar de alta). Auditor es un usuario elegido por el Administrador. Proveedor también requiere aprobación.
- DT-015 (2026-10-07): esquemas de Zod para dieta y producto en `src/modules/dietas/schema.ts` y `src/modules/catalogo/schema.ts`. Dieta: nombre, descripción, alimentos con cantidad/unidad/patrón, duración (días o indefinida), notas. Patrón de consumo: "X veces/semana" o "cada N días" (N<10, se repite). Producto: nombre, descripción, precio, marca, peso, volumen, imagen, stock, tipos de mascota, tipos de dieta, tabla nutricional (opcional). Tests unitarios de validación en `*.test.ts`.
- DT-016 (2026-10-07): negocio: solo venta de comida, no servicios de nutrición. Dietas no tienen costo en el sistema.
- DT-017 (2026-10-07): dietas genéricas las ven todos los nutricionistas (RN-021). Dietas específicas solo quien las creó. Una mascota puede tener N dietas de N nutricionistas.
