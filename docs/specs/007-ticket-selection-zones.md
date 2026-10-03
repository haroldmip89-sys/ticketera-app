# 007 — Selección de entradas por zona y cantidad (paso 1 de la compra)

- **Estado:** done (APPROVED por reviewer en iteración 1)
- **Modo:** SDD
- **Módulo(s):** `src/modules/checkout` (nuevo: flujo de compra), `src/modules/seating` (nuevo: geometría de recintos; aquí el mapa esquemático de zonas). Consume `src/modules/events` (003, 006). Transversal: `src/components/shared` (`QuantityStepper`), `src/app/(purchase)/` (grupo de rutas nuevo).
- **Depende de:** 003–006 implementadas y en verde. Consume: `TicketType`, `getTicketTypes`, `getZoneTones`/`getZoneToneClassName`, contrato `data-mobile-action-bar` (006); `getEventHref`, `getEventTicketsHref`, `formatDateLong`, `formatDateShort`, `formatPrice` (003/005); `BrandLogo` (004).
- **Diseño fuente:** `docs/design/reference-design.md` §2.5 (`Tickets`, `TicketsMobile`) y §3.4.

**Roadmap:** 003 paleta + events + descubrimiento · 004 shell · 005 Hero · 006 detalle · **007 selección por zonas (esta)** · 008 mapa de teatro (paso extra) · 009 búsqueda · 010 checkout + confirmación · 011 login/registro · 012 Mis entradas · 013 panel de organizador · 014 crear evento.

## Objetivo

Crear `/events/[slug]/tickets`, el paso 1 ("Entradas") del flujo de compra de la referencia, para **todos** los eventos (modelo híbrido elegido por el usuario): header propio del flujo con el stepper "1 Entradas — 2 Datos y pago — 3 Confirmación", mini cabecera del evento, **mapa esquemático de zonas** (cuando el recinto lo tiene), lista de zonas con **selector de cantidad**, resumen "Tu compra" con total y "Continuar". La selección viaja en la URL (`?tickets=`): los eventos de zona van al checkout (010) y los teatros (`seatSelection: "seat"`) al paso extra de asientos (008). Desktop y móvil según la referencia, claro y oscuro, proyecto en verde.

## Fuera de alcance

- **008**: mapa de asientos numerados de teatro (`/events/[slug]/seats`). Hasta entonces, "Continuar" en evt-001/evt-004 da 404 (aceptado).
- **010**: checkout y confirmación (`/events/[slug]/checkout`), temporizador de reserva y pago. Hasta entonces, "Continuar" en eventos de zona da 404 (aceptado). La 010 reutilizará `PurchaseFlowHeader`, `EventPurchaseSummary`, `parseTicketSelection` y `getSelectionLines`.
- Reserva/hold de entradas, disponibilidad en tiempo real, tope total por compra (la referencia solo limita por zona), persistencia fuera de la URL.
- Mapas de zonas de recintos sin plano (evt-005, 006, 008, 009, 010): muestran solo la lista (D5).

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `Button` / `buttonVariants` | reutilizar | `src/components/ui/button.tsx` | Botones del stepper y CTA deshabilitado (`focusableWhenDisabled`). |
| `Badge` | reutilizar (003) | `src/components/ui/badge.tsx` | "Últimas entradas". |
| `BrandLogo` | reutilizar (004) | `src/components/shared/brand-logo.tsx` | Header del flujo. |
| `TicketType`, `eventsService.getTicketTypes`, `getBySlug` | reutilizar (003/006) | `src/modules/events/**` | |
| `getZoneTones`, `getZoneToneClassName` | reutilizar (006) | `src/modules/events/utils/zone-tones.ts` | Mismo color de zona en mapa, lista y detalle. |
| `getEventHref` | reutilizar (003) | `src/modules/events/utils/event-routes.ts` | "Volver al evento". |
| `getEventSeatsHref`, `getEventCheckoutHref` | extender | `src/modules/events/utils/event-routes.ts` | `"/events/{slug}/seats"` (008) y `"/events/{slug}/checkout"` (010). |
| `--mobile-action-bar-height` + `data-mobile-action-bar` | reutilizar (006) | `src/app/globals.css` | Barra inferior móvil. Sin cambios en `globals.css`. |
| Stepper de cantidad | crear (`QuantityStepper`) | `src/components/shared/quantity-stepper.tsx` | shadcn no tiene number field/stepper; `NumberField` de Base UI se descarta (D7). Genérico, sin dominio. |
| Tipos y mock de mapas de zonas | crear | `src/modules/seating/types/seating.types.ts`, `src/modules/seating/data/zone-maps.mock.ts` | La 008 añade al mismo módulo el layout de asientos. |
| `seatingService.getZoneMap` | crear | `src/modules/seating/services/seating.service.ts` (+ test) | |
| `ZoneMap` | crear | `src/modules/seating/components/zone-map.tsx` | Mapa esquemático (CSS grid) de la referencia. |
| Lógica de selección | crear | `src/modules/checkout/utils/ticket-selection.ts` (+ test) | Pura: cantidades, líneas, total, URL. |
| `PurchaseFlowHeader` | crear | `src/modules/checkout/components/purchase-flow-header.tsx` | Header del flujo (pasos 1–3); lo reutilizan 008 y 010. |
| `EventPurchaseSummary` | crear | `src/modules/checkout/components/event-purchase-summary.tsx` | Mini cabecera del evento; la reutilizan 008 y 010. |
| `TicketZoneList` | crear | `src/modules/checkout/components/ticket-zone-list.tsx` | Filas de zona con stepper. |
| `OrderSummary` | crear | `src/modules/checkout/components/order-summary.tsx` | "Tu compra" (desktop) y barra de total (móvil). |
| `TicketSelectionView` | crear | `src/modules/checkout/components/ticket-selection-view.tsx` (+ test) | Client: estado de selección y zona activa. |
| Ruta | crear | `src/app/(purchase)/events/[slug]/tickets/page.tsx`, `not-found.tsx` | Grupo `(purchase)`: sin `SiteHeader` ni footer (la referencia no los tiene en el flujo). |
| Store zustand | no se usa | — | La URL es la fuente de verdad entre pasos (D3). |

