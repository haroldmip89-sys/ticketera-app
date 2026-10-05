# 011 — Confirmación de compra (paso 3, UI con datos mock)

- **Estado:** done (APPROVED por reviewer en iteración 1)
- **Modo:** SDD
- **Módulo(s):**
  - `src/modules/checkout` (extiende: estado de confirmación, vista, tarjeta de entrada y estado "No encontramos tu pedido");
  - `src/components/shared` (nuevo `DecorativeQr`);
  - `src/app/globals.css` (tokens `--success`);
  - `docs/design/design-system.md`.
  - Ruta nueva: `src/app/(purchase)/events/[slug]/confirmation/page.tsx`.
- **Depende de:** 010 en `done`. Consume sus contratos:
  - C1 (`checkout-order.ts`): `isOrderCode`, `ORDER_SEARCH_PARAM`, `getSubtotalCents`, `calculateOrderTotals`, `fromCents`, `OrderTotals`;
  - C3: `parseCompleteSeatSelection`, `formatSeatPosition`;
  - C4: `getEventConfirmationHref`;
  - formato de URL de `buildConfirmationHref`: `?order=TK-XXXXX&tickets=…[&seats=…]`.
- **Diseño fuente:** `docs/design/reference-design.md` §1 y §2.7, y los lienzos `Confirmation` / `ConfirmationMobile`, que se transcriben abajo porque la ruta original no es durable. System design: §5.4 (confirmación por webhook, futura) y §6.4 (`orders.code`, `tickets`).

## Objetivo

Crear `/events/[slug]/confirmation`, el paso 3 ("Confirmación") del flujo de compra, al que llega "Pagar" desde el checkout de la 010. Muestra:

- check de éxito y "¡Compra confirmada!";
- pedido `TK-XXXXX` y resumen del pedido (entradas, cargo por servicio, total pagado);
- **una tarjeta de entrada por unidad**, con QR decorativo y "Entrada N de M";
- las acciones de la referencia, con comportamiento mock definido;
- "Qué sigue" (3 tarjetas);
- stepper en el paso 3, con los conectores completados en índigo.

Sin backend: el estado llega por query params y se valida en el server. Si el pedido o la selección de la URL no son válidos, se muestra un estado "No encontramos tu pedido" (no se redirige). Debe verse bien en desktop y móvil, claro y oscuro, y el proyecto debe quedar en verde.

## Fuera de alcance

- Confirmación real por webhook de Stripe y el estado "Procesando tu pago" hasta `orders.status = 'paid'` (§5.4). Tampoco hay ruta por pedido real (p. ej. por `orders.code`), que llegará con backend.
- QR real (`tickets.qr_token`). El QR de esta fase es un patrón decorativo y **no** codifica nada.
- **Mis entradas (012)**, descarga de PDF y agregar al calendario reales. Hoy los tres botones solo informan (ver §Acciones).
- Correo de confirmación (Resend), reembolsos, transferencias y check-in.
- Mostrar nombre o email del comprador: no viajan en la URL (decisión de la 010) y los textos son genéricos.
- `round2` duplicado y botón "Agotado" duplicado (pendientes; ver la 010 y sus Preguntas abiertas).
- Ciudades y zona horaria de EE. UU. **Pendiente:** los mocks siguen con ciudades de Perú y `America/Lima` (system design §11).

## Precondiciones (bloqueantes)

