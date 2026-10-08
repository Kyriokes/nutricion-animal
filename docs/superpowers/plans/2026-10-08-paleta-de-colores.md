# Paleta de colores administrable — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** El administrador define desde VA-08 una paleta clara y una oscura (8 categorías), importándolas desde coolors.co; el sitio las aplica sin parpadeo, sigue el modo del sistema con botón para cambiarlo, y cae a una paleta base si la base de datos falla.

**Architecture:** Módulo de dominio nuevo `src/modules/apariencia/` con lógica pura (contraste, categorías, coolors, variables CSS) testeada con Vitest. Un Server Component inyecta en `<head>` un `<style>` con las variables CSS de shadcn calculadas desde la paleta (guardada o base). El modo claro/oscuro lo maneja `next-themes` con la clase `.dark` que ya usa shadcn. La paleta se lee con cache por tag y se invalida al guardar (ver DT-031: el proyecto usa Cache Components).

**Tech Stack:** Next.js 16 (App Router, sin Cache Components), TypeScript estricto, Zod 4, Vitest, Drizzle + Postgres (Supabase), Tailwind 4 + shadcn/ui, `next-themes`.

**Spec:** `docs/reglas-de-negocio.md`, sección 2.7 (RN-070 a RN-074). Ejecutores: leer ambos.

## Global Constraints

- Antes de escribir código de Next, leer la guía relevante en `node_modules/next/dist/docs/` (AGENTS.md). **Cache Components está activo** (`cacheComponents: true`, DT-031): cache con `"use cache"` + `cacheTag` + `cacheLife`; invalidar con `updateTag` en Server Actions o `revalidateTag(tag, perfil)`. No usar `unstable_cache`.
- Nombres en el código en inglés; textos de interfaz y documentación en español. Commits en español citando RN-070 a RN-074, terminando con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Toda entrada se valida con Zod en el borde. La lógica vive en `src/modules/apariencia/`, nunca en componentes.
- Funciones de dominio puras, con resultado `Result<T, E>` de `src/lib/result.ts` y `Actor` de `src/modules/usuarios/roles.ts` (DT-027).
- Colores siempre como `Hex` normalizado: `#` + 6 dígitos hex en minúscula (`/^#[0-9a-f]{6}$/`).
- Umbral de contraste: constante `MIN_TEXT_CONTRAST = 4.5` (WCAG AA). Confirmado por el desarrollador (RN-072).
- Toda tabla nueva con RLS activado (DT-029).
- Comandos de verificación: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

## Review Focus

1. **Base de datos caída o lenta:** la página debe renderizar con la paleta base, y el fallo **no** debe quedar cacheado. Con Cache Components hay dos lugares donde podría quedar: la función con `"use cache"` y el HTML estático del layout que se genera en el build. → Task 7 (a rediseñar): la función cacheada lanza en error; `loadPalettes` atrapa afuera; test con loader que rechaza y con loader que excede el timeout; y decidir cómo se regenera un HTML construido con la paleta de respaldo.
2. **Paleta guardada antes de agregar una categoría nueva:** la categoría faltante toma el valor de la paleta base, no rompe el render. → Task 7: test de mezcla con categoría ausente y con hex inválido guardado.
3. **Variantes de enlace de coolors:** `/palette/`, mayúsculas, query o `#` al final, `www.`; rechazar dominios ajenos y hex de 3 dígitos. → Task 3.
4. **Paleta con contraste insuficiente:** se bloquea el guardado y el mensaje nombra el par que falla, también para error, éxito y advertencia. → Tasks 2 y 6.
5. **Elección de modo del usuario:** "sistema" con SO oscuro usa la paleta oscura; la elección sobrevive a recargar y no hay parpadeo de colores. → Task 5, verificación manual.

---

## Archivos

| Archivo | Responsabilidad |
|---|---|
| `src/modules/apariencia/color.ts` | Matemática de color: parsear/normalizar hex, mezclar, contraste WCAG |
| `src/modules/apariencia/paleta.ts` | Categorías, esquema Zod de paleta, paletas base, validación de contraste |
| `src/modules/apariencia/coolors.ts` | Leer y armar enlaces de coolors.co |
| `src/modules/apariencia/variables.ts` | Paleta → variables CSS de shadcn y texto CSS |
| `src/modules/apariencia/guardar.ts` | Regla de guardado: permiso + validación (pura) |
| `src/modules/apariencia/tables.ts` | Tabla Drizzle `theme_palettes` |
| `src/modules/apariencia/lectura.ts` | Leer paletas con cache, timeout y caída a la base |
| `src/components/theme-provider.tsx`, `theme-toggle.tsx`, `palette-style.tsx` | Proveedor de tema, botón de modo, `<style>` con la paleta |
| `src/app/admin/configuracion/apariencia/` | Página VA-08 y Server Action de guardado |

