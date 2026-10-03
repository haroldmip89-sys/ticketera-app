# 006 — Detalle de evento `/events/[slug]`

- **Estado:** done (APPROVED por reviewer en iteración 2)
- **Modo:** SDD
- **Módulo(s):** `src/modules/events` (extiende el módulo de la 003). Transversal: `src/lib/format.ts` (`formatTime`), `src/components/ui` (shadcn `breadcrumb`), `src/app/globals.css` (tokens de zona y contrato de barra inferior), `src/app/(site)/events/[slug]/` (routing).
- **Depende de:** 003, 004 y 005 implementadas y en verde. Consume: tokens y `focus-ring` (003), `--site-header-height` y el grupo `(site)` (004), `--stage*`, `formatDateLong`, `withImageWidth` y `getEventTicketsHref` (005).
- **Diseño fuente:** `docs/design/reference-design.md` §2.4 (`EventDetail`, `EventDetailMobile`) y §3.3. Esta spec antes era la `005-event-detail.md`; se renumeró al separar el Hero en la 005.

**Roadmap:** 003 paleta + events + descubrimiento · 004 shell · 005 Hero · **006 detalle (esta)** · 007 selección por zonas · 008 mapa de teatro · 009 búsqueda · 010 checkout + confirmación · 011 login/registro · 012 Mis entradas · 013 panel de organizador · 014 crear evento.

## Objetivo

Crear la página de detalle de los 10 eventos según la referencia: hero en panel partido (oscuro + imagen) con CTA "Comprar entradas · desde $X", guardar y compartir; "Acerca del evento", "Información importante" (puertas, inicio, edad, ingreso), "Lugar" con "Cómo llegar"; panel "Entradas" con la lista de zonas, su color, precio y estado, y el CTA "Elegir entradas" hacia el paso 1 de la compra; relacionados; barra de compra fija en móvil; `generateStaticParams`, `generateMetadata` y not-found. **La cantidad ya no se elige aquí** (referencia): todos los CTAs llevan a `/events/[slug]/tickets` (007). Fija los contratos `TicketType`, `eventsService.getTicketTypes`, `getRelated` y los tonos de zona, que consumen 007 y 008.

## Fuera de alcance

- **007**: la página `/events/[slug]/tickets` (selección por zona y cantidad). Hasta entonces, los CTAs de compra dan 404 (aceptado).
- **008**: mapa de asientos de teatro. **009**: búsqueda (destino real del breadcrumb de categoría y de "Ver más …"; mientras tanto apuntan a `/#eventos`). **010**: checkout.
- Persistencia de "Guardar evento" (es estado local; Mis entradas/cuenta es la 012).
- Mapa real del lugar: se muestra un panel referencial (D6).
- Zod, React Query, Zustand: no hacen falta.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `Button` / `buttonVariants` | reutilizar | `src/components/ui/button.tsx` | Guardar/compartir, CTAs deshabilitados. |
| `Badge`, `Empty` | reutilizar (003) | `src/components/ui/*` | Badge "Últimas"; not-found. |
| `breadcrumb` (shadcn) | agregar de shadcn | `src/components/ui/breadcrumb.tsx` | `npx shadcn@latest add breadcrumb` (base-nova: `BreadcrumbLink` con `render`). Sin editar. |
| `SectionHeader` (003) | reutilizar | `src/components/shared/section-header.tsx` | "También te puede interesar" + "Ver más …". |
| `EventCard` (003) | **extender** | `src/modules/events/components/event-card.tsx` | Prop nueva `variant?: "ticket" \| "compact"` (default `"ticket"`, salida actual sin cambios). Relacionados usan `"compact"`. |
| `EventItem`, `EventAvailability`, `eventsService` | reutilizar / extender | `src/modules/events/**` | Se añaden `TicketType`, `getTicketTypes`, `getRelated`. Los campos `doorsOpenAt`, `minAge` y `venue.address` ya existen (003). |
| `formatPrice`, `formatDateLong`, `withImageWidth` | reutilizar | `src/lib/*` | |
| `formatTime` | extender | `src/lib/format.ts` (+ test) | "8:00 p. m.". La reutiliza la 010. |
| `getEventHref`, `getEventTicketsHref` | reutilizar | `src/modules/events/utils/event-routes.ts` | |
| `getVenueDirectionsUrl` | extender | `src/modules/events/utils/event-routes.ts` (+ test nuevo) | URL de Google Maps para "Cómo llegar". |
| `getZoneTones` | crear | `src/modules/events/utils/zone-tones.ts` (+ test) | Color de cada zona derivado del precio (no es dato de dominio). Lo reutilizan 007 y 008. |
| `TICKET_TYPES_MOCK` | crear | `src/modules/events/data/ticket-types.mock.ts` | Solo lo importa el service. |
| `EventDetailHero` | crear | `src/modules/events/components/event-detail-hero.tsx` | Server: panel partido + fila de acciones móvil. |
| `EventActions` | crear | `src/modules/events/components/event-actions.tsx` (+ test) | Client: guardar y compartir. |
| `EventInfoSections` | crear | `src/modules/events/components/event-info-sections.tsx` | Acerca, Información importante, Lugar. |
| `EventTicketsPanel` | crear | `src/modules/events/components/event-tickets-panel.tsx` (+ test) | Lista de zonas + CTA. |
| `PurchaseBar` | crear | `src/modules/events/components/purchase-bar.tsx` | Barra fija móvil. |
| `EventDetailView` | crear | `src/modules/events/components/event-detail-view.tsx` | Server async: compone la página y los relacionados. |
| `EventNotFound` | crear | `src/modules/events/components/event-not-found.tsx` | |
| Routing | crear | `src/app/(site)/events/[slug]/page.tsx`, `not-found.tsx` | Solo routing. |
| `QuantityStepper`, `ticket-selection.ts`, `buildCheckoutHref` (versión anterior de esta spec) | **retirados de esta spec** | — | La cantidad se elige en la 007, que los define allí. |