- 010 en `done`: existen `checkout-order.ts`, `parseCompleteSeatSelection`, `formatSeatPosition` y `getEventConfirmationHref`, y el checkout navega a `/events/{slug}/confirmation?order=…&tickets=…[&seats=…]`.
- Sin dependencias npm nuevas.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `PurchaseFlowHeader` | extender | `src/modules/checkout/components/purchase-flow-header.tsx` | 1) Variante sin "volver" para el paso 3 (logo + "Paso 3 de 3" en móvil). 2) Conectores entre pasos completados en `bg-primary`, como en los lienzos de checkout y confirmación (hoy siempre `bg-input`). Los llamadores existentes no cambian. |
| `BrandLogo` | reutilizar | `src/components/shared/brand-logo.tsx` | `size="sm"` (32 px, 18 px de texto) coincide con el logo móvil del lienzo. |
| `checkout-order.ts` (010) | reutilizar | `src/modules/checkout/utils/checkout-order.ts` | `isOrderCode`, totales y `fromCents`. Sin cambios. |
| `parseTicketSelection`, `getSelectionLines`, `getTotalQuantity`, `TicketSelection` | reutilizar | `src/modules/checkout/utils/ticket-selection.ts` | |
| `parseCompleteSeatSelection`, `formatSeatPosition` (010) | reutilizar | `src/modules/seating/utils/seat-selection.ts` | |
| `eventsService`, `seatingService` | reutilizar | services | |
| `getEventTicketsHref` | no se usa | `src/modules/events/utils/event-routes.ts` | Una URL inválida ya no redirige a `/tickets` (decisión del usuario): muestra `ConfirmationNotFound`. |
| `formatPrice`, `formatDateLong` | reutilizar | `src/lib/format.ts` | |
| `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyDescription`, `EmptyContent` | reutilizar | `src/components/ui/empty.tsx` | Para `ConfirmationNotFound`, con la misma composición visual que `EventNotFound` y `ReservationExpired` (010). |
| `EventNotFound` | **no** reutilizar | `src/modules/events/components/event-not-found.tsx` | Textos y acciones fijos de "evento no encontrado" y un solo CTA. Sigue siendo el 404 cuando el evento no existe. Generalizarlo con props tocaría un componente de otro módulo con un solo consumidor nuevo (KISS). |
| `ConfirmationNotFound` | crear | `src/modules/checkout/components/confirmation-not-found.tsx` | Estado "No encontramos tu pedido". Server-compatible, sin props. |
| Estado de confirmación (parse + tarjetas por unidad) | crear | `src/modules/checkout/utils/order-confirmation.ts` | Nada equivalente. Separado de `checkout-order.ts`: es la lectura del pedido, no su creación (SRP). |
| `DecorativeQr` + `getDecorativeQrCells` | crear | `src/components/shared/decorative-qr.tsx` | No existe en shadcn ni en el proyecto. Es transversal y no tiene dominio: el design-system lo lista como recurrente y lo volverá a usar Mis entradas (012). Recibe solo un `seed`. |
| `ConfirmationTicketCard` | crear | `src/modules/checkout/components/confirmation-ticket-card.tsx` | La "perforación de ticket" de `EventCard` es otra composición. No hay tarjeta de entrada reutilizable. |
| `ConfirmationActions` | crear | `src/modules/checkout/components/confirmation-actions.tsx` | Client component (mensajes mock). |
| `ConfirmationView` | crear | `src/modules/checkout/components/confirmation-view.tsx` | Server-compatible: no necesita `"use client"`. |
| Tokens `--success` / `--success-foreground` | crear | `src/app/globals.css`, `docs/design/design-system.md` | El design-system §1.8/§7 los pospuso "hasta que haya un consumidor real": este es el primero (check de compra confirmada). |

## Contratos

### C1 — Estado de confirmación (`src/modules/checkout/utils/order-confirmation.ts`)

```ts
export type ConfirmationState = {
  orderCode: string                          // cumple ORDER_CODE_PATTERN
  selection: TicketSelection                 // no vacía
  seatSummary: SeatSelectionSummary | null   // completa en teatro; null en eventos por zona
}

type SearchParamValue = string | string[] | undefined

/** order: array → primer valor; si !isOrderCode → null.
 *  selection = parseTicketSelection(tickets, ticketTypes); vacía → null.
 *  seatMap !== null (evento de teatro): seatSummary = parseCompleteSeatSelection(seats, seatMap, selection, ticketTypes);
 *  si es null → null. seatMap === null (evento por zona): `seats` se ignora y seatSummary = null. */
export function parseConfirmationState(
  params: { order?: SearchParamValue; tickets?: SearchParamValue; seats?: SearchParamValue },
  ctx: { ticketTypes: readonly TicketType[]; seatMap: EventSeatMap | null }
): ConfirmationState | null

export type ConfirmationTicket = {
  key: string               // `${orderCode}-${position}` (único)
  position: number          // 1..total
  total: number             // cantidad de entradas del pedido
  ticketTypeName: string
  seatLabel: string | null  // formatSeatPosition(...) en teatro; null en zona
  unitPrice: number         // dólares (precio del tipo de entrada)
  qrSeed: number            // Number(dígitos del código) × 100 + position (determinista)
}

/** Una por unidad.
 *  Zona: por cada línea de getSelectionLines(selection, ticketTypes), en ese orden (precio ascendente), repetida `quantity` veces.
 *  Teatro: por cada zona de seatSummary.zones (orden del layout) y cada asiento en su orden; ticketTypeName = nombre del
 *  TicketType de zone.ticketTypeId; unitPrice = seat.price. */
export function buildConfirmationTickets(
  state: ConfirmationState,
  ticketTypes: readonly TicketType[]
): ConfirmationTicket[]

/** calculateOrderTotals(getSubtotalCents(getSelectionLines(state.selection, ticketTypes))). Mismo cálculo que el checkout. */
export function getConfirmationTotals(state: ConfirmationState, ticketTypes: readonly TicketType[]): OrderTotals
```

Ejemplo de referencia: evt-002 con `tickets=evt-002-sur:2,evt-002-oriente:1`. Da 3 entradas (Sur, Sur, Oriente) y un subtotal de 13000. El cargo es `1300 + 150 = 1450` y el total, 14450: se muestran "$14.50" y "$144.50".

### C2 — QR decorativo (`src/components/shared/decorative-qr.tsx`)

