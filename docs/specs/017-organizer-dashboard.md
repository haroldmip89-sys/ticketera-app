# 017 — Panel de organizador: "Resumen" y "Mis eventos" con datos reales, dentro del shell de administración

- **Estado:** draft
- **Modo:** SDD
- **Actualizada tras 019–023** (2026-10-08): reemplaza el supuesto de mock + shell propio + metadata de Clerk por DB (019), guards respaldados por DB (020), seed (022) y el shell `/admin` con sidebar shadcn (023).
- **Módulo(s):**
  - `src/modules/organizers` (módulo **nuevo**): tipos `OrganizerEvent`, service de lectura sobre la DB, utils del resumen, vista "Resumen" y "Mis eventos".
  - `src/modules/admin` (solo **ajustes mínimos** al shell de la 023 para que lo use el organizador: `admin-nav.ts`, `admin-shell.tsx`, `admin-sidebar.tsx`).
  - `src/app/(organizer)` (route group **nuevo**): layout + páginas `/organizer`, `/organizer/events` y placeholder `/organizer/events/new`.
  - `src/app/(admin)/admin/layout.tsx`: una línea (pasar `organizerActive` al shell).
  - `src/lib/format.ts`: `formatCount`.
  - `src/components/ui`: `progress`, `toggle-group` (+ `toggle`) vía CLI de shadcn (`table` ya existe).
- **Fuentes:** System Design §3, §4.3 (guards), §4.4 (matriz), §6 (modelo de datos: `events`, `ticket_types`, `orders`, `organizer_profiles`). Specs 019 (esquema), 020 (guards/permisos), 022 (seed), 023 (shell).
- **Depende de:** 019, 020, 022 y 023 en `done`. Consume:
  - de la 020: `requireOrganizer(options?)` → `OrganizerUser { userId, organizerId, displayName, email }` y `requireUser()` → `AccessContext` (memoizado por request con `cache()`), en `src/lib/auth/guards.ts`; `ORGANIZER_PATH`, `ORGANIZER_ONBOARDING_PATH` en `src/lib/auth/auth-routes.ts`; el proxy (`/organizer/**` exige sesión).
  - de la 023: `AdminShell`, `AdminSidebar`, `AdminHeader`, `getAdminNav` (con la sección "Organizador" ya declarada con Resumen, Mis eventos, Crear evento, Check-in, Pagos, hoy `href: null`).
  - de la 019: tablas `events`, `ticket_types`, `orders`, `venues`, `categories`, `organizer_profiles`.
  - de la 022: eventos del organizador sembrados (todos `published`; `cover_key` guarda una URL de Unsplash).
- **Roadmap:** 013 Auth base · 014 Registro y recuperación · 015 Roles (reemplazada en datos por la 020) · 016 Mis entradas · **017 Panel de organizador (esta)** · 018 Crear evento (consume la ruta, el shell y los tipos de esta spec).

## Objetivo

1. Un organizador `active` que entra a `/organizer` ve su **Resumen** dentro del shell existente (sidebar shadcn colapsable, header con breadcrumb "Organizador / Resumen", pie con sesión), con el ítem "Resumen" activo (`aria-current="page"`). "Mis eventos" abre `/organizer/events`.
2. Los datos salen de la **DB**, filtrados siempre por el `organizerId` del organizador autenticado (obtenido en servidor con `requireOrganizer()`, nunca del cliente ni de la URL):
   - 3 KPI (Entradas vendidas, Ingresos en USD, Eventos publicados) calculados a partir de sus eventos;
   - "Mis eventos" con filtro por estado (Todos / Publicados / Borradores): tabla semántica en pantallas anchas y tarjetas en pantallas angostas, con barra de progreso vendidas/capacidad accesible.
3. Contrato para la 018: route group `(organizer)` con layout protegido por `requireOrganizer()` y `AdminShell`, constantes de ruta, tipo `OrganizerEvent` y service `organizerEventsService`. "Crear evento" lleva a un placeholder protegido que la 018 reemplaza.

Todo en verde: `lint`, `test` y `build`.

## Fuera de alcance

- **Crear/editar/publicar/cancelar eventos** y "Ver ventas" por evento: 018 y fases posteriores. Solo existe el placeholder de `/organizer/events/new`.
- **Check-in, Pagos y Configuración**: siguen "Próximamente" en el shell (023 D3).
- **Stripe Connect, payouts y reembolsos.** Los ingresos son lectura de órdenes pagadas.
- **Pantalla `/organizer/onboarding` ("solicita acceso", 020 Q2):** no existe hoy; `requireOrganizer()` redirige allí a quien no sea organizador `active` y esa ruta da 404 hasta que otra spec la cree (ver Preguntas abiertas 4). No se toca aquí.
- **`becomeOrganizer`, metadata de Clerk y `isOrganizer(publicMetadata)`** como criterio de acceso: eliminados (020: la base manda; `publicMetadata` es solo copia).
- Paginación, orden por columnas, búsqueda y exportación de la tabla; `@tanstack/react-table` no se usa (KISS, D6).
- Cambios en `src/proxy.ts`, `guards.ts`, `permissions.ts`, el esquema de la DB y el seed.
- Ediciones manuales de `src/components/ui/**` (solo se agregan archivos con la CLI).
- Mover el shell de `src/modules/admin` a `src/components/shared` (la 023 lo sugería "cuando lo adopte la 017"); se evalúa en una fase de refactor para no mezclar movimientos de archivos con esta entrega. El layout de `src/app` lo importa directamente (es composición de routing).

## Precondiciones