**Recuento de archivos de producción:** 14 (1 extensión de `event-routes.ts`, 2 de routing). Pasa la guía de ~8: el paso 1 de la referencia es una unidad (header de flujo + mapa + lista + resumen) y sin cualquiera de ellas no hay resultado verificable; 4 de los archivos son contratos/datos/lógica pura sin UI. Las tareas paralelas tienen 1–2 archivos.

## Contratos

### C1 — Mapa de zonas (`src/modules/seating/types/seating.types.ts`)

```ts
/** Alto de cada fila del mapa; la UI lo traduce a px por breakpoint (C6). */
export type ZoneMapRowSize = "stage" | "sm" | "md" | "lg"
/** Valores CSS de grid-column / grid-row, p. ej. "2", "1 / -1", "1 / 4". */
export type ZoneMapArea = { column: string; row: string }
export type ZoneMap = {
  eventId: string
  columns: 1 | 3                         // 3 = lateral izquierdo, centro, lateral derecho
  rows: readonly ZoneMapRowSize[]
  stage: { label: string; area: ZoneMapArea }
  zones: readonly { ticketTypeId: string; area: ZoneMapArea }[]
}
```

### C2 — Mock y service (`src/modules/seating/`)

```ts
// data/zone-maps.mock.ts
export const ZONE_MAPS_MOCK: Readonly<Record<string, ZoneMap>>   // claves = eventId
// services/seating.service.ts
export const seatingService: {
  /** Mapa esquemático del recinto del evento; null si no tiene plano. Copia profunda en cada llamada. */
  getZoneMap(eventId: string): Promise<ZoneMap | null>
}
```

| Evento | columns | rows | Escenario (label · área) | Zonas (ticketTypeId · column · row) |
|---|---|---|---|---|
| evt-001 (teatro) | 1 | stage, lg, md | "ESCENARIO" · 1 · 1 | `evt-001-platea` · 1 · 2; `evt-001-mezzanine` · 1 · 3 |
| evt-004 (teatro) | 1 | stage, lg, md | "ESCENARIO" · 1 · 1 | `evt-004-platea` · 1 · 2; `evt-004-mezzanine` · 1 · 3 |
| evt-002 (estadio) | 3 | sm, lg, sm | "CAMPO DE JUEGO" · 2 · 2 | `evt-002-norte` · 1 / -1 · 1; `evt-002-occidente` · 1 · 2; `evt-002-oriente` · 3 · 2; `evt-002-sur` · 1 / -1 · 3 |
| evt-003 (festival) | 1 | stage, md, lg | "ESCENARIO" · 1 · 1 | `evt-003-vip` · 1 · 2; `evt-003-general` · 1 · 3 |
| evt-007 (arena) | 1 | stage, lg, md, sm | "ESCENARIO" · 1 · 1 | `evt-007-campo` · 1 · 2; `evt-007-platea-baja` · 1 · 3; `evt-007-platea-alta` · 1 · 4 |

Resto de eventos → `null`. Invariante (test): en cada mapa, cada `TicketType` del evento aparece exactamente una vez y no hay `ticketTypeId` ajenos.

### C3 — Selección (`src/modules/checkout/utils/ticket-selection.ts`)