Fases: **1** (Tasks 1–6) no necesita cuentas externas. **2** (Task 7) necesita `DATABASE_URL`. **3** (Task 8) necesita además el ingreso con Google y un usuario admin, más un helper de sesión que todavía no existe.

---

## Fase 1 — sin cuentas externas

### Task 1: Matemática de color

**Files:**
- Create: `src/modules/apariencia/color.ts`
- Test: `src/modules/apariencia/color.test.ts`

**Interfaces:**
- Produces: `type Hex = string`; `normalizeHex(input: string): Hex | null` (acepta con o sin `#`, mayúsculas; solo 6 dígitos); `contrastRatio(a: Hex, b: Hex): number` (WCAG 2.x, luminancia relativa sRGB); `mix(a: Hex, b: Hex, weightOfA: number): Hex` (interpolación lineal por canal sRGB, redondeo al entero); `bestTextOn(bg: Hex, candidates: readonly Hex[]): Hex` (el candidato de mayor contraste).

- [ ] **Step 1: Tests que fallan**

```ts
it("normaliza hex", () => {
  expect(normalizeHex("2A9D8F")).toBe("#2a9d8f");
  expect(normalizeHex("#2a9d8f")).toBe("#2a9d8f");
  expect(normalizeHex("#abc")).toBeNull();
  expect(normalizeHex("zzzzzz")).toBeNull();
});
it("contraste WCAG", () => {
  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
  expect(contrastRatio("#ffffff", "#ffffff")).toBeCloseTo(1, 5);
  expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  expect(contrastRatio("#ffffff", "#000000")).toBe(contrastRatio("#000000", "#ffffff"));
});
it("mezcla", () => {
  expect(mix("#000000", "#ffffff", 0.5)).toBe("#808080");
  expect(mix("#ff0000", "#0000ff", 1)).toBe("#ff0000");
});
it("elige el texto más legible", () => {
  expect(bestTextOn("#ffffff", ["#0a0a0a", "#fafafa"])).toBe("#0a0a0a");
});
```

- [ ] **Step 2:** `npm test -- color` → FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar las cuatro funciones en `color.ts`.
- [ ] **Step 4:** `npm test -- color` → PASS.
- [ ] **Step 5:** Commit `Agregar matemática de color para paletas (RN-072)`.

### Task 2: Categorías, paleta base y validación de contraste

**Files:**
- Create: `src/modules/apariencia/paleta.ts`
- Test: `src/modules/apariencia/paleta.test.ts`
- Modify: `CLAUDE.md` (agregar `apariencia` a la lista de módulos), `docs/decisiones.md`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `PALETTE_CATEGORIES = ["background","foreground","primary","secondary","accent","destructive","success","warning"] as const`; `type PaletteCategory`.
  - `PaletteSchema`: `z.object` con una clave por categoría, cada una `z.string().transform(normalizeHex)` que falla si da `null`. `type Palette = Record<PaletteCategory, Hex>`.
  - `type ThemeMode = "light" | "dark"`; `DEFAULT_PALETTES: Record<ThemeMode, Palette>`.
  - `MIN_TEXT_CONTRAST = 4.5`.
  - `onColorOf(palette: Palette, category: Exclude<PaletteCategory,"background"|"foreground">): Hex` = `bestTextOn(palette[category], [palette.foreground, palette.background])`.
  - `type ContrastIssue = { pair: [string, string]; ratio: number }`; `validatePalette(p: Palette): ContrastIssue[]`. Pares: `foreground/background`; cada categoría de color contra su `onColorOf`; `destructive`, `success` y `warning` contra `background` (se usan como texto). Nombres de los pares en español: `"texto"`, `"fondo"`, `"primario"`, `"texto sobre primario"`, etc.

Valores de `DEFAULT_PALETTES` (equivalentes a los neutros de shadcn más estados):