- 019, 020, 022 y 023 en `done`. El developer verifica que existan `src/db/schema/events.ts`, `src/lib/auth/guards.ts` (con `requireOrganizer` que devuelve `organizerId`), `src/modules/admin/components/admin-shell.tsx` y `src/modules/admin/utils/admin-nav.ts`; si falta alguno → `BLOCKED`.
- Sin dependencias npm nuevas (`@base-ui/react` ya trae `progress`, `toggle` y `toggle-group`). `next.config.ts` ya permite `images.unsplash.com`.
- Si la 016 ya agregó `toggle-group`/`toggle` con la CLI, P1 omite ese `add`.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `requireOrganizer`, `OrganizerUser`, `requireUser`, `AccessContext` | reutilizar | `src/lib/auth/guards.ts` (020) | `organizerId` = `organizer_profiles.id` = `events.organizer_id`. La resolución de acceso está memoizada con `cache()` por request: llamarlo en layout **y** página no repite la consulta (resuelve la pregunta obsoleta del doble `currentUser()`). |
| `ORGANIZER_PATH`, `ORGANIZER_ONBOARDING_PATH` | reutilizar | `src/lib/auth/auth-routes.ts` | `ORGANIZER_PATH` = "Resumen". |
| `ORGANIZER_EVENTS_PATH`, `ORGANIZER_NEW_EVENT_PATH` | crear | `src/modules/organizers/utils/organizer-routes.ts` | Rutas propias del dominio; no se toca `auth-routes.ts`. `/organizer/**` ya está protegido por el proxy. |
| `AdminShell`, `AdminSidebar`, `AdminHeader`, `getAdminNav`, `findNavMatch`, `isNavItemActive` | **extender** | `src/modules/admin/components/*`, `src/modules/admin/utils/admin-nav.ts` (023) | Se reutilizan tal cual el layout, colapso a rail, drawer móvil, breadcrumb y pie. Ajustes (D2, D3): enlaces de la sección "Organizador", `exact` en ítems, `homeHref` del logo. Reemplaza al shell propio (`OrganizerShell`, `OrganizerSidebar`, `OrganizerMobileNav`) de la versión anterior de esta spec. |
| Cierre de sesión | reutilizar | pie de `AdminSidebar` (`useClerk().signOut`) | Ya no se extrae `useSignOut` ni se extiende `BrandLogo` (`caption`): sin segundo consumidor. |
| `formatPrice`, `formatDateShort` | reutilizar | `src/lib/format.ts` | Ingresos USD y fecha corta. |
| `formatCount` | crear | `src/lib/format.ts` | No existe formateador de enteros. Reutiliza la agrupación de miles de `formatPrice` (helper privado extraído). |
| `getEventHref` | reutilizar | `src/modules/events/utils/event-routes.ts` | Acción "Ver evento" (D5). |
| `getDb`, tablas `events`, `ticketTypes`, `orders`, `venues`, `categories` | reutilizar | `src/db/client.ts`, `src/db/schema/*` | Lectura con Drizzle; mismo patrón de service que `usersService`. |
| `Button`, `Badge`, `Empty*`, `Table*`, `Skeleton` | reutilizar | `src/components/ui/` | `Badge` ya tiene la variante `success` (023). |
| `Progress` | agregar de shadcn | `src/components/ui/progress.tsx` | `npx shadcn@latest add progress` (`base-nova` sobre `@base-ui/react/progress`: `role="progressbar"`, `aria-valuenow`, `getAriaValueText`). Verificar con `npx shadcn@latest view progress` antes. |
| `ToggleGroup`, `ToggleGroupItem` (+ `toggle.tsx`) | agregar de shadcn | `src/components/ui/toggle-group.tsx`, `toggle.tsx` | Segmented de filtros (`aria-pressed`, flechas). `ToggleChip` no aplica (estilo chip). |
| `@tanstack/react-table` | no se usa | — | D6. |
| Mock `ORGANIZER_EVENTS_MOCK` y `organizerEventsService` sobre mock | **no se crea** | — | Sustituidos por el service sobre DB (C3). |
| `OrganizerEvent`, `OrganizerEventStatus` | crear | `src/modules/organizers/types/organizer-event.types.ts` | No existe. Lo consume la 018. |
| Mapper fila→`OrganizerEvent` | crear | `src/modules/organizers/utils/organizer-event-mapper.ts` | Puro y testeado (centavos→dólares, ceros, portada). |
| Utils del resumen (KPI, filtro, %, ingresos, href) | crear | `src/modules/organizers/utils/organizer-dashboard.ts` | Puros y testeados. |
| `organizerEventsService` | crear | `src/modules/organizers/services/organizer-events.service.ts` | Lectura filtrada por `organizerId`. |
| Vista | crear | `src/modules/organizers/components/*` | Ver C7. Badge y ventas se comparten entre tabla y tarjetas (DRY). |

## Decisiones

### D1 — Rutas: panel en `/organizer/**`, grupo `(organizer)`, shell compartido (ver Pregunta abierta 1)

```
src/app/
  (admin)/admin/layout.tsx           ← requireStaff + AdminShell (023); 1 línea nueva: organizerActive
  (organizer)/
    layout.tsx                       ← requireOrganizer() + requireUser() (staffRole) + AdminShell
    organizer/
      page.tsx                       ← "/organizer"            → Resumen
      events/page.tsx                ← "/organizer/events"     → Mis eventos
      events/new/page.tsx            ← "/organizer/events/new" → placeholder (la 018 lo reemplaza)
```

- `ORGANIZER_PATH` (`/organizer`) ya es el destino que usan el proxy, los guards y `UserMenu`; el panel vive ahí. `/admin/**` sigue exigiendo staff (023): un organizador no staff **no** entra a `/admin`.
- El grupo `(organizer)` es solo para organizadores `active`. Una futura pantalla `/organizer/onboarding` (quien aún no lo es) debe vivir **fuera** del grupo (p. ej. `(site)/organizer/onboarding`), o `requireOrganizer()` del layout la redirigiría a sí misma en bucle.
- Compartir el prefijo `organizer` entre grupos está permitido; lo prohibido es que dos `page` resuelvan a la misma URL.

### D2 — El shell de la 023 se reutiliza con ajustes mínimos

- `AdminShell` ya soporta `staffRole = null` (muestra solo la sección "Organizador" y el rol "Organizador") y `defaultOpen` desde la cookie `sidebar_state`.
- Ajustes:
  1. `getAdminNav(staffRole, options?: { organizerActive?: boolean })`: con `organizerActive === true` la sección "Organizador" tiene `href` en **Resumen** (`/organizer`), **Mis eventos** (`/organizer/events`) y **Crear evento** (`/organizer/events/new`); **Check-in** y **Pagos** siguen `null`. Sin `organizerActive` (valor por defecto) toda la sección queda `null` ("Próximamente"), así un admin sin perfil de organizador no ve enlaces que lo mandarían al onboarding. El layout de `/admin` pasa `organizerActive = ctx.organizer?.status === "active"`; el de `(organizer)` pasa `true`.
  2. `AdminNavItem` gana `exact?: boolean`; `isNavItemActive` con `exact` compara solo igualdad. Resumen y Mis eventos son `exact` (si no, `/organizer` marcaría activo "Resumen" en `/organizer/events` y `/organizer/events` marcaría "Mis eventos" en `/organizer/events/new`).
  3. `AdminShell`/`AdminSidebar` reciben `homeHref?: string` (por defecto `/admin/users`); el logo del sidebar enlaza a ese destino (el layout organizador pasa `ORGANIZER_PATH`) y `aria-label` "Ticketera, administración" pasa a `homeLabel` (por defecto igual; organizador: "Ticketera, panel de organizador").
  4. `AdminShell` recibe `organizerActive` y lo pasa a `getAdminNav`.