```ts
export const MAX_TICKETS_PER_ZONE = 6           // referencia: "Máximo 6 entradas por zona"
export const TICKETS_SEARCH_PARAM = "tickets"

/** ticketTypeId → cantidad entera 1..MAX. Las cantidades 0 no se guardan. */
export type TicketSelection = Readonly<Record<string, number>>
export type SelectionLine = { ticketTypeId: string; name: string; unitPrice: number; quantity: number; subtotal: number }

export function getTicketQuantity(selection: TicketSelection, ticketTypeId: string): number
/** Selección NUEVA con la cantidad truncada y limitada a [0, MAX_TICKETS_PER_ZONE]; 0 elimina la clave.
 *  Si el tipo está agotado devuelve LA MISMA referencia. Nunca muta la entrada. */
export function setTicketQuantity(selection: TicketSelection, ticketType: TicketType, quantity: number): TicketSelection
export function getTotalQuantity(selection: TicketSelection): number
/** Solo cantidades > 0, en el orden de ticketTypes; ignora ids desconocidos. subtotal = round2(unitPrice × quantity). */
export function getSelectionLines(selection: TicketSelection, ticketTypes: readonly TicketType[]): SelectionLine[]
/** round2(Σ subtotal); round2(x) = Math.round(x * 100) / 100. */
export function getSelectionTotal(selection: TicketSelection, ticketTypes: readonly TicketType[]): number
/** "id:qty,id:qty" en el orden de ticketTypes (ignora desconocidos). Vacía → "". */
export function serializeTicketSelection(selection: TicketSelection, ticketTypes: readonly TicketType[]): string
/** Inverso tolerante: array → primer valor; ignora ids desconocidos o agotados, cantidades no enteras o ≤ 0
 *  y pares mal formados; trunca a MAX_TICKETS_PER_ZONE; si un id se repite, gana el primero. undefined → {}. */
export function parseTicketSelection(value: string | string[] | undefined, ticketTypes: readonly TicketType[]): TicketSelection
/** baseHref + "?tickets=" + serialize (con URLSearchParams). Vacía → baseHref sin "?". */
export function buildPurchaseStepHref(baseHref: string, selection: TicketSelection, ticketTypes: readonly TicketType[]): string
```

Ejemplo: `buildPurchaseStepHref("/events/festival-sonidos-del-sur/checkout", { "evt-003-general": 2 }, types)` → `searchParams.get("tickets") === "evt-003-general:2"`.

### C4 — Rutas (`src/modules/events/utils/event-routes.ts`, se añade)

```ts
export function getEventSeatsHref(slug: string): string     // "/events/{slug}/seats"
export function getEventCheckoutHref(slug: string): string  // "/events/{slug}/checkout"
```

Destino de "Continuar": `event.seatSelection === "seat"` → `buildPurchaseStepHref(getEventSeatsHref(slug), …)`; si no → `buildPurchaseStepHref(getEventCheckoutHref(slug), …)`.

### C5 — Componentes

```ts
// src/components/shared/quantity-stepper.tsx  (sin "use client"; lo usan componentes cliente)
export type QuantityStepperProps = {
  value: number
  max: number
  onValueChange: (next: number) => void   // value - 1 o value + 1
  groupLabel: string                      // "Cantidad de Platea"
  decrementLabel: string                  // "Quitar una entrada de Platea"
  incrementLabel: string                  // "Agregar una entrada de Platea"
  className?: string
}
// mínimo fijo 0: "−" deshabilitado con value <= 0; "+" con value >= max

// src/modules/seating/components/zone-map.tsx  (sin "use client")
export type ZoneMapProps = {
  zoneMap: ZoneMap
  ticketTypes: TicketType[]
  tones: ReadonlyMap<string, ZoneTone | null>
  selectedTicketTypeId: string | null
  onSelect: (ticketTypeId: string) => void
}

// src/modules/checkout/components/ticket-zone-list.tsx  (sin "use client")
export type TicketZoneListProps = {
  ticketTypes: TicketType[]
  tones: ReadonlyMap<string, ZoneTone | null>
  selection: TicketSelection
  selectedTicketTypeId: string | null
  onQuantityChange: (ticketType: TicketType, quantity: number) => void
}

// src/modules/checkout/components/order-summary.tsx  (server/presentacional)
export type OrderSummaryProps = {
  lines: SelectionLine[]
  totalQuantity: number
  totalPrice: number
  continueHref: string | null     // null = deshabilitado
  note?: string                   // texto opcional bajo el CTA (D4)
}

// src/modules/checkout/components/purchase-flow-header.tsx  (server)
export type PurchaseStep = 1 | 2 | 3
export type PurchaseFlowHeaderProps = { currentStep: PurchaseStep; backHref: string; backLabel: string; mobileTitle: string }

// src/modules/checkout/components/event-purchase-summary.tsx  (server)
export type EventPurchaseSummaryProps = { event: EventItem; backHref: string }

// src/modules/checkout/components/ticket-selection-view.tsx  ("use client")
export type TicketSelectionViewProps = {
  event: EventItem
  ticketTypes: TicketType[]
  zoneMap: ZoneMap | null
  initialSelection: TicketSelection
}
```

Estado de `TicketSelectionView`:
- `selection` (inicial `initialSelection`) y `selectedTicketTypeId` (inicial: primer tipo con cantidad > 0 o `null`).
- Pulsar una zona del mapa **no agrega entradas**: solo la marca como seleccionada y resalta su fila (referencia).
- Cambiar una cantidad con el stepper fija `selection` con `setTicketQuantity` **y** marca esa zona como seleccionada (referencia).
- `tones = getZoneTones(ticketTypes)`, `lines`, `totalQuantity`, `totalPrice` y `continueHref` derivados con `useMemo`; `continueHref = totalQuantity > 0 ? <C4> : null`.

### C6 — Routing (`src/app/(purchase)/events/[slug]/tickets/`)