**Recuento de archivos de producción:** 17 (1 generado por la CLI, 2 de routing de pocas líneas, 4 extensiones de archivos existentes). Pasa la guía de ~8: la pantalla de la referencia tiene 6 bloques (hero, 3 secciones, panel, relacionados) más la barra móvil, y separarla dejaría una página de detalle sin su acción de compra. Las tareas paralelas tienen 1–3 archivos.

## Contratos

### C1 — Tokens (P1, `src/app/globals.css`)

**Tonos de zona** (colores del mapa y de la lista de la referencia), iguales en claro y oscuro porque cada uno trae su propio color de texto (D4):

| Token | Valor | `-foreground` | Contraste |
|---|---|---|---|
| `--zone-1` | `#4F46E5` | `#FFFFFF` | 6.3:1 |
| `--zone-2` | `#818CF8` | `#1E1B4B` | 5.4:1 |
| `--zone-3` | `#A5B4FC` | `#1E1B4B` | 8.0:1 |
| `--zone-4` | `#C7D2FE` | `#1E1B4B` | 10.7:1 |

Zona agotada: tokens existentes `bg-muted text-muted-foreground` (sin token nuevo). Mapeos `@theme inline` `--color-zone-1` … `--color-zone-4-foreground`.

**Barra de acción inferior en móvil** (primer consumidor: `PurchaseBar`; también la 007 y la 008):

```css
:root { --mobile-action-bar-height: 5rem; } /* alto máximo de una barra inferior fija (< lg) */
@media (width < 64rem) {
  html:has([data-mobile-action-bar]) { scroll-padding-bottom: calc(var(--mobile-action-bar-height) + 1rem); }
}
```
Contrato: la raíz de toda barra inferior lleva `data-mobile-action-bar` y su alto (safe-area incluida) no supera `--mobile-action-bar-height`. Así ningún elemento enfocado queda oculto bajo la barra (WCAG 2.4.11) sin compensaciones locales.

### C2 — Tipos y mock

```ts
// src/modules/events/types/event.types.ts (se añade)
/** Tipo de entrada = zona del recinto (modelo de la referencia: zona + precio + estado). */
export type TicketType = {
  id: string                       // `${eventId}-${zona}`, p. ej. "evt-001-platea"
  eventId: string
  name: string                     // visible en español
  price: number                    // formatPrice
  availability: EventAvailability  // "available" | "last-tickets" | "sold-out"
}

// src/modules/events/data/ticket-types.mock.ts
export const TICKET_TYPES_MOCK: readonly TicketType[]
```

Orden del array = orden de la tabla (precio ascendente; en empate, el de la tabla).

| id | eventId | name | price | availability |
|---|---|---|---|---|
| `evt-001-mezzanine` | evt-001 | Mezzanine | 45 | available |
| `evt-001-platea` | evt-001 | Platea | 85 | last-tickets |
| `evt-002-norte` | evt-002 | Norte | 30 | available |
| `evt-002-sur` | evt-002 | Sur | 30 | available |
| `evt-002-oriente` | evt-002 | Oriente | 70 | available |
| `evt-002-occidente` | evt-002 | Occidente | 95 | sold-out |
| `evt-003-general` | evt-003 | General | 60 | last-tickets |
| `evt-003-vip` | evt-003 | VIP | 150 | sold-out |
| `evt-004-mezzanine` | evt-004 | Mezzanine | 35 | available |
| `evt-004-platea` | evt-004 | Platea | 55 | available |
| `evt-005-general` | evt-005 | General | 25 | available |
| `evt-005-vip` | evt-005 | VIP | 45 | available |
| `evt-006-general` | evt-006 | General | 40 | sold-out |
| `evt-006-vip` | evt-006 | VIP | 90 | sold-out |
| `evt-007-platea-alta` | evt-007 | Platea alta | 55 | available |
| `evt-007-platea-baja` | evt-007 | Platea baja | 95 | available |
| `evt-007-campo` | evt-007 | Campo | 130 | available |
| `evt-008-general` | evt-008 | General | 38 | available |
| `evt-008-vip` | evt-008 | VIP | 75 | available |
| `evt-009-general` | evt-009 | General | 20 | available |
| `evt-009-preferencial` | evt-009 | Preferencial | 35 | available |
| `evt-010-general` | evt-010 | General | 15 | available |
| `evt-010-visita-guiada` | evt-010 | Visita guiada | 25 | available |

