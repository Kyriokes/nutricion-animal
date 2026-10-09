# Plan y estado

## Estado actual
- Repositorio creado y conectado a GitHub.
- Reglas de negocio v0.6 con RN-024 y VP-09 corregidas (no hay registro aparte; el primer ingreso crea la cuenta como Cliente).
- Proyecto base: Next.js 16 (Cache Components y Partial Prefetching activos, DT-031), TypeScript, Tailwind, ESLint y shadcn/ui.
- Supabase (São Paulo): `.env.local` completo, conexión verificada (DT-028).
- **Ingreso con Google funcionando** (RN-003, RN-024, DT-034, DT-035): modal "Ingresar", sesión con `@supabase/ssr`, proxy que renueva la sesión, `/auth/callback`, encabezado con foto, nombre y "Salir". `getCurrentUser()` y `getCurrentActor()` en `src/modules/usuarios/sesion.ts`.
- **Base de datos:** tabla `users` (roles, perfil, nota del admin) con RLS y vínculo a `auth.users`. Migraciones en `drizzle/`, se aplican con `npm run db:migrate`.
- **Sergio es admin** (roles `customer` y `admin`, asignados a mano el 2026-10-08).
- **Paleta de colores completa** (RN-070 a RN-075, DT-030 a DT-033, DT-037): tabla `theme_palettes`, lectura cacheada con respaldo, pantalla VA-08 en `/admin/configuracion/apariencia` (coolors, vista previa, restaurar por categoría, ajustar contraste). Plan: `docs/superpowers/plans/2026-10-08-paleta-de-colores.md`.
- **Perfil (VU-01)** en `/perfil`: datos, editar nombre, postularse como nutricionista o proveedor y ver el estado (RN-024, DT-040).
- **Postulaciones (VA-06)** en `/admin/postulaciones`: admin y auditor aprueban o rechazan; aprobar suma el rol (RN-024, RN-043). Tabla `applications`.
- **Usuarios y roles (VA-10)** en `/admin/usuarios`: roles por casilla, bloqueo sin roles y nota del admin (DT-041).
- Módulos con lógica y tests: `usuarios` (roles, ingreso, postulaciones, perfil, gestión), `mascotas` (esquema), `dietas` (versiones, clonado, asignación), `catalogo` (esquema), `apariencia`.
- `npm test`: 141 tests. Los flujos con base de datos se verificaron con pruebas de humo temporales (datos restaurados).

## Próximo paso
- Que Sergio pruebe `/perfil`, `/admin/postulaciones` y `/admin/usuarios`, y responda la lista de decisiones (abajo, "Decisiones pendientes del 2026-10-08").

## Decisiones pendientes del 2026-10-08 (responde Sergio)
- Avisar por email al postulante cuando se aprueba o rechaza (necesita dominio y servicio de email).
- Motivo del rechazo: ¿se pide y el postulante lo ve?
- Datos del perfil profesional del nutricionista (VN-05, VU-09): hoy quedan en la postulación aprobada; ¿se copian a un perfil editable?
- Campos del formulario de proveedor (hoy solo el nombre del negocio).
- ¿El admin puede dar roles de nutricionista o proveedor directo, sin postulación? Hoy sí puede (RN-001).
- ¿Qué ve un usuario bloqueado? Hoy entra y ve "Cuenta sin roles"; no ve la nota del admin.
- Cambiar la foto de perfil (requiere guardar archivos en Supabase Storage).
- Direcciones del cliente en el perfil (VU-01), atadas a envíos (pregunta 12).

## Pendientes técnicos (de la revisión del 2026-10-08)
- Antes de desplegar: timeouts y tamaño del pool de Postgres en `src/lib/db.ts`, y decidir session vs transaction pooler para Vercel.
- Las pantallas de admin sin permiso muestran un texto; redirigir a VP-13 cuando exista.
- Ajustar el fondo o el texto puede hacer fallar otras categorías; los avisos lo muestran.
- Verificar en Supabase (Settings > JWT Signing Keys) que el proyecto use claves asimétricas, así `getClaims()` valida localmente sin llamar a Supabase Auth en cada pedido.

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
- Paleta de colores completa (fases 1 a 3 y ajuste de contraste), con dos revisiones finales.
- Node 24 LTS; tests, typecheck, lint y build pasan.
- Proyecto Next.js, Tailwind, shadcn/ui, Zod, Vitest, Drizzle.
- Esquemas de dieta, producto y mascota; módulos `usuarios` y `dietas` con lógica y tests.