```ts
// page.tsx
export async function generateMetadata(props: PageProps<"/events/[slug]/tickets">): Promise<Metadata>
//   { title: `Elige tus entradas — ${event.title}` }; inexistente → {}
export default async function TicketsPage(props: PageProps<"/events/[slug]/tickets">): Promise<JSX.Element>
//   const { slug } = await props.params; const { tickets } = await props.searchParams
//   getBySlug → notFound(); [ticketTypes, zoneMap] = await Promise.all([...])
//   initialSelection = parseTicketSelection(tickets, ticketTypes)
//   <PurchaseFlowHeader currentStep={1} backHref={getEventHref(slug)} backLabel="Volver al evento" mobileTitle="Elige tus entradas" />
//   <main className="flex-1 bg-secondary"><TicketSelectionView … /></main>
// not-found.tsx → <EventNotFound /> (006)
```
- `params` y `searchParams` son `Promise` (Next 16). Leer `searchParams` hace la ruta dinámica (aceptado: permite volver desde 008/010 con la selección precargada).
- La ruta vive en `(purchase)`, que **no** tiene layout propio: hereda el root layout (sin `SiteHeader`/`SiteFooter`, que viven en `(site)` desde la 004). Mismo segmento `[slug]` que `(site)/events/[slug]` (requisito de Next: igual nombre de parámetro) y URL distinta.

## Especificación visual

**Transcrito de la referencia** (`Tickets` 1440 px, `TicketsMobile` 390 px): header del flujo y stepper, mini cabecera, "Elige tu zona"/"Toca una zona del mapa", mapa en CSS grid (escenario oscuro, zonas con color y precio, anillo de 3 px en la seleccionada), lista con muestra de color, badge, "c/u", stepper −/+ y "Agotado", nota "Máximo 6 entradas por zona.", "Tu compra" (líneas, vacío punteado, perforación, total, "Continuar" deshabilitado gris), header móvil con "Paso 1 de 3" y barra al 33 %, barra inferior "Total · N entradas". **Criterio propio**: mapas de nuestros recintos (C2), recintos sin plano (D5), estado deshabilitado accesible, nota de teatro (D4) y lo marcado con D.

### `PurchaseFlowHeader`
- `<header className="border-b border-border bg-background">`.
- **`≥ lg`** (`h-19`, contenedor `mx-auto max-w-7xl px-8 flex items-center justify-between`):
  - Izquierda (`w-60`): `next/link` a `/` con `<BrandLogo />`, `aria-label="Ticketera, ir al inicio"`, `focus-ring`.
  - Centro: `<ol aria-label="Pasos de la compra" className="flex items-center gap-3 text-sm">` con 3 `li`: **"Entradas"**, **"Datos y pago"**, **"Confirmación"**. Círculo `size-7 rounded-full text-[13px]` con el número: paso actual `bg-foreground text-background` + label `font-semibold` + `aria-current="step"`; pasos siguientes `border-[1.5px] border-input` + label `text-muted-foreground`; pasos anteriores (010) `bg-primary text-primary-foreground` con `Check`. Conector `w-10 h-[1.5px] bg-input` (`aria-hidden`) entre pasos, dentro del `li`.
  - Derecha (`w-60 justify-end`): `Lock` 16 px `aria-hidden` + **"Compra segura"** (`text-sm text-muted-foreground`).
- **`< lg`**: fila `h-15 flex items-center gap-1 pr-3 pl-1.5`: link `size-11 rounded-xl focus-ring` con `ArrowLeft` y `aria-label={backLabel}` a `backHref`; columna `flex-1`: **"Paso {n} de 3"** (`text-xs text-muted-foreground`) + `mobileTitle` (`text-base font-semibold`); `Lock` 20 px `aria-hidden` + `sr-only` "Compra segura". Debajo, barra `h-[3px] bg-border` con relleno `bg-primary` al `n/3` (33.33 % en el paso 1), `aria-hidden`.

### `EventPurchaseSummary`
- **`≥ lg`**: contenedor `mx-auto max-w-7xl px-8 pt-6 pb-7 flex flex-col gap-4`: link **"Volver al evento"** (`ArrowLeft` 16 px, `h-8 w-fit text-sm font-medium text-muted-foreground hover:text-foreground focus-ring`) a `backHref`; fila `flex items-center gap-4`: `next/image` `size-16 rounded-2xl object-cover` (`alt=""`), `<h1>` (`text-[1.625rem] leading-[1.2] font-bold tracking-[-0.02em]`) y `<p>` **"{formatDateLong(startsAt)} · {venue.name}, {venue.city}"** (`text-[0.9375rem] text-muted-foreground`).
- **`< lg`**: franja `bg-card border-b border-border p-4 flex items-center gap-3` sin link (el header móvil ya lo tiene): imagen `size-13 rounded-[14px]`, `<h1>` `text-[0.9375rem] font-semibold`, `<p>` **"{formatDateShort(startsAt)} · {venue.name}, {venue.city}"** (`text-[13px] text-muted-foreground`).

### Cuerpo (`TicketSelectionView`)
- `≥ lg`: `mx-auto max-w-7xl px-8 pb-20 grid grid-cols-[minmax(0,1fr)_26.25rem] gap-8 items-start` (aside de 420 px). Columna izquierda `flex flex-col gap-6`: mapa (si hay) y lista. Aside `sticky top-6` (el header del flujo no es sticky, D6).
- `< lg`: `p-4 flex flex-col gap-4` (mapa, lista) y la barra inferior como último hijo.