- El breadcrumb del header (`findNavMatch`) ya produce "Organizador / Resumen" y "Organizador / Mis eventos". En `/organizer/events/new` produce "Organizador / Crear evento".

### D3 — Guard en el layout y en cada página

- Layout: `const organizer = await requireOrganizer({ returnTo: ORGANIZER_PATH })` y `const ctx = await requireUser()` (memoizado, sin consulta extra) para `staffRole`. Protege el shell y da el nombre del pie.
- Cada página llama de nuevo a `requireOrganizer({ returnTo: <su ruta> })` porque por *Partial Rendering* el layout no se reevalúa al navegar entre páginas del grupo (`node_modules/next/dist/docs/01-app/02-guides/authentication.md`, "Layouts and auth checks"); además necesita `organizerId` para consultar. El costo es nulo gracias a `cache()` (020).
- El `organizerId` **solo** sale del guard. Ninguna página, componente cliente ni Server Action de esta spec acepta un id de organizador como parámetro.

### D4 — Datos (fuente de cada campo de `OrganizerEvent`)

- Eventos: `events WHERE organizer_id = :organizerId` (cualquier `status`), orden `starts_at` ascendente. Índice existente `events_organizer_id_idx`.
- `city` = `venues.city`; `categoryName` = `categories.name` (join por `venue_id`/`category_id`, ambos `restrict`, no nulos).
- `capacity` = `Σ ticket_types.capacity` y `ticketsSold` = `Σ ticket_types.sold_count` por evento (0 si no tiene tipos).
- `revenue` = `Σ orders.subtotal_cents / 100` de órdenes `status = 'paid'` del evento (USD en dólares; **excluye** la comisión de servicio, que no es del organizador; las órdenes `refunded`/`failed`/`pending` no cuentan). Ver Pregunta abierta 3: en datos solo sembrados (022) no hay órdenes, así que `Ingresos` mostrará `$0` aunque haya vendidas.
- `imageUrl` = `events.cover_key` si es una URL `https://images.unsplash.com/…` (la que escribe el seed 022); cualquier otro valor o `null` → `null` y la UI muestra un recuadro neutro con icono (TEMPORAL hasta que existan subidas de portada, 018+).
- Para no multiplicar filas por joins, el service hace **tres consultas**: eventos (+ venue + categoría), agregados de `ticket_types` agrupados por `event_id` y agregados de `orders` agrupados por `event_id`, ambos con `inArray(eventIds)`; el mapper une los resultados.
- Mercado: USD (System Design §6.1), `formatPrice` → `$464,400`; conteos con `formatCount` → `8,146`.

### D5 — Acciones de fila sin backend

- **Publicado** → link outline **"Ver evento"** → `getEventHref(slug)` (detalle público).
- **Borrador, cancelado, suspendido** → sin acción. "Editar" y "Ver ventas" quedan fuera de alcance.
- La regla vive en un util testeado (`getOrganizerEventPublicHref`).

### D6 — Sin `@tanstack/react-table`

El filtro es un util puro y no hay orden ni paginación. Tabla HTML con `Table*` de shadcn. Se reconsidera cuando "Mis eventos" necesite orden/paginación.

### D7 — Breakpoints

- Sidebar/drawer: los de la 023 (`md`, 768 px; el drawer lo gestiona el componente).
- Tabla desde `xl` (1280 px): con el sidebar expandido (264 px) el área útil a 1280 px es ≈ 980 px y las 5 columnas (≈ 680 px fijos + título) caben; por debajo, tarjetas (1 columna; `md:grid-cols-2`). El área de contenido del shell es `max-w-6xl`; no se agrega otro contenedor.
- KPI en un único `<dl>`: `grid-cols-2 gap-3 lg:grid-cols-3 lg:gap-5`; en móvil "Ingresos" ocupa las 2 columnas y va primero (orden de DOM); en `lg` el orden visual es Entradas vendidas, Ingresos, Eventos publicados (`lg:order-*`).

### D8 — KPI sobre todos los eventos del organizador

`ticketsSold` e `ingresos` suman **todos** los eventos; `publishedCount` cuenta `status === "published"`. Con reembolsos/cancelaciones la regla se revisa en la fase de Ventas.

## Contratos

### C1 — Tipos (`src/modules/organizers/types/organizer-event.types.ts`)

```ts
/** Enum `event_status` (019). */
export type OrganizerEventStatus = "draft" | "published" | "cancelled" | "suspended"

/** Evento visto por su organizador. Serializable (server → client). */
export type OrganizerEvent = {
  id: string                // events.id (uuid)
  slug: string              // events.slug; en publicados es el slug público (/events/[slug])
  title: string
  categoryName: string      // categories.name
  startsAt: string          // ISO 8601 (events.starts_at, UTC)
  city: string              // venues.city
  imageUrl: string | null   // ver D4
  status: OrganizerEventStatus
  capacity: number          // Σ ticket_types.capacity (entero ≥ 0)
  ticketsSold: number       // Σ ticket_types.sold_count (entero ≥ 0)
  revenue: number           // USD en dólares (Σ paid orders.subtotal_cents / 100)
}
```

### C2 — Rutas (`src/modules/organizers/utils/organizer-routes.ts`)

```ts
export const ORGANIZER_EVENTS_PATH = "/organizer/events"
/** Crear evento: placeholder en la 017, página real en la 018. */
export const ORGANIZER_NEW_EVENT_PATH = "/organizer/events/new"
```

`ORGANIZER_PATH` se importa de `@/lib/auth/auth-routes`.