| categoría | light | dark |
|---|---|---|
| background | `#ffffff` | `#0a0a0a` |
| foreground | `#0a0a0a` | `#fafafa` |
| primary | `#171717` | `#e5e5e5` |
| secondary | `#f5f5f5` | `#262626` |
| accent | `#f5f5f5` | `#262626` |
| destructive | `#c10007` | `#ff6467` |
| success | `#008236` | `#05df72` |
| warning | `#a65f00` | `#ffb900` |

Si algún valor no pasa `validatePalette`, ajustarlo (oscurecer en claro, aclarar en oscuro) hasta que pase, y anotarlo en `docs/decisiones.md`.

- [ ] **Step 1: Tests que fallan**

```ts
it("RN-074: las paletas base cumplen el contraste", () => {
  expect(validatePalette(DEFAULT_PALETTES.light)).toEqual([]);
  expect(validatePalette(DEFAULT_PALETTES.dark)).toEqual([]);
});
it("RN-072: detecta texto ilegible sobre el fondo", () => {
  const p = { ...DEFAULT_PALETTES.light, foreground: "#eeeeee" };
  expect(validatePalette(p)).toContainEqual(
    expect.objectContaining({ pair: ["texto", "fondo"] }));
});
it("RN-072: error, éxito y advertencia también deben leerse sobre el fondo", () => {
  const p = { ...DEFAULT_PALETTES.light, warning: "#ffe066" };
  expect(validatePalette(p).map((i) => i.pair)).toContainEqual(["advertencia", "fondo"]);
});
it("el esquema normaliza y rechaza colores inválidos", () => {
  const ok = PaletteSchema.safeParse({ ...DEFAULT_PALETTES.light, primary: "264653" });
  expect(ok.success && ok.data.primary).toBe("#264653");
  expect(PaletteSchema.safeParse({ ...DEFAULT_PALETTES.light, primary: "#123" }).success).toBe(false);
  const { warning: _, ...missing } = DEFAULT_PALETTES.light;
  expect(PaletteSchema.safeParse(missing).success).toBe(false);
});
```

- [ ] **Step 2:** `npm test -- paleta` → FAIL.
- [ ] **Step 3:** Implementar `paleta.ts`. Agregar `apariencia` a los módulos en `CLAUDE.md`. Registrar en `docs/decisiones.md`: módulo `apariencia`, 8 categorías, umbral confirmado.
- [ ] **Step 4:** `npm test -- paleta` → PASS.
- [ ] **Step 5:** Commit `Agregar categorías, paletas base y validación de contraste (RN-070, RN-072, RN-074)`.

### Task 3: Enlaces de coolors.co

**Files:**
- Create: `src/modules/apariencia/coolors.ts`
- Test: `src/modules/apariencia/coolors.test.ts`

**Interfaces:**
- Consumes: `normalizeHex`, `Hex` (Task 1); `Result` de `@/lib/result`.
- Produces: `parseCoolorsUrl(url: string): Result<{ colors: Hex[] }, "invalid_url" | "no_colors">` (host `coolors.co` o `www.coolors.co`; último segmento de la ruta, con o sin `/palette/`; separados por `-`; entre 2 y 10 colores, todos válidos; ignora query y `#`). `toCoolorsUrl(colors: readonly Hex[]): string` = `https://coolors.co/` + colores sin `#`, en minúscula, sin repetir, unidos por `-`.

- [ ] **Step 1: Tests que fallan**

```ts
it("RN-071: lee los colores de un enlace", () => {
  expect(parseCoolorsUrl("https://coolors.co/264653-2a9d8f-e9c46a-f4a261-e76f51"))
    .toEqual({ ok: true, colors: ["#264653", "#2a9d8f", "#e9c46a", "#f4a261", "#e76f51"] });
});
it("acepta /palette/, mayúsculas, www, query y hash", () => {
  for (const url of [
    "https://coolors.co/palette/264653-2A9D8F",
    "https://www.coolors.co/264653-2a9d8f?ref=x",
    "https://coolors.co/264653-2a9d8f#top",
  ]) expect(parseCoolorsUrl(url)).toEqual({ ok: true, colors: ["#264653", "#2a9d8f"] });
});
it("rechaza dominios ajenos, textos que no son URL y colores inválidos", () => {
  expect(parseCoolorsUrl("https://evil.com/264653-2a9d8f")).toEqual({ ok: false, error: "invalid_url" });
  expect(parseCoolorsUrl("no es un link")).toEqual({ ok: false, error: "invalid_url" });
  expect(parseCoolorsUrl("https://coolors.co/generate")).toEqual({ ok: false, error: "no_colors" });
  expect(parseCoolorsUrl("https://coolors.co/abc-2a9d8f")).toEqual({ ok: false, error: "no_colors" });
});
it("RN-071: arma el enlace para editar en coolors", () => {
  expect(toCoolorsUrl(["#264653", "#2A9D8F", "#264653"]))
    .toBe("https://coolors.co/264653-2a9d8f");
});
```