### `ZoneMap` (dentro de una tarjeta `<section aria-labelledby="zone-map-title">`)
- Tarjeta `rounded-[22px] lg:rounded-3xl border border-border bg-card px-4 pt-4.5 pb-4 lg:px-7 lg:pt-6 lg:pb-7 flex flex-col gap-3.5 lg:gap-4.5`.
- Encabezado `flex items-baseline justify-between`: `<h2 id="zone-map-title">` **"Elige tu zona"** (`text-lg lg:text-xl font-semibold`) + **"Toca una zona del mapa"** (`text-xs lg:text-[13px] text-muted-foreground`; en móvil **"Toca una zona"**).
- Grilla `<div role="group" aria-label="Mapa de zonas">` `grid gap-2 lg:gap-2.5 rounded-2xl lg:rounded-[18px] bg-muted/50 p-3 lg:p-5`:
  - Columnas: `columns === 3` → `grid-cols-[76px_minmax(0,1fr)_76px] lg:grid-cols-[140px_minmax(0,1fr)_140px]`; `1` → `grid-cols-1`.
  - Filas: `style={{ gridTemplateRows: rows.map(r => \`var(--zone-row-${r})\`).join(" ") }}` con las variables definidas por clases estáticas en el contenedor: stage 34 px / 44 px, sm 56 / 72, md 76 / 104, lg 96 / 128 (móvil / `lg`), valores de la referencia.
  - Escenario: `<span>` en su área (`style={{ gridColumn, gridRow }}`), `flex items-center justify-center rounded-[10px] lg:rounded-xl bg-foreground text-background text-[10px] lg:text-xs font-bold tracking-[0.16em]` con `stage.label`.
  - Cada zona: `<button type="button" aria-pressed={selected}>` en su área, `flex flex-col items-center justify-center gap-0.5 rounded-xl lg:rounded-[14px] border-3 text-center focus-ring` + `getZoneToneClassName(tone)`; borde `border-foreground` si está seleccionada y `border-transparent` si no (anillo de 3 px de la referencia). Contenido: `name` (`text-[13px] lg:text-[0.9375rem] font-semibold leading-tight`) y `formatPrice(price)` o **"Agotado"** (`text-xs lg:text-[13px]`). `aria-label`: **"{name}, {precio}"**, **"{name}, {precio}, últimas entradas"** o **"{name}, agotado"**.
- Sin `zoneMap` (`null`): no se renderiza esta tarjeta (D5).

### `TicketZoneList`
- Tarjeta `<section aria-labelledby="ticket-list-title">` `rounded-[22px] lg:rounded-3xl border border-border bg-card px-4 lg:px-7 py-2`.
- `<h2 id="ticket-list-title">` **"Entradas"** (`pt-4 pb-2 text-lg lg:text-xl font-semibold`).
- `<ul>`; cada `li` `min-h-19 -mx-3 px-3 flex items-center gap-4 rounded-[14px] border-t border-border` (`bg-primary/10` si es la zona seleccionada):
  - Muestra `size-3.5 rounded-[4px] shrink-0` + `getZoneToneClassName(tone)`, `aria-hidden`.
  - Columna `flex-1 flex flex-col gap-0.5`: fila `name` (`text-base font-semibold`) + `Badge` **"Últimas entradas"** (`h-6 gap-1 px-2 rounded-full bg-urgent text-urgent-foreground text-[11px] font-semibold` + `Clock` 12 px) si aplica; **"{formatPrice(price)} c/u"** (`text-sm text-muted-foreground`).
  - Derecha: agotado → **"Agotado"** (`h-11 px-4 inline-flex items-center rounded-xl bg-muted text-sm font-semibold text-muted-foreground`); si no → `QuantityStepper` con `value = getTicketQuantity`, `max = MAX_TICKETS_PER_ZONE`, `groupLabel = "Cantidad de {name}"`, `decrementLabel = "Quitar una entrada de {name}"`, `incrementLabel = "Agregar una entrada de {name}"`.
- Nota `border-t border-border pt-3.5 pb-4.5 text-xs lg:text-[13px] text-muted-foreground`: **"Máximo 6 entradas por zona."** (el 6 sale de `MAX_TICKETS_PER_ZONE`).

### `QuantityStepper`
- `<div role="group" aria-label={groupLabel} className="inline-flex items-center gap-1 rounded-[14px] border border-border p-[3px]">`.
- "−": `Button` `type="button"` `size-11 lg:size-10 rounded-[11px] bg-muted text-foreground hover:bg-muted/80`, `Minus` 18 px `aria-hidden`, `aria-label={decrementLabel}`, `disabled={value <= 0}` + `focusableWhenDisabled`.
- Valor: `<output aria-live="polite" aria-atomic="true" className="w-8 text-center text-base font-semibold tabular-nums">`.
- "+": `size-11 lg:size-10 rounded-[11px] bg-foreground text-background hover:bg-foreground/90`, `Plus`, `aria-label={incrementLabel}`, `disabled={value >= max}` + `focusableWhenDisabled`.
- Deshabilitado: `opacity-40 cursor-not-allowed` (referencia). Con `focusableWhenDisabled`, el botón que se deshabilita con el foco lo conserva (`aria-disabled="true"`).