### C3 — Service (`src/modules/organizers/services/organizer-events.service.ts`)

```ts
export const organizerEventsService = {
  /** Eventos del organizador `organizerId` (organizer_profiles.id) por startsAt ascendente.
   *  Solo lectura; tres consultas (D4). Sin eventos → []. Nunca devuelve eventos de otro organizador. */
  async getByOrganizer(organizerId: string): Promise<OrganizerEvent[]>
}
```

### C4 — Mapper (`src/modules/organizers/utils/organizer-event-mapper.ts`, puro)

```ts
export type OrganizerEventRow = {
  id: string; slug: string; title: string; status: OrganizerEventStatus
  startsAt: Date; coverKey: string | null; city: string; categoryName: string
}
export type OrganizerEventTotals = { capacity: number; soldCount: number }  // por event_id
export function toOrganizerEvent(
  row: OrganizerEventRow,
  totals: OrganizerEventTotals | undefined,   // undefined → 0/0
  paidSubtotalCents: number | undefined,      // undefined → 0
): OrganizerEvent
// startsAt → toISOString(); revenue = paidSubtotalCents / 100; imageUrl según D4.
```

### C5 — Utils (`src/modules/organizers/utils/organizer-dashboard.ts`, puros)

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
export function filterOrganizerEvents(events: readonly OrganizerEvent[], filter: OrganizerEventFilter): OrganizerEvent[]
/** Entero 0–100: Math.round(ticketsSold / capacity * 100) acotado; capacity ≤ 0 o no finito → 0. */
export function getSoldPercentage(ticketsSold: number, capacity: number): number
/** draft → null (la UI muestra "—"); otro status → formatPrice(revenue). */
export function formatOrganizerEventRevenue(event: Pick<OrganizerEvent, "status" | "revenue">): string | null
/** published → getEventHref(slug); otro → null (D5). */
export function getOrganizerEventPublicHref(event: Pick<OrganizerEvent, "status" | "slug">): string | null
```

### C6 — `formatCount` (`src/lib/format.ts`)

```ts
/** "0", "414", "8,146", "1,200,000". Redondea al entero más cercano; coma de miles (igual que formatPrice). */
export function formatCount(value: number): string
```

La agrupación de miles se extrae a un helper **privado** usado por `formatPrice` y `formatCount`; `formatPrice` no cambia de salida.

### C7 — Componentes (`src/modules/organizers/components/`)

```ts
// organizer-dashboard.tsx (servidor)
export type OrganizerDashboardProps = { events: readonly OrganizerEvent[] }
// organizer-events-section.tsx ("use client"): filtro, segmented, tabla/tarjetas o mensaje vacío
export type OrganizerEventsSectionProps = { events: readonly OrganizerEvent[]; headingLevel?: "h1" | "h2" }  // def. "h2"
// organizer-events-table.tsx
export type OrganizerEventsTableProps = { events: readonly OrganizerEvent[]; caption: string }
// organizer-event-list.tsx
export type OrganizerEventListProps = { events: readonly OrganizerEvent[] }
// organizer-event-status-badge.tsx
export type OrganizerEventStatusBadgeProps = { status: OrganizerEventStatus }
// organizer-event-sales.tsx: "x / capacidad vendidas" + Progress
export type OrganizerEventSalesProps = { event: Pick<OrganizerEvent, "title" | "ticketsSold" | "capacity"> }
// organizer-event-cover.tsx: miniatura 52×52 (next/image) o recuadro con icono si imageUrl es null
export type OrganizerEventCoverProps = { imageUrl: string | null }
```

**`OrganizerDashboard`** (diseño `OrgDashboard`, tokens del proyecto):

- Encabezado: `h1` "Resumen" y `p` "Así van las ventas de tus eventos."; botón **"Crear evento"** (`Link` a `ORGANIZER_NEW_EVENT_PATH`, icono `Plus` `aria-hidden`, `Button` default, `focus-ring`); en pantallas angostas apilado y botón a ancho completo.
- KPI: `const stats = getOrganizerDashboardStats(events)` en un `<dl>`; tarjetas `rounded-2xl border bg-card p-[18px] lg:p-6`, `dt` `text-muted-foreground`, `dd` `font-bold tabular-nums`. DOM: **Ingresos** (`formatPrice(stats.revenue)`, `col-span-2 lg:col-span-1`), **Entradas vendidas** (`formatCount`), **Eventos publicados** (`formatCount`; `dt` "Publicados" en móvil y "Eventos publicados" en `lg`). Iconos `ChartColumn`, `Ticket`, `Calendar` `aria-hidden`.
- Debajo, `<OrganizerEventsSection events={events} />`.

**`OrganizerEventsSection`**:

- `<section aria-labelledby>` con encabezado "Mis eventos" (nivel por `headingLevel`).
- Estado `filter` (inicial `"all"`); `visible = filterOrganizerEvents(events, filter)`.
- Segmented: `ToggleGroup` con `aria-label="Filtrar eventos por estado"`, `value={[filter]}`; `onValueChange` ignora el array vacío (siempre hay una opción activa). Opciones de `ORGANIZER_EVENT_FILTERS`; presionada `bg-card font-semibold shadow-sm` (`data-[pressed]`); alto 44 px en móvil.
- `visible.length === 0` → `<p>`: filtro "all" → "Aún no tienes eventos. Crea el primero con “Crear evento”."; "published" → "No tienes eventos publicados."; "draft" → "No tienes borradores.".
- Con eventos: `OrganizerEventsTable` en `hidden xl:block` y `OrganizerEventList` en `xl:hidden`; `caption` = `Mis eventos: ${label del filtro}`. En `xl` la sección es una tarjeta (`rounded-2xl border bg-card overflow-hidden`) con cabecera (título + segmented).

**`OrganizerEventsTable`** (`Table*`):

- `<TableCaption className="sr-only">`; 5 `TableHead scope="col"`: "Evento", "Estado", "Vendidas", "Ingresos" (derecha), y uno con `<span className="sr-only">Acciones</span>`.
- Fila: `OrganizerEventCover` (`alt=""`, el título está al lado) + título (`truncate`) + `${formatDateShort(startsAt)} · ${city}`; `OrganizerEventStatusBadge`; `OrganizerEventSales`; ingresos con `formatOrganizerEventRevenue` (`null` → `<span aria-hidden>—</span><span className="sr-only">Sin ingresos</span>`); acción "Ver evento" (`Link`, `aria-label={`Ver evento ${title}`}`) si `getOrganizerEventPublicHref` no es null, si no celda vacía.

**`OrganizerEventList`**: `<ul aria-label="Mis eventos" className="grid gap-2.5 md:grid-cols-2">`; cada `li` `rounded-2xl border bg-card p-3.5` con portada, título, `fecha · ciudad`, badge, ventas + ingresos (o "—" con `sr-only`) y, si hay href público, "Ver evento" a ancho completo (`h-11`).

**`OrganizerEventStatusBadge`**: `Badge` con `ORGANIZER_EVENT_STATUS_LABELS[status]`; tonos: published `bg-success text-success-foreground` (variante `success`); draft `bg-muted text-foreground`; cancelled `bg-destructive/10 text-destructive`; suspended `bg-urgent text-urgent-foreground`. Siempre con texto.

**`OrganizerEventSales`**: `<strong>{formatCount(ticketsSold)}</strong> / {formatCount(capacity)} vendidas` (`tabular-nums`) y `Progress` con `value={getSoldPercentage(...)}`, `aria-label={`Entradas vendidas de ${title}`}`, `getAriaValueText={() => `${formatCount(ticketsSold)} de ${formatCount(capacity)} vendidas`}`; track `h-1.5 bg-muted`, indicador `bg-primary` por `className` (sin editar `progress.tsx`).

### C8 — Ajustes al shell (`src/modules/admin`)

```ts
// utils/admin-nav.ts
export type AdminNavItem = { id: string; label: string; icon: AdminNavIconId; href: string | null; exact?: boolean }
export function getAdminNav(staffRole: StaffRole | null, options?: { organizerActive?: boolean }): AdminNavSection[]
// organizerActive: overview "/organizer" (exact), events "/organizer/events" (exact), create-event "/organizer/events/new"; check-in y payments: null.
// isNavItemActive: si item.exact → pathname === item.href.

