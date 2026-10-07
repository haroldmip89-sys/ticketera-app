# 017 — Panel de organizador: shell del panel y "Resumen" (KPI y Mis eventos, datos mock)

- **Estado:** draft
- **Modo:** SDD
- **Módulo(s):**
  - `src/modules/organizers` (módulo creado por la 015): tipos `OrganizerEvent`, mock, ruta de "Crear evento", utils del resumen, service mock, **shell del panel** (sidebar desktop + barra móvil con `Sheet`) y vista "Resumen".
  - `src/app/(organizer)` (route group **nuevo**): layout del panel, página `/organizer` y placeholder `/organizer/events/new`.
  - `src/app/(site)/organizer/page.tsx`: **se elimina** (placeholder de la 015). `/organizer/onboarding` se queda en `(site)` sin cambios.
  - `src/modules/auth`: hook `useSignOut` extraído del header (DRY con el pie del panel).
  - `src/components/shared/brand-logo.tsx`: prop opcional `caption` ("Organizadores").
  - `src/lib/format.ts`: formateador nuevo `formatCount`.
  - `src/components/ui`: `table`, `progress`, `toggle-group` (+ `toggle`) vía CLI de shadcn.
- **Depende de:** **013, 014 y 015 en `done`**. Consume:
  - de la 013: `ORGANIZER_PATH`, `DEFAULT_AFTER_AUTH_PATH` (`src/lib/auth/auth-routes.ts`), el proxy (`/organizer/**` exige sesión) y `HeaderSessionActions` (C11);
  - de la 013 (C10): `BrandLogo` con `tone`;
  - de la 015: `requireOrganizer(options?)` → `OrganizerUser` (`src/lib/auth/guards.ts`), `/organizer/onboarding` y el placeholder `/organizer` que esta spec reemplaza.
- **Roadmap:** 013 Auth base · 014 Registro y recuperación · 015 Roles y alta de organizador · 016 Mis entradas · **017 Panel de organizador (esta)** · 018 Crear evento (consume el shell, la ruta y los tipos de esta spec).

## Objetivo

1. Un organizador que entra a `/organizer` ve el **panel** del diseño `OrgDashboard` / `OrgDashboardMobile`, sin el header ni el footer del sitio:
   - **desktop (≥ `lg`)**: sidebar con logo "Ticketera · Organizadores", navegación (Resumen activa) y pie con su nombre, "Organizador" y "Cerrar sesión";
   - **móvil (< `lg`)**: barra superior con logo y botón "Abrir menú del panel", que abre un `Sheet` con la misma navegación y el mismo pie.
2. La vista **"Resumen"** muestra, con datos mock:
   - 3 KPI (Entradas vendidas, Ingresos en USD, Eventos publicados) **calculados** a partir de los eventos;
   - "Mis eventos" con filtro por estado (Todos / Publicados / Borradores): tabla semántica en pantallas anchas y lista de tarjetas en móvil, con barra de progreso vendidas/capacidad accesible.
3. Queda el **contrato del shell** para la 018: route group `(organizer)` con layout protegido por `requireOrganizer()`, constante `ORGANIZER_NEW_EVENT_PATH` y tipo `OrganizerEvent`. "+ Crear evento" lleva a un placeholder protegido que la 018 reemplaza.

Todo en verde: `lint`, `test` y `build`.

## Fuera de alcance

- **Persistencia y datos reales:** tablas `events`, `ticket_types`, `orders`, `organizer_profiles` (System Design §6). El service devuelve un mock y no filtra por organizador (TEMPORAL, C5).
- **Ventas reales, Stripe Connect, payouts y reembolsos.** Los ingresos son un número mock en USD.
- **Páginas "Mis eventos", "Ventas" y "Configuración"**: en esta spec son ítems no navegables con "Próximamente" (D4). Irán en fases posteriores (sin número asignado).
- **Crear evento (018):** aquí solo existe el placeholder de `/organizer/events/new` (D6).
- **Editar, publicar, despublicar o cancelar eventos** y la acción "Ver ventas" del diseño (D5).
- Paginación, orden por columnas, búsqueda y exportación de la tabla. Con 4 filas mock no aportan (YAGNI); por eso **no** se usa `@tanstack/react-table` (D7).
- `ThemeToggle` dentro del panel: el diseño no lo muestra. El tema elegido en el sitio se conserva.
- Cambios en `src/proxy.ts` (ya protege `/organizer/**`), en `guards.ts`/`roles.ts` (015) y en `UserMenu` ("Panel de organizador" ya apunta a `/organizer`).
- Ediciones manuales de `src/components/ui/**` (solo se agregan archivos con la CLI).

## Precondiciones