```ts
export const DECORATIVE_QR_SIZE = 21

/** 441 booleanos en orden fila por fila (índice = fila × 21 + columna; true = módulo oscuro).
 *  - Tres marcas de posición de 7×7 en las esquinas superior izquierda (0,0), superior derecha (0,14) e inferior
 *    izquierda (14,0): anillo exterior encendido, anillo interior apagado y núcleo 3×3 encendido.
 *  - Alrededor de cada marca, un separador de 1 módulo apagado (dentro de la grilla).
 *  - El resto, recorrido fila por fila, se rellena con el LCG del lienzo: x = (x × 9301 + 49297) % 233280, con x inicial
 *    = seed; se enciende si x / 233280 > 0.52. Determinista: el mismo seed da la misma grilla. */
export function getDecorativeQrCells(seed: number): boolean[]

export type DecorativeQrProps = { seed: number; className?: string }
/** <svg viewBox="0 0 21 21" aria-hidden="true" focusable="false" shape-rendering="crispEdges">: un fondo claro fijo
 *  (`fill-white`) y un <rect> 1×1 por módulo encendido (`fill-zinc-900`). El tamaño lo da className. */
export function DecorativeQr(props: DecorativeQrProps): React.JSX.Element
```

Los colores son **fijos en ambos temas** (claro sobre oscuro no se lee como QR). Es la misma excepción que el "escenario" de la 005: un objeto que imita algo físico. Se usan clases de la paleta de Tailwind, no hex.

### C3 — `PurchaseFlowHeader` (se extiende, compatible hacia atrás)

```ts
export type PurchaseFlowHeaderProps = { currentStep: PurchaseStep } & (
  | { backHref: string; backLabel: string; mobileTitle: string }          // pasos 1 y 2 (sin cambios para los llamadores)
  | { backHref?: undefined; backLabel?: undefined; mobileTitle?: undefined } // paso 3: sin "volver"
)
```

- **Conector** (la línea de 40 px entre pasos): `bg-primary` si el paso a su izquierda es `< currentStep`; si no, `bg-input`. En el paso 2 el primer conector queda índigo; en el paso 3, ambos.
- **Variante sin "volver":**
  - desktop: la columna derecha conserva `w-60` pero queda vacía, sin "Compra segura" (transcrito del lienzo);
  - móvil: fila `h-15 px-4 justify-between`, con un link `/` (`aria-label="Ticketera, ir al inicio"`, `focus-ring rounded-xl`, alto ≥ 44 px) que envuelve `BrandLogo size="sm"`, y a la derecha "Paso 3 de 3" en 12 px `text-muted-foreground`. Sin candado ni título. La barra de progreso de 3 px queda al 100 %.

### C4 — Componentes

```ts
// src/modules/checkout/components/confirmation-ticket-card.tsx
export type ConfirmationTicketCardProps = { event: EventItem; ticket: ConfirmationTicket }

// src/modules/checkout/components/confirmation-actions.tsx  ("use client")
export function ConfirmationActions(): React.JSX.Element   // sin props: todo mock

// src/modules/checkout/components/confirmation-view.tsx
export type ConfirmationViewProps = {
  event: EventItem
  orderCode: string
  tickets: ConfirmationTicket[]   // no vacío
  totals: OrderTotals
}

// src/modules/checkout/components/confirmation-not-found.tsx  (server-compatible)
/** Ruta prevista de Mis entradas (012). Hasta que exista, el link da 404 (se acepta, como entre 010 y 011). */
export const MY_TICKETS_HREF = "/my-tickets"
export function ConfirmationNotFound(): React.JSX.Element   // sin props
```

`ConfirmationNotFound` (estado de URL inválida):
- misma composición que `EventNotFound`: contenedor `mx-auto max-w-7xl px-4 py-16 md:py-24`, `Empty` en tarjeta `rounded-3xl border-[1.5px] border-dashed border-input bg-card`, tile de 56 px `rounded-2xl bg-primary/10 text-primary` con `TicketX` `aria-hidden`;
- único `h1` de la página: "No encontramos tu pedido";
- descripción: "El enlace de confirmación está incompleto o no es válido. Si ya compraste, tus entradas están en Mis entradas.";
- dos links, en este orden, en fila desde `sm` y apilados en móvil, cada uno de ≥ 44 px de alto con `focus-ring`:
  - "Mis entradas" → `MY_TICKETS_HREF` (`/my-tickets`), estilo primario (`bg-foreground text-background h-12 rounded-[14px] px-5 font-semibold`, como `EventNotFound`);
  - "Volver al inicio" → `/`, estilo outline (`border-[1.5px] border-input bg-card h-12 rounded-[14px] px-5 font-medium`).
- No muestra código de pedido, entradas ni datos de la URL.

### C5 — Página (`src/app/(purchase)/events/[slug]/confirmation/page.tsx`)

`PageProps<"/events/[slug]/confirmation">`, con `params` y `searchParams` como Promises (Next 16). Server Component que solo compone:

1. Si el evento no existe: `notFound()`.
2. Carga `ticketTypes` y, **solo si** `event.seatSelection === "seat"`, `seatMap = await seatingService.getSeatMap(event.id)`. Si un teatro no tiene `seatMap`, `notFound()`.
3. `state = parseConfirmationState({ order, tickets, seats }, { ticketTypes, seatMap })`. `null` cubre `order` que no cumple `isOrderCode` y una selección `tickets`/`seats` inválida para el evento.
4. Renderiza siempre `<PurchaseFlowHeader currentStep={3} />` y `<main className="flex-1 bg-secondary">` con:
   - si `state` es `null`: `<ConfirmationNotFound />`. **No** redirige ni llama `notFound()` (la respuesta es 200 con el estado de error). Un enlace inválido o manipulado no muestra una confirmación falsa;
   - si no: `<ConfirmationView event orderCode={state.orderCode} tickets={buildConfirmationTickets(state, ticketTypes)} totals={getConfirmationTotals(state, ticketTypes)} />`.
5. `generateMetadata`: `{}` si el evento no existe. Si existe, `robots: { index: false }` y `title` "Compra confirmada — {event.title}" con estado válido o "Pedido no encontrado — {event.title}" si `parseConfirmationState` da `null` (se repite el parse; es mock y barato).

## Especificación de la vista

### Estructura semántica

`ConfirmationView` contiene, en este orden:

1. Encabezado con un único `h1` "¡Compra confirmada!".
2. Resumen del pedido: `<dl>`.
3. `<section aria-labelledby>` con `h2` `sr-only` "Tus entradas" y `<ol>`: un `<li>` por entrada con su `ConfirmationTicketCard`.
4. `ConfirmationActions`.
5. `<section aria-labelledby>` "Qué sigue":
   - su `h2` es visible en móvil y `sr-only` desde `lg` (el lienzo desktop no lo muestra);
   - contiene un `<ol>` con 3 ítems.

Cada tarjeta es un `<article aria-label="Entrada {position} de {total}: {ticketTypeName}[, {seatLabel}]">`. El título del evento va como `<p>` y **no** como heading, para no repetir N headings iguales.

### Desktop (≥ lg), transcrito del lienzo `Confirmation` (1440 px)

Contenedor `mx-auto flex max-w-[55rem] flex-col items-center` (880 px), `pt-14 pb-18` (56 / 72 px), `gap-9` (36 px), sobre `bg-secondary`.

1. **Encabezado** (centrado, `gap-3.5`):
   - círculo de 76 px (`size-19`) `rounded-full bg-success text-success-foreground` con `CircleCheck` de 40 px `aria-hidden`;
   - `h1` 40 px / 1.1 / 700 / `tracking-[-0.025em]`;
   - párrafo 17 px / 1.55 `text-muted-foreground`, `max-w-[32.5rem]`: "Enviamos tus entradas a tu correo. También las tienes siempre en Mis entradas.";
   - pill `h-9 px-4 rounded-full border border-border bg-card`, 14 px `text-muted-foreground`: "Pedido N.º" + `<strong>` 600 `text-foreground` `tabular-nums` con el código, separado 6 px (`ml-1.5`);
   - debajo, en 13 px `text-muted-foreground`: "Modo demo: no se realizó ningún cargo ni se envió ningún correo.".
2. **Resumen del pedido** (criterio propio, ver abajo):
   - tarjeta `w-full rounded-[20px] border border-border bg-card px-7 py-4`, `<dl>` en grid de 3 columnas;
   - "Entradas" N | "Cargo por servicio" $Y | "Total pagado" $X;
   - `dt` 12 px `text-muted-foreground`, `dd` 16 px/600 `tabular-nums`.
3. **Tarjetas de entrada** (`<ol>` `w-full flex-col gap-4`). Cada `ConfirmationTicketCard`:
   - forma: `flex min-h-58` (232 px), `overflow-hidden rounded-3xl border border-border bg-card`;
   - imagen: `next/image` del evento, `alt=""`, ancho 200 px (`w-50`), alto completo, `object-cover`, `sizes="(min-width: 1024px) 200px, 100vw"`;
   - cuerpo (`flex-1 px-7 py-6.5 flex-col gap-2`):
     - eyebrow con la categoría: 12 px/600, `tracking-[0.06em]`, mayúsculas, `text-primary` (`event.category.label`);
     - título: 24 px/700 / 1.2 / `tracking-[-0.02em]`;
     - "{formatDateLong(startsAt)} · {venue.name}, {venue.city}": 15 px `text-muted-foreground`;
     - fila `mt-auto flex gap-7` (`<dl>`): "Zona" {ticketTypeName}; "Asiento" {seatLabel} (solo si no es `null`); "Precio" {formatPrice(unitPrice)}. Label 12 px `text-muted-foreground`, valor 16 px/600.
   - talón:
     - `relative w-55` (220 px), `shrink-0`, `flex-col items-center justify-center gap-2.5`, `border-l-[1.5px] border-dashed border-input`;
     - dos muescas `absolute -left-3 size-6 rounded-full border border-border bg-secondary`, una en `-top-3` y otra en `-bottom-3`;
     - `DecorativeQr` de 126 px (`size-[7.875rem]`) con `seed={ticket.qrSeed}`;
     - "Entrada {position} de {total}" en 13 px `text-muted-foreground`.
