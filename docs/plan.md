# Plan y estado

## Estado actual
- Repositorio creado y conectado a GitHub.
- Reglas de negocio en borrador v0.5 (ver `docs/reglas-de-negocio.md`).
- Proyecto base: Next.js 16, TypeScript, Tailwind, ESLint y shadcn/ui (DT-007 a DT-009).
- Supabase instalado como librería (DT-010); el proyecto en supabase.com todavía no existe.
- Zod y Vitest instalados, `npm test` funciona (DT-012). `.env.example` creado (DT-013).
- Todavía no hay funcionalidad de negocio.

## Próximo paso
- Cerrar definiciones de las reglas que bloquean código (ver "Bloqueado por definiciones"). La primera en implementar es `dietas`.

## Bloqueado por definiciones (responde el desarrollador)
- Dieta (RN-021, RN-022): qué campos tiene. Desbloquea el módulo `dietas`.
- Búsquedas (sección 3 y preguntas 10 y 11): confirmar qué se guarda de cada búsqueda. Desbloquea `busquedas` y la normalización del texto.
- Pedidos (pregunta 9): lista de estados. Desbloquea `pedidos`.
- Roles (preguntas 1 y 8): cómo se combinan y qué puede hacer un nutricionista pendiente. Desbloquea `usuarios`.
- Producto (RN-030, RN-031): campos del producto. Desbloquea `catalogo`.

## En pausa (requiere al desarrollador, con sus cuentas)
- Crear el proyecto en Supabase (supabase.com), elegir región cercana a los usuarios.
- Completar `.env.local` a partir de `.env.example` (URL, clave pública y, solo en `.env.local`, la `service_role`).
- Habilitar Google como proveedor de ingreso (RN-003): requiere credenciales OAuth en Google Cloud.
- Tener presente: Supabase pausa los proyectos gratuitos tras una semana sin actividad.

## Pendiente (en orden)
- Módulos de dominio en `src/modules/` a medida que se definan las reglas (DT-011).
- Tests de integración por dominio contra Postgres de prueba (DT-005).
- Playwright con 3 a 5 tests de humo, solo cuando exista el flujo de compra (DT-006).
- Actualizar Node a >= 20.18.1 (shadcn lo pide; Vitest ya obligó a un workaround con `.mts`).

## Hecho
- Proyecto Next.js creado, shadcn/ui inicializado, comandos documentados en `CLAUDE.md`.
- Supabase, Zod y Vitest instalados; estructura de módulos decidida; `.env.example` agregado.