- 013, 014 y 015 en `done` (el developer verifica que existan `src/lib/auth/auth-routes.ts`, `src/lib/auth/guards.ts`, `src/modules/auth/components/header-session-actions.tsx`, `src/app/(site)/organizer/page.tsx` y `src/app/(site)/organizer/onboarding/page.tsx`; si falta alguno → `BLOCKED`).
- Sin dependencias npm nuevas (`@base-ui/react` 1.8.0 ya trae `progress`, `toggle` y `toggle-group`).
- Si la 016 ya agregó `toggle-group`/`toggle` con la CLI, P1 omite ese `add` (no se sobrescribe nada).

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `requireOrganizer`, `OrganizerUser` | reutilizar | `src/lib/auth/guards.ts` (015) | Layout y cada página del grupo lo llaman (D2). |
| `ORGANIZER_PATH`, `DEFAULT_AFTER_AUTH_PATH` | reutilizar | `src/lib/auth/auth-routes.ts` (013) | `ORGANIZER_PATH` = destino de "Resumen". |
| `ORGANIZER_NEW_EVENT_PATH` | crear | `src/modules/organizers/utils/organizer-routes.ts` | Ruta propia del dominio organizers; no se toca `auth-routes.ts`. `/organizer/**` ya está protegido por el proxy. |
| `useClerk().signOut({ redirectUrl })` | **extender (extraer)** | `src/modules/auth/hooks/use-sign-out.ts` (nuevo) + `header-session-actions.tsx` | Hoy está inline en `HeaderSessionActions` (013 C11). Con el pie del panel hay 2 consumidores → hook `useSignOut` (DRY). El header pasa a usarlo sin cambiar comportamiento. |
| `BrandLogo` | extender | `src/components/shared/brand-logo.tsx` | Prop opcional `caption` para "Organizadores" debajo de "Ticketera" (C8). Sin `caption` queda idéntico. |
| `formatPrice`, `formatDateShort` | reutilizar | `src/lib/format.ts` | Ingresos en USD (`$464,400`) y fecha corta (`vie 16 oct`). |
| `formatCount` | crear | `src/lib/format.ts` | No existe un formateador de enteros. Reutiliza la agrupación de miles de `formatPrice` (helper privado extraído). |
| `getEventHref` | reutilizar | `src/modules/events/utils/event-routes.ts` | Acción "Ver evento" de eventos publicados (D5). |
| `EventCategory`, `EVENT_CATEGORIES` | reutilizar | `src/modules/events/types/event.types.ts`, `src/modules/events/data/event-categories.ts` | El mock referencia las categorías existentes, sin duplicarlas. |
| `Sheet*` | reutilizar | `src/components/ui/sheet.tsx` | Menú móvil del panel (patrón de `SiteMobileMenu`). |
| `Button`, `Badge`, `Empty*` | reutilizar | `src/components/ui/` | Botón de cerrar sesión y trigger del menú; badge de estado; placeholder de crear evento. |
| `Table*` | agregar de shadcn | `src/components/ui/table.tsx` | **Verificado** con `npx shadcn@latest view table`: existe en `base-nova` (HTML semántico, sin Base UI). |
| `Progress` | agregar de shadcn | `src/components/ui/progress.tsx` | **Verificado**: `base-nova` sobre `@base-ui/react/progress` (`role="progressbar"`, `aria-valuenow`, `getAriaValueText`). |
| `ToggleGroup`, `ToggleGroupItem` (+ `toggle.tsx`) | agregar de shadcn | `src/components/ui/toggle-group.tsx`, `src/components/ui/toggle.tsx` | **Verificado**: `base-nova` sobre `@base-ui/react/toggle-group` (botones con `aria-pressed`, foco con flechas). Es el "segmented" de filtros del diseño. `ToggleChip` no aplica (estilo chip, no segmented). |
| `@tanstack/react-table` | no se usa | — | D7. |
| `OrganizerEvent`, `OrganizerEventStatus` | crear | `src/modules/organizers/types/organizer-event.types.ts` | No existe. Lo consume la 018. |
| `ORGANIZER_EVENTS_MOCK` | crear | `src/modules/organizers/data/organizer-events.mock.ts` | C3. |
| Utils del resumen (KPI, filtro, %, ingresos, href) | crear | `src/modules/organizers/utils/organizer-dashboard.ts` | Puros y testeados. |
| `organizerEventsService` | crear | `src/modules/organizers/services/organizer-events.service.ts` | Mismo patrón que `eventsService` (async sobre mock). |
| Shell del panel | crear | `src/modules/organizers/components/organizer-shell.tsx`, `organizer-sidebar.tsx`, `organizer-mobile-nav.tsx` | No existe un layout con sidebar. |
| Vista Resumen | crear | `src/modules/organizers/components/organizer-dashboard.tsx`, `organizer-events-section.tsx`, `organizer-events-table.tsx`, `organizer-event-list.tsx`, `organizer-event-status-badge.tsx`, `organizer-event-sales.tsx` | Badge y ventas se comparten entre tabla y tarjetas (DRY). |

## Decisiones

### D1 — Route groups: panel en `(organizer)`, onboarding se queda en `(site)`

Árbol resultante:

```
src/app/
  (site)/
    layout.tsx                       ← header + footer del sitio (sin cambios)
    organizer/
      onboarding/page.tsx            ← sin cambios (015). NO pasa por requireOrganizer()
      (page.tsx eliminado)
  (organizer)/
    layout.tsx                       ← nuevo: requireOrganizer() + <OrganizerShell>
    organizer/
      page.tsx                       ← nuevo: "/organizer" (Resumen)
      events/new/page.tsx            ← nuevo: placeholder "/organizer/events/new" (la 018 lo reemplaza)
```

- Ninguna URL se define dos veces: `/organizer` solo existe en `(organizer)` y `/organizer/onboarding` solo en `(site)`. Compartir el nombre de carpeta `organizer` entre grupos está permitido; lo prohibido es que dos `page` resuelvan a la misma URL (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/route-groups.md`, "Conflicting paths").
- Cada página recibe solo los layouts de su ruta de archivos: `/organizer/onboarding` usa root + `(site)/layout.tsx` (sin shell ni guard de organizador, así un cliente puede activar su cuenta); `/organizer` y `/organizer/events/new` usan root + `(organizer)/layout.tsx`.
- El layout está a nivel de grupo (`(organizer)/layout.tsx`), no en `(organizer)/organizer/layout.tsx`: todo lo que se agregue al grupo hereda el shell.
- No hay varios root layouts: la navegación entre `(site)` y `(organizer)` es una transición normal (sin recarga completa).

### D2 — Guard en el layout **y** en cada página

- El layout llama a `requireOrganizer({ returnTo: ORGANIZER_PATH })`: protege el shell y obtiene el nombre del pie.
- Cada página llama además a `requireOrganizer({ returnTo: <su ruta> })`. Motivo: por *Partial Rendering* el layout no se vuelve a ejecutar al navegar entre páginas del grupo (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`, "Layouts and auth checks"). La página además necesita `userId` para pedir sus datos.
- Costo: hasta 2 llamadas a `currentUser()` por request (TEMPORAL, hasta que exista la base). Ver Preguntas abiertas.

### D3 — Moneda USD y formato de números

- El diseño usa `S/` (soles) y `toLocaleString('es-PE')`. El proyecto usa **USD** (System Design §6.1) y `formatPrice` → `$464,400`.
- Conteos con `formatCount` → `8,146` (coma de miles, igual que `formatPrice`).
- `OrganizerEvent.revenue` está en **dólares** (número, como `TicketType.price`), no en centavos: el service convertirá desde `*_cents` cuando exista la base.

### D4 — Navegación del sidebar sin links muertos

- **Resumen** es el único link (`href = ORGANIZER_PATH`). Activo cuando `pathname === ORGANIZER_PATH`: `aria-current="page"`.
- **Mis eventos, Ventas, Configuración** se renderizan (para conservar el diseño) como elementos **no interactivos** (`<span>`, no `<a>` ni `<button>`, sin `href`, no enfocables), con el texto en `text-muted-foreground` y una etiqueta "Próximamente". El lector de pantalla lee "Mis eventos Próximamente".
- En `/organizer/events/new` (018) ningún ítem queda activo; la 018 puede decidir otra cosa.

### D5 — Acciones de fila sin backend

- **Publicado** → link outline **"Ver evento"** → `getEventHref(slug)` (detalle público, que existe porque los slugs publicados del mock existen en `EVENTS_MOCK`, C3). Reemplaza "Ver ventas" del diseño, porque no hay página de ventas.
- **Borrador, cancelado, suspendido** → **sin acción** (celda vacía en la tabla; sin botón en la tarjeta). "Editar" del diseño queda fuera de alcance.
- La regla vive en un util testeado (`getOrganizerEventPublicHref`).

### D6 — "+ Crear evento" lleva a un placeholder

- El botón enlaza a `ORGANIZER_NEW_EVENT_PATH`. Para no dejar un link muerto, esta spec crea `src/app/(organizer)/organizer/events/new/page.tsx` mínimo (C10), protegido y dentro del shell. **La 018 reemplaza ese archivo.**

### D7 — Sin `@tanstack/react-table`