- [ ] **Step 2:** `npm test -- coolors` → FAIL.
- [ ] **Step 3:** Implementar con `new URL()` dentro de try/catch.
- [ ] **Step 4:** `npm test -- coolors` → PASS.
- [ ] **Step 5:** Commit `Leer y armar enlaces de coolors.co (RN-071)`.

### Task 4: Paleta → variables CSS, y CSS base alineado

**Files:**
- Create: `src/modules/apariencia/variables.ts`
- Test: `src/modules/apariencia/variables.test.ts`
- Modify: `src/app/globals.css` (valores de `:root` y `.dark`; agregar `--success`, `--success-foreground`, `--warning`, `--warning-foreground` y sus `--color-*` en `@theme inline`)

**Interfaces:**
- Consumes: Tasks 1 y 2.
- Produces: `toCssVariables(p: Palette): Record<string, Hex>` y `paletteCss(palettes: Record<ThemeMode, Palette>): string` (devuelve `:root{--x:#...;...}.dark{...}`, claves ordenadas alfabéticamente).

Correspondencia (las `--chart-*` y `--radius` no se tocan):

| variable | valor |
|---|---|
| `--background`, `--card`, `--popover`, `--sidebar` | `background` |
| `--foreground`, `--card-foreground`, `--popover-foreground`, `--sidebar-foreground` | `foreground` |
| `--primary`, `--sidebar-primary`, `--ring`, `--sidebar-ring` | `primary` |
| `--X` y `--X-foreground` para X en secondary, accent, destructive, success, warning; `--primary-foreground`, `--sidebar-primary-foreground` | el color y `onColorOf(p, X)` |
| `--sidebar-accent`, `--sidebar-accent-foreground` | `accent` y `onColorOf(p,"accent")` |
| `--muted` | `mix(background, foreground, 0.92)` |
| `--muted-foreground` | `mix(foreground, background, 0.65)`; si su contraste con `background` < `MIN_TEXT_CONTRAST`, usar `foreground` |
| `--border`, `--input`, `--sidebar-border` | `mix(background, foreground, 0.85)` |

- [ ] **Step 1: Tests que fallan**

```ts
it("mapea categorías a variables de shadcn", () => {
  const v = toCssVariables(DEFAULT_PALETTES.light);
  expect(v["--background"]).toBe("#ffffff");
  expect(v["--card"]).toBe("#ffffff");
  expect(v["--primary-foreground"]).toBe(onColorOf(DEFAULT_PALETTES.light, "primary"));
  expect(v["--success"]).toBe("#008236");
});
it("el texto atenuado siempre se lee", () => {
  const p = { ...DEFAULT_PALETTES.light, foreground: "#595959" };
  const v = toCssVariables(p);
  expect(contrastRatio(v["--muted-foreground"], p.background)).toBeGreaterThanOrEqual(MIN_TEXT_CONTRAST);
});
it("arma el CSS de ambos modos", () => {
  const css = paletteCss(DEFAULT_PALETTES);
  expect(css.startsWith(":root{")).toBe(true);
  expect(css).toContain(".dark{--accent:#262626;");
});
it("RN-074: globals.css coincide con la paleta base", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  for (const [mode, selector] of [["light", ":root"], ["dark", ".dark"]] as const) {
    const block = css.match(new RegExp(`\\${selector}\\s*\\{([^}]*)\\}`))![1];
    for (const [name, value] of Object.entries(toCssVariables(DEFAULT_PALETTES[mode]))) {
      expect(block).toContain(`${name}: ${value};`);
    }
  }
});
```

- [ ] **Step 2:** `npm test -- variables` → FAIL.
- [ ] **Step 3:** Implementar `variables.ts`. Generar los valores de `globals.css` con `toCssVariables(DEFAULT_PALETTES.light|dark)` (no copiarlos a mano) y reemplazar los de `:root` y `.dark`; agregar las variables `success` y `warning` en los tres bloques.
- [ ] **Step 4:** `npm test` y `npm run build` → PASS.
- [ ] **Step 5:** Commit `Traducir paletas a variables CSS y alinear el estilo base (RN-070, RN-074)`.

