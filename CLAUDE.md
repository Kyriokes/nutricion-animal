# Ecommerce de comida natural para mascotas

Web que conecta clientes (con mascotas), nutricionistas animales y proveedores de comida. El cliente compra alimentos y ve la dieta que le asignó un nutricionista. Más adelante: chatbot con IA y carrito asistido.

## Fuente de verdad
- Reglas de negocio y vistas: `docs/reglas-de-negocio.md`. Leelo antes de implementar cualquier funcionalidad y citá los códigos (RN-xxx, VU-xx) en commits y tests.
- No implementes nada marcado **[A DEFINIR]**: preguntale al desarrollador.
- Decisiones técnicas tomadas: `docs/decisiones.md`. Estado y próximos pasos: `docs/plan.md`.

## Stack
- Next.js con TypeScript en modo estricto.
- UI: Tailwind y shadcn/ui.
- Validación: Zod.
- Base de datos: PostgreSQL en Supabase (DT-010). Acceso con Drizzle ORM + SQL directo según convenga (DT-018).
- Ingreso con Google (RN-003) mediante Supabase Auth (DT-010).
- Hosting: Vercel. Ojo: su plan gratuito no permite uso comercial.

## Arquitectura
- La lógica de negocio vive en el backend, en módulos por dominio: `apariencia`, `catalogo`, `contacto`, `contenido`, `dietas`, `mascotas`, `pedidos`, `busquedas`, `usuarios`. Nunca dentro de componentes de UI.
- Toda entrada se valida con Zod en el borde (formularios y API).
- No depender por completo del ORM: usar SQL directo cuando convenga delegar procesamiento a la base (agregaciones, estadísticas). Siempre parametrizado, nunca armado concatenando texto.
- Los datos de tarjeta nunca se guardan en el sistema: los guarda la pasarela de pago, acá solo una referencia.
- No abstraer hasta tener dos casos reales. Nada de patrones "por si acaso".

## Convenciones
- Nombres en el código en inglés; textos de interfaz y documentación en español.
- Glosario: dieta = `diet` (nunca "receta"), mascota = `pet`, nutricionista = `nutritionist`, pedido = `order`, proveedor = `supplier`, cliente = `customer`.
- Commits chicos, mensaje en español, citando la regla (RN) cuando aplique.

## Comandos
- `npm run dev`: servidor de desarrollo.
- `npm run build`: build de producción.
- `npm run lint`: ESLint.
- `npm run typecheck`: genera los tipos de rutas de Next y corre `tsc --noEmit`.
- `npm run db:generate` y `npm run db:migrate`: migraciones con drizzle-kit (requieren `DATABASE_URL`).
- `npm test`: Vitest (`vitest run`), tests en `src/**/*.test.ts` (DT-005, DT-012).

`AGENTS.md` (generado por Next) indica leer `node_modules/next/dist/docs/` antes de escribir código de Next: esta versión (16) difiere de lo que se conoce de versiones anteriores.

## Forma de trabajar
- Es el primer proyecto del desarrollador con Claude Code. Explicá en pocas líneas el porqué de las decisiones de diseño y registralas en `docs/decisiones.md`.
- Antes de cambios grandes, proponé un plan corto y esperá confirmación.
- Usá las skills del proyecto: `nueva-funcionalidad`, `consulta-sql`, `cerrar-tarea`.