- 4 filas, sin orden, paginación ni selección. El filtro es un util puro. Una tabla HTML con `Table*` de shadcn es lo más simple (KISS). Se reconsidera cuando "Mis eventos" tenga orden/paginación.

### D8 — Breakpoints

- Sidebar desde `lg` (1024 px); por debajo, barra superior + `Sheet`.
- Tabla desde `xl` (1280 px). Entre `lg` y `xl` el área de contenido (≈ 664 px) no entra las 5 columnas del diseño (≈ 680 px fijos + título), así que se usan las tarjetas. Tarjetas en 1 columna, y en 2 desde `md` (`md:grid-cols-2`).
- Los KPI siguen el orden del diseño en cada tamaño (C9) usando `order` de CSS: el orden del DOM es el de móvil (Ingresos, Entradas vendidas, Eventos publicados). Son métricas independientes, así que el cambio visual no altera el sentido.

### D9 — KPI sobre todos los eventos

- `ticketsSold` e `revenue` suman **todos** los eventos (los borradores tienen 0). `publishedCount` cuenta `status === "published"`.
- Cuando existan cancelaciones con reembolsos, la regla se revisará en la fase de Ventas (no hay eventos cancelados en el mock).

## Contratos

### C1 — Tipos (`src/modules/organizers/types/organizer-event.types.ts`)

```ts
import type { EventCategory } from "@/modules/events/types/event.types"

/** Enum `event_status` del System Design §6.3. */
export type OrganizerEventStatus = "draft" | "published" | "cancelled" | "suspended"

/** Evento visto por su organizador. Serializable (server → client). */
export type OrganizerEvent = {
  id: string
  /** kebab-case; en publicados coincide con el slug público (/events/[slug]). */
  slug: string
  title: string
  category: EventCategory
  /** ISO 8601 con offset "-05:00". */
  startsAt: string
  city: string
  imageUrl: string
  imageAlt: string
  status: OrganizerEventStatus
  /** Σ ticket_types.capacity (entero ≥ 0). */
  capacity: number
  /** Σ ticket_types.sold_count (entero ≥ 0). */
  ticketsSold: number
  /** Ingresos brutos en USD (dólares, no centavos). */
  revenue: number
}
```

### C2 — Ruta (`src/modules/organizers/utils/organizer-routes.ts`)

```ts
/** Crear evento: placeholder en la 017, página real en la 018. */
export const ORGANIZER_NEW_EVENT_PATH = "/organizer/events/new"
```

### C3 — Mock (`src/modules/organizers/data/organizer-events.mock.ts`)

```ts
export const ORGANIZER_EVENTS_MOCK: readonly OrganizerEvent[]
```

Exactamente estos 4 eventos (categorías tomadas de `EVENT_CATEGORIES` por `id`; `imageUrl` = `https://images.unsplash.com/{photoId}?auto=format&fit=crop&w=800&q=70`, mismas fotos del catálogo):

| id | slug | title | category | startsAt | city | status | capacity | ticketsSold | revenue | photoId / imageAlt |
|---|---|---|---|---|---|---|---|---|---|---|
| `org-evt-001` | `festival-sonidos-del-sur` | Festival Sonidos del Sur | `festivals` | `2026-10-16T14:00:00-05:00` | Lima | published | 8000 | 7420 | 445200 | `photo-1492684223066-81342ee5ff30` / "Confeti cayendo sobre el público de un festival" |
| `org-evt-002` | `la-casa-de-bernarda-alba` | La Casa de Bernarda Alba | `theater` | `2026-10-22T19:30:00-05:00` | Lima | published | 420 | 312 | 10920 | `photo-1503095396549-807759245b35` / "Escenario de teatro con telón rojo" |
| `org-evt-003` | `circo-de-las-maravillas` | Circo de las Maravillas | `family` | `2026-11-22T16:00:00-05:00` | Lima | published | 1200 | 414 | 8280 | `photo-1504196606672-aef5c9cefc92` / "Mano sosteniendo un racimo de globos de colores" |
| `org-evt-004` | `muestra-de-arte-joven` | Muestra de Arte Joven | `arts` | `2026-12-12T11:00:00-05:00` | Arequipa | draft | 600 | 0 | 0 | `photo-1572947650440-e8a97ef053b2` / "Sala de exposición en penumbra con obras coloridas en las paredes" |

- Los 3 publicados reutilizan título, slug, fecha, ciudad e imagen de `EVENTS_MOCK` (así "Ver evento" no da 404). `revenue` = `ticketsSold × priceFrom` del catálogo (60, 35, 20).
- KPI resultantes: **8,146** entradas, **$464,400**, **3** publicados.

### C4 — Utils (`src/modules/organizers/utils/organizer-dashboard.ts`, puros)

```ts
export type OrganizerEventFilter = "all" | "published" | "draft"

/** Orden del segmented: Todos, Publicados, Borradores. */
export const ORGANIZER_EVENT_FILTERS: readonly { value: OrganizerEventFilter; label: string }[]

/** draft "Borrador", published "Publicado", cancelled "Cancelado", suspended "Suspendido". */
export const ORGANIZER_EVENT_STATUS_LABELS: Record<OrganizerEventStatus, string>

export type OrganizerDashboardStats = { ticketsSold: number; revenue: number; publishedCount: number }

/** Suma ticketsSold y revenue de todos los eventos; cuenta status === "published". [] → ceros. */
export function getOrganizerDashboardStats(events: readonly OrganizerEvent[]): OrganizerDashboardStats

/** "all" → copia de todos; si no, solo los de ese status. Conserva el orden. No muta la entrada. */
export function filterOrganizerEvents(
  events: readonly OrganizerEvent[],
  filter: OrganizerEventFilter
): OrganizerEvent[]

/** Entero 0–100: Math.round(ticketsSold / capacity * 100) acotado a [0, 100].
 *  capacity ≤ 0 o valores no finitos → 0. */
export function getSoldPercentage(ticketsSold: number, capacity: number): number

/** draft → null (la UI muestra "—"); otro status → formatPrice(revenue). */
export function formatOrganizerEventRevenue(event: Pick<OrganizerEvent, "status" | "revenue">): string | null

/** published → getEventHref(slug); otro status → null (sin acción, D5). */
export function getOrganizerEventPublicHref(event: Pick<OrganizerEvent, "status" | "slug">): string | null
```

### C5 — Service (`src/modules/organizers/services/organizer-events.service.ts`)

```ts
export const organizerEventsService = {
  /** Eventos del organizador por startsAt ascendente (copia nueva).
   *  TEMPORAL (mock): ignora organizerUserId y devuelve ORGANIZER_EVENTS_MOCK.
   *  Con base: events.organizer_id del organizer_profiles del usuario. */
  async getByOrganizer(organizerUserId: string): Promise<OrganizerEvent[]>
}
```

### C6 — `formatCount` (`src/lib/format.ts`)

```ts
/** "0", "414", "8,146", "1,200,000". Redondea al entero más cercano; coma de miles (igual que formatPrice). */
export function formatCount(value: number): string
```