4. **Acciones** (`ConfirmationActions`): fila centrada, `gap-3`. Ver §Acciones.
5. **Qué sigue:**
   - `<ol>` `w-full mt-3 grid grid-cols-3 gap-4`;
   - cada ítem: `p-5 flex-col gap-2.5 rounded-[20px] border border-border bg-card`;
   - tile de 44 px (`size-11`) `rounded-[14px] bg-primary/10 text-primary` con icono de 20 px;
   - título 16 px/600; descripción 14 px / 1.5 `text-muted-foreground`.

### Móvil (< lg), transcrito del lienzo `ConfirmationMobile` (390 px)

- **Header:** variante sin "volver" (C3).
- **Contenedor:** `px-4 pt-7 pb-9` (28 / 36 px), `gap-6` (24 px).
- **Encabezado:** `gap-3`, círculo de 64 px (`size-16`) con icono de 34 px, `h1` 28 px / 1.15, párrafo 15 px / 1.55, pill `h-8.5 px-3.5` 13 px y la misma nota demo.
- **Resumen del pedido:** igual que en desktop, `px-5`; `dt` 11 px, `dd` 14 px.
- **Tarjeta de entrada** (`flex-col`, `rounded-3xl`):
  - imagen de ancho completo y 130 px de alto (`h-32.5`);
  - cuerpo `px-5 py-4.5 gap-1.5`: eyebrow 11 px, título 20 px, fecha · lugar 14 px; fila `mt-2 grid grid-cols-3 gap-2` con label 11 px y valor 14 px;
  - perforación horizontal: `relative border-t-[1.5px] border-dashed border-input` con muescas de 24 px en `-top-3 -left-3` y `-top-3 -right-3`;
  - talón `p-5.5 flex-col items-center gap-2.5`: QR de 168 px (`size-42`) y "Entrada N de M" 13 px.
- **Acciones:** columna `gap-2.5`: el botón primario de ancho completo y, debajo, un grid de 2 columnas (`gap-2.5`) con los dos outline.
- **Qué sigue:**
  - `h2` visible 18 px/600;
  - `<ol>` `flex-col gap-2.5`;
  - ítems `px-4 py-3.5 flex-row items-center gap-3.5 rounded-[18px]`, tile de 40 px (`size-10`) `rounded-xl` con icono de 19 px, título 15 px/600 y descripción 13 px / 1.45.

### Acciones (mock)

Los tres son `<button type="button">`. Escriben en **un** párrafo `role="status" aria-live="polite"` debajo de las acciones (14 px `text-muted-foreground`, centrado; vacío al cargar):

| Botón | Estilo desktop / móvil | Mensaje al pulsar |
|---|---|---|
| "Ver mis entradas" + `ArrowRight` de 18 px | `h-13.5 px-6.5 rounded-2xl bg-primary text-primary-foreground text-base font-semibold focus-ring` / ancho completo | "Mis entradas estará disponible pronto. Por ahora, tus entradas están en esta página." |
| `CalendarPlus` + "Agregar al calendario" (móvil: "Calendario") | `h-13.5 px-5.5 rounded-2xl border-[1.5px] border-input bg-card text-[0.9375rem] font-medium focus-ring` / `h-12.5 rounded-[14px] text-sm` | "Agregar al calendario estará disponible pronto." |
| `Download` + "Descargar PDF" | igual que el anterior | "La descarga en PDF estará disponible pronto." |

- El texto corto en móvil usa dos `span` responsive. El nombre accesible siempre contiene la palabra visible ("calendario"), lo que cumple WCAG 2.5.3.
- No llevan `aria-disabled`: funcionan e informan.

### Qué sigue (textos)

| Icono | Título | Descripción |
|---|---|---|
| `Mail` | Revisa tu correo | Ahí llegan tus entradas y el comprobante de pago. |
| `QrCode` | Muestra tu QR | Cada entrada tiene su propio QR. Muéstralo desde tu celular en el ingreso. |
| `Ticket` | Todo en Mis entradas | Entra con tu cuenta para ver y descargar tus entradas cuando quieras. |

Se usan los textos de desktop también en móvil: el lienzo móvil solo los acorta.

## Tokens `--success` (`src/app/globals.css` y `docs/design/design-system.md`)

| Token | Claro | Oscuro |
|---|---|---|
| `--success` | `oklch(0.962 0.044 156.743)` (`#DCFCE7`) | `oklch(0.266 0.065 152.934)` (`#052E16`) |
| `--success-foreground` | `oklch(0.527 0.154 150.069)` (`#15803D`) | `oklch(0.871 0.15 154.449)` (`#86EFAC`) |