### `OrderSummary`
- **Aside `≥ lg`** (`hidden lg:flex`): `<aside aria-label="Resumen de la compra">` `flex-col gap-5 rounded-3xl border border-border bg-card p-7 shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)]`:
  - `<h2>` **"Tu compra"** (`text-xl font-semibold`).
  - Con líneas: `<ul className="flex flex-col gap-3">`, cada una `flex justify-between gap-3 text-[0.9375rem]`: **"{q} × {name}"** y `formatPrice(subtotal)` (`font-semibold tabular-nums`).
  - Sin líneas: `<p>` **"Todavía no elegiste entradas. Toca una zona o usa los botones +."** (`rounded-2xl border-[1.5px] border-dashed border-input p-5 text-sm leading-normal text-muted-foreground text-center`).
  - Total (perforación: `border-t-[1.5px] border-dashed border-input pt-4.5 flex items-baseline justify-between`): **"Total"** + **"({n} entrada)"/"({n} entradas)"** (`text-muted-foreground`) y `formatPrice(totalPrice)` (`text-[1.75rem] font-bold tracking-[-0.02em] tabular-nums`).
  - CTA **"Continuar"** + `ArrowRight`: con `continueHref` → `next/link` `h-14 rounded-2xl bg-cta text-cta-foreground hover:bg-cta-hover text-base font-semibold focus-ring`; sin él → `Button disabled focusableWhenDisabled` con las mismas medidas y `bg-border text-muted-foreground` (`aria-disabled="true"`, no navega).
  - `note` (si existe) `text-[13px] text-muted-foreground text-center`.
- **Barra `< lg`** (`lg:hidden`): `<div role="region" aria-label="Total de la compra" data-mobile-action-bar className="sticky bottom-0 z-40 border-t border-border bg-background shadow-[0_-12px_24px_-18px_rgb(24_24_27/0.35)]">`, interior `flex items-center justify-between gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]`:
  - Izquierda `<span aria-live="polite" className="flex flex-col">`: **"Total · {n} entrada(s)"** (`text-xs text-muted-foreground`) + `formatPrice(totalPrice)` (`text-[1.375rem] font-bold tracking-[-0.02em] tabular-nums`).
  - Derecha: CTA **"Continuar"** (`h-13 px-6 rounded-[15px] text-[0.9375rem]`, mismo comportamiento habilitado/deshabilitado).
  - Alto: 1 + 12 + 52 + 12 = **77 px ≤ `--mobile-action-bar-height`**.

### Responsive

| Ancho | Composición |
|---|---|
| 375 / 768 px | header de paso (60 px + barra de 3 px) → franja del evento → mapa compacto (laterales de 76 px) → lista con steppers de 44 px → barra inferior "Total · N entradas" + "Continuar" |
| 1280 px | header con stepper → "Volver al evento" + mini cabecera → [mapa + lista] \| [aside "Tu compra" de 420 px, sticky] |

**Headings:** `h1` título del evento → `h2` "Elige tu zona" → `h2` "Entradas" → `h2` "Tu compra" (desktop).

## Decisiones propias (no validadas) vs. validadas

**Validadas por el usuario o la referencia:** modelo híbrido (zona + cantidad para todos; teatro con paso extra de asientos), flujo de 3 pasos con header propio, mapa esquemático de zonas, máximo por zona (6), "Continuar" naranja, `$`.

**Decisiones propias:**
- **D1** — Solo tope **por zona** (6, referencia); se elimina el tope total de 8 por compra de la versión anterior de las specs.
- **D2** — Mapas esquemáticos de nuestros recintos (C2) inventados con la misma gramática de la referencia (escenario + bloques en CSS grid). El estadio de fútbol usa "CAMPO DE JUEGO" en el centro con tribunas alrededor.
- **D3** — La selección viaja por query param (`?tickets=id:qty,…`) y no por store: sobrevive a recargas, se puede compartir, permite volver desde 008/010 con la selección precargada y no necesita persistencia. Contrapartida: la ruta es dinámica.
- **D4** — Teatros: mismo paso de zona + cantidad; "Continuar" lleva a `/seats` y el aside muestra la nota **"En el siguiente paso eliges tus asientos."** (en móvil, la misma nota bajo la lista). La referencia no tiene teatro.
- **D5** — Recintos sin plano (general/club/auditorio): no se muestra la tarjeta del mapa, solo la lista. No se inventan planos donde la zona no aporta orientación.
- **D6** — El header del flujo no es sticky (la referencia no lo define); el aside usa `top-6`.
- **D7** — Stepper propio (dos botones + `<output aria-live>`) en lugar de `NumberField` de Base UI: máximo 6, no requiere tecleo y el patrón es predecible con lector de pantalla.
- **D8** — Fondo del mapa `bg-muted/50` (≈ `#FAFAFA` de la referencia) y zona agotada `bg-muted text-muted-foreground` en lugar de `#E4E4E7`/`#52525B`: en oscuro el par de la referencia no llega a 4.5:1; con tokens sí (7.0:1 claro, 5.8:1 oscuro).
- **D9** — Seleccionar una zona del mapa no hace scroll hasta su fila (la referencia tampoco).