- La agrupación de miles se extrae a un helper **privado** que usan `formatPrice` y `formatCount`. `formatPrice` no cambia de salida.

### C7 — `useSignOut` (`src/modules/auth/hooks/use-sign-out.ts`, `"use client"`)

```ts
/** () => useClerk().signOut({ redirectUrl: DEFAULT_AFTER_AUTH_PATH }) */
export function useSignOut(): () => Promise<void>
```

- `HeaderSessionActions` reemplaza su `onSignOut` inline por `const signOut = useSignOut()` y pasa `onSignOut={signOut}` (o una flecha equivalente). Mismo comportamiento: el test del header de 013/015 sigue verde **sin cambios**.

### C8 — `BrandLogo` (extender)

```ts
export type BrandLogoProps = {
  size?: "md" | "sm"
  tone?: "default" | "inverted"   // 013
  caption?: string                // nuevo
  className?: string
}
```

- Con `caption`, el texto pasa a una columna `flex flex-col leading-[1.15]`: "Ticketera" (mismas clases que hoy) y debajo `caption` en `font-medium text-muted-foreground`, `text-xs` (md) / `text-[0.6875rem]` (sm).
- Sin `caption`, el HTML es idéntico al actual. `caption` solo se usa con `tone="default"` en esta spec.

### C9 — Componentes de la vista Resumen (`src/modules/organizers/components/`)

```ts
// organizer-dashboard.tsx (sin "use client")
export type OrganizerDashboardProps = { events: readonly OrganizerEvent[] }
export function OrganizerDashboard(props: OrganizerDashboardProps): React.JSX.Element

// organizer-events-section.tsx ("use client"): estado del filtro, segmented, tabla/tarjetas o mensaje vacío
export type OrganizerEventsSectionProps = { events: readonly OrganizerEvent[] }
export function OrganizerEventsSection(props: OrganizerEventsSectionProps): React.JSX.Element

// organizer-events-table.tsx
export type OrganizerEventsTableProps = { events: readonly OrganizerEvent[]; caption: string }
export function OrganizerEventsTable(props: OrganizerEventsTableProps): React.JSX.Element

// organizer-event-list.tsx
export type OrganizerEventListProps = { events: readonly OrganizerEvent[] }
export function OrganizerEventList(props: OrganizerEventListProps): React.JSX.Element

// organizer-event-status-badge.tsx
export type OrganizerEventStatusBadgeProps = { status: OrganizerEventStatus }
export function OrganizerEventStatusBadge(props: OrganizerEventStatusBadgeProps): React.JSX.Element

// organizer-event-sales.tsx: "x / capacidad vendidas" + Progress
export type OrganizerEventSalesProps = { event: Pick<OrganizerEvent, "title" | "ticketsSold" | "capacity"> }
export function OrganizerEventSales(props: OrganizerEventSalesProps): React.JSX.Element
```

**`OrganizerDashboard`** (transcrito de `OrgDashboard`/`OrgDashboardMobile`):

- Encabezado: `h1` "Resumen" (`text-[1.75rem] lg:text-[2rem] font-bold leading-[1.15] tracking-[-0.025em]`) y `p` "Así van las ventas de tus eventos." (`text-sm lg:text-[0.9375rem] text-muted-foreground`). En `lg` el bloque y el botón van en fila (`items-end justify-between`); en móvil apilados (`gap-3.5`) y el botón a todo el ancho.
- Botón **"Crear evento"**: `Link href={ORGANIZER_NEW_EVENT_PATH}`, icono `Plus` 18 px (`aria-hidden`), `h-[50px] px-[22px] rounded-[14px] bg-primary text-primary-foreground text-[0.9375rem] font-semibold focus-ring`, hover `bg-primary/90`.
- KPI: `const stats = getOrganizerDashboardStats(events)` y un único `<dl>`:
  - tarjetas `rounded-[20px] lg:rounded-[22px] border bg-card p-[18px] lg:p-6 flex flex-col gap-1.5 lg:gap-2`; `dt` `text-[0.8125rem] lg:text-sm text-muted-foreground` (con icono de 17 px `aria-hidden` solo en `lg`); `dd` `font-bold tracking-[-0.02em] tabular-nums`;
  - DOM en orden móvil: **Ingresos** (`formatPrice(stats.revenue)`, `col-span-2 lg:col-span-1`, `text-[1.75rem] lg:text-[2rem]`, icono `ChartColumn`), **Entradas vendidas** (`formatCount(stats.ticketsSold)`, `text-[1.375rem] lg:text-[2rem]`, icono `Ticket`), **Eventos publicados** (`formatCount(stats.publishedCount)`, mismo tamaño, icono `Calendar`; el `dt` dice "Publicados" en móvil y "Eventos publicados" en `lg`);
  - grid `grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5`; en `lg` el orden visual es Entradas vendidas, Ingresos, Eventos publicados (`lg:order-*`, D8).
- Debajo, `<OrganizerEventsSection events={events} />`.

**`OrganizerEventsSection`**:

- `<section aria-labelledby={headingId}>` con `h2` "Mis eventos" (`text-lg font-semibold`).
- Estado `filter: OrganizerEventFilter` (inicial `"all"`); `visible = filterOrganizerEvents(events, filter)`.
- Segmented: `ToggleGroup` con `aria-label="Filtrar eventos por estado"`, `value={[filter]}`, y `onValueChange` que solo actualiza si recibe un valor (ignora el array vacío, para que siempre haya una opción activa). Un `ToggleGroupItem` por `ORGANIZER_EVENT_FILTERS`. Estilo: contenedor `rounded-xl bg-muted p-1 gap-1` (`grid grid-cols-3 w-full` en móvil, `flex w-fit` en `xl`); opción `h-11 xl:h-9 px-3.5 rounded-[9px] text-[0.8125rem] font-medium`, presionada `bg-card font-semibold shadow-[0_2px_8px_-4px_rgba(24,24,27,.3)]` (vía `data-[pressed]`).
- `visible.length === 0` → `<p>` en lugar de tabla y tarjetas: "all" → "Aún no tienes eventos. Crea el primero con “Crear evento”."; "published" → "No tienes eventos publicados."; "draft" → "No tienes borradores.".
- Si hay eventos: `<OrganizerEventsTable>` dentro de `hidden xl:block` y `<OrganizerEventList>` dentro de `xl:hidden`. `caption` = `Mis eventos: ${label del filtro activo}`.
- En `xl`, la sección es una tarjeta (`rounded-[22px] border bg-card overflow-hidden`) con cabecera `px-6 py-[18px] border-b flex items-center justify-between` (h2 + segmented). Por debajo de `xl`, sin tarjeta: h2, segmented y lista con `gap-3`.

**`OrganizerEventsTable`** (`Table*` de shadcn):