- Mapeo en `@theme inline`: `--color-success: var(--success)` y `--color-success-foreground: var(--success-foreground)`, junto a los de `--urgent`.
- Contraste verificado: claro 4.6:1, oscuro 10.6:1 (≥ 4.5:1, aunque aquí solo se usa en un icono, que exige ≥ 3:1).
- `design-system.md`:
  - agregar §2.3.5 "Éxito (spec 011)" con esta tabla y su uso (check de compra confirmada; después, el estado "Válida" de Mis entradas);
  - sumar la fila de contraste a §2.5;
  - actualizar la línea **Estado** del encabezado.
- Tolerancia de verificación: ±2 por canal RGB.

## Transcrito del diseño vs. criterio propio

**Transcrito del lienzo:**
- header del paso 3: el desktop sin "Compra segura" y el móvil con logo y "Paso 3 de 3";
- círculo verde con check;
- `h1`, subtítulo y pill "Pedido N.º" con sus medidas;
- tarjeta de entrada: 880 × 232 px, imagen de 200 px, eyebrow, título, fecha · lugar, fila de datos, perforación vertical con muescas, QR de 126 px y "Entrada N de M";
- versión móvil apilada: imagen de 130 px, perforación horizontal y QR de 168 px;
- acciones con sus estilos;
- "Qué sigue" con 3 tarjetas, iconos y textos;
- `h2` "Qué sigue" visible solo en móvil;
- algoritmo del QR decorativo (LCG, umbral 0.52, tres marcas).

**Criterio propio:**
- **Una tarjeta por unidad** (pedido explícito; el lienzo muestra una sola con "Entrada 1 de 2"). Por eso la fila de cada tarjeta pasa de "Zona / Entradas / Total pagado" a "Zona / Asiento (teatro) / Precio", y los datos del pedido van a un **resumen** aparte ("Entradas / Cargo por servicio / Total pagado"), que además muestra el cargo por servicio exigido por el system design.
- Acciones solo informativas.
- Nota "Modo demo".
- QR en SVG con colores fijos.
- `article` con `aria-label` y título de evento no-heading.
- Estado "No encontramos tu pedido" (con "Mis entradas" y "Volver al inicio") ante una URL inválida, en lugar de redirigir (decisión del usuario; el lienzo no lo dibuja). El evento inexistente sigue en 404.
- `robots: noindex`.

## Supuestos mock

- **Sin orden real:** la página **confía** en `?order=` si tiene el formato `TK-` + 5 dígitos. El mismo enlace muestra la misma confirmación siempre, y cualquiera que arme una URL válida "ve" una confirmación. Se acepta en mock. En el futuro la página leerá `orders` y `tickets` por código o id, y mostrará "Procesando tu pago" hasta `paid` (§5.4).
- **Estado entre pasos:** solo `order`, `tickets` y `seats`. Sin PII: los textos no nombran al comprador ni su correo.
- **QR:** `qrSeed` sale del código y de la posición. No es un `qr_token`, no se escanea y no identifica nada.
- **Recarga:** recargar la confirmación la vuelve a mostrar igual. "Atrás" vuelve al paso anterior al checkout, porque la 010 navega con `replace`.

## Tareas

### Preparación (serie, en este orden)

- **P1** Tokens de éxito. Archivos: `src/app/globals.css` y `docs/design/design-system.md`.
- **P2** Header del flujo, variante sin volver y conectores, con test. Archivos: `src/modules/checkout/components/purchase-flow-header.tsx` y `src/modules/checkout/components/purchase-flow-header.test.tsx`.
- **P3** Contratos con tests. Archivos: `src/modules/checkout/utils/order-confirmation.ts`, `src/modules/checkout/utils/order-confirmation.test.ts`, `src/components/shared/decorative-qr.tsx` y `src/components/shared/decorative-qr.test.tsx`.

### Paralelo (archivos disjuntos; nadie corre `npm install` ni `npm run build`)

- **T1** Tarjeta de entrada. Archivos: `src/modules/checkout/components/confirmation-ticket-card.tsx`.
- **T2** Acciones mock. Archivos: `src/modules/checkout/components/confirmation-actions.tsx`.
- **T3** Estado "No encontramos tu pedido". Archivos: `src/modules/checkout/components/confirmation-not-found.tsx` (su test va en el de I1).

### Integración (serie)

- **I1** Vista, ruta y test. Archivos: `src/modules/checkout/components/confirmation-view.tsx`, `src/modules/checkout/components/confirmation-view.test.tsx` y `src/app/(purchase)/events/[slug]/confirmation/page.tsx`.

**Tamaño:** 14 archivos (4 tests y 1 doc).

## Criterios de aceptación