// components/admin-shell.tsx  — AdminShellProps += { organizerActive?: boolean; homeHref?: string; homeLabel?: string }
// components/admin-sidebar.tsx — AdminSidebarProps += { homeHref?: string; homeLabel?: string }
```

### C9 — Rutas de `src/app` (delgadas)

- **`(organizer)/layout.tsx`**: `metadata: { title: "Panel de organizador — Ticketera", robots: { index: false } }`; `const organizer = await requireOrganizer({ returnTo: ORGANIZER_PATH })`; `const ctx = await requireUser()`; `defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false"`; devuelve `<AdminShell userName={organizer.displayName} email={organizer.email ?? ctx.email} staffRole={ctx.staffRole} organizerActive homeHref={ORGANIZER_PATH} homeLabel="Ticketera, panel de organizador" defaultOpen={defaultOpen}>{children}</AdminShell>`.
- **`(organizer)/organizer/page.tsx`**: `const { organizerId } = await requireOrganizer({ returnTo: ORGANIZER_PATH })`; `events = await organizerEventsService.getByOrganizer(organizerId)`; `<OrganizerDashboard events={events} />`.
- **`(organizer)/organizer/events/page.tsx`**: `requireOrganizer({ returnTo: ORGANIZER_EVENTS_PATH })`; service; `<OrganizerEventsSection events={events} headingLevel="h1" />`.
- **`(organizer)/organizer/events/new/page.tsx`** (placeholder **TEMPORAL**, la 018 lo reemplaza): `requireOrganizer({ returnTo: ORGANIZER_NEW_EVENT_PATH })`; `Empty*` con icono `CalendarPlus`, `<h1>` "Crear evento", "Muy pronto podrás crear tus eventos desde aquí." y `Link` "Volver al resumen" → `ORGANIZER_PATH`.
- **`(admin)/admin/layout.tsx`**: agrega `organizerActive={ctx.organizer?.status === "active"}` al `AdminShell`.
- El shell ya contiene el único `<main>`; las páginas no renderizan otro.

## Tareas

### Preparación (serie)

- **P1** Primitivos y formato. Archivos:
  - `src/components/ui/progress.tsx`, `src/components/ui/toggle-group.tsx`, `src/components/ui/toggle.tsx`: `npx shadcn@latest add progress toggle-group`. Si la CLI pide sobrescribir un archivo existente, responder **no**; si toca otro archivo, se revierte. No se editan a mano.
  - `src/lib/format.ts` (C6) y `src/lib/format.test.ts`

  Al terminar: `npm run lint`, `npm run test`.
- **P2** Ajustes del shell (C8, D2). Archivos:
  - `src/modules/admin/utils/admin-nav.ts` y `src/modules/admin/utils/admin-nav.test.ts`
  - `src/modules/admin/components/admin-shell.tsx`
  - `src/modules/admin/components/admin-sidebar.tsx` y `src/modules/admin/components/admin-sidebar.test.tsx`
  - `src/app/(admin)/admin/layout.tsx` (solo `organizerActive`)

  Al terminar: `npm run lint`, `npm run test` (los tests existentes de la 023 siguen en verde).
- **P3** Dominio organizers (contratos, lectura de DB). Archivos:
  - `src/modules/organizers/types/organizer-event.types.ts` (C1)
  - `src/modules/organizers/utils/organizer-routes.ts` (C2)
  - `src/modules/organizers/utils/organizer-event-mapper.ts` (C4) y `organizer-event-mapper.test.ts`
  - `src/modules/organizers/utils/organizer-dashboard.ts` (C5) y `organizer-dashboard.test.ts`
  - `src/modules/organizers/services/organizer-events.service.ts` (C3) y `organizer-events.service.test.ts`

  Al terminar: `npm run lint`, `npm run test`.

### Paralelo (tras P1–P3; archivos disjuntos; nadie corre `npm install` ni `npm run build`)

- **T1** Rutas del grupo `(organizer)`. Archivos:
  - `src/app/(organizer)/layout.tsx`
  - `src/app/(organizer)/organizer/page.tsx`
  - `src/app/(organizer)/organizer/events/page.tsx`
  - `src/app/(organizer)/organizer/events/new/page.tsx`