## Tareas

### Preparación (serie)
- **P1** Dominio de mapas de zonas con test — archivos: `src/modules/seating/types/seating.types.ts`, `src/modules/seating/data/zone-maps.mock.ts`, `src/modules/seating/services/seating.service.ts`, `src/modules/seating/services/seating.service.test.ts`.
- **P2** Lógica de selección y rutas con tests — archivos: `src/modules/checkout/utils/ticket-selection.ts`, `src/modules/checkout/utils/ticket-selection.test.ts`, `src/modules/events/utils/event-routes.ts`, `src/modules/events/utils/event-routes.test.ts` (añadir casos).
- **P3** Stepper compartido — archivos: `src/components/shared/quantity-stepper.tsx`.

### Paralelo (archivos disjuntos)
- **T1** Mapa de zonas — archivos: `src/modules/seating/components/zone-map.tsx`.
- **T2** Lista de zonas — archivos: `src/modules/checkout/components/ticket-zone-list.tsx`.
- **T3** Resumen y barra — archivos: `src/modules/checkout/components/order-summary.tsx`.
- **T4** Header del flujo y mini cabecera — archivos: `src/modules/checkout/components/purchase-flow-header.tsx`, `src/modules/checkout/components/event-purchase-summary.tsx`.

Durante el bloque paralelo nadie ejecuta `npm install` ni `npm run build`.

### Integración (serie)
- **I1** Vista, ruta y test — archivos: `src/modules/checkout/components/ticket-selection-view.tsx`, `src/modules/checkout/components/ticket-selection-view.test.tsx`, `src/app/(purchase)/events/[slug]/tickets/page.tsx`, `src/app/(purchase)/events/[slug]/tickets/not-found.tsx`.

## Criterios de aceptación

**Calidad**
- [ ] AC1 `npm run lint`, `npm run test` y `npm run build` pasan.
- [ ] AC2 Exports según C1–C6. Grep: `zone-maps.mock` solo se importa en `seating.service.ts`; ningún archivo de `src/modules/events` importa de `checkout` ni de `seating`; no se usa zustand en esta fase; no hay rutas `/seats`, `/checkout` ni `/tickets` construidas a mano fuera de `event-routes.ts`.
- [ ] AC3 No se modificó `src/app/globals.css`, `src/app/layout.tsx` ni nada de `src/app/(site)/**`. La página de compra no muestra `SiteHeader` ni `SiteFooter`.

**Página (manual, `npm run dev`)**
- [ ] AC4 `/events/clasico-del-futbol-final-de-temporada/tickets` a 1280 px: header con logo, stepper "1 Entradas" (actual, `aria-current="step"`) — "2 Datos y pago" — "3 Confirmación" y "Compra segura"; "Volver al evento" (→ `/events/clasico-del-futbol-final-de-temporada`); miniatura, `h1` y "domingo 4 de octubre · Estadio Nacional, Lima".
- [ ] AC5 Mapa "Elige tu zona": "CAMPO DE JUEGO" en el centro, "Norte" arriba y "Sur" abajo a todo el ancho, "Occidente" a la izquierda y "Oriente" a la derecha. Oriente, Norte y Sur con los tonos 1, 2 y 3 y su precio; Occidente gris con "Agotado". Mismos colores en las muestras de la lista.
- [ ] AC6 Pulsar "Norte" en el mapa: `aria-pressed="true"` con anillo oscuro de 3 px, su fila de la lista se resalta y el total no cambia. Pulsar "Agregar una entrada de Sur" 2 veces: "Sur" pasa a ser la zona seleccionada (mapa y fila), "Tu compra" muestra "2 × Sur · $60" y "Total (2 entradas) $60".
- [ ] AC7 Con 6 entradas en una zona, su "+" queda `aria-disabled="true"`, no suma más y conserva el foco; con 0, su "−" está deshabilitado. Occidente muestra "Agotado" y no tiene stepper. Se lee "Máximo 6 entradas por zona.".
- [ ] AC8 Sin selección: "Tu compra" muestra el texto punteado exacto y "Continuar" está deshabilitado (`aria-disabled="true"`, no navega). Con selección, "Continuar" es un link cuyo `href` decodificado es `/events/clasico-del-futbol-final-de-temporada/checkout?tickets=evt-002-sur:2` (404 hasta la 010).
- [ ] AC9 `/events/noche-de-rock-sinfonico/tickets`: mapa "ESCENARIO" + "Platea" + "Mezzanine"; Platea con badge "Últimas entradas" en la lista; tras elegir entradas, "Continuar" apunta a `/events/noche-de-rock-sinfonico/seats?tickets=…` y se ve "En el siguiente paso eliges tus asientos.".
- [ ] AC10 `/events/risas-sin-filtro-stand-up/tickets`: no hay mapa, solo la lista (General, VIP). `/events/electro-night-sessions/tickets`: todas las zonas "Agotado" y "Continuar" deshabilitado.
- [ ] AC11 `/events/festival-sonidos-del-sur/tickets?tickets=evt-003-general:3` carga con 3 entradas General precargadas; `?tickets=evt-003-vip:2,xx:1,evt-003-general:abc` carga vacío (VIP agotado, id y cantidad inválidos ignorados); `/events/no-existe/tickets` muestra "No encontramos este evento" con respuesta 404.
- [ ] AC12 A 375 px: header de paso con "Volver al evento" (icono), "Paso 1 de 3", "Elige tus entradas" y barra de progreso al 33 %; franja del evento con "dom 4 oct · Estadio Nacional, Lima"; mapa compacto (laterales de 76 px, "Toca una zona"); steppers de 44 px; barra inferior "Total · N entradas" + importe + "Continuar", alto ≤ 80 px, que no tapa la nota final; `scroll-padding-bottom` del `<html>` = 96 px. Sin scroll horizontal.

