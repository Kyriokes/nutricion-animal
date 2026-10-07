# Plan y estado

## Estado actual
- Repositorio creado y conectado a GitHub.
- Reglas de negocio en borrador (ver `docs/reglas-de-negocio.md`).
- Proyecto base creado: Next.js 16, TypeScript, Tailwind, ESLint y shadcn/ui (DT-007 a DT-009). Lint, typecheck y build pasan.
- Todavía no hay funcionalidad.

## Próximo paso
- Elegir proveedor de base de datos (Neon o Supabase) y librería de ingreso con Google (RN-003).

## Pendiente (en orden)
- Agregar Zod y la estructura de módulos por dominio (`catalogo`, `dietas`, `pedidos`, `busquedas`, `usuarios`).
- Tests unitarios y de integración por dominio contra Postgres de prueba (DT-005); definir `npm test`.
- Playwright con 3 a 5 tests de humo, solo cuando exista el flujo de compra (DT-006).
- Actualizar Node a >= 20.18.1.

## Hecho
- Proyecto Next.js creado, shadcn/ui inicializado, comandos documentados en `CLAUDE.md`.
