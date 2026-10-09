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
- **Perfil (VU-01)** en `/perfil`: datos, editar nombre, cambiar foto (RN-016, bucket `avatars`), direcciones de entrega (RN-017), postularse como nutricionista o proveedor y ver el resultado con su motivo (RN-024, RN-044, RN-045).
- **Postulaciones (VA-06)** en `/admin/postulaciones`: admin y auditor aprueban o rechazan (con motivo); aprobar suma el rol y, si es nutricionista, crea su perfil profesional (RN-029). Tabla `applications`.
- **Perfil profesional y búsqueda** (RN-012, RN-029, VN-05, VU-08, VU-09): el nutricionista lo edita en Mi perfil; los clientes lo ven en `/nutricionistas`, sin matrícula.
- **Usuarios y roles (VA-10)** en `/admin/usuarios`: roles por casilla, bloqueo sin roles y nota del admin (DT-041). Las cuentas bloqueadas ven un aviso de contactar a soporte (RN-046).
- **Mis mascotas (VU-03, VU-04)** en `/mascotas`: alta, edición, borrado; el detalle muestra la "Dieta actual" con la versión asignada (RN-010, RN-015). Tabla `pets`.
- **Mis dietas (VN-01, VN-03, VN-04)** en `/dietas`: crear, renombrar, editar (en el lugar o versión nueva eligiendo qué mascotas pasan), clonar, borrar versiones nunca asignadas, asignar buscando cliente o mascota, terminar asignaciones e historial (RN-021 a RN-027, DT-047). Tablas `diets`, `diet_versions`, `diet_assignments`.
- Módulos con lógica y tests: `usuarios` (roles, ingreso, postulaciones, perfil, perfil profesional, direcciones, foto, gestión), `mascotas` (esquema, formulario), `dietas` (versiones, clonado, asignación, textos), `catalogo` (esquema), `apariencia`.
- `npm test`: 167 tests. Los flujos con base de datos y el almacenamiento se verificaron con pruebas de humo temporales (datos borrados al terminar).

## Próximo paso
- Que Sergio pruebe en pantalla: Mis mascotas, Mis dietas (con el rol de nutricionista), y la Dieta actual desde el detalle de la mascota.
- Navegación: el encabezado ya tiene muchos enlaces; conviene un menú (desplegable o lateral) antes de sumar más secciones.
- Siguiente bloque grande: catálogo de productos (RN-030, RN-031, VP-04, VP-05), que hoy solo tiene el esquema.

## Versión avanzada (decidido dejar para después)
- Emails: avisar al postulante (RN-045), cambios de dieta (RN-028), y soporte para cuentas suspendidas (RN-046).
- Formulario completo de proveedor (hoy solo el nombre del negocio).
- Editar una dirección (hoy se borra y se carga de nuevo).

## Esperando a Sergio
- VN-04: alcance de la búsqueda de clientes para asignar dietas (Ley 25.326). Lo consulta antes de definirlo; mientras tanto la pantalla muestra un aviso de funcionamiento provisorio.

## Pendientes de la revisión final de perfil, mascotas y dietas (2026-10-08)
Arreglados: aprobar ya no desbloquea a un usuario (RN-024); el editor desactualizado ya no mueve mascotas (RN-026); borrar dietas nunca asignadas (RN-021).
Quedan (menores):
- Pasar una mascota que quedó en una versión vieja a la última (hoy: terminar y volver a asignar).
- Dos admins quitándose el rol entre sí a la vez podrían dejar el sistema sin admins.
- Fotos: dos subidas simultáneas dejan una huérfana; exigir el prefijo `<id de usuario>/` antes de borrar la anterior.
- `import "server-only"` en `src/lib/supabase/admin.ts` (requiere instalar el paquete `server-only`).
- Largos máximos en los esquemas (descripción y notas de dieta, alimentos, listas de la mascota, dirección y matrícula).
- Sugerencias de especies: hoy muestran texto libre de otros usuarios; exigir que se repita o usar lista cerrada.
- El admin al clonar una dieta ajena queda como dueño de la copia.
- Si la base falla al leer la sesión, las acciones terminan en la pantalla de error en vez de un mensaje.

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
