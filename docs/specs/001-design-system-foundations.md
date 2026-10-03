# 001 — Design system foundations (typography, color tokens, base layout)

- **Estado:** done (APPROVED por reviewer en iteración 2)
- **Modo:** SDD
- **Módulo(s):** ninguno nuevo en `src/modules` (esta fase es transversal: `src/app` root layout, `src/components/shared`, `src/components/ui`, `src/app/globals.css`)

## Objetivo

Establecer la base visual de todo el proyecto — tipografía global (Poppins), paleta de color en modo claro y oscuro (con toggle manual), y el layout compartido (header + footer) — para que la fase 2 (contenido real de la landing) se construya sobre tokens y componentes ya definidos, sin tocar de nuevo `layout.tsx` ni `globals.css`.

Documento de diseño de referencia (fuente de verdad para valores de color/tipografía/espaciado): `docs/design/design-system.md`.

## Fuera de alcance

- Contenido real de la landing: hero, carrusel de eventos destacados, grid de eventos, categorías, sección de newsletter/CTA. Va en la spec `002`.
- Mock data de eventos con imágenes de Unsplash, y cualquier tipo/schema relacionado a eventos.
- `src/modules/events` (o cualquier otro módulo de dominio) — no se crea en esta fase.
- Componentes shadcn que solo usará el contenido de la landing: `card`, `badge`, `input`, `avatar`, `carousel`, `skeleton`. Se instalan en la spec `002`, cuando haya un consumidor real (YAGNI: no instalar dependencias — incluida `embla-carousel-react`, que `carousel` trae consigo — antes de usarlas).
- `navigation-menu`: el header de esta fase no necesita menús desplegables (son enlaces simples); si una fase futura requiere un mega-menú, se evalúa entonces.
- Selector de tema de tres vías (claro/oscuro/sistema): el toggle de esta fase alterna solo entre `"light"` y `"dark"` explícitos; `next-themes` ya resuelve la preferencia inicial del sistema sin necesidad de exponer un tercer control (ver `docs/design/design-system.md`, sección 6).
- Rutas reales de navegación (`/events`, `/categories`, etc.): los enlaces del header/footer apuntan a `#` o `/` como placeholder hasta que esas rutas existan.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `Button` (shadcn) | reutilizar | `src/components/ui/button.tsx` | Único componente shadcn existente; no requiere cambios. Se usa en el trigger del menú móvil y CTA del header. |
| `components.json` | reutilizar sin cambios | `components.json` | Config (`style: base-nova`, `baseColor: neutral`, `iconLibrary: lucide`) ya correcta para esta fase; no se detectaron cambios necesarios. |
| `next-themes` | agregar dependencia nueva | `package.json` | `npm install next-themes` — gestiona la clase `dark` en `<html>`, persistencia en `localStorage` y detección de `prefers-color-scheme`. |
| Fuentes Geist/Geist Mono | reemplazar | `src/app/layout.tsx` | Se quita `Geist`/`Geist_Mono` de `next/font/google`, se agrega `Poppins`. |
| Tokens de tema (oklch) | redefinir | `src/app/globals.css` | Nueva paleta claro/oscuro de `docs/design/design-system.md` sección 2 (`:root` y `.dark`); se conserva `@custom-variant dark (&:is(.dark *));`. |
| `sheet` (shadcn) | agregar de shadcn | `src/components/ui/sheet.tsx` | `npx shadcn@latest add sheet` — necesario para el menú de navegación móvil del header. Trae `button` como registry-dependency (ya existe, no se reinstala). |
| `separator` (shadcn) | agregar de shadcn | `src/components/ui/separator.tsx` | `npx shadcn@latest add separator` — usado como divisor en el footer. |
| `ThemeProvider` | crear | `src/components/shared/theme-provider.tsx` | Client component, wrapper delgado sobre `next-themes`'s `ThemeProvider` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`). |
| `ThemeToggle` | crear | `src/components/shared/theme-toggle.tsx` | Botón con icono sol/luna (`lucide-react`) que alterna `"light"`/`"dark"` vía `useTheme()` de `next-themes`. Único componente de esta fase con lógica propia (no puramente presentacional) → lleva test unitario (ver "Tests obligatorios"). |
| `SiteHeader` | crear | `src/components/shared/site-header.tsx` | No existe equivalente en el proyecto. Transversal (se usa en el root layout, no pertenece a un dominio) → `src/components/shared`, según `docs/SETUP.md` sección 1.6. Incluye `<ThemeToggle />`. |
| `SiteFooter` | crear | `src/components/shared/site-footer.tsx` | Igual que arriba. |
| `src/app/layout.tsx` | modificar | `src/app/layout.tsx` | Integra `ThemeProvider` (envolviendo `SiteHeader`/`main`/`SiteFooter`), nueva fuente, metadata actualizada, `suppressHydrationWarning` en `<html>`. |
| `src/app/page.tsx` | reemplazar contenido | `src/app/page.tsx` | Ver justificación abajo. |