### Task 5: Modo claro/oscuro y aplicación de la paleta

**Files:**
- Create: `src/components/theme-provider.tsx` (client), `src/components/theme-toggle.tsx` (client), `src/components/palette-style.tsx` (server)
- Modify: `src/app/layout.tsx`, `package.json` (`npm install next-themes`)

**Interfaces:**
- Consumes: `paletteCss`, `DEFAULT_PALETTES`.
- Produces: `<PaletteStyle palettes={...} />` renderiza `<style>{paletteCss(palettes)}</style>`; en este task el layout le pasa `DEFAULT_PALETTES` (el Task 7 lo cambia por `await getPalettes()`). `<ThemeToggle />` cicla claro → oscuro → sistema.

Decisiones fijas: `ThemeProvider` de `next-themes` con `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`. `<html lang="es" suppressHydrationWarning>`. El toggle es un botón de shadcn con íconos de lucide (`Sun`, `Moon`, `Monitor`), `aria-label` en español que dice el modo actual, y no renderiza el ícono hasta montar (evita el error de hidratación). Ubicación provisional del botón: arriba a la derecha en `page.tsx`, hasta que exista un encabezado.

- [ ] **Step 1:** Leer `node_modules/next/dist/docs/01-app/01-getting-started` sobre layouts y metadata.
- [ ] **Step 2:** Implementar los tres componentes y el layout.
- [ ] **Step 3:** `npm run typecheck`, `npm run lint`, `npm run build` → PASS.
- [ ] **Step 4: Verificación manual** con `npm run dev` en el navegador del panel: con el SO en oscuro y modo "sistema" se ve oscuro; el botón cambia a claro y sobrevive a recargar; no hay parpadeo; sin errores de hidratación en consola.
- [ ] **Step 5:** Commit `Agregar modo claro/oscuro con botón y aplicar la paleta (RN-073)`. Registrar `next-themes` en `docs/decisiones.md`.

### Task 6: Regla de guardado

**Files:**
- Create: `src/modules/apariencia/guardar.ts`
- Test: `src/modules/apariencia/guardar.test.ts`
- Modify: `src/modules/usuarios/roles.ts` (permiso `"settings.manage"`, comentario `// VA-08, RN-070`), `src/modules/usuarios/roles.test.ts`

**Interfaces:**
- Consumes: `PaletteSchema`, `validatePalette`, `ContrastIssue`, `ThemeMode`; `hasPermission`, `Actor`.
- Produces: `preparePaletteUpdate(input: { actor: Actor; palettes: unknown }): Result<{ palettes: Record<ThemeMode, Palette> }, "not_allowed" | "invalid" | "low_contrast">`; el error `"low_contrast"` incluye `issues: { mode: ThemeMode; issue: ContrastIssue }[]` (ampliar el tipo de error con un campo extra solo para este caso).

- [ ] **Step 1: Tests que fallan**

```ts
it("VA-08: solo el admin puede cambiar la paleta", () => {
  expect(hasPermission(["admin"], "settings.manage")).toBe(true);
  expect(hasPermission(["auditor"], "settings.manage")).toBe(false);
  expect(preparePaletteUpdate({ actor: { id: "u", roles: ["auditor"] }, palettes: DEFAULT_PALETTES }))
    .toMatchObject({ ok: false, error: "not_allowed" });
});
it("acepta paletas válidas y normaliza", () => {
  const input = { light: { ...DEFAULT_PALETTES.light, primary: "264653" }, dark: DEFAULT_PALETTES.dark };
  expect(preparePaletteUpdate({ actor: admin, palettes: input }))
    .toMatchObject({ ok: true, palettes: { light: { primary: "#264653" } } });
});
it("rechaza datos mal formados", () => {
  expect(preparePaletteUpdate({ actor: admin, palettes: { light: {} } }))
    .toMatchObject({ ok: false, error: "invalid" });
});
it("RN-072: bloquea si algún modo no contrasta, indicando el modo y el par", () => {
  const input = { light: DEFAULT_PALETTES.light, dark: { ...DEFAULT_PALETTES.dark, foreground: "#111111" } };
  const r = preparePaletteUpdate({ actor: admin, palettes: input });
  expect(r).toMatchObject({ ok: false, error: "low_contrast" });
  if (!r.ok && r.error === "low_contrast") expect(r.issues[0]).toMatchObject({ mode: "dark", issue: { pair: ["texto", "fondo"] } });
});
```