- **T2** Vista. Archivos:
  - `src/modules/organizers/components/organizer-dashboard.tsx`
  - `src/modules/organizers/components/organizer-events-section.tsx` y `organizer-events-section.test.tsx`
  - `src/modules/organizers/components/organizer-events-table.tsx`
  - `src/modules/organizers/components/organizer-event-list.tsx`
  - `src/modules/organizers/components/organizer-event-status-badge.tsx`
  - `src/modules/organizers/components/organizer-event-sales.tsx`
  - `src/modules/organizers/components/organizer-event-cover.tsx`

T1 importa los componentes de T2 por contrato (C7); la integración la valida el reviewer con el build final. Verificación acotada de cada tarea: `npx vitest run <tests de la tarea>` y `npx eslint <archivos de la tarea>`.

**Tamaño:** ≈ 31 archivos (3 de la CLI, 2 de format, 6 del shell, 9 de dominio, 4 de rutas, 8 de vista + 4 tests de componente/service). Supera la guía de ~8 porque une ajuste de shell, lectura de DB y vista. Si hay que repartirlo en sesiones, el corte natural es **sesión 1 = P1–P3** (sin UI nueva) y **sesión 2 = P2 + T1 + T2**; la 018 solo depende de P2, P3 y T1.

## Criterios de aceptación

**A. Rutas, acceso y datos**

- [ ] AC1 Un organizador `active` que abre `/organizer` ve su panel dentro del shell de la 023 (sidebar, header con breadcrumb "Organizador / Resumen", pie con sesión), con `h1` "Resumen".
- [ ] AC2 Un usuario sin perfil de organizador `active` (cliente, organizador `onboarding`/`suspended`) que abre `/organizer`, `/organizer/events` o `/organizer/events/new` es redirigido por `requireOrganizer` a `ORGANIZER_ONBOARDING_PATH` (que hoy da 404; ver Pregunta 4). Sin sesión, las tres rutas llevan a `/sign-in?redirect_url=…` (proxy).
- [ ] AC3 `/organizer/**` no usa `publicMetadata` ni `isOrganizer` para decidir acceso (`git grep -n "publicMetadata\|isOrganizer\|becomeOrganizer" src/modules/organizers "src/app/(organizer)"` → vacío).
- [ ] AC4 Los eventos mostrados son exactamente los de `events.organizer_id = organizerId` del usuario autenticado. Con dos organizadores con eventos distintos (seed o fixtures), cada uno ve solo los suyos; ninguna página, componente ni Server Action de esta spec recibe un id de organizador desde la URL o el cliente (`git grep -n "searchParams\|params" "src/app/(organizer)"` → solo para nada relacionado con organizador).
- [ ] AC5 `src/app/(organizer)/layout.tsx` y las tres páginas del grupo llaman a `requireOrganizer` (`git grep -c requireOrganizer "src/app/(organizer)"` → 4 archivos). Ningún componente cliente importa `@/lib/auth/guards` (salvo `import type`). Ninguna URL queda definida dos veces y `npm run build` lista `/organizer`, `/organizer/events` y `/organizer/events/new`.

**B. Shell (reutilizado)**

- [ ] AC6 En `/organizer` el ítem "Resumen" lleva `aria-current="page"` y es un enlace; "Mis eventos" y "Crear evento" son enlaces (no activos); "Check-in" y "Pagos" mantienen `aria-disabled="true"` y tooltip "Próximamente". En `/organizer/events` solo "Mis eventos" está activo; en `/organizer/events/new` solo "Crear evento".
- [ ] AC7 Un organizador sin rol staff ve solo la sección "Organizador" y el rol "Organizador" en el pie; un staff que además es organizador `active` ve ambas secciones. Un admin sin perfil de organizador, en `/admin/users`, ve los ítems de "Organizador" como "Próximamente" (sin enlaces).
- [ ] AC8 El logo del sidebar en `/organizer/**` enlaza a `/organizer` (no a `/admin/users`); en `/admin/**` sigue enlazando a `/admin/users`. Colapso a rail, drawer móvil, "Cerrar sesión" y "Ver sitio" funcionan como en la 023 (AC3–AC5 de 023, sin regresión). La página tiene exactamente un `main`.

**C. Resumen y Mis eventos**

- [ ] AC9 Los KPI muestran, dentro de un `dl`, Entradas vendidas = Σ `ticket_types.sold_count`, Ingresos = Σ subtotales de órdenes `paid` (USD) y Eventos publicados = cantidad con `status = 'published'`, todos de los eventos del organizador. Con el seed de la 022 (organizador con 10 eventos publicados) "Eventos publicados" = 10. Orden visual en `lg`: Entradas vendidas, Ingresos, Eventos publicados; en 390 px: Ingresos (ancho completo), Entradas vendidas, Publicados.
- [ ] AC10 No hay valores de KPI escritos a mano en componentes: cambiar datos en la DB cambia los KPI sin tocar código.
- [ ] AC11 "Crear evento" (botón del Resumen y enlace del sidebar) lleva a `/organizer/events/new`, que muestra dentro del shell el placeholder "Crear evento" con "Volver al resumen" → `/organizer`.
- [ ] AC12 En ≥ 1280 px "Mis eventos" es una `table` con `caption` (oculta visualmente) y 5 encabezados `th scope="col"` (el último "Acciones" solo para lectores). En < 1280 px es una lista de tarjetas con los mismos datos.
- [ ] AC13 Cada evento muestra portada (o recuadro neutro si no hay imagen utilizable), título, `fecha corta · ciudad` (p. ej. "vie 16 oct · Lima"), badge de estado con texto, "7,420 / 8,000 vendidas" y una barra `role="progressbar"` con `aria-valuenow` = porcentaje (93 para 7,420/8,000), nombre accesible "Entradas vendidas de {título}" y `aria-valuetext` "7,420 de 8,000 vendidas".
- [ ] AC14 Ingresos por evento en USD alineados a la derecha (p. ej. `$445,200`); en borradores se ve "—" y los lectores oyen "Sin ingresos".
- [ ] AC15 El segmented "Todos / Publicados / Borradores" tiene "Todos" presionado al inicio (`aria-pressed="true"`). Cada opción filtra por `status`; pulsar la opción activa no deja el grupo sin selección. Con 0 eventos se ve "Aún no tienes eventos. Crea el primero con “Crear evento”." y no hay `table`.
- [ ] AC16 Los eventos publicados tienen "Ver evento" → `/events/{slug}` (detalle público, existe en la DB); borradores, cancelados y suspendidos no tienen acción. No hay links con `href="#"` ni botones sin efecto.
- [ ] AC17 `/organizer/events` muestra `h1` "Mis eventos" con la misma sección (tabla/tarjetas y filtro), sin los KPI y sin un `h2` duplicado.
- [ ] AC18 Controles interactivos con foco visible (`focus-ring`) y área táctil ≥ 44 px en móvil (segmented, "Ver evento"); solo tokens (sin hex); legible en claro y oscuro.