- `<TableCaption className="sr-only">{caption}</TableCaption>`.
- `TableHeader` con 5 `TableHead scope="col"`: "Evento", "Estado", "Vendidas", "Ingresos" (`text-right`), y un 5.º con `<span className="sr-only">Acciones</span>`. Estilo `text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground px-6`.
- Fila por evento (`px-6 py-3.5`, borde superior):
  - Evento: `next/image` 52×52 `rounded-xl object-cover`, `alt=""` (el título está al lado), `sizes="52px"`; título `text-[0.9375rem] font-semibold truncate`; debajo `${formatDateShort(startsAt)} · ${city}` `text-[0.8125rem] text-muted-foreground`.
  - Estado: `<OrganizerEventStatusBadge>`.
  - Vendidas: `<OrganizerEventSales>` (ancho ≈ 260 px).
  - Ingresos: `formatOrganizerEventRevenue(event)` `text-right font-semibold tabular-nums`; si es `null`: `<span aria-hidden="true">—</span><span className="sr-only">Sin ingresos</span>`.
  - Acción: si `getOrganizerEventPublicHref(event)` no es null, `Link` "Ver evento" (`h-10 px-3.5 rounded-[11px] border-[1.5px] border-input text-[0.8125rem] font-semibold hover:bg-muted focus-ring`) con `aria-label={`Ver evento ${title}`}`; si no, celda vacía.

**`OrganizerEventList`** (tarjetas móviles, `<ul aria-label="Mis eventos">`, `grid gap-2.5 md:grid-cols-2`):

- `li` `rounded-[20px] border bg-card p-3.5 flex flex-col gap-3`:
  - fila: imagen 52 px (igual que la tabla), título (`truncate`) + `fecha · ciudad` `text-xs`, y el badge a la derecha (`shrink-0`);
  - `<OrganizerEventSales>` con el ingreso (o "—" con el mismo `sr-only`) alineado a la derecha en la línea del texto;
  - si hay href público: `Link` "Ver evento" a todo el ancho (`h-11 rounded-xl border-[1.5px] border-input text-sm font-semibold`), mismo `aria-label`. Si no, nada.

**`OrganizerEventStatusBadge`**: `Badge` con `ORGANIZER_EVENT_STATUS_LABELS[status]`, `h-7 px-3 text-xs font-semibold rounded-full`, tono por estado: published `bg-success text-success-foreground`; draft `bg-muted text-foreground`; cancelled `bg-destructive/10 text-destructive`; suspended `bg-urgent text-urgent-foreground`.

**`OrganizerEventSales`**:

- Texto `text-[0.8125rem] tabular-nums`: `<strong className="font-semibold">{formatCount(ticketsSold)}</strong> <span className="text-muted-foreground">/ {formatCount(capacity)} vendidas</span>`.
- `Progress` con `value={getSoldPercentage(ticketsSold, capacity)}`, `aria-label={`Entradas vendidas de ${title}`}` y `getAriaValueText={() => `${formatCount(ticketsSold)} de ${formatCount(capacity)} vendidas`}`. Track de 6 px (`h-1.5`, `bg-muted`) e indicador `bg-primary`, ajustados por `className` sin editar `progress.tsx`.

### C10 — Shell (`src/modules/organizers/components/`)

```ts
// organizer-shell.tsx (servidor, sin "use client")
export type OrganizerShellProps = {
  organizer: Pick<OrganizerUser, "displayName" | "email">   // import type desde @/lib/auth/guards
  children: React.ReactNode
}
export function OrganizerShell(props: OrganizerShellProps): React.JSX.Element

// organizer-sidebar.tsx ("use client"): logo + nav + pie de cuenta. Se usa en el aside y dentro del Sheet.
export type OrganizerSidebarProps = { organizerName: string; onNavigate?: () => void }
export function OrganizerSidebar(props: OrganizerSidebarProps): React.JSX.Element

// organizer-mobile-nav.tsx ("use client"): barra superior móvil + Sheet
export type OrganizerMobileNavProps = { organizerName: string }
export function OrganizerMobileNav(props: OrganizerMobileNavProps): React.JSX.Element
```

- **`OrganizerShell`**: `organizerName = organizer.displayName ?? organizer.email ?? "Organizador"`. Estructura (`flex-1 bg-muted`, grid `lg:grid-cols-[264px_minmax(0,1fr)]`):
  1. `<aside className="hidden lg:flex …">` (`bg-card border-r`, `lg:sticky lg:top-0 lg:h-dvh`, `px-4 py-6`) con `<OrganizerSidebar organizerName={…} />`;
  2. `<OrganizerMobileNav organizerName={…} />` (solo `< lg`);
  3. `<main className="min-w-0 px-4 pt-[22px] pb-9 lg:px-12 lg:py-10 flex flex-col gap-5 lg:gap-8">{children}</main>`. Sin `max-w`: cada página decide su ancho.
- **`OrganizerSidebar`** (columna `flex flex-col gap-7 h-full`):
  - `Link href="/"` con `<BrandLogo caption="Organizadores" />` (`focus-ring rounded-xl px-2`), `onClick={onNavigate}`.
  - `<nav aria-label="Panel de organizador">` con `<ul>` de 4 ítems (`flex flex-col gap-1`), alto `h-11`, `px-3 gap-3 rounded-xl text-[0.9375rem]`, icono 19 px `aria-hidden`:
    - **Resumen** (`LayoutDashboard`): `Link href={ORGANIZER_PATH}` con `onClick={onNavigate}`; si `usePathname() === ORGANIZER_PATH` → `aria-current="page"` + `bg-primary/10 text-primary font-semibold`; si no `font-medium text-foreground/80 hover:bg-muted`. `focus-ring`.
    - **Mis eventos** (`Calendar`), **Ventas** (`ChartColumn`), **Configuración** (`Settings`): `<span>` no interactivo (D4), `font-medium text-muted-foreground`, con `<span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[0.6875rem] font-medium">Próximamente</span>`.
  - Espaciador `flex-1`.
  - Pie (`border-t p-3 flex items-center gap-3`): avatar `size-10 rounded-full bg-primary/10 text-primary` con icono `User` 20 px `aria-hidden`; columna con `organizerName` (`text-sm font-semibold truncate`) y "Organizador" (`text-xs text-muted-foreground`); `Button variant="ghost" size="icon"` `size-10 rounded-[10px]` con `aria-label="Cerrar sesión"`, icono `LogOut` 18 px `aria-hidden`, `onClick` = `useSignOut()`.
- **`OrganizerMobileNav`**: `<header className="lg:hidden h-16 bg-card border-b pl-4 pr-3 flex items-center justify-between">`:
  - `Link href="/"` con `<BrandLogo size="sm" caption="Organizadores" />`;
  - `Sheet` controlado (`open`/`onOpenChange`), `SheetTrigger render={<Button variant="ghost" size="icon" className="size-11 rounded-xl" aria-label="Abrir menú del panel" />}` con icono `Menu` 20 px;
  - `SheetContent side="right"` con `SheetHeader`/`SheetTitle` "Panel de organizador" (`sr-only` permitido) y `<OrganizerSidebar organizerName={…} onNavigate={() => setOpen(false)} />`.

### C11 — Rutas de `src/app` (delgadas)