- [ ] **Step 2:** `npm test -- guardar roles` → FAIL.
- [ ] **Step 3:** Implementar. Orden: permiso → Zod → contraste.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `Validar el guardado de paletas: permiso y contraste (RN-070, RN-072)`.

## Fase 2 — necesita `DATABASE_URL`

> **Rediseñada (2026-10-08) para Cache Components (DT-031).** Ya existen `src/lib/db.ts` y `getCurrentActor()` (login, DT-034). Cómo se resuelven los problemas de la versión anterior:
> - **Cache:** `"use cache"` + `cacheTag(PALETTES_TAG)` + `cacheLife` condicional (docs: `cacheLife.md`, "Conditional cache lifetimes"). Si la base respondió: `cacheLife("max")` y solo se renueva al guardar (`updateTag` en la Task 8). Si falló o tardó: paleta base con `cacheLife("minutes")` (revalida al minuto).
> - **Base caída durante `next build`:** la paleta base queda en el HTML estático, pero con vida de minutos: el sitio se corrige solo al minuto de que la base vuelva. No queda horneada.
> - **Defensa contra inyección de CSS:** `paletteCss` normaliza cada valor con `sanitizePalette` antes de escribirlo.

### Task 7: Tabla, lectura cacheada y caída a la base

**Files:**
- Create: `src/modules/apariencia/tables.ts`, `src/modules/apariencia/lectura.ts`, migración en `drizzle/`
- Test: `src/modules/apariencia/lectura.test.ts`, `src/modules/apariencia/paleta.test.ts`, `src/modules/apariencia/variables.test.ts`
- Modify: `src/modules/apariencia/paleta.ts`, `src/modules/apariencia/variables.ts`, `src/app/layout.tsx` (usar `await getPalettes()`)

**Interfaces:**
- Consumes: Tasks 2 y 4; `db` de `@/lib/db`; tabla `users` (para `updated_by`).
- Produces:
  - Tabla `theme_palettes`: `mode text primary key check (mode in ('light','dark'))`, `colors jsonb not null`, `updated_at timestamptz not null default now()`, `updated_by uuid references users(id) on delete set null`. Con `.enableRLS()` (DT-029).
  - En `paleta.ts`: `sanitizePalette(stored: unknown, mode: ThemeMode): Palette`: por categoría usa el valor si `normalizeHex` lo acepta; si no, el de `DEFAULT_PALETTES[mode]`. (Reemplaza a `mergeWithDefaults` de la versión anterior.)
  - En `lectura.ts`: `loadPalettes(loader: () => Promise<unknown>, timeoutMs: number): Promise<{ palettes: Record<ThemeMode, Palette>; source: "database" | "fallback" }>`: el loader devuelve `{ light?, dark? }`; si rechaza o tarda más que `timeoutMs`, `source: "fallback"` y `DEFAULT_PALETTES`; nunca lanza.
  - `getPalettes(): Promise<Record<ThemeMode, Palette>>` con `"use cache"`, `cacheTag(PALETTES_TAG)` y `cacheLife(source === "database" ? "max" : "minutes")`; timeout 1500 ms.
  - `PALETTES_TAG = "theme-palettes"`.

- [ ] **Step 1: Tests que fallan**