**Justificación de reemplazar `page.tsx` (en vez de dejarlo intacto):** el contenido actual es el boilerplate de `create-next-app` (logos de Next.js/Vercel, clases `dark:`). Dejarlo intacto violaría la decisión de "solo modo claro" (tiene clases `dark:`) y no permitiría verificar visualmente que el header/footer quedaron integrados. Se reemplaza por un placeholder mínimo (contenedor + un título/párrafo de marcador de posición), que la spec `002` reemplazará por el contenido real de la landing.

## Contratos

### Fuente (next/font/google)

```ts
// src/app/layout.tsx
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});
```

`html` recibe `className` con `poppins.variable` (ya no `geistSans.variable`/`geistMono.variable`).

### Tokens CSS (`src/app/globals.css`)

- `@theme inline`: `--font-sans: var(--font-poppins);` (reemplaza la referencia a `--font-geist-sans`/circular actual), `--font-heading` se mantiene apuntando a `--font-sans`, `--font-mono` pasa a ser una pila de fuentes del sistema (no una variable de `next/font`): ver `docs/design/design-system.md` sección 6, punto 2.
- Bloque `:root`: todos los valores de color de `docs/design/design-system.md` sección 2.1 (background, foreground, card, popover, primary, secondary, muted, accent, destructive, border, input, ring, chart-1..5, sidebar\*).
- Bloque `.dark`: todos los valores de color de `docs/design/design-system.md` sección 2.2 (mismos tokens, valores de modo oscuro). Se conserva la línea `@custom-variant dark (&:is(.dark *));` ya presente en el scaffold.
- `@layer base` se mantiene igual (usa `--color-border`, `--color-background`, `--font-sans` ya redefinidos).

### `ThemeProvider`

```ts
// src/components/shared/theme-provider.tsx
"use client"
export function ThemeProvider({ children }: { children: React.ReactNode }): JSX.Element
```

- Wrapper delgado sobre `ThemeProvider` de `next-themes`, con `attribute="class"`, `defaultTheme="system"`, `enableSystem`.

### `ThemeToggle`

```ts
// src/components/shared/theme-toggle.tsx
"use client"
export function ThemeToggle(): JSX.Element
```

- Usa `useTheme()` de `next-themes` (`theme`/`resolvedTheme` y `setTheme`).
- Botón único (`Button` variant `ghost`/`icon`) que alterna entre `"light"` y `"dark"`; muestra icono `Sun` o `Moon` (`lucide-react`) según el tema resuelto actual.
- `aria-label` descriptivo del estado destino (ej. "Cambiar a modo oscuro" / "Cambiar a modo claro"), no solo el icono (regla de accesibilidad de `docs/design/design-system.md`/skill `ui-ux-pro-max`: botones de solo-ícono necesitan nombre accesible).
- Antes de montar (`useEffect`/estado `mounted`), renderiza un estado neutro (ej. icono fijo o `disabled`) para evitar mismatch de hidratación entre servidor y el tema real del cliente — patrón estándar al usar `next-themes`.

### `SiteHeader`