Total **23**. Invariantes (verificados por test):
- Cada evento tiene ≥ 2 tipos y `EventItem.priceFrom === min(price)` de sus tipos.
- `EventItem.availability` coincide con la derivada de sus tipos: `"sold-out"` si todos están agotados; si no, `"last-tickets"` si alguno lo está; si no, `"available"`.
- Teatros (evt-001, evt-004, `seatSelection: "seat"`): exactamente `platea` y `mezzanine`. Contrato con el layout de asientos de la 008.

### C3 — Service (se añade a `eventsService`)

```ts
/** Tipos del evento por price ascendente (empates: orden del mock). Id inexistente → []. Array nuevo. */
getTicketTypes(eventId: string): Promise<TicketType[]>
/** Eventos próximos (getUpcoming()) sin el actual: primero misma categoría y luego el resto, cada grupo por startsAt. Corta en limit (4). Id inexistente → []. */
getRelated(eventId: string, limit?: number): Promise<EventItem[]>
```
Resultado esperado de `getRelated`: evt-001 → [evt-006, evt-007, evt-008, evt-002]; evt-004 → [evt-001, evt-002, evt-003, evt-005]; evt-010 → [evt-001, evt-002, evt-003, evt-004].

### C4 — Tonos de zona (`src/modules/events/utils/zone-tones.ts`)

```ts
export type ZoneTone = 1 | 2 | 3 | 4
/** Asigna tono a cada tipo no agotado por precio DEScendente (empate: orden recibido): 1, 2, 3, 4, 4, 4…
 *  Agotados → null. Clave: TicketType.id. */
export function getZoneTones(ticketTypes: readonly TicketType[]): ReadonlyMap<string, ZoneTone | null>
/** Clases estáticas completas (para que Tailwind las detecte). null → "bg-muted text-muted-foreground". */
export function getZoneToneClassName(tone: ZoneTone | null): string
```
Reproduce la referencia: la zona disponible más cara es `#4F46E5` y las siguientes van aclarando; las agotadas son grises. Ejemplo evt-002: Occidente → null, Oriente → 1, Norte → 2, Sur → 3.

### C5 — Formato y rutas