- **`src/app/(organizer)/layout.tsx`**: `export default async function OrganizerLayout({ children }: { children: React.ReactNode })`; `const organizer = await requireOrganizer({ returnTo: ORGANIZER_PATH })`; devuelve `<OrganizerShell organizer={organizer}>{children}</OrganizerShell>`.
- **`src/app/(organizer)/organizer/page.tsx`**: `metadata: { title: "Panel de organizador — Ticketera", robots: { index: false } }`; `const { userId } = await requireOrganizer({ returnTo: ORGANIZER_PATH })`; `const events = await organizerEventsService.getByOrganizer(userId)`; devuelve `<OrganizerDashboard events={events} />`.
- **`src/app/(organizer)/organizer/events/new/page.tsx`** (placeholder **temporal**, la 018 lo reemplaza): `metadata: { title: "Crear evento — Ticketera", robots: { index: false } }`; `await requireOrganizer({ returnTo: ORGANIZER_NEW_EVENT_PATH })`; compone `Empty*` (como el placeholder de la 015): icono `CalendarPlus` en `EmptyMedia` `size-14 rounded-2xl bg-primary/10 text-primary`, `<h1>` "Crear evento", descripción "Muy pronto podrás crear tus eventos desde aquí.", `Link` "Volver al resumen" → `ORGANIZER_PATH`.
- **`src/app/(site)/organizer/page.tsx`**: se **elimina**.

## Tareas

### Preparación (serie)

- **P1** Primitivos y piezas transversales. Archivos:
  - `src/components/ui/table.tsx`, `src/components/ui/progress.tsx`, `src/components/ui/toggle-group.tsx`, `src/components/ui/toggle.tsx`: `npx shadcn@latest add table progress toggle-group`. Si la CLI pide sobrescribir algún archivo existente, responder **no**; si toca cualquier otro archivo, se revierte. No se editan a mano.
  - `src/lib/format.ts` (C6) y `src/lib/format.test.ts`
  - `src/components/shared/brand-logo.tsx` (C8)
  - `src/modules/auth/hooks/use-sign-out.ts` (C7)
  - `src/modules/auth/components/header-session-actions.tsx` (C7, solo el `onSignOut`)

  Al terminar: `npm run lint`, `npm run test`.
- **P2** Contratos del dominio organizers. Archivos:
  - `src/modules/organizers/types/organizer-event.types.ts` (C1)
  - `src/modules/organizers/utils/organizer-routes.ts` (C2)
  - `src/modules/organizers/data/organizer-events.mock.ts` (C3)
  - `src/modules/organizers/utils/organizer-dashboard.ts` (C4) y `organizer-dashboard.test.ts`
  - `src/modules/organizers/services/organizer-events.service.ts` (C5) y `organizer-events.service.test.ts`

  Al terminar: `npm run lint`, `npm run test`.

### Paralelo (tras P2; archivos disjuntos; nadie corre `npm install` ni `npm run build`)

- **T1** Shell del panel y placeholder de crear evento. Archivos:
  - `src/modules/organizers/components/organizer-shell.tsx` (C10)
  - `src/modules/organizers/components/organizer-sidebar.tsx` (C10)
  - `src/modules/organizers/components/organizer-mobile-nav.tsx` (C10)
  - `src/app/(organizer)/layout.tsx` (C11)
  - `src/app/(organizer)/organizer/events/new/page.tsx` (C11)
- **T2** Vista Resumen. Archivos:
  - `src/modules/organizers/components/organizer-dashboard.tsx` (C9)
  - `src/modules/organizers/components/organizer-events-section.tsx` (C9)
  - `src/modules/organizers/components/organizer-events-section.test.tsx`
  - `src/modules/organizers/components/organizer-events-table.tsx` (C9)
  - `src/modules/organizers/components/organizer-event-list.tsx` (C9)
  - `src/modules/organizers/components/organizer-event-status-badge.tsx` (C9)
  - `src/modules/organizers/components/organizer-event-sales.tsx` (C9)

T1 y T2 solo importan de P1/P2 y de primitivos existentes; no se importan entre sí. Verificación acotada: `npx vitest run <tests de la tarea>` y `npx eslint <archivos de la tarea>`.

### Integración (serie, tras T1 y T2)

- **I1** Mover `/organizer` al grupo `(organizer)`. Archivos:
  - `src/app/(organizer)/organizer/page.tsx` (C11, nuevo)
  - `src/app/(site)/organizer/page.tsx` (**eliminar**)

  Va al final para que nunca haya dos `page` en `/organizer` ni un `/organizer` sin shell. Al terminar: `npm run lint`, `npm run test`. El reviewer corre `npm run build`.

**Tamaño:** 29 archivos — 4 generados por la CLI, 4 existentes modificados (`format.ts`, `format.test.ts`, `brand-logo.tsx`, `header-session-actions.tsx`), 1 eliminado, 17 nuevos de código/rutas (11 de módulo + 3 de shell + 3 de `src/app`) y 3 tests nuevos. Supera la guía de ~14 porque esta fase entrega el shell (contrato de la 018) y la vista juntos; los 4 de la CLI y los 2 cambios de una línea pesan poco. Si se prefiere achicar, ver Preguntas abiertas (2).

## Criterios de aceptación

**A. Rutas y acceso**

- [ ] AC1 Un organizador (`publicMetadata.isOrganizer === true`) que abre `/organizer` ve el panel: sin el header ni el footer del sitio, con `h1` "Resumen".
- [ ] AC2 Un cliente sin rol que abre `/organizer` o `/organizer/events/new` es redirigido a `/organizer/onboarding`. Sin sesión, ambas rutas llevan a `/sign-in?redirect_url=…` (proxy).
- [ ] AC3 `/organizer/onboarding` sigue igual que en la 015 (header y footer del sitio, sin sidebar) y un cliente puede activar su cuenta y terminar en `/organizer` con el panel.
- [ ] AC4 `src/app/(site)/organizer/page.tsx` ya no existe; `npm run build` termina sin error de rutas en conflicto y lista `/organizer`, `/organizer/onboarding` y `/organizer/events/new`.
- [ ] AC5 `src/app/(organizer)/layout.tsx` y las dos páginas del grupo llaman a `requireOrganizer` (`git grep requireOrganizer "src/app/(organizer)"` → 3 resultados). Ningún componente cliente importa `@/lib/auth/guards` (salvo `import type`).

**B. Shell**

- [ ] AC6 En ≥ 1024 px se ve el sidebar: logo "Ticketera" + "Organizadores" (link a `/`), `nav` "Panel de organizador" con "Resumen" (`aria-current="page"`, tinte indigo) y "Mis eventos", "Ventas", "Configuración" con "Próximamente", que no son links ni botones ni reciben foco con Tab.
- [ ] AC7 El pie del sidebar muestra el nombre completo del usuario de Clerk (o su email si no tiene nombre), "Organizador" y un botón "Cerrar sesión" (accesible por nombre) que cierra la sesión y lleva a `/`.
- [ ] AC8 En < 1024 px no hay sidebar: se ve una barra superior con el logo y un botón "Abrir menú del panel" que abre un panel lateral (título "Panel de organizador") con la misma navegación y el mismo pie. Al pulsar "Resumen" el panel se cierra. Escape cierra el panel y devuelve el foco al botón.
- [ ] AC9 La página tiene exactamente un `main` y la navegación está en un `nav` con nombre accesible.

