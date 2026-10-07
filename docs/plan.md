# Plan y estado

## Estado actual
- Repositorio creado y conectado a GitHub.
- Reglas de negocio v0.6: roles, nutricionista, dietas y productos definidos (DT-014 a DT-017).
- Proyecto base: Next.js 16, TypeScript, Tailwind, ESLint y shadcn/ui.
- Supabase instalado como librería; proyecto en supabase.com: a definir por Sergio.
- Zod y Vitest instalados. `npm test` funciona con 12 tests (humo, dietas, catalogo).
- Drizzle ORM instalado y configurado (DT-018); sin tablas ni conexión todavía.
- Esquemas iniciales para dieta y producto con tests de validación.
- Todavía no hay funcionalidad de backend/API.

## Próximo paso (sesión 3)
- Módulo `usuarios`: esquema y validaciones para registro, roles, perfil de nutricionista.
- Módulo `pedidos`: esquema de pedido con estados definidos (pregunta 9).
- Crear API routes iniciales (`/api/*`) para pruebas.
- (Punto de pausa: crear proyecto Supabase y completar `.env.local`.)

## Bloqueado por definiciones (responde Sergio)
- Pregunta 5.1: cómo se vuelve paciente un cliente.
- Pregunta 6: método de contacto cliente-nutricionista (mensaje interno, WhatsApp, etc.).
- Pregunta 9: estados del pedido completos (pedido, preparado, en camino, entregado, cancelado?, pago pendiente?, devuelto?).
- Pregunta 10 y 11: búsquedas de usuarios sin sesión, retención, normativa argentina.
- Pregunta 12: pagos y envíos v1 (costo de envío, método de pago, quién reparte).
- Pregunta 13: ¿producto puede publicarse sin Auditor?

## En pausa (requiere Sergio con sus cuentas)
- Crear proyecto en Supabase (supabase.com), elegir región.
- Completar `.env.local` (URL, clave pública anon, clave service_role).
- Habilitar Google OAuth (RN-003).
- Advertencia: Supabase pausa proyectos gratuitos tras una semana sin actividad.

## Pendiente (en orden)
- Módulos de dominio restantes: `usuarios`, `pedidos`, `busquedas`.
- API routes con lógica de negocio en módulos (no en controladores).
- Tests de integración contra Postgres de prueba (DT-005).
- Playwright con 3-5 tests de humo cuando exista flujo de compra completo (DT-006).
- Primera tabla y conexión con Drizzle (`src/modules/<dominio>/tables.ts`), cuando exista la base de Supabase.
- Actualizar Node a >= 20.18.1.

## Hecho
- Proyecto Next.js, Tailwind, shadcn/ui, Zod, Vitest.
- Esquemas de dieta y producto con tests.
- Reglas de negocio v0.6 completada.