**Flujo y validación**
- [ ] AC1 Desde el checkout de la 010 con 2 × Sur (evt-002), pagar con datos válidos lleva a `/events/clasico-del-futbol-final-de-temporada/confirmation?order=TK-NNNNN&tickets=evt-002-sur%3A2`. La página muestra el mismo `TK-NNNNN`, 2 tarjetas y "Total pagado" $67.50, igual que el total del checkout.
- [ ] AC2 Con `order` ausente o inválido ("TK-123", "tk-12345", "TK-123456"), con `tickets` ausente, vacío o solo con zonas agotadas, o en un teatro con `seats` ausente, incompleto o con un asiento vendido: la URL **no cambia** (sin redirect) y se ve, bajo el header del paso 3, el estado con el `h1` "No encontramos tu pedido", su descripción y los links "Mis entradas" (→ `/my-tickets`, que da 404 hasta la 012) y "Volver al inicio" (→ `/`). No aparecen "¡Compra confirmada!", código de pedido, tarjetas de entrada ni acciones. El título de la pestaña es "Pedido no encontrado — {título del evento}".
- [ ] AC3 Un slug inexistente da la página 404 (también si los params serían inválidos).
- [ ] AC4 En un evento por zona, un `seats` presente se ignora.

**Contenido**
- [ ] AC5 Con `?order=TK-24817&tickets=evt-002-sur:2,evt-002-oriente:1`:
  - se ven "¡Compra confirmada!" (único `h1`) y "Pedido N.º TK-24817";
  - el resumen dice Entradas 3, Cargo por servicio $14.50 y Total pagado $144.50;
  - la lista "Tus entradas" tiene 3 tarjetas, en orden Sur, Sur, Oriente, con "Entrada 1 de 3", "Entrada 2 de 3" y "Entrada 3 de 3".
- [ ] AC6 Teatro (evt-001, 2 × Platea con 2 asientos válidos): 2 tarjetas con "Zona Platea", "Asiento Fila X, asiento N" (los dos asientos, en orden) y el precio unitario. En eventos por zona no aparece "Asiento".
- [ ] AC7 Cada tarjeta muestra la imagen del evento, la categoría en mayúsculas, el título, "{fecha larga} · {lugar}, {ciudad}", un QR decorativo (`aria-hidden`) y "Entrada N de M". Los QR de entradas distintas se ven distintos.
- [ ] AC8 Pulsar "Ver mis entradas", "Agregar al calendario" o "Descargar PDF" escribe su mensaje de la tabla en la región `role="status"`. No navega ni descarga nada.
- [ ] AC9 "Qué sigue" muestra 3 tarjetas con los títulos y descripciones de la tabla.
- [ ] AC10 Se ve la nota "Modo demo: no se realizó ningún cargo ni se envió ningún correo.". No aparecen el nombre ni el email del comprador.

**Header**
- [ ] AC11 Stepper desktop en el paso 3: "Confirmación" con `aria-current="step"`, los pasos 1 y 2 con check índigo, los dos conectores en índigo y sin "Compra segura".
- [ ] AC12 En el checkout (paso 2), el primer conector es índigo y el segundo gris. En `/tickets` y `/seats` (paso 1), los dos son grises.
- [ ] AC13 Header móvil del paso 3: logo (link al inicio, ≥ 44 px) y "Paso 3 de 3", sin botón volver; barra de progreso al 100 %. El header de los pasos 1 y 2 no cambia.

**Layout, temas y accesibilidad**
- [ ] AC14 Desktop (1440 px): columna centrada de 880 px, tarjetas horizontales de ≥ 232 px de alto con el talón a la derecha, acciones en una fila y "Qué sigue" en 3 columnas.
- [ ] AC15 Móvil (390 px): tarjetas verticales (imagen de 130 px arriba y QR de 168 px abajo, con perforación horizontal), botón primario a lo ancho, outline en 2 columnas y "Qué sigue" en lista con su `h2` visible. Todos los botones miden ≥ 44 px.
- [ ] AC16 En claro y oscuro: el círculo usa `bg-success text-success-foreground` y el QR se ve oscuro sobre claro en ambos temas. Fuera de las clases de paleta del QR (C2), no hay hex literales ni clases de paleta.
- [ ] AC17 Cada tarjeta es un `article` cuyo nombre accesible es "Entrada N de M: {zona}[, {asiento}]". El foco es visible en los botones y en el logo.
- [ ] AC18 Estado "No encontramos tu pedido": en móvil (390 px) los dos links se apilan y miden ≥ 44 px; desde `sm` van en fila. Ambos muestran foco visible. Es legible en claro y oscuro, sin hex literales.

## Tests obligatorios

- `src/modules/checkout/utils/order-confirmation.test.ts`:
  - `parseConfirmationState`:
    - válido en zona, con `seats` presente que se ignora;
    - `order` ausente, "TK-123", "tk-12345" o "TK-123456" → `null`;
    - `order` array → usa el primer valor;
    - `tickets` vacío o solo agotado → `null`;
    - teatro con `seats` completo → `seatSummary.isComplete`;
    - teatro con `seats` incompleto, vendido o ausente → `null`.
  - `buildConfirmationTickets`:
    - zona `sur:2, oriente:1` → 3 entradas, en orden Sur, Sur, Oriente, con `position` 1..3, `total` 3, `seatLabel` `null`, `unitPrice` 30/30/70;
    - `key` únicas;
    - `qrSeed` determinista y distinto por posición;
    - teatro → `seatLabel` "Fila …, asiento …" en el orden del resumen, con el nombre del `TicketType`.
  - `getConfirmationTotals`: el caso de referencia da `{ 13000, 1450, 14450 }`, igual a `calculateOrderTotals(getSubtotalCents(lines))`.