**D. Regresión**

- [ ] AC19 `/admin/users` y el resto de la 023 siguen funcionando igual (tests de la 023 en verde; el cambio de `getAdminNav` es compatible hacia atrás sin `organizerActive`).
- [ ] AC20 `npm run lint`, `npm run test` y `npm run build` en verde.

## Tests obligatorios

- **`src/lib/format.test.ts`** (ampliar) — `formatCount`: `0` → "0"; `414` → "414"; `8146` → "8,146"; `1200000` → "1,200,000"; `7420.6` → "7,421". Los casos de `formatPrice` siguen en verde.
- **`src/modules/admin/utils/admin-nav.test.ts`** (ampliar) — sin `organizerActive`: toda la sección "Organizador" con `href: null` (comportamiento actual); con `organizerActive`: Resumen `/organizer`, Mis eventos `/organizer/events`, Crear evento `/organizer/events/new`, Check-in y Pagos `null`; `findNavMatch("/organizer")` → Resumen; `("/organizer/events")` → Mis eventos (no Resumen); `("/organizer/events/new")` → Crear evento (no Mis eventos); `staffRole = null` → solo sección "Organizador".
- **`src/modules/admin/components/admin-sidebar.test.tsx`** (ampliar) — `homeHref` personalizado en el logo; por defecto `/admin/users`; ítem organizador con `href` es enlace con `aria-current` según `usePathname` mockeado.
- **`src/modules/organizers/utils/organizer-event-mapper.test.ts`** — `toOrganizerEvent`: `startsAt` ISO; `revenue = cents / 100` (`44520000` → `445200`); sin totales ni órdenes → `capacity`, `ticketsSold`, `revenue` en 0; `coverKey` Unsplash → `imageUrl`; `null`, otro host o no-URL → `imageUrl: null`.
- **`src/modules/organizers/utils/organizer-dashboard.test.ts`** (fixtures locales, sin mock global):
  - `getOrganizerDashboardStats`: fixture de 4 eventos (3 publicados + 1 borrador) → totales esperados; `[]` → ceros; un `cancelled` suma vendidas e ingresos pero no cuenta como publicado.
  - `filterOrganizerEvents`: `"all"` devuelve todos en el mismo orden y un array distinto (no la misma referencia); `"published"`; `"draft"`; no muta la entrada.
  - `getSoldPercentage`: `(7420, 8000)` → 93; `(0, 1500)` → 0; `(1, 3)` → 33; `(2, 3)` → 67; `(900, 800)` → 100; `(-5, 100)` → 0; `(10, 0)` → 0; `(NaN, 100)` → 0.
  - `formatOrganizerEventRevenue`: published `445200` → "$445,200"; draft → `null`; suspended `0` → "$0".
  - `getOrganizerEventPublicHref`: published → `/events/{slug}`; draft, cancelled y suspended → `null`.
  - `ORGANIZER_EVENT_FILTERS` en orden Todos, Publicados, Borradores; `ORGANIZER_EVENT_STATUS_LABELS` con los 4 estados.
- **`src/modules/organizers/services/organizer-events.service.test.ts`** (mock de `getDb()` con el mismo patrón que `users.service.test.ts`) — `getByOrganizer("org-1")`: aplica el filtro por `organizerId` en la consulta de eventos; devuelve los eventos mapeados en el orden recibido (`starts_at` ascendente); evento sin tipos ni órdenes → 0/0/0; con tipos y órdenes pagadas → totales por `event_id`; sin eventos → `[]` y **no** ejecuta las consultas de agregados.
- **`src/modules/organizers/components/organizer-events-section.test.tsx`** (RTL, con fixture de 3 publicados y 1 borrador; tabla y lista conviven en jsdom, así que se consulta con `within(screen.getByRole("table"))` y `within(screen.getByRole("list", { name: "Mis eventos" }))`):
  - inicial: "Todos" con `aria-pressed="true"`; la tabla tiene 4 filas de datos y `caption` "Mis eventos: Todos";
  - clic en "Borradores": solo el borrador en tabla y lista, sin "Ver evento", ingreso "Sin ingresos" accesible; "Borradores" `aria-pressed="true"` y "Todos" `"false"`; clic otra vez: sigue presionado;
  - "Publicados": 3 filas; el link "Ver evento {título}" tiene `href="/events/{slug}"`;
  - barra de progreso: `aria-valuenow="93"` y `aria-valuetext="7,420 de 8,000 vendidas"` (fixture 7420/8000);
  - `events=[]`: mensaje "Aún no tienes eventos…" y sin `table`; solo publicados con filtro "Borradores": "No tienes borradores.";
  - `headingLevel="h1"` renderiza un `h1` "Mis eventos".

No requieren test unitario (SETUP §3): `admin-shell.tsx` (cambio de props), `organizer-dashboard`, `organizer-events-table`, `organizer-event-list`, `organizer-event-status-badge`, `organizer-event-sales`, `organizer-event-cover` (presentacionales; lógica en utils testeados y ejercitada en el test de la sección), layout y páginas de `src/app/**` (delgados).

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (AC5: ver las tres rutas en la salida; el reviewer lo corre al cerrar el bloque paralelo)
- **Manual** (`npm run dev`, con migración 019 aplicada y `npm run db:seed -- --organizer-email <email>` de un organizador `active`, creado desde `/admin/users`; y un usuario cliente):
  - 1440 px como organizador: `/organizer` → AC1, AC6–AC9, AC12–AC16, AC18; `/organizer/events` → AC17; "Crear evento" → AC11; contraer el sidebar a rail y recargar (persistencia).
  - Con un segundo organizador con otros eventos → AC4.
  - 390 px: drawer, tarjetas, segmented a ancho completo, orden móvil de KPI.
  - Cliente sin perfil → AC2 (redirige; hoy 404 en `/organizer/onboarding`, esperado hasta la Pregunta 4).
  - Admin sin perfil de organizador en `/admin/users` → AC7 (ítems "Próximamente").
  - Modo oscuro → AC18. Nota: tras el seed los ingresos muestran `$0` (no hay órdenes); ver Pregunta 3.