```ts
// src/lib/format.ts (se añade)
/** "8:00 p. m." en APP_TIME_ZONE (12 h; 00:00 → "12:00 a. m."; 12:00 → "12:00 p. m."). */
export function formatTime(value: string | Date): string

// src/modules/events/utils/event-routes.ts (se añade)
/** "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${name}, ${address}, ${city}`) */
export function getVenueDirectionsUrl(venue: Venue): string
```

### C6 — Componentes

```ts
// event-detail-hero.tsx (server)
export type EventDetailHeroProps = { event: EventItem }
// event-actions.tsx ("use client")
export type EventActionsProps = { title: string; tone: "stage" | "default"; className?: string }
// event-info-sections.tsx (server)
export type EventInfoSectionsProps = { event: EventItem }
// event-tickets-panel.tsx (server)
export type EventTicketsPanelProps = { event: EventItem; ticketTypes: TicketType[] }
// purchase-bar.tsx (server)
export type PurchaseBarProps = { event: EventItem }
// event-detail-view.tsx (server async)
export type EventDetailViewProps = { event: EventItem }
//   const [ticketTypes, related] = await Promise.all([getTicketTypes(event.id), getRelated(event.id)])
// event-not-found.tsx (server, sin props)
// event-card.tsx (se extiende)
export type EventCardProps = { event: EventItem; variant?: "ticket" | "compact"; className?: string }
```

CTA de compra según disponibilidad (en hero, panel y barra): `availability !== "sold-out"` → `next/link` a `getEventTicketsHref(slug)`; `"sold-out"` → `Button disabled focusableWhenDisabled` con texto **"Agotado"** (`aria-disabled="true"`, `bg-muted text-muted-foreground`, no navega).

### C7 — Routing (`src/app/(site)/events/[slug]/`)

```ts
// page.tsx
export async function generateStaticParams(): Promise<{ slug: string }[]>   // los 10 slugs
export async function generateMetadata(props: PageProps<"/events/[slug]">): Promise<Metadata>
//   inexistente → notFound(); si no → { title: `${title} — Ticketera`, description }
export default async function EventPage(props: PageProps<"/events/[slug]">): Promise<JSX.Element>
//   const { slug } = await props.params; getBySlug → notFound() o <EventDetailView event={event} />
// not-found.tsx
export default function NotFound(): JSX.Element   // <EventNotFound />
```
`params` es una `Promise` (Next 16). `dynamicParams` por defecto (`true`).

## Especificación visual

**Transcrito de la referencia** (`EventDetail` 1440 px y `EventDetailMobile` 390 px): estructura, copy, medidas, colores, orden de secciones en móvil, lista de zonas con color/estado, ausencia de steppers, relacionados compactos y barra fija. **Criterio propio**: breakpoint `lg`, contenido de los placeholders de la referencia (`[HORA]`, `[EDAD]`, `[DIRECCIÓN]`, `[MAPA DEL LUGAR]`, descripción), comportamiento de compartir, estado agotado y lo marcado con D.

### Estructura (`EventDetailView`)
Raíz `<div>` sin `overflow` distinto de `visible` (requisito de la barra sticky), con, en orden:
1. **Fila de acciones móvil** (`lg:hidden`, `mx-auto max-w-7xl px-2 sm:px-4 h-16 flex items-center justify-between`): link "Volver a eventos" (icono `ArrowLeft` 22 px, `aria-label="Volver a eventos"`, `size-11 focus-ring rounded-xl`, `href="/#eventos"`) + `<EventActions tone="default" />`. Parte de `EventDetailHero`.
2. **Breadcrumb** (`hidden lg:block`, `mx-auto max-w-7xl px-8 pt-6 pb-5`): `Breadcrumb` `aria-label="Ruta"` con separador "/": "Inicio" → `/`; `{category.label}` → `/#eventos` (D7); `{title}` como `BreadcrumbPage` (`aria-current="page"`, `font-medium text-foreground`). Texto `text-sm text-muted-foreground`.
3. **Hero** (`EventDetailHero`), contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8`:
   - Bloque `overflow-hidden rounded-[28px] lg:rounded-[32px] bg-stage text-stage-foreground`; `< lg` `flex flex-col` con imagen arriba; `≥ lg` `grid h-115 grid-cols-[33.75rem_minmax(0,1fr)]` (460 px; panel de 540 px; imagen a la derecha).
   - Imagen `relative h-55 lg:h-auto` (220 px en móvil), `next/image` `fill object-cover`, `src={withImageWidth(imageUrl, 1600)}`, `alt={imageAlt}`, `sizes="(min-width: 1280px) 740px, (min-width: 1024px) 55vw, 100vw"`, `loading="eager"`, `fetchPriority="high"` (LCP).
   - Panel `flex flex-col p-5.5 lg:px-12 lg:py-11`:
     - Pill de categoría `h-7 lg:h-8 w-fit px-3.5 rounded-full border border-white/28 text-[13px] font-medium`.
     - `<h1>` `mt-4 lg:mt-6 text-[1.75rem] leading-[1.15] lg:text-[2.875rem] lg:leading-[1.08] font-bold tracking-[-0.025em] text-balance`.
     - `<ul>` `mt-4 lg:mt-5 flex flex-col gap-2 lg:gap-2.5 text-sm lg:text-base text-stage-muted`, iconos 18 px `aria-hidden`: `Calendar` + `<time dateTime={startsAt}>{formatDateLong(startsAt)}</time>`; `Clock` + `formatTime(startsAt)`; `MapPin` + `"{venue.name}, {venue.city}"`.
     - Solo `≥ lg`: espaciador `flex-1` y fila `flex items-center gap-2.5`: CTA **"Comprar entradas · desde {formatPrice(priceFrom)}"** (`flex-1 h-13.5 rounded-2xl bg-cta text-cta-foreground hover:bg-cta-hover text-base font-semibold focus-ring`; agotado → C6) + `<EventActions tone="stage" />`.
4. **Cuerpo** `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-12 lg:pt-14 lg:pb-18`: `flex flex-col gap-10` en móvil y `lg:grid lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-x-14 lg:gap-y-12 lg:items-start`. DOM (= orden móvil de la referencia): "Acerca del evento" → "Información importante" → `EventTicketsPanel` → "Lugar". En `lg` las 3 secciones van en la columna 1 (`lg:col-start-1`) y el panel en la columna 2 (`lg:col-start-2 lg:row-start-1 lg:row-span-3`, `lg:sticky lg:top-[calc(var(--site-header-height)+1rem)]`).
5. **Relacionados** (si hay): `<section aria-labelledby="related-events-title">` a todo el ancho con `bg-secondary`, contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 lg:pt-16 lg:pb-20 flex flex-col gap-5 lg:gap-7`. `SectionHeader` `title="También te puede interesar"` y `action={{ href: "/#eventos", label: "Ver más " + category.label.toLowerCase(), className: "hidden lg:inline-flex" }}` (oculto por debajo de `lg`, como la referencia). Lista: `< lg` scroll horizontal `-mx-4 flex gap-3 overflow-x-auto snap-x snap-mandatory px-4` con tarjetas `w-62.5 shrink-0 snap-start` (250 px); `≥ lg` `grid grid-cols-4 gap-6`. `EventCard variant="compact"`.
6. `<PurchaseBar />` como último hijo de la raíz.

