# Nutrición animal

Ecommerce de comida natural para mascotas que conecta a **clientes** (con sus mascotas), **nutricionistas animales** y **proveedores** de alimentos. El cliente compra alimentos y ve la dieta que un nutricionista le asignó a cada mascota.

> Proyecto en desarrollo. Ya funcionan el ingreso con Google, los roles y permisos, el perfil, las mascotas, las dietas con versiones, el catálogo con búsqueda, el carrito, la compra con reserva de stock, los reclamos, el contacto y el panel del admin. El pago todavía es simulado: Mercado Pago viene después.

---

## Contenido

- [Qué hace hoy](#qué-hace-hoy)
- [Stack](#stack)
- [Arquitectura](#arquitectura)
- [Puesta en marcha](#puesta-en-marcha)
- [Despliegue](#despliegue)
- [Comandos](#comandos)
- [Pruebas](#pruebas)
- [Seguridad](#seguridad)
- [Documentación del proyecto](#documentación-del-proyecto)
- [Hoja de ruta](#hoja-de-ruta)

---

## Qué hace hoy

| Área | Funcionalidad | Ruta |
|---|---|---|
| Inicio | Presentación y productos destacados. | `/` |
| Catálogo | Búsqueda por texto, filtros por especie y tipo de dieta, atajos por las mascotas del usuario, detalle con tabla nutricional. | `/catalogo` |
| Carrito y compra | Funciona sin sesión; precios y stock siempre del servidor. Con sesión se elige una dirección de Capital (validada con Georef) y se confirma: el stock queda reservado 30 minutos. | `/carrito` |
| Pedidos | Pago simulado (hasta integrar Mercado Pago), resultado, seguimiento, cancelación antes del envío y reclamos. | `/pedidos` |
| Ingreso | Ingreso con Google (sin contraseñas). El primer ingreso crea la cuenta como Cliente. | modal "Ingresar" |
| Perfil | Nombre, foto (JPG/PNG/WebP hasta 1 MB), direcciones de entrega, postulación a nutricionista o proveedor y aviso del resultado. | `/perfil` |
| Mascotas | Alta y edición con alergias, alimentos no permitidos y de necesidad. El detalle muestra la **dieta actual** asignada. | `/mascotas` |
| Dietas | El nutricionista crea dietas, las versiona, las clona y las asigna a mascotas. Si una dieta ya asignada cambia, elige qué mascotas pasan a la versión nueva. | `/dietas` |
| Nutricionistas | Los clientes ven los perfiles profesionales (sin la matrícula). | `/nutricionistas` |
| Postulaciones | Admin y auditor aprueban o rechazan (con motivo) a nutricionistas y proveedores. | `/admin/postulaciones` |
| Usuarios | El admin asigna roles, nombra auditores y suspende cuentas con una nota interna. | `/admin/usuarios` |
| Apariencia | Paleta clara y oscura editable, importable desde coolors.co, con control de contraste (WCAG AA). | `/admin/configuracion/apariencia` |
| Gestión del catálogo | El admin crea y edita productos, con imagen. | `/admin/catalogo` |
| Contenido | El admin edita las preguntas frecuentes, quiénes somos y términos. | `/admin/contenido` |
| Contacto | Formulario (también para cuentas suspendidas), email y WhatsApp. El admin lee los mensajes. | `/contacto`, `/admin/mensajes` |
| Dashboard | Pendientes de atender, ventas de hoy y lo más vendido. | `/admin` |
| Ventas y pedidos | Ventas por día o mes; pedidos filtrados por estado, con avance paso a paso; reclamos y reembolsos. | `/admin/ventas`, `/admin/pedidos`, `/admin/reclamos` |
| Envío | Costo fijo editable (envío simulado, solo Capital). | `/admin/configuracion/envio` |

**Roles:** Cliente, Nutricionista, Proveedor, Auditor y Administrador. Un usuario puede tener varios roles a la vez. Una cuenta sin roles queda suspendida: solo ve una pantalla que la manda a soporte.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Cache Components, Server Actions) |
| Lenguaje | TypeScript en modo estricto |
| UI | Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com) (sobre Base UI), lucide-react, next-themes |
| Validación | [Zod 4](https://zod.dev) en todos los bordes (formularios y acciones) |
| Base de datos | PostgreSQL en [Supabase](https://supabase.com), con [Drizzle ORM](https://orm.drizzle.team) y SQL directo donde conviene |
| Autenticación | Supabase Auth con Google (`@supabase/ssr`, sesión en cookies) |
| Archivos | Supabase Storage (fotos de perfil) |
| Pruebas | [Vitest](https://vitest.dev) |

---

## Arquitectura

Next.js con App Router es *full-stack*: el backend vive en el mismo proyecto, en código que **solo corre en el servidor**. No hay una carpeta `api/` porque la interfaz habla con el servidor mediante **Server Actions**; la sección [¿Y la API?](#y-la-api) explica cuándo hará falta una.

```
src/
├── modules/<dominio>/          ← lógica de negocio (el backend)
│   ├── *.ts                    reglas puras, sin base ni framework, con tests
│   ├── tables.ts               tablas de la base (Drizzle)
│   └── repositorio.ts          acceso a la base: transacciones que aplican las reglas
├── app/                        ← rutas (App Router)
│   ├── **/page.tsx             páginas: leen datos del repositorio en el servidor
│   ├── **/actions.ts           Server Actions ("use server"): los endpoints de la interfaz
│   └── auth/callback/route.ts  ruta HTTP de vuelta del ingreso con Google
├── components/                 componentes de interfaz (solo presentan datos)
├── lib/                        conexiones: db.ts (Postgres), supabase/ (Auth, Storage)
└── proxy.ts                    middleware de Next 16: renueva la sesión en cada pedido

drizzle/                        migraciones SQL generadas
docs/                           reglas de negocio, decisiones y plan
```

### Módulos de dominio

| Módulo | Responsabilidad |
|---|---|
| `usuarios` | Roles y permisos, ingreso, perfil, direcciones, foto, postulaciones, perfil profesional, gestión de usuarios |
| `mascotas` | Mascotas y su formulario |
| `dietas` | Dietas, versiones, asignaciones a mascotas, textos para mostrarlas |
| `apariencia` | Paletas de colores, contraste, coolors.co, variables CSS |
| `catalogo` | Productos, búsqueda y filtros, formulario y textos (precio, tamaño, stock) |
| `pedidos` | Carrito (los pedidos y pagos vienen después) |
| `contenido` | Páginas de texto editables (FAQ, quiénes somos, términos) |

### Cómo fluye un pedido

Ejemplo: un admin aprueba una postulación.

1. El botón llama a `decideAction` (`src/app/admin/postulaciones/actions.ts`). Next la convierte en un `POST` al servidor.
2. La acción valida la entrada con **Zod** y obtiene quién la ejecuta con `getCurrentActor()`, que verifica la sesión.
3. Llama a `decideApplicationInDb` (`src/modules/usuarios/repositorio.ts`), que abre una **transacción**, bloquea las filas involucradas (`FOR UPDATE`) y aplica las **reglas puras** de `postulaciones.ts`: quién puede decidir, que nadie decida su propia postulación y que aprobar sume el rol.
4. Se guarda el resultado y `refresh()` actualiza la pantalla.

Las reglas puras no conocen la base ni Next, así que se prueban con tests rápidos. El repositorio solo traduce su resultado a la base.

### ¿Y la API?

Las Server Actions reemplazan a una API REST cuando quien la consume es la propia interfaz: no hay que escribir `fetch`, rutas ni tipos dos veces. Una carpeta `src/app/api/` con *route handlers* se va a agregar cuando el cliente no sea esta web:

- **webhooks de pagos** (por ejemplo, Mercado Pago avisando un pago aprobado),
- una **app móvil** u otro sistema que consuma los datos,
- el **chatbot con IA** previsto, si necesita streaming o corre afuera.

Esas rutas van a llamar a los mismos módulos de `src/modules/`, así que la lógica no se duplica.

### Decisiones que vale la pena conocer

- **ORM + SQL directo:** Drizzle para el CRUD; SQL directo, siempre parametrizado, cuando conviene que la base haga el trabajo (agregaciones y conteos).
- **Dietas versionadas:** una versión que nunca se asignó se edita libremente; desde que se asigna queda fija y los cambios crean una versión nueva. Así nunca se pierde lo que una mascota llegó a seguir.
- **Cache Components:** las partes que leen la sesión van dentro de `<Suspense>` y se calculan en cada pedido; el resto se pre-renderiza. La paleta de colores se cachea y se invalida al guardarla.
- **Permisos explícitos por rol**, sin herencia: cada rol lista sus permisos y los de varios roles se suman.

El detalle y el porqué de cada decisión está en [`docs/decisiones.md`](docs/decisiones.md).

---

## Puesta en marcha

### Requisitos

- **Node.js 24 LTS** (o 20.19+) y npm.
- Una cuenta de **Supabase** (el plan gratuito alcanza).
- Un proyecto en **Google Cloud** para el ingreso con Google.

### 1. Instalar dependencias

```bash
npm ci
```

### 2. Variables de entorno

Copiá `.env.example` a `.env.local` y completalo. `.env.local` nunca se sube al repositorio.

| Variable | Dónde se obtiene | ¿Pública? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API | Sí |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API Keys (`sb_publishable_…`) | Sí |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys (`sb_secret_…`) | **No**, solo servidor |
| `DATABASE_URL` | Supabase → Connect → Session pooler (puerto 5432), con la contraseña de la base | **No**, solo servidor |
| `PAYMENTS_SIMULATED` | Opcional. `true` activa el pago de prueba en producción (en desarrollo siempre está activo) | **No**, solo servidor |

### 3. Configurar el ingreso con Google

1. En **Google Cloud**, configurá la pantalla de consentimiento (permisos `openid`, `email` y `profile`) y creá un cliente OAuth de tipo *Aplicación web*:
   - Origen autorizado: `http://localhost:3000`
   - URI de redirección: `https://<tu-proyecto>.supabase.co/auth/v1/callback`
2. En **Supabase → Authentication → Sign In / Providers**, activá **Google** con el ID y el secreto del cliente, y **desactivá Email** (el ingreso es solo con Google).
3. En **Authentication → URL Configuration**: Site URL `http://localhost:3000` y Redirect URL `http://localhost:3000/**`.

Mientras la app de Google esté en modo prueba, solo pueden ingresar los usuarios de prueba cargados ahí.

### 4. Crear las tablas

```bash
npm run db:migrate
```

Todas las tablas se crean con **RLS activado** (ver [Seguridad](#seguridad)).

### 5. Almacenamiento de imágenes y productos de prueba

```bash
npm run storage:setup
npm run db:seed
```

El primero crea en Supabase Storage los buckets públicos `avatars` (fotos de perfil) y `products` (imágenes de productos), con límite de 1 MB y solo JPG, PNG o WebP. El segundo carga 12 productos de prueba en el catálogo; se puede correr varias veces sin duplicar.

### 6. Levantar el sitio

```bash
npm run dev
```

Abrí `http://localhost:3000` e ingresá con Google. El primer usuario queda como Cliente; para hacerlo administrador, agregale el rol a mano en la base, en la columna `roles` de la tabla `users`:

```sql
update users set roles = array['customer','admin'] where email = 'tu@email.com';
```

Desde ahí, el resto de los roles se asigna desde `/admin/usuarios`.

---

## Despliegue

El sitio se publica en [Vercel](https://vercel.com) desde la rama `main` de GitHub: cada push despliega solo. Ojo: el plan gratuito de Vercel no permite uso comercial (sirve para mostrar el proyecto).

- **Región:** `vercel.json` fija São Paulo (`gru1`), al lado de la base de Supabase.
- **Base de datos:** en Vercel, `DATABASE_URL` usa el **transaction pooler** de Supabase (puerto `6543`), pensado para servidores que levantan y bajan instancias. En local se puede seguir usando el session pooler (puerto `5432`). Las migraciones se aplican desde la computadora con `npm run db:migrate`, no en el deploy.
- **Variables de entorno en Vercel:** las mismas de `.env.local` (con el `DATABASE_URL` del transaction pooler). Para una demo con el pago de prueba, `PAYMENTS_SIMULATED=true`.
- **Supabase Auth:** agregar la URL de Vercel en Authentication → URL Configuration (Site URL y Redirect URLs, con `/auth/callback`). Google no necesita cambios: vuelve siempre a Supabase.

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Sirve el build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | Genera los tipos de rutas de Next y corre `tsc --noEmit` |
| `npm test` | Tests con Vitest |
| `npm run db:generate` | Genera una migración a partir de los cambios en `tables.ts` |
| `npm run db:migrate` | Aplica las migraciones pendientes (lee `.env.local`) |
| `npm run db:seed` | Carga los productos de prueba del catálogo |
| `npm run storage:setup` | Crea o actualiza los buckets de imágenes en Supabase |

---

## Pruebas

```bash
npm test
```

Los tests cubren las **reglas de negocio puras** de cada módulo: permisos por rol, postulaciones, versiones y asignaciones de dietas, validación de mascotas, direcciones y fotos, contraste de colores y lectura de enlaces de coolors.co, entre otras. Cada test cita la regla que prueba (por ejemplo, `RN-024`), así se puede rastrear hasta [`docs/reglas-de-negocio.md`](docs/reglas-de-negocio.md).

Los flujos que tocan la base se verificaron con pruebas de humo contra una base de desarrollo. Están previstos tests de integración contra una base de prueba y algunos tests de punta a punta con Playwright para el flujo de compra.

---

## Seguridad

- **Autorización en el servidor:** cada Server Action verifica la sesión y el permiso antes de tocar datos, aunque la interfaz ya oculte la opción. El proxy solo renueva la sesión; no decide permisos.
- **Sesión verificada:** se valida con `getClaims()` de Supabase, no leyendo la cookie a ciegas.
- **RLS en todas las tablas, sin políticas:** la clave publicable viaja al navegador, así que nadie puede leer ni escribir las tablas con ella. El servidor accede con `DATABASE_URL`.
- **Secretos solo en el servidor:** `SUPABASE_SECRET_KEY` y `DATABASE_URL` no llevan el prefijo `NEXT_PUBLIC_`.
- **Entradas validadas con Zod**, incluidos los colores que se inyectan como CSS y las fotos (tipo, tamaño y contenido real del archivo).
- **Redirecciones seguras:** después de ingresar solo se vuelve a rutas del propio sitio.
- **Datos de tarjeta:** nunca se van a guardar en el sistema; los guardará la pasarela de pago.

---

## Documentación del proyecto

| Documento | Contenido |
|---|---|
| [`docs/reglas-de-negocio.md`](docs/reglas-de-negocio.md) | Fuente de verdad: roles, reglas (`RN-xxx`), vistas (`VP`, `VU`, `VN`, `VA`) y preguntas abiertas |
| [`docs/decisiones.md`](docs/decisiones.md) | Decisiones técnicas (`DT-xxx`) con su porqué |
| [`docs/plan.md`](docs/plan.md) | Estado actual, próximos pasos y pendientes |
| [`CLAUDE.md`](CLAUDE.md) | Convenciones para desarrollar con Claude Code |

Convenciones: código en inglés y textos en español. Los commits citan la regla que implementan.

---

## Hoja de ruta

- [x] Ingreso con Google, roles y permisos, suspensión de cuentas
- [x] Perfil, direcciones y foto
- [x] Postulaciones de nutricionistas y proveedores
- [x] Mascotas y dietas versionadas
- [x] Apariencia administrable
- [x] Menú de navegación
- [x] Catálogo de productos y búsqueda
- [x] Carrito
- [x] Páginas de contenido editables (FAQ, quiénes somos, términos)
- [x] Pedidos, estados, reserva de stock y reclamos
- [x] Contacto y dashboard del admin
- [ ] Despliegue en Vercel
- [ ] Publicación de productos por proveedores y revisión del auditor
- [ ] Pagos con Mercado Pago (webhooks)
- [ ] Estadísticas de búsquedas
- [ ] Notificaciones por email
- [ ] Chatbot con IA y carrito asistido
- [ ] Despliegue