## Transcrito del diseño vs. criterio propio

| Transcrito (`OrgDashboard` / `OrgDashboardMobile`) | Criterio propio |
|---|---|
| h1 "Resumen", subtítulo, botón indigo "Crear evento" con `Plus` | Sidebar, header y menú móvil son los del shell de la 023 (colapsable, breadcrumb), no un sidebar propio; placeholder de `/organizer/events/new` |
| 3 KPI en `dl`; móvil: Ingresos a ancho completo, luego Entradas vendidas y Publicados | USD y `$` en vez de `S/`; KPI calculados desde la DB con util puro (D4, D8) |
| Sección "Mis eventos" con segmented Todos/Publicados/Borradores | `ToggleGroup` shadcn/Base UI; 44 px en móvil |
| Columnas Evento / Estado / Vendidas (+ barra) / Ingresos / acción; badges | `table` semántica con `caption`; progreso con `role="progressbar"`; "Ver evento" en lugar de "Ver ventas"/"Editar" (D5); tabla desde `xl` (D7) |
| Datos de ejemplo del diseño | Datos reales de la DB (019) y seed (022) |

## Contratos que consume la 018

| Contrato | Archivo | Uso en la 018 |
|---|---|---|
| Route group del panel y su layout (`requireOrganizer` + `AdminShell`) | `src/app/(organizer)/layout.tsx` | Toda página nueva en `src/app/(organizer)/organizer/**` hereda sidebar, header y `<main>`. La página **no** renderiza otro `main`. |
| Placeholder `/organizer/events/new` | `src/app/(organizer)/organizer/events/new/page.tsx` | La 018 lo **reemplaza**; debe seguir llamando a `requireOrganizer({ returnTo: ORGANIZER_NEW_EVENT_PATH })`. |
| `ORGANIZER_PATH`, `ORGANIZER_EVENTS_PATH`, `ORGANIZER_NEW_EVENT_PATH` | `src/lib/auth/auth-routes.ts`, `src/modules/organizers/utils/organizer-routes.ts` | Redirecciones tras guardar/publicar. |
| `getAdminNav(…, { organizerActive })` y `exact` | `src/modules/admin/utils/admin-nav.ts` | Cualquier ítem nuevo del panel se activa cambiando su `href`. |
| `OrganizerUser.organizerId` | `src/lib/auth/guards.ts` (020) | Valor de `events.organizer_id` al crear (siempre del guard, nunca del formulario). |
| `OrganizerEvent`, `OrganizerEventStatus` | `src/modules/organizers/types/organizer-event.types.ts` | Forma del evento del organizador. Si la 018 necesita más campos, los agrega de forma compatible. |
| `organizerEventsService` | `src/modules/organizers/services/organizer-events.service.ts` | Punto donde la 018 agrega `create(...)`. |
| `ORGANIZER_EVENT_STATUS_LABELS`, `OrganizerEventStatusBadge` | `utils/organizer-dashboard.ts`, `components/organizer-event-status-badge.tsx` | Si la 018 muestra el estado. |
| `formatCount` | `src/lib/format.ts` | Conteos. |

**Archivos existentes que modifica esta spec:** `src/lib/format.ts` y su test, `src/modules/admin/utils/admin-nav.ts` y su test, `src/modules/admin/components/admin-shell.tsx`, `admin-sidebar.tsx` y su test, `src/app/(admin)/admin/layout.tsx`.

## Preguntas abiertas

Hay una recomendación asumida por defecto en cada una; responder distinto cambia solo lo indicado.

1. **Ubicación de las rutas (D1).** Recomendado y asumido: `/organizer`, `/organizer/events`, `/organizer/events/new` en un grupo `(organizer)` que reutiliza `AdminShell`. Es coherente con `ORGANIZER_PATH` (guards, proxy, `UserMenu`), permite que un organizador no staff use el shell sin abrir `/admin` (que exige staff) y deja libre `/admin/**` para moderación. Alternativa: `/admin/organizer/**` (exigiría relajar `requireStaff` del layout `/admin` y mezclar permisos; no recomendado).
2. **"Mis eventos" navegable.** Asumido: se activan "Resumen" (`/organizer`) y "Mis eventos" (`/organizer/events`, listado completo con el mismo componente, 1 página extra) y "Crear evento" (placeholder). Alternativa mínima: solo "Resumen", dejando "Mis eventos" como "Próximamente" y sin `/organizer/events` (se quitan 1 página y el prop `headingLevel`).
3. **Fuente de "Ingresos".** Asumido (D4): suma de `subtotal_cents` de órdenes `paid` (excluye comisión, reembolsos y pendientes). Efecto: con el seed de la 022 hay `sold_count` pero no órdenes, así que `Ingresos` muestra `$0` mientras `Entradas vendidas` > 0 hasta que haya compras reales. Alternativa: derivar `Σ sold_count × price_cents` (siempre coherente con el seed, pero ignora reembolsos y precios cambiados). ¿Cuál se prefiere?
4. **`/organizer/onboarding` no existe.** `requireOrganizer()` redirige allí a quien no es organizador `active` y hoy da 404 (020 Q2 la difiere a una spec posterior: pantalla "solicita acceso"). No se resuelve aquí; si el 404 es inaceptable antes de esa pantalla, habría que crearla en una spec aparte (fuera del grupo `(organizer)`, D1).
5. **Tamaño (≈ 31 archivos).** Si se prefiere una sesión más corta, partir en 017a (P1–P3: ajustes de shell, dominio y service) y 017b (T1–T2: rutas y vista).

**Resueltas / obsoletas respecto a la versión anterior:** el doble `currentUser()` por request ya no aplica (los guards de la 020 memoizan con `cache()`); la coordinación de `format.ts`/`brand-logo.tsx` con 016/018 se reduce a `formatCount` (ya no se toca `brand-logo.tsx`); "Ver evento" en lugar de "Ver ventas/Editar" y los ítems "Próximamente" se mantienen (D5, 023 D3).