```ts
// src/components/shared/site-header.tsx
export function SiteHeader(): JSX.Element
```

- Sin props (navegación estática en esta fase).
- Contenido: logo/nombre de marca (placeholder de texto "Ticketera", sin logo gráfico — branding real fuera de alcance), enlaces de navegación de ejemplo en español (ej. "Eventos", "Categorías", "Ayuda") apuntando a `#` o `/`, `<ThemeToggle />`, un botón de acción (ej. "Iniciar sesión", usando `Button`) y, en viewport móvil, un trigger (`Button` + icono `Menu` de `lucide-react`) que abre un `Sheet` con los mismos enlaces (incluyendo el `ThemeToggle`).
- No implementa lógica de "link activo" (resaltar la ruta actual): todas las rutas salvo `/` son placeholders sin página real todavía; se difiere a cuando existan rutas reales (YAGNI).

### `SiteFooter`

```ts
// src/components/shared/site-footer.tsx
export function SiteFooter(): JSX.Element
```

- Sin props.
- Contenido: breve texto de marca, 1-2 columnas de enlaces placeholder (ej. "Sobre nosotros", "Contacto", "Términos"), un `Separator`, y una línea de copyright con el año actual (`new Date().getFullYear()`) calculado inline en el componente — no se extrae a una función de `lib` porque es una expresión trivial de una línea, no lógica que pueda romperse silenciosamente (ver `docs/SETUP.md` sección 3).

### `RootLayout`

```ts
// src/app/layout.tsx
export default function RootLayout({ children }: LayoutProps<"/">): JSX.Element
```

- Envuelve el `children` del `<body>` en `<ThemeProvider>`; dentro de este compone `<SiteHeader />`, luego `<main className="flex-1">{children}</main>`, luego `<SiteFooter />`.
- `<html>` recibe `suppressHydrationWarning` (requerido por `next-themes`) y `lang="es"` (completa la decisión ya aprobada de copy en español — sección 6, punto 4 de `docs/design/design-system.md` — hallazgo del reviewer en iteración 1, no es una decisión nueva).
- `metadata` (`title`/`description`) se actualiza a un texto placeholder en español que refleje el producto (ej. título "Ticketera — Compra entradas para tus eventos", sin inventar nombre de marca final definitivo más allá de este placeholder).

## Tareas

Todo el alcance de esta fase toca archivos compartidos/globales (`layout.tsx`, `globals.css`, instalación de dependencias/componentes), por lo que es una sola secuencia serial. No se fuerza paralelismo artificial.

### Preparación / única secuencia (serie)

- **P1** Instalar dependencia y componentes shadcn necesarios para el layout base — `npm install next-themes`; `npx shadcn@latest add sheet` y `npx shadcn@latest add separator` (archivos generados: `src/components/ui/sheet.tsx`, `src/components/ui/separator.tsx`; no editar a mano más allá de lo que genera la CLI).
- **P2** Tipografía y tokens de color globales (claro + oscuro) — archivos: `src/app/layout.tsx` (fuente Poppins, `metadata`), `src/app/globals.css` (tokens `:root` y `.dark` según `docs/design/design-system.md` sección 2).
- **P3** Crear `ThemeProvider` y `ThemeToggle` — archivos: `src/components/shared/theme-provider.tsx`, `src/components/shared/theme-toggle.tsx`, y su test (`src/components/shared/theme-toggle.test.tsx`).
- **P4** Crear `SiteHeader` (incluye `ThemeToggle`) y `SiteFooter` — archivos: `src/components/shared/site-header.tsx`, `src/components/shared/site-footer.tsx`.
- **P5** Integrar `ThemeProvider`/header/footer en el root layout y reemplazar el placeholder de `page.tsx` — archivos: `src/app/layout.tsx` (composición final con `ThemeProvider` > `SiteHeader`/`main`/`SiteFooter`, `suppressHydrationWarning`), `src/app/page.tsx` (placeholder mínimo sin boilerplate de `create-next-app`).

## Criterios de aceptación