### `EventActions`
- Dos `<button type="button">`: **"Guardar evento"** (`aria-pressed`, `Heart`, relleno `fill-current` cuando está activo) y **"Compartir evento"** (`Share2`). Iconos 20 px `aria-hidden`.
- `tone="stage"`: `size-13.5 rounded-2xl border-[1.5px] border-white/40 text-white hover:bg-white/10`, activo `bg-white/15`. `tone="default"`: `size-11 rounded-xl hover:bg-muted`, activo `text-primary`. Ambos `focus-ring`.
- Compartir: si existe `navigator.share` → `navigator.share({ title, url: window.location.href })` (un `AbortError` se ignora); si no, si existe `navigator.clipboard.writeText` → copia la URL y muestra **"Enlace copiado"**; si no hay ninguno o falla → **"No se pudo compartir el enlace"**. El mensaje va en un `<p role="status">` visible (`text-xs`, debajo del grupo) y se borra a los 3 s.
- "Guardar" es estado local (no persiste, D8).

### `EventInfoSections`
- **Acerca del evento**: `<section aria-labelledby>` con `<h2>` (`text-xl lg:text-2xl font-bold tracking-[-0.02em]`) y `<p>` con `description` (`mt-3 lg:mt-4 text-[0.9375rem] lg:text-base leading-[1.65] text-muted-foreground max-w-prose`). Sin la caja punteada de la referencia (era un placeholder, D6).
- **Información importante**: `<h2>` + `<dl className="mt-3 lg:mt-4 grid grid-cols-2 gap-3 lg:gap-4">`. Cada ítem `flex flex-col lg:flex-row lg:items-center gap-3 lg:gap-3.5 rounded-[18px] border border-border p-4 lg:px-5 lg:py-4.5`: tile `size-11 rounded-[14px] bg-primary/10 text-primary` con icono `aria-hidden`, y `<dt>` (`text-[13px] text-muted-foreground`) + `<dd>` (`text-base font-semibold`):
  - `DoorOpen` **"Apertura de puertas"** → `formatTime(doorsOpenAt)`.
  - `Clock` **"Inicio del show"** → `formatTime(startsAt)`.
  - `IdCard` **"Edad mínima"** → `minAge` ? **"Mayores de {minAge} años"** : **"Todo público"**.
  - `QrCode` **"Ingreso"** → **"Entrada digital con QR"**.
- **Lugar**: `<h2>` + tarjeta `mt-3 lg:mt-4 overflow-hidden rounded-[22px] border border-border`:
  - Panel referencial `h-40 lg:h-60 flex flex-col items-center justify-center gap-2.5 bg-primary/10 text-primary` con `MapPin` 28 px y **"Mapa referencial"** (`text-sm font-semibold`), todo `aria-hidden` (D6).
  - Fila `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 px-5 py-4 lg:px-6 lg:py-5`: `venue.name` (`text-[1.0625rem] font-semibold`) + `"{venue.address}, {venue.city}"` (`text-sm text-muted-foreground`); link **"Cómo llegar"** a `getVenueDirectionsUrl(venue)` con `target="_blank" rel="noopener noreferrer"`, texto sr-only " (se abre en una pestaña nueva)", `h-11 px-4 inline-flex items-center rounded-xl border-[1.5px] border-foreground text-sm font-semibold focus-ring`.

### `EventTicketsPanel`
- `<section aria-labelledby="tickets-title">`; en `lg`: `rounded-3xl border border-border bg-card p-7 shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)] flex flex-col gap-5`.
- `<h2 id="tickets-title">` **"Entradas"** visible en móvil (estilo de h2 de sección) y `lg:sr-only`.
- Solo `lg`: "Entradas desde" (`text-[13px] text-muted-foreground`) + `formatPrice(priceFrom)` (`text-[1.875rem] font-bold tracking-[-0.02em] text-price`).
- `<ul>` `border-t border-border` (móvil `mt-3`); un `li` por `TicketType` en el orden recibido, `min-h-14 flex items-center justify-between gap-3 border-b border-border`:
  - Izquierda `flex items-center gap-2.5`: muestra `size-3 rounded-[4px]` con `getZoneToneClassName(tone)` (`aria-hidden`); `name` (`text-[0.9375rem] font-medium`; agotado `text-muted-foreground`); si `last-tickets`, `Badge` **"Últimas"** `h-6 gap-1 px-2 rounded-full bg-urgent text-urgent-foreground text-[11px] font-semibold` + `Clock` 12 px.
  - Derecha: `formatPrice(price)` (`text-[0.9375rem] font-semibold`) o **"Agotado"** (`text-sm font-semibold text-muted-foreground`).
- Solo `lg`: CTA **"Elegir entradas"** + `ArrowRight` (`h-14 rounded-2xl bg-cta text-cta-foreground hover:bg-cta-hover text-base font-semibold focus-ring`; agotado → C6) y nota `flex items-center justify-center gap-2 text-[13px] text-muted-foreground` con `Lock` 16 px + **"Pago seguro · Entrada digital con QR"**.