**C. Resumen**

- [ ] AC10 Con el mock, los KPI muestran **8,146** (Entradas vendidas), **$464,400** (Ingresos) y **3** (Eventos publicados), dentro de un `dl`. En desktop el orden visual es Entradas vendidas, Ingresos, Eventos publicados; en 390 px es Ingresos (ancho completo), Entradas vendidas, Publicados.
- [ ] AC11 Cambiar el mock (p. ej. `ticketsSold` de un evento) cambia los KPI sin tocar componentes (no hay valores escritos a mano en la vista; `git grep -n "8,146\|464,400" src/modules/organizers/components` → vacío).
- [ ] AC12 "Crear evento" (desktop y móvil) lleva a `/organizer/events/new`, que muestra dentro del shell el placeholder "Crear evento" con "Volver al resumen" → `/organizer`.
- [ ] AC13 En ≥ 1280 px "Mis eventos" es una `table` con `caption` (oculta visualmente) y 5 encabezados de columna (`th scope="col"`, el último "Acciones" solo para lectores). En < 1280 px es una lista de tarjetas con los mismos datos.
- [ ] AC14 Cada evento muestra miniatura, título, `fecha corta · ciudad` (p. ej. "vie 16 oct · Lima"), badge de estado ("Publicado" verde / "Borrador" gris), "7,420 / 8,000 vendidas" y una barra `role="progressbar"` con `aria-valuenow` = porcentaje (93 para 7,420/8,000), nombre accesible "Entradas vendidas de {título}" y `aria-valuetext` "7,420 de 8,000 vendidas".
- [ ] AC15 Ingresos por evento en USD alineados a la derecha (`$445,200`); en borradores se ve "—" y los lectores oyen "Sin ingresos".
- [ ] AC16 El segmented "Todos / Publicados / Borradores" tiene "Todos" presionado al inicio (`aria-pressed="true"`). "Publicados" deja 3 eventos; "Borradores" deja solo "Muestra de Arte Joven". Pulsar la opción ya activa no deja el grupo sin selección.
- [ ] AC17 Los publicados tienen un link "Ver evento" a su detalle público (`/events/festival-sonidos-del-sur` abre la página del evento, no un 404). Los borradores no tienen acción. No hay links con `href="#"` ni botones sin efecto en el panel.
- [ ] AC18 Controles interactivos con foco visible (`focus-ring`) y área táctil ≥ 44 px en móvil (segmented, "Ver evento", menú, cerrar sesión ≥ 40 px como el diseño). Se ve bien en modo claro y oscuro (solo tokens, sin hex).

**D. Regresión**

- [ ] AC19 El header del sitio sigue cerrando sesión igual que antes (test del header de 013/015 en verde sin cambios) y `BrandLogo` sin `caption` renderiza lo mismo que antes en header, footer y auth.
- [ ] AC20 `npm run lint`, `npm run test` y `npm run build` en verde.

## Tests obligatorios

- **`src/lib/format.test.ts`** (ampliar) — `formatCount`: `0` → "0"; `414` → "414"; `8146` → "8,146"; `1200000` → "1,200,000"; `7420.6` → "7,421". Los casos existentes de `formatPrice` siguen en verde.
- **`src/modules/organizers/utils/organizer-dashboard.test.ts`**:
  - `getOrganizerDashboardStats`: con `ORGANIZER_EVENTS_MOCK` → `{ ticketsSold: 8146, revenue: 464400, publishedCount: 3 }`; con `[]` → ceros; un evento `cancelled` suma vendidas e ingresos pero no cuenta como publicado.
  - `filterOrganizerEvents`: `"all"` devuelve los 4 en el mismo orden y un array distinto (no la misma referencia); `"published"` → 3; `"draft"` → 1; no muta la entrada.
  - `getSoldPercentage`: `(7420, 8000)` → 93; `(0, 1500)` → 0; `(1, 3)` → 33; `(2, 3)` → 67; `(900, 800)` → 100; `(-5, 100)` → 0; `(10, 0)` → 0; `(NaN, 100)` → 0.
  - `formatOrganizerEventRevenue`: published `445200` → "$445,200"; draft → `null`; suspended `0` → "$0".
  - `getOrganizerEventPublicHref`: published → `/events/{slug}`; draft, cancelled y suspended → `null`.
  - `ORGANIZER_EVENT_FILTERS` en orden Todos, Publicados, Borradores; `ORGANIZER_EVENT_STATUS_LABELS` con los 4 estados.
- **`src/modules/organizers/services/organizer-events.service.test.ts`** — `getByOrganizer("user_123")`: devuelve los 4 eventos ordenados por `startsAt` ascendente; mutar el array devuelto no altera `ORGANIZER_EVENTS_MOCK`; los slugs de los publicados existen en `EVENTS_MOCK` (protege D5).
- **`src/modules/organizers/components/organizer-events-section.test.tsx`** (RTL, con `ORGANIZER_EVENTS_MOCK`; tabla y lista conviven en jsdom, así que se consulta con `within(screen.getByRole("table"))` y `within(screen.getByRole("list", { name: "Mis eventos" }))`):
  - inicial: "Todos" con `aria-pressed="true"`; la tabla tiene 4 filas de datos y `caption` "Mis eventos: Todos";
  - clic en "Borradores": solo "Muestra de Arte Joven" en tabla y lista, sin link "Ver evento", ingreso "Sin ingresos" accesible; "Borradores" `aria-pressed="true"` y "Todos" `"false"`;
  - clic otra vez en "Borradores": sigue presionado (no queda vacío);
  - "Publicados": 3 filas; "Ver evento Festival Sonidos del Sur" tiene `href="/events/festival-sonidos-del-sur"`;
  - barra de progreso de "Festival Sonidos del Sur": `aria-valuenow="93"` y `aria-valuetext="7,420 de 8,000 vendidas"`;
  - con `events=[]`: se ve "Aún no tienes eventos. Crea el primero con “Crear evento”." y no hay `table`; con solo publicados y filtro "Borradores": "No tienes borradores.".