- `src/components/shared/decorative-qr.test.tsx`:
  - `getDecorativeQrCells`:
    - devuelve 441 celdas;
    - el mismo seed da la misma grilla y seeds distintos dan grillas distintas;
    - marcas: (0,0), (0,6), (6,0), (2,2) y (4,4) encendidas; (1,1) y (1,5) apagadas; separador (7,0)…(7,7) y (0,7) apagado; lo mismo en la marca superior derecha ((0,14) encendida, (0,13) apagada) y en la inferior izquierda ((14,0) encendida, (13,0) apagada).
  - Render: un `svg` con `aria-hidden="true"`, `viewBox="0 0 21 21"` y tantos `rect` de módulo como celdas encendidas (más el fondo).
- `src/modules/checkout/components/purchase-flow-header.test.tsx`:
  - paso 2 con back: "Datos y pago" con `aria-current="step"`; el link "Volver a Entradas" apunta al `backHref`; el primer conector es índigo y el segundo no (por clase o `data-*`, a elección del developer, que debe documentarlo en el test); aparece "Compra segura".
  - paso 3 sin back: no hay link con nombre "Volver…"; hay un link "Ticketera, ir al inicio" que apunta a `/`; "Paso 3 de 3"; no aparece "Compra segura".
- `src/modules/checkout/components/confirmation-view.test.tsx` (RTL; mockear `next/image` como en los tests existentes):
  1. Caso de referencia (AC5): `h1`, código, resumen ($14.50 y $144.50), 3 `article` dentro de la lista "Tus entradas" con sus nombres accesibles, "Entrada 1 de 3"…"3 de 3", 3 QR `aria-hidden` y 3 ítems en "Qué sigue".
  2. Teatro: aparecen "Asiento" y "Fila …, asiento …".
  3. Pulsar "Agregar al calendario" muestra su mensaje en `role="status"`; pulsar "Descargar PDF" lo reemplaza por el suyo.
  4. `ConfirmationNotFound`: único `h1` "No encontramos tu pedido"; la descripción; link "Mis entradas" con `href` `/my-tickets` (= `MY_TICKETS_HREF`) y link "Volver al inicio" con `href` `/`, en ese orden; no hay `article` ni `role="status"`.
- Tests existentes en verde **sin cambios**: los de la 010 (`checkout-view.test.tsx`, etc.) y los de la 007 y la 008. `PurchaseFlowHeader` mantiene sus props para los pasos 1 y 2.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- **Manual** (`npm run dev`), en desktop 1440 px y móvil 390 px, claro y oscuro:
  - flujo completo por zona: `/events/clasico-del-futbol-final-de-temporada/tickets` → 2 Sur → checkout → pagar con tarjeta 4242… → confirmación (AC1, AC5, AC11, AC14, AC15);
  - flujo de teatro: `/events/noche-de-rock-sinfonico/tickets` → Platea 2 → asientos → checkout → pagar (AC6);
  - abrir `/events/clasico-del-futbol-final-de-temporada/confirmation?order=TK-24817&tickets=evt-002-sur:2,evt-002-oriente:1` (AC5);
  - probar URLs inválidas: estado "No encontramos tu pedido" sin cambio de URL (AC2, AC18), y un slug inexistente da 404 (AC3);
  - pulsar las tres acciones (AC8);
  - teclado: Tab por el logo y las acciones, con foco visible;
  - "atrás" del navegador desde la confirmación no vuelve al checkout.

## Preguntas abiertas

1. **Acciones mock:** ¿se aceptan los mensajes "disponible pronto" de los tres botones? Alternativas de bajo costo:
   - "Agregar al calendario" genera y descarga un `.ics` real del lado del cliente (util puro + test, +2 archivos);
   - "Ver mis entradas" lleva a una ruta futura `/my-tickets`, que daría 404 hasta la 012.
2. **URL inválida:** resuelta. Estado "No encontramos tu pedido" con "Mis entradas" (`/my-tickets`, ruta prevista de la 012) y "Volver al inicio"; sin redirect. Evento inexistente: 404.
3. **Tarjeta por unidad:** ¿se acepta la fila "Zona / Asiento / Precio" por tarjeta, con el total y el cargo por servicio en el resumen del pedido aparte (desviación del lienzo, que tiene una sola tarjeta con "Total pagado")?
4. **Ruta:** ¿se confirma `/events/[slug]/confirmation` (fijada en la 010, C4) hasta que haya backend?