- [ ] AC1 `npm run lint` pasa sin errores.
- [ ] AC2 `npm run test` pasa (sin tests nuevos obligatorios en esta fase; no debe romper los existentes si los hay).
- [ ] AC3 `npm run build` pasa sin errores.
- [ ] AC4 El `html`/`body` renderizado aplica Poppins globalmente: `src/app/layout.tsx` ya no importa `Geist`/`Geist_Mono`, usa `Poppins` de `next/font/google`, y el elemento `html` incluye la variable de esa fuente en su `className`.
- [ ] AC5 `src/app/globals.css` contiene un bloque `:root` (tokens claros) y un bloque `.dark` (tokens oscuros) según `docs/design/design-system.md` secciones 2.1 y 2.2, y conserva `@custom-variant dark (&:is(.dark *));`.
- [ ] AC6 `SiteHeader` y `SiteFooter` se renderizan en toda ruta de la app porque están integrados en `src/app/layout.tsx` (visibles al abrir `/`).
- [ ] AC7 En viewport móvil, el trigger del header abre un `Sheet` (de `src/components/ui/sheet.tsx`) que muestra los enlaces de navegación.
- [ ] AC8 `src/components/ui/sheet.tsx` y `src/components/ui/separator.tsx` existen y tienen la forma estándar generada por la CLI de shadcn (no fueron escritos a mano imitando el estilo).
- [ ] AC9 No existe la carpeta `src/modules/events` ni ningún archivo de mock data de eventos, `event-card`, o similar creado en esta fase.
- [ ] AC10 `src/app/page.tsx` ya no contiene el contenido boilerplate de `create-next-app` (logos de Next.js/Vercel).
- [ ] AC11 `ThemeToggle` cambia la clase `dark` del elemento `html` al hacer click (verificable con RTL/testing-library mediante `document.documentElement.classList`) y persiste entre recargas vía `localStorage` (comportamiento propio de `next-themes`, no reimplementado a mano).
- [ ] AC12 El botón de `ThemeToggle` tiene `aria-label` que describe la acción (no solo el icono).
- [ ] AC13 No hay warning de hidratación en consola al cargar `/` relacionado al `class` de `next-themes` (requiere `suppressHydrationWarning` en `<html>` y el patrón "mounted" en `ThemeToggle`).

## Tests obligatorios

Según `docs/SETUP.md` sección 3: esta fase no agrega `services/`, `schemas/` de Zod, utilidades de `lib/`, ni stores de Zustand con lógica de transición. La única pieza con lógica propia es `ThemeToggle` (lee/cambia estado de tema), así que **sí requiere test unitario**:

- `src/components/shared/theme-toggle.test.tsx` (Vitest + RTL): renderiza envuelto en el `ThemeProvider` real (o un mock mínimo de `next-themes`), simula click, y verifica que el tema cambia (ej. `setTheme` fue llamado con el valor opuesto, o el icono/`aria-label` cambia tras el click).
- `SiteHeader` y `SiteFooter` siguen siendo mayormente presentacionales (reciben sin props) → no requieren test unitario propio más allá del que ya cubre `ThemeToggle` como unidad aislada.
- El cálculo del año en `SiteFooter` (`new Date().getFullYear()`) es una expresión trivial embebida en el componente, no una función extraída a `lib` → no requiere test unitario propio.
- Si el developer detecta que necesita escribir alguna otra función con lógica real y la extrae a `src/lib`, debe agregarle test — pero esa extracción no es requisito de esta spec (YAGNI: no extraer si no hay un segundo caso de uso).

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- Verificación manual: abrir `/` en el navegador (`npm run dev`), confirmar que (a) la tipografía visible es Poppins, (b) en modo claro los colores reflejan `docs/design/design-system.md` sección 2.1, (c) el header y footer aparecen con el `ThemeToggle` visible, (d) en un viewport angosto (DevTools, ~375px) el botón de menú abre el `Sheet` con los enlaces de navegación y el toggle, (e) al hacer click en el toggle la interfaz cambia a los colores de la sección 2.2 sin parpadeo/flash incorrecto, y al recargar la página se mantiene el modo elegido.