```ts
// lectura.test.ts
it("RN-074: si la base falla, usa la paleta base y lo indica", async () => {
  await expect(loadPalettes(() => Promise.reject(new Error("down")), 50))
    .resolves.toEqual({ palettes: DEFAULT_PALETTES, source: "fallback" });
});
it("RN-074: si la base tarda, usa la paleta base", async () => {
  const slow = () => new Promise((r) => setTimeout(() => r({}), 200));
  await expect(loadPalettes(slow, 50)).resolves.toMatchObject({ source: "fallback" });
});
it("usa lo guardado para cada modo", async () => {
  const stored = { light: { primary: "#264653" }, dark: { primary: "#e9c46a" } };
  const r = await loadPalettes(async () => stored, 50);
  expect(r.source).toBe("database");
  expect([r.palettes.light.primary, r.palettes.dark.primary]).toEqual(["#264653", "#e9c46a"]);
});
it("sin paletas guardadas usa la base, pero la base de datos respondió", async () => {
  await expect(loadPalettes(async () => ({}), 50)).resolves.toEqual({ palettes: DEFAULT_PALETTES, source: "database" });
});
// paleta.test.ts
it("RN-074: completa categorías faltantes o inválidas con la base", () => {
  const p = sanitizePalette({ primary: "#264653", warning: "rojo" }, "light");
  expect(p.primary).toBe("#264653");
  expect(p.warning).toBe(DEFAULT_PALETTES.light.warning);
  expect(p.success).toBe(DEFAULT_PALETTES.light.success);
});
// variables.test.ts
it("no deja inyectar CSS con un valor inválido", () => {
  const evil = { ...DEFAULT_PALETTES.light, primary: "red}body{display:none" };
  const css = paletteCss({ light: evil as Palette, dark: DEFAULT_PALETTES.dark });
  expect(css).not.toContain("body{");
  expect(css).toContain(`--primary:${DEFAULT_PALETTES.light.primary};`);
});
```

- [ ] **Step 2:** `npx vitest run src/modules/apariencia` → FAIL.
- [ ] **Step 3:** Implementar. Generar la migración con `npm run db:generate` y aplicarla con `npm run db:migrate`.
- [ ] **Step 4:** `npx vitest run`, `npm run typecheck`, `npm run lint`, `npm run build` → PASS. El build no debe mostrar errores de prerender.
- [ ] **Step 5:** Commit `Guardar paletas en la base con lectura cacheada y paleta base de respaldo (RN-074)`.

## Fase 3 — necesita ingreso con Google y usuario admin

### Task 8: Página VA-08 y Server Action

> `getCurrentActor(): Promise<Actor | null>` ya existe en `src/modules/usuarios/sesion.ts` (DT-034). La página lee la sesión: con Cache Components, la parte que llama a `getCurrentActor()` va dentro de `<Suspense>` y después de `await connection()` (DT-036).

**Files:**
- Create: `src/app/admin/configuracion/apariencia/page.tsx` (server), `actions.ts` (`"use server"`), `palette-form.tsx` (client)

**Interfaces:**
- Consumes: `getCurrentActor`, `getPalettes`, `preparePaletteUpdate`, `parseCoolorsUrl`, `toCoolorsUrl`, `toCssVariables`, `PALETTE_CATEGORIES`, `DEFAULT_PALETTES`, `PALETTES_TAG`, `db`, tabla `theme_palettes`.
- Produces: `savePalettes(input: unknown): Promise<{ ok: true } | { ok: false; message: string; issues?: ... }>`: obtiene el actor, llama a `preparePaletteUpdate`, hace upsert de ambos modos en una transacción con `updated_by`, y `updateTag(PALETTES_TAG)` (Server Action: el admin ve el cambio al instante). Mensajes en español.

Comportamiento de la pantalla (solo presentación; la lógica está en el módulo):
- Pestañas "Modo claro" / "Modo oscuro". Por categoría: nombre en español, muestra del color, campo hex y selector de color.
- "Pegar enlace de coolors": muestra los colores leídos como muestras; cada categoría elige una muestra.
- "Editar en coolors": abre `toCoolorsUrl` de los colores del modo en una pestaña nueva.
- Vista previa en vivo (aplicando `toCssVariables` a un contenedor) con texto, botones y mensajes de error/éxito/advertencia.
- Avisos de contraste en vivo con `validatePalette`; el botón Guardar se deshabilita si hay problemas (y el servidor igual lo valida).
- "Restaurar valores por defecto" carga `DEFAULT_PALETTES` en el formulario (hay que guardar para aplicar).
- Sin permiso → redirige a VP-13 (acceso sin permisos).

- [ ] **Step 1:** Implementar página, formulario y acción.
- [ ] **Step 2:** `npm run typecheck`, `npm run lint`, `npm run build` → PASS.
- [ ] **Step 3: Verificación manual** como admin: pegar `https://coolors.co/264653-2a9d8f-e9c46a-f4a261-e76f51`, asignar, ver aviso de contraste con una combinación mala, guardar una buena y ver el sitio actualizado al recargar; como cliente, acceso denegado.
- [ ] **Step 4:** Commit `Agregar pantalla de apariencia en configuración del sistema (RN-070, RN-071, VA-08)`. Cerrar con la skill `cerrar-tarea`.