No requieren test unitario (SETUP §3): `organizer-shell`, `organizer-sidebar`, `organizer-mobile-nav` (composición; se verifican en manual con AC6–AC9), `organizer-dashboard`, `organizer-events-table`, `organizer-event-list`, `organizer-event-status-badge`, `organizer-event-sales` (presentacionales; su lógica está en utils testeados y se ejercitan en el test de la sección), `use-sign-out` (wrapper trivial; cubierto por el test del header), `brand-logo` y las páginas/layout.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (AC4: ver las tres rutas en la salida)
- **Manual** (`npm run dev`, con un usuario organizador — M4 de la 015 — y otro sin rol):
  - 1440 px: `/organizer` → AC1, AC6, AC7, AC10, AC13–AC17; Tab por todo el panel (los ítems "Próximamente" no reciben foco).
  - 390 px: AC8, AC10 (orden móvil), tarjetas, segmented a todo el ancho.
  - 1100 px: sidebar visible y tarjetas (D8).
  - Usuario sin rol: AC2; activar en `/organizer/onboarding` → AC3.
  - Modo oscuro: AC18.
  - "Cerrar sesión" del panel y del header (AC7, AC19).

## Transcrito del diseño vs. criterio propio

| Transcrito (`OrgDashboard` / `OrgDashboardMobile`) | Criterio propio |
|---|---|
| Sidebar 264 px blanca, logo + "Organizadores", nav de 4 ítems con iconos (Resumen activa con tinte indigo), pie con avatar, nombre y botón de cerrar sesión | "Organizador" bajo el nombre (pedido del orquestador); ítems no disponibles como `span` + "Próximamente" (D4) |
| h1 "Resumen", subtítulo, botón indigo "Crear evento" con `Plus` | Placeholder de `/organizer/events/new` (D6) |
| 3 KPI en `dl`, 32 px `tabular-nums`; móvil: Ingresos ancho completo, luego Entradas vendidas y Publicados | USD y `$` en vez de `S/` (D3); KPI calculados por util (D9) |
| Sección "Mis eventos" con segmented Todos/Publicados/Borradores (`aria-pressed`) | `ToggleGroup` de shadcn/Base UI (foco con flechas); alto 44 px en móvil (diseño 40 px) por la regla de 44 px de §1.5 |
| Columnas Evento / Estado / Vendidas (+ barra indigo 6 px) / Ingresos / acción; borrador con ingresos "—"; badges verde/gris | `table` semántica con `caption` en vez de `ul` + cabecera `aria-hidden`; progreso con `role="progressbar"`; "Ver evento" en vez de "Ver ventas"/"Editar" (D5); tonos de cancelado/suspendido; tabla desde `xl` (D8) |
| Móvil: barra superior 64 px con logo y "Abrir menú del panel"; eventos como tarjetas | `Sheet` lateral derecho (como el menú del sitio); tarjetas en 2 columnas desde `md` |
| Datos: 4 eventos (3 publicados, 1 borrador), 7,420/8,000 en el primero | Títulos, fechas e imágenes del catálogo propio (sin marcas reales); ingresos = vendidas × `priceFrom` (C3) |

## Contratos que consume la 018

| Contrato | Archivo | Uso en la 018 |
|---|---|---|
| Route group del panel y su layout (`requireOrganizer` + `OrganizerShell`) | `src/app/(organizer)/layout.tsx` | Toda página nueva en `src/app/(organizer)/organizer/**` hereda sidebar, barra móvil y `<main>`. La página **no** debe renderizar otro `main`. |
| Placeholder `/organizer/events/new` | `src/app/(organizer)/organizer/events/new/page.tsx` | La 018 **reemplaza** este archivo. Debe seguir llamando a `requireOrganizer({ returnTo: ORGANIZER_NEW_EVENT_PATH })` (D2). |
| `ORGANIZER_NEW_EVENT_PATH = "/organizer/events/new"` | `src/modules/organizers/utils/organizer-routes.ts` | Página, `returnTo` y redirecciones. Protegida por el proxy (`/organizer/**`). |
| `ORGANIZER_PATH` (Resumen) | `src/lib/auth/auth-routes.ts` (013) | Volver al panel tras guardar/publicar. |
| `OrganizerEvent`, `OrganizerEventStatus` | `src/modules/organizers/types/organizer-event.types.ts` | Forma del evento del organizador (estado `draft`/`published` al guardar/publicar). Si la 018 necesita más campos (p. ej. `description`, `venueName`, `imageUrl` opcional), los agrega de forma compatible. |
| `ORGANIZER_EVENTS_MOCK` | `src/modules/organizers/data/organizer-events.mock.ts` | Datos de ejemplo. Sin persistencia: crear un evento no lo agrega al mock. |
| `ORGANIZER_EVENT_STATUS_LABELS`, `OrganizerEventStatusBadge` | `src/modules/organizers/utils/organizer-dashboard.ts`, `components/organizer-event-status-badge.tsx` | Si la 018 muestra el estado. |
| `organizerEventsService` | `src/modules/organizers/services/organizer-events.service.ts` | Punto donde la 018 (o la fase con base) agregará `create(...)`. |
| `OrganizerShell`, `OrganizerSidebar`, `OrganizerMobileNav` | `src/modules/organizers/components/` | No se importan desde páginas (los compone el layout). Nota: la barra móvil del shell se ve en todas las páginas del grupo; si la 018 quiere el header "← Crear evento" de `OrgCreateMobile`, lo pone **debajo** de la barra o extiende el shell (decisión de la 018). En `/organizer/events/new` ningún ítem del sidebar queda activo (D4). |
| `formatCount` | `src/lib/format.ts` | "Capacidad total" y conteos. |
| `BrandLogo` con `caption` | `src/components/shared/brand-logo.tsx` | Si la 018 necesita el logo de organizadores fuera del shell. |
| `useSignOut` | `src/modules/auth/hooks/use-sign-out.ts` | Cualquier otro botón de cerrar sesión. |

**Archivos existentes que modifica esta spec:** `src/lib/format.ts`, `src/lib/format.test.ts`, `src/components/shared/brand-logo.tsx`, `src/modules/auth/components/header-session-actions.tsx` (de la 013/015) y la eliminación de `src/app/(site)/organizer/page.tsx` (de la 015).

## Preguntas abiertas

Ninguna bloqueante. Puntos de criterio propio para revisar al aprobar:

1. **Doble `currentUser()` por request (D2):** layout y página llaman a `requireOrganizer()`. Si molesta la latencia, la 015 podría envolver los guards con `cache()` de React (cambio en `guards.ts`, fuera de esta spec). ¿Se acepta así por ahora?
2. **Tamaño (29 archivos):** si se quiere acercar a ~14, la opción es separar el shell + placeholder (P1 parcial, P2 de tipos/rutas, T1) como 017 y la vista Resumen (T2 + I1) como una 017b. La 018 solo depende de la primera parte.
3. **Coordinación con 016/018 (en redacción en paralelo):** esta spec agrega `toggle-group`/`toggle` (shadcn), `formatCount` (`src/lib/format.ts`) y `caption` en `BrandLogo`. Si la 016 necesita un segmented de botones, debería reutilizar `ToggleGroup`; si la 016 o la 018 tocan `format.ts` o `brand-logo.tsx`, deben ejecutarse después de la 017 o coordinar el orden.
4. **"Ver evento" en lugar de "Ver ventas" / "Editar" (D5)** y **ítems "Próximamente" visibles** (D4) en vez de ocultarlos. ¿OK?
