# Plan y estado

## Estado actual
- Repositorio creado y conectado a GitHub.
- Reglas de negocio v0.6 con RN-024 y VP-09 corregidas (no hay registro aparte; el primer ingreso crea la cuenta como Cliente).
- Proyecto base: Next.js 16 (Cache Components y Partial Prefetching activos, DT-031), TypeScript, Tailwind, ESLint y shadcn/ui.
- Supabase (São Paulo): `.env.local` completo, conexión verificada (DT-028).
- **Ingreso con Google funcionando** (RN-003, RN-024, DT-034, DT-035): modal "Ingresar", sesión con `@supabase/ssr`, proxy que renueva la sesión, `/auth/callback`, encabezado con foto, nombre y "Salir". `getCurrentUser()` y `getCurrentActor()` en `src/modules/usuarios/sesion.ts`.
- **Base de datos:** tabla `users` (roles, perfil, nota del admin) con RLS y vínculo a `auth.users`. Migraciones en `drizzle/`, se aplican con `npm run db:migrate`.
- **Sergio es admin** (roles `customer` y `admin`, asignados a mano el 2026-10-08).
- Paleta de colores, Fase 1 (RN-070 a RN-074, DT-030 a DT-033): contraste, coolors, variables CSS, modo claro/oscuro, validación de guardado. Plan: `docs/superpowers/plans/2026-10-08-paleta-de-colores.md`.
- Módulos con lógica y tests: `usuarios` (roles, postulaciones, ingreso), `mascotas` (esquema), `dietas` (versiones, clonado, asignación), `catalogo` (esquema), `apariencia`.
- `npm test`: 109 tests.

## Próximo paso
- Paleta, Fase 2: rediseñar la Task 7 para Cache Components (ver el aviso en el plan de la paleta) y guardar la paleta en la base.
- Paleta, Fase 3: pantalla VA-08 para el admin (ya existen `getCurrentActor()` y el usuario admin).

## Bloqueado por definiciones (responde Sergio)
- RN-028: cómo se avisa al cliente que cambió la dieta de su mascota (se ve junto con los emails).
- Pregunta 5.1: cómo se vuelve paciente un cliente.
- Pregunta 6: método de contacto cliente-nutricionista (mensaje interno, WhatsApp, etc.).
- Pregunta 9: estados del pedido completos (pedido, preparado, en camino, entregado, cancelado?, pago pendiente?, devuelto?).
- Pregunta 10 y 11: búsquedas de usuarios sin sesión, retención, normativa argentina.
- Pregunta 12: pagos y envíos v1 (costo de envío, método de pago, quién reparte).
- Pregunta 13: ¿producto puede publicarse sin Auditor?

## Configuración externa hecha (2026-10-08)
- `.env.local` completo: URL, clave publishable, clave secreta y `DATABASE_URL` (session pooler, puerto 5432).
- Google Cloud: proyecto `nutricion-animal`, pantalla de consentimiento (openid, email, profile), usuario de prueba, cliente OAuth web con origen `http://localhost:3000` y redirección `https://xilzwjudufoplgqpzxkx.supabase.co/auth/v1/callback`.
- Supabase: Google activado; ingreso por email desactivado (RN-003: solo Google); Site URL y redirect `http://localhost:3000/**`.

## En pausa (requiere Sergio con sus cuentas)
- Al desplegar: agregar el dominio de producción en Google (orígenes y redirección) y en Supabase (Site URL y Redirect URLs), y publicar la app de Google (sale del modo prueba; hoy solo entran los usuarios de prueba).
- Opcional: cuenta de Vercel con GitHub (el plan Hobby no permite uso comercial).
- Más adelante: dominio propio y servicio de email (notificaciones, RN-024 y RN-028); Mercado Pago (pregunta 12); inscripción de bases de datos ante la AAIP, Ley 25.326 (pregunta 11).
- Advertencia: Supabase pausa proyectos gratuitos tras una semana sin actividad.

## Pendiente (en orden)
- Pantalla de perfil (VU-01) con el botón para postularse como nutricionista o proveedor (RN-024); guardar postulaciones en la base.
- Gestión de usuarios y roles para el admin (VA-10): asignar auditores, bloquear con nota (DT-021).
- Tablas para mascotas y dietas.
- Módulos de dominio restantes: `pedidos`, `busquedas`.
- Tests de integración contra Postgres de prueba (DT-005).
- Playwright con 3-5 tests de humo cuando exista flujo de compra completo (DT-006).

## Hecho
- Ingreso con Google, tabla `users`, primer admin.
- Paleta de colores, Fase 1.
- Node 24 LTS; tests, typecheck, lint y build pasan.
- Proyecto Next.js, Tailwind, shadcn/ui, Zod, Vitest, Drizzle.
- Esquemas de dieta, producto y mascota; módulos `usuarios` y `dietas` con lógica y tests.