### `PurchaseBar` (`< lg`)
- `<div role="region" aria-label="Compra rápida" data-mobile-action-bar className="sticky bottom-0 z-40 lg:hidden border-t border-border bg-background shadow-[0_-12px_24px_-18px_rgb(24_24_27/0.35)]">`; interior `mx-auto max-w-7xl flex items-center justify-between gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6`.
- Izquierda: "Desde" (`text-xs text-muted-foreground`) + `formatPrice(priceFrom)` (`text-[1.375rem] font-bold tracking-[-0.02em] text-price`).
- Derecha: **"Comprar entradas"** + `ArrowRight` (`h-13 px-5 rounded-[15px] bg-cta text-cta-foreground text-[0.9375rem] font-semibold focus-ring`; agotado → C6).
- Alto: borde 1 + 12 + 52 + 12 = **77 px ≤ 80 px**.

### `EventCard variant="compact"`
Siempre vertical: imagen `h-42.5` (170 px) con el badge de fecha; cuerpo `px-5 pt-4.5 pb-5 flex flex-col gap-2`: eyebrow, título (2 líneas), `"{venue.name} · {venue.city}"` (`text-sm text-muted-foreground truncate`) y "Desde" + precio (`text-lg font-bold text-price`). Sin perforación, sin badge de estado y sin indicador "Ver entradas" (referencia). Mismo link estirado y hover que la variante `"ticket"`.

### `EventNotFound`
`mx-auto max-w-7xl px-4 py-16 md:py-24`, `Empty` `rounded-3xl border-[1.5px] border-dashed border-input bg-card`: tile `size-14 rounded-2xl bg-primary/10 text-primary` con `TicketX`; **`h1`** "No encontramos este evento"; "Puede que el enlace esté mal escrito o que el evento ya no esté disponible."; link **"Volver al inicio"** a `/` (`h-12 rounded-[14px] px-5 bg-foreground text-background font-semibold focus-ring`).

### Responsive

| Ancho | Orden |
|---|---|
| 375 px | header del sitio → fila "Volver a eventos" + guardar/compartir → hero apilado (imagen 220 px, panel sin CTA) → Acerca → Información (2×2) → Entradas (lista) → Lugar → relacionados en scroll horizontal → barra fija "Desde $X" + "Comprar entradas" |
| 768 px | igual que 375 px |
| 1280 px | breadcrumb → hero partido de 460 px con CTA, guardar y compartir → grid: [Acerca, Información, Lugar] \| [panel "Entradas" de 400 px sticky] → relacionados en 4 columnas; sin barra ni fila de acciones móvil |

**Headings:** `h1` título → `h2` Acerca del evento → `h2` Información importante → `h2` Entradas → `h2` Lugar → `h2` También te puede interesar → `h3` por tarjeta.

## Decisiones propias (no validadas) vs. validadas

**Validadas por el usuario o la referencia:** layout y copy de la referencia; sin selector de cantidad en el detalle; CTA naranja para comprar; `$`; nombres ficticios; modelo híbrido (el detalle lleva siempre al paso de zonas).

**Decisiones propias:**
- **D1** — Zonas y precios ficticios del mock (C2). Estados elegidos para que se vean los tres en la demo (Occidente y VIP agotados, Platea y General de evt-003 "Últimas") y respeten el estado del evento de la 003.
- **D2** — `TicketType` sin `description` (la referencia no la muestra; YAGNI) y con `availability`.
- **D3** — Estado agotado del evento (evt-006): los tres CTAs pasan a "Agotado" deshabilitado y enfocable; la referencia no define esta variante.
- **D4** — El color de zona **no** es dato de dominio: `getZoneTones` lo deriva del precio, que reproduce exactamente la asignación de la referencia. Tokens iguales en ambos temas porque cada uno lleva su color de texto.
- **D5** — Móvil: se conserva el header global del sitio y se agrega debajo una fila "Volver a eventos" + guardar + compartir, en lugar de sustituir el header como hace la referencia móvil (consistencia de navegación y menos variantes de header).
- **D6** — Placeholders de la referencia: la descripción va sin caja punteada; el mapa es un panel decorativo "Mapa referencial" (no hay API de mapas); `[HORA]` = `formatTime`, `[EDAD]` = "Mayores de N años"/"Todo público", `[DIRECCIÓN]` = `venue.address`.
- **D7** — El breadcrumb de categoría y "Ver más …" apuntan a `/#eventos` hasta que exista la búsqueda (009), en lugar de un link muerto.
- **D8** — "Guardar evento" no persiste (sin cuenta ni backend). Compartir usa la Web Share API con respaldo de portapapeles.
- **D9** — "Cómo llegar" abre Google Maps con una búsqueda por texto (sin API key).
- **D10** — Barra móvil `sticky bottom-0` como último hijo (no `fixed`): nunca tapa el footer y no necesita padding compensatorio.

## Tareas

