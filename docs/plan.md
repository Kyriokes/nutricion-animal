# Plan y estado

## Estado actual
- Repositorio creado y conectado a GitHub.
- Reglas de negocio v0.6: roles, nutricionista, dietas y productos definidos (DT-014 a DT-017).
- Proyecto base: Next.js 16, TypeScript, Tailwind, ESLint y shadcn/ui.
- Supabase: proyecto creado (`xilzwjudufoplgqpzxkx`); `.env.local` tiene URL y clave publishable, conexión verificada (DT-028).
- Zod y Vitest instalados. `npm test` funciona (73 tests).
- Drizzle ORM instalado y configurado (DT-018); sin tablas ni conexión todavía.
- Esquemas iniciales para dieta y producto con tests de validación.
- Módulo `usuarios`: roles[] con permisos, postulaciones y nota del admin (DT-019 a DT-021), con tests.
- Módulo `mascotas`: esquema con alergias, alimentos no permitidos y de necesidad (DT-022).
- Módulo `dietas`: dietas propias con versiones, clonado y asignación a mascotas (DT-025 a DT-027), con tests.
- Todavía no hay funcionalidad de backend/API.

## Próximo paso
- Avisar al cliente cuando cambia la dieta de su mascota (RN-028): falta definir cómo (se ve junto con los emails).
- Qué ve el cliente de la dieta de su mascota (RN-015, VU-04).
- Módulo `pedidos`: bloqueado hasta definir los estados (pregunta 9).

## Bloqueado por definiciones (responde Sergio)
- Pregunta 5.1: cómo se vuelve paciente un cliente.
- Pregunta 6: método de contacto cliente-nutricionista (mensaje interno, WhatsApp, etc.).
- Pregunta 9: estados del pedido completos (pedido, preparado, en camino, entregado, cancelado?, pago pendiente?, devuelto?).
- Pregunta 10 y 11: búsquedas de usuarios sin sesión, retención, normativa argentina.
- Pregunta 12: pagos y envíos v1 (costo de envío, método de pago, quién reparte).
- Pregunta 13: ¿producto puede publicarse sin Auditor?

## En pausa (requiere Sergio con sus cuentas)
- Completar en `.env.local`: `SUPABASE_SECRET_KEY` y `DATABASE_URL` (session pooler, puerto 5432). Nunca pegarlas en el chat.
- Google Cloud: pantalla de consentimiento (openid, email, profile), usuario de prueba, cliente OAuth web con origen `http://localhost:3000` y redirección `https://xilzwjudufoplgqpzxkx.supabase.co/auth/v1/callback` (RN-003).
- Supabase: activar Google en Authentication > Providers; en URL Configuration, Site URL `http://localhost:3000` y redirect `http://localhost:3000/**`.
- Después del primer ingreso: dar el rol `admin` al usuario de Sergio a mano en la base.
- Opcional: cuenta de Vercel con GitHub (el plan Hobby no permite uso comercial).
- Más adelante: dominio propio y servicio de email (notificaciones, RN-024 y RN-028); Mercado Pago (pregunta 12); inscripción de bases de datos ante la AAIP, Ley 25.326 (pregunta 11).
- Advertencia: Supabase pausa proyectos gratuitos tras una semana sin actividad.

## Pendiente (en orden)
- Módulos de dominio restantes: `pedidos`, `busquedas`.
- API routes con lógica de negocio en módulos (no en controladores).
- Tests de integración contra Postgres de prueba (DT-005).
- Playwright con 3-5 tests de humo cuando exista flujo de compra completo (DT-006).
- Primera tabla y conexión con Drizzle (`src/modules/<dominio>/tables.ts`), cuando exista la base de Supabase.

## Hecho
- Node actualizado a 24 LTS; `npm ci`, tests, typecheck, lint y build pasan.
- Proyecto Next.js, Tailwind, shadcn/ui, Zod, Vitest.
- Esquemas de dieta y producto con tests.
- Reglas de negocio v0.6 completada.
- Módulo `usuarios` (roles, permisos, postulaciones, nota del admin) y módulo `mascotas`.