**Accesibilidad y tema**
- [ ] AC13 Teclado: Tab recorre logo (o volver), zonas del mapa, steppers, "Continuar"; Enter/Espacio activan; foco visible en todos (incluidas zonas de color y botones oscuros). Cada stepper es un `role="group"` "Cantidad de {zona}" con botones "Quitar/Agregar una entrada de {zona}" de ≥ 44 px (40 px + borde y padding del grupo en desktop) y valor en `<output aria-live="polite">`; el total de la barra móvil se anuncia al cambiar.
- [ ] AC14 Claro y oscuro (inspector de contraste ≥ 4.5:1): textos sobre los 4 tonos de zona, zona agotada, escenario, nombres, "c/u", badge, "Agotado", total, "Continuar" habilitado. La consola no muestra errores ni warnings de hidratación.

## Tests obligatorios

- `src/modules/seating/services/seating.service.test.ts` — mapas para evt-001, 002, 003, 004 y 007 y `null` para el resto y para un id inexistente; en cada mapa, cada tipo de `getTicketTypes(eventId)` aparece una sola vez y no hay ids ajenos; `rows.length` ≥ mayor fila usada; áreas con formato válido (`/^\d+( \/ -?\d+)?$/`); copia profunda (mutar el resultado no afecta otra llamada).
- `src/modules/checkout/utils/ticket-selection.test.ts` — `setTicketQuantity`: fija, trunca `2.7` → 2, negativo → elimina, por encima de 6 → 6, 0 elimina la clave, tipo agotado → misma referencia, no muta; `getTotalQuantity`; `getSelectionLines` en orden de `ticketTypes`, ignora desconocidos; `getSelectionTotal` con decimales (3 × 19.99 = 59.97); `serializeTicketSelection` ordena según `ticketTypes`; `parseTicketSelection`: caso válido, array (toma el primero), ids desconocidos/agotados, `"x:abc"`, `"x:0"`, `"x:-1"`, `"x:2.5"`, `"x"` sin cantidad, repetidos (gana el primero), `"x:9"` → 6, `undefined` → `{}`; ida y vuelta `parse(serialize(s)) = s`; `buildPurchaseStepHref` con el ejemplo de C3 y vacía → sin `?`.
- `src/modules/events/utils/event-routes.test.ts` (añadir) — `getEventSeatsHref("x")` → `"/events/x/seats"`; `getEventCheckoutHref("x")` → `"/events/x/checkout"`.
- `src/modules/checkout/components/ticket-selection-view.test.tsx` (RTL + `user-event`; fixtures de evt-002 y evt-001 desde los mocks; mockear `next/image`):
  - Render inicial: zonas del mapa sin `aria-pressed="true"`, texto de vacío, "Continuar" con `aria-disabled="true"`.
  - Clic en la zona "Norte" → `aria-pressed="true"` y total sin cambios.
  - "Agregar una entrada de Sur" ×2 → "2 × Sur", total "$60", "Sur" con `aria-pressed="true"`, link "Continuar" con `tickets` = `"evt-002-sur:2"` y ruta `/checkout`.
  - 6 clics en "+" de una zona → "+" con `aria-disabled="true"` y un clic más no cambia el valor.
  - Occidente: texto "Agotado" y ningún grupo "Cantidad de Occidente".
  - Con evt-001 (`seatSelection: "seat"`) y una entrada → "Continuar" apunta a `/seats`.
  - `initialSelection` precargada se refleja en el stepper y el resumen.
- **Sin test propio:** `QuantityStepper`, `ZoneMap`, `TicketZoneList`, `OrderSummary`, `PurchaseFlowHeader`, `EventPurchaseSummary` (presentacionales, cubiertos por el test de la vista), tipos y mock (validados por el test del service), routing.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- Manual (`npm run dev`): AC4–AC14 en `/events/clasico-del-futbol-final-de-temporada/tickets`, `/events/noche-de-rock-sinfonico/tickets`, `/events/risas-sin-filtro-stand-up/tickets`, `/events/electro-night-sessions/tickets`, las URLs con `?tickets=` de AC11 y `/events/no-existe/tickets`, a 375, 768 y 1280 px, claro y oscuro; recorrido con Tab; inspector de contraste; consola.