### Preparación (serie)
- **P1** Tokens, contrato de barra y documentación — archivos: `src/app/globals.css` (C1), `docs/design/design-system.md` (tonos de zona, regla de color de zona derivado del precio, contrato `data-mobile-action-bar`).
- **P2** Breadcrumb de shadcn — archivos: `src/components/ui/breadcrumb.tsx` (`npx shadcn@latest add breadcrumb`; si la CLI toca `package.json`/lock, entran aquí).
- **P3** Formato, contratos, mock, service, rutas y tonos con tests — archivos: `src/lib/format.ts`, `src/lib/format.test.ts`, `src/modules/events/types/event.types.ts`, `src/modules/events/data/ticket-types.mock.ts`, `src/modules/events/services/events.service.ts`, `src/modules/events/services/events.service.test.ts`, `src/modules/events/utils/event-routes.ts`, `src/modules/events/utils/event-routes.test.ts`, `src/modules/events/utils/zone-tones.ts`, `src/modules/events/utils/zone-tones.test.ts`.

### Paralelo (archivos disjuntos)
- **T1** Hero y acciones con test — archivos: `src/modules/events/components/event-detail-hero.tsx`, `src/modules/events/components/event-actions.tsx`, `src/modules/events/components/event-actions.test.tsx`.
- **T2** Panel de entradas (con test) y barra móvil — archivos: `src/modules/events/components/event-tickets-panel.tsx`, `src/modules/events/components/event-tickets-panel.test.tsx`, `src/modules/events/components/purchase-bar.tsx`.
- **T3** Secciones informativas — archivos: `src/modules/events/components/event-info-sections.tsx`.
- **T4** Variante compacta de la tarjeta y not-found del módulo — archivos: `src/modules/events/components/event-card.tsx`, `src/modules/events/components/event-not-found.tsx`.

Durante el bloque paralelo nadie ejecuta `npm install` ni `npm run build`.

### Integración (serie)
- **I1** Vista y routing — archivos: `src/modules/events/components/event-detail-view.tsx`, `src/app/(site)/events/[slug]/page.tsx`, `src/app/(site)/events/[slug]/not-found.tsx`.

## Criterios de aceptación

**Calidad**
- [ ] AC1 `npm run lint`, `npm run test` y `npm run build` pasan; el build lista `/events/[slug]` como SSG (●).
- [ ] AC2 Exports según C2–C7. Grep: `ticket-types.mock` y `events.mock` solo se importan en `events.service.ts`; los archivos de `src/app/(site)/events/[slug]/` solo componen `EventDetailView`/`EventNotFound`.
- [ ] AC3 Grep: ningún archivo de esta spec contiene `top-16`, `top-20`, `64px` ni `76px` como altura del header; el panel sticky usa `var(--site-header-height)`. La raíz de `PurchaseBar` tiene `data-mobile-action-bar`.
- [ ] AC4 `EventCard` sin `variant` produce la misma salida que antes (test de la 003 en verde).

**Datos**
- [ ] AC5 `TICKET_TYPES_MOCK` tiene las 23 filas de C2 y cumple sus invariantes (cubierto por test).
- [ ] AC6 `getRelated` devuelve los conjuntos de C3; `getZoneTones` de evt-002 da Oriente 1, Norte 2, Sur 3 y Occidente `null` (tests).

**Página (manual)**
- [ ] AC7 `/events/noche-de-rock-sinfonico` a 1280 px: breadcrumb "Inicio / Conciertos / Noche de Rock Sinfónico"; hero partido de 460 px con pill "Conciertos", `h1`, "sábado 3 de octubre", "8:00 p. m.", "Teatro Municipal, Lima", CTA naranja "Comprar entradas · desde $45" a `/events/noche-de-rock-sinfonico/tickets`, "Guardar evento" y "Compartir evento"; imagen a la derecha.
- [ ] AC8 Secciones: "Acerca del evento" con la descripción del mock; "Información importante" con "Apertura de puertas 6:30 p. m.", "Inicio del show 8:00 p. m.", "Edad mínima Mayores de 12 años", "Ingreso Entrada digital con QR"; "Lugar" con "Teatro Municipal", "Jr. Las Artes 377, Cercado de Lima, Lima" y "Cómo llegar" (abre Google Maps en otra pestaña).
- [ ] AC9 Panel "Entradas" (derecha, sticky bajo el header al hacer scroll): "Entradas desde $45", filas "Mezzanine $45" (muestra `--zone-2`) y "Platea" con badge "Últimas" y "$85" (muestra `--zone-1`), CTA "Elegir entradas" a `/tickets` y "Pago seguro · Entrada digital con QR".
- [ ] AC10 `/events/clasico-del-futbol-final-de-temporada`: "Occidente" con muestra gris, nombre en gris y "Agotado"; Oriente, Norte y Sur con los tonos 1, 2 y 3. `/events/electro-night-sessions`: los tres CTAs muestran "Agotado" con `aria-disabled="true"` y no navegan; la página de un evento con `minAge: null` muestra "Todo público".
- [ ] AC11 "Guardar evento" alterna `aria-pressed` y el relleno del corazón. "Compartir evento" en un navegador sin Web Share copia la URL y muestra "Enlace copiado".
- [ ] AC12 Relacionados: en `/events/noche-de-rock-sinfonico` 4 tarjetas compactas (Electro Night Sessions, Pop en Vivo, Jazz al Atardecer, Clásico del Fútbol) sobre `bg-secondary`, con el link "Ver más conciertos" (desde 1024 px) a `/#eventos`.
- [ ] AC13 A 375 px: orden de la tabla Responsive; fila "Volver a eventos" + guardar + compartir; hero apilado sin CTA; Información en 2×2; relacionados con scroll horizontal (250 px); barra "Compra rápida" fija abajo con "Desde $45" y "Comprar entradas", de alto ≤ 80 px; al final de la página la barra no tapa ni las tarjetas ni el footer; `scroll-padding-bottom` computado del `<html>` = 96 px (a 1280 px, `auto`). Sin scroll horizontal de página.
- [ ] AC14 Los 10 slugs abren sin errores; la pestaña dice "{título} — Ticketera". `/events/no-existe` muestra "No encontramos este evento" dentro del header y footer del sitio, con respuesta 404.

**Accesibilidad y tema**
- [ ] AC15 Teclado: Tab recorre breadcrumb (o "Volver a eventos"), CTA del hero, guardar, compartir, "Cómo llegar", CTA del panel, tarjetas relacionadas y CTA de la barra, con foco visible (también sobre el panel oscuro). Ningún elemento enfocado queda oculto bajo la barra móvil ni bajo el header.
- [ ] AC16 Claro y oscuro, con inspector de contraste (≥ 4.5:1): textos del hero, metadatos, `dt`/`dd`, nombres y precios de zonas, "Agotado", badge "Últimas", "Entradas desde" y precio, CTAs naranjas, texto de la barra. La consola no muestra errores ni warnings de hidratación.

## Tests obligatorios

- `src/lib/format.test.ts` (añadir) — `formatTime`: 20:00 → `"8:00 p. m."`; 19:30 → `"7:30 p. m."`; mediodía → `"12:00 p. m."`; medianoche → `"12:00 a. m."`; `"2026-10-04T01:00:00Z"` → `"8:00 p. m."` (zona).
- `src/modules/events/services/events.service.test.ts` (añadir) — 23 tipos con ids únicos y prefijo `${eventId}-`; por evento ≥ 2 tipos, `min(price) === priceFrom` y disponibilidad derivada = `availability` del evento; teatros con exactamente `platea` y `mezzanine`; `getTicketTypes("evt-002")` → [norte, sur, oriente, occidente] (empate estable); inexistente → `[]`; mutar el resultado no afecta otra llamada; `getRelated` con los 3 casos de C3, con `limit` 2, nunca incluye el propio evento, inexistente → `[]`.
- `src/modules/events/utils/zone-tones.test.ts` — evt-002 (caso de C4); 6 tipos disponibles → tonos 1, 2, 3, 4, 4, 4; empate de precio conserva el orden; todos agotados → todos `null`; `getZoneToneClassName` devuelve la clase de cada tono y la de agotado.
- `src/modules/events/utils/event-routes.test.ts` — `getEventHref("x")` → `"/events/x"`; `getEventTicketsHref("x")` → `"/events/x/tickets"`; `getVenueDirectionsUrl` codifica comas, espacios y tildes (`new URL(...).searchParams.get("query")` = `"Teatro Municipal, Jr. Las Artes 377, Cercado de Lima, Lima"`).
- `src/modules/events/components/event-actions.test.tsx` (RTL + `user-event`) — "Guardar evento" alterna `aria-pressed`; con `navigator.share` mockeado se llama con `{ title, url }`; sin `share` y con `clipboard.writeText` mockeado → se llama y aparece "Enlace copiado"; sin ninguno → "No se pudo compartir el enlace".
- `src/modules/events/components/event-tickets-panel.test.tsx` (RTL) — con evt-002: 4 filas en orden, "Occidente" con "Agotado" y sin precio, Oriente "$70"; con evt-001: badge "Últimas" en Platea; CTA "Elegir entradas" con `href="/events/<slug>/tickets"`; con evt-006: CTA "Agotado" con `aria-disabled="true"` y sin `href`.
- **Sin test propio:** `EventDetailHero`, `EventInfoSections`, `PurchaseBar`, `EventCard` compacta, `EventNotFound` (presentacionales), `EventDetailView` (composición), mock (validado por el service), routing.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (AC1: `/events/[slug]` como ●)
- Manual (`npm run dev`): AC7–AC16 en `/events/noche-de-rock-sinfonico`, `/events/clasico-del-futbol-final-de-temporada`, `/events/electro-night-sessions` y `/events/no-existe` (Network: 404), a 375, 768 y 1280 px, claro y oscuro; recorrido con Tab; inspector de contraste; valores computados de `scroll-padding-bottom`; consola.
