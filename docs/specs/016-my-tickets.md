# 016 — Mis entradas (pedidos y entradas del usuario, datos mock)

- **Estado:** draft
- **Modo:** SDD
- **Módulo(s):**
  - `src/modules/tickets` (**módulo nuevo**, plural: colección de entradas; nombre del System Design §3.2): types, data mock, utils puros, service y componentes de Mis entradas.
  - `src/modules/checkout` (extiende): `order-confirmation.ts` expone la numeración de entradas; hook nuevo `useTicketDownloads`, extraído de `ConfirmationActions`; "Ver mis entradas" pasa a ser un link a `/my-tickets`.
  - `src/components/ui/tabs.tsx` (shadcn, nuevo).
  - Ruta: `src/app/(site)/my-tickets/page.tsx` (reemplaza el placeholder de la 013).
  - `docs/design/design-system.md`: solo se corrige la referencia "Mis entradas (013)" de §2.3.5.
- **Depende de:** 001–012 `done` y **013, 014 y 015 en `done` antes de implementar** (hoy están en `draft`). Consume:
  - **013:** `MY_TICKETS_PATH` (`src/lib/auth/auth-routes.ts`); `src/proxy.ts` ya exige sesión en `/my-tickets`; el placeholder `src/app/(site)/my-tickets/page.tsx` (C12); el header con sesión ("Mi cuenta" y el link "Mis entradas" con `aria-current`), que no se toca.
  - **015:** `requireUser(options?) → { userId }` (`src/lib/auth/guards.ts`).
  - **Clerk:** `currentUser()` de `@clerk/nextjs/server` (necesita `CLERK_SECRET_KEY`, ya exigida por la 015).
  - **011/012:** `ConfirmationTicket` y `buildConfirmationTickets` (`order-confirmation.ts`), `DecorativeQr`, `ConfirmationActions`, `buildTicketPdfPages`, `getTicketPdfFileName`, `generateTicketPdf`, `buildEventCalendar`, `getCalendarFileName`, `CALENDAR_MIME_TYPE`, `downloadBlob`.
  - **events / seating / lib:** `eventsService` (`getAll`, `getTicketTypes`, `getReferenceDate`), `getEventsSearchHref`, `formatSeatPosition`, `formatDateBadge`, `formatDateShort`, `formatDateLong`, `formatTime`, `isOrderCode`, `Empty*`, `Button`, `focus-ring`, token `--success-foreground`.
- **Roadmap:** 013 Auth base · 014 Registro y recuperación · 015 Roles y alta de organizador · **016 Mis entradas (esta)** · 017 Panel de organizador · 018 Crear evento.
- **Diseño fuente:** `docs/design/reference-design.md` §2.9 (y §2.7 para coherencia con la confirmación), y los lienzos `MyTickets` / `MyTicketsMobile`. La ruta original no es durable, así que lo necesario se transcribe en la sección "Diseño". System Design: §3.2 (dominios), §5.4 (las entradas nacen al confirmarse el pago), §6.3 (`ticket_status`), §6.4 (`orders`, `tickets.holder_user_id`) y §6.5 (Mis entradas lee `tickets`, `orders` y `events`).

## Objetivo

Reemplazar el placeholder de `/my-tickets` por la pantalla real de **Mis entradas**, en desktop y móvil, con datos mock:

- pestañas **Próximas | Pasadas**, separadas por la fecha del evento respecto de "ahora";
- lista de pedidos del usuario;
- la entrada seleccionada del pedido, con QR decorativo, "Entrada N de M" y anterior/siguiente;
- Zona, Titular (nombre del usuario de Clerk), Código y Estado;
- "Descargar PDF" y "Agregar al calendario" reales, reutilizando la 012;
- estado vacío de "Pasadas".

Además, "Ver mis entradas" de la confirmación deja de ser un mensaje mock y navega a `/my-tickets`. El proyecto queda en verde.

## Fuera de alcance

- **Persistencia.** No hay base: los pedidos son un mock fijo, el mismo para cualquier usuario con sesión. Una compra hecha en el checkout **no** aparece en Mis entradas. Por eso "Ver mis entradas" no puede preseleccionar el pedido recién creado: su código es aleatorio y no existe en el mock (ver D6). Llegará con `orders`/`tickets` (System Design §5.4 y §6.4).
- **Deep link a un pedido** (`/my-tickets?order=…` o `/my-tickets/[code]`). Se suma cuando existan pedidos persistidos (D5).
- Transferencias (§5.7), reembolsos (§5.6), check-in (§5.8) y el QR real (`tickets.qr_token`). El QR sigue siendo el patrón decorativo de la 011.
- Estados "Usada" y "Anulada" con datos reales. El tipo y sus textos existen (D8), pero todas las entradas del mock son `valid`.
- PDF de una sola entrada. "Descargar PDF" descarga el pedido completo, igual que en la confirmación (D9).
- Paginación o búsqueda de pedidos.
- El header con sesión: lo resuelven 013 y 015 y no se modifica.
- Ciudades y zona horaria de EE. UU. Los mocks siguen con Perú y `America/Lima` (System Design §11).

## Decisiones (criterio propio, revisables al aprobar)

- **D1 — Módulo `src/modules/tickets`.** La pantalla lista entradas cuyo titular es el usuario (`tickets.holder_user_id`, índice "Mis entradas" en §6.4), agrupadas por pedido. Es el dominio `tickets` del System Design §3.2. No se crea `orders`: hoy no hay lógica de pedidos propia (YAGNI). El tipo `UserOrder` vive en `tickets` como "agrupación de entradas del usuario".
- **D2 — Los pedidos mock guardan unidades, no query strings.** Cada registro lista sus entradas (`ticketTypeId` y, en teatro, `{ rowLabel, number }`). No se reconstruyen con `parseConfirmationState`: en teatro, ese parser descarta los asientos que figuran como vendidos en `seat-maps.mock.ts`, y los asientos comprados son justamente vendidos. Para no duplicar la numeración (`key`, `position`, `total`, `qrSeed`), `order-confirmation.ts` expone `createConfirmationTickets`, y `buildConfirmationTickets` pasa a delegar en ella. Así, la entrada de un pedido mock es **idéntica** a la que mostraría la confirmación de ese mismo pedido (mismo QR).
- **D3 — "Ahora" = `eventsService.getReferenceDate()`** (`MOCK_REFERENCE_DATE`, 2026-10-02), el mismo "hoy" de la landing y de la búsqueda. Todos los eventos del mock son posteriores, así que **"Pasadas" queda vacía**: se ve el estado vacío del diseño, que el lienzo también muestra en 0. No se agrega un evento pasado a `EVENTS_MOCK`, porque cambiaría la landing, la búsqueda, los relacionados y sus tests. Las dos ramas (Pasadas con y sin pedidos) se prueban con fecha inyectada (`splitOrdersByEventDate`, test del service y test de la vista).
  - Criterio: un pedido es "próximo" si `startsAt >= now` (inclusivo, igual que `getUpcoming`) y "pasado" si `startsAt < now`.
  - Orden: Próximas por `startsAt` ascendente; Pasadas por `startsAt` descendente (la más reciente primero).
- **D4 — Titular desde el servidor.** La página llama `requireUser({ returnTo: MY_TICKETS_PATH })` (defensa en profundidad además del proxy; 015 lo exige para páginas con datos del usuario) y luego `currentUser()`.
  - El nombre se resuelve con `getHolderName`: `fullName` → email principal → "Sin nombre".
  - Se elige servidor y no `useUser()` para que el `dl` no parpadee con un placeholder. La página ya es dinámica por `requireUser()`.
  - Costo: una llamada al Backend API de Clerk por request, la misma que ya usan los guards de la 015.
  - El nombre del mock (`buyer_name`) no se usa: el titular es el usuario, no el comprador.
- **D5 — Selección en estado local, no en la query.** Pestaña, pedido y entrada viven en `useState`. Motivos:
  1. Con `?order=` en la URL, cada clic navegaría y re-renderizaría la página de servidor, que llama `requireUser()` y `currentUser()` (Backend API) en cada cambio.
  2. Hoy no hay un enlace entrante que la use (D6).
  3. Es estado efímero de UI.

  Al cambiar de pedido, la entrada vuelve a la 1 (`TicketDetail` con `key={orderCode}`).
- **D6 — "Ver mis entradas" → `/my-tickets`, sin preselección.** El código del pedido recién comprado es aleatorio (`createMockOrderCode`) y no está en el mock. Para no confundir, Mis entradas muestra una nota de modo demo (criterio propio): "Modo demo: estas entradas son de ejemplo. Tus compras todavía no se guardan aquí."
- **D7 — Patrones accesibles.**
  - **Próximas | Pasadas** usa `Tabs` de shadcn (Base UI): `role="tablist"`/`tab`/`tabpanel`, `aria-selected`, flechas entre pestañas y activación con Enter/Espacio (`activateOnFocus` en su default `false`). Se aparta del lienzo, que usa botones `aria-pressed`: el control cambia el panel visible, y eso es una pestaña, no un toggle.
  - **Lista de pedidos:** `<button>` con `aria-current="true"` solo en el seleccionado (sin `aria-current="false"` en el resto) y `aria-controls` hacia el panel de la entrada. Se elige `aria-current` (como el lienzo) y no `aria-pressed`: es "el elemento actual de un conjunto" (maestro-detalle de selección única), no un interruptor de encendido y apagado.
  - **Anterior/siguiente** usan `Button` con `focusableWhenDisabled`. En el extremo quedan `aria-disabled` sin perder el foco.
  - "Entrada N de M" es `aria-live="polite"`.
- **D8 — `TicketStatus` = `ticket_status` (§6.3): `valid | used | void`, con textos "Válida" / "Usada" / "Anulada".** Se define el enum completo para que el contrato del service no cambie con la base. Solo "Válida" usa color (`text-success-foreground`, ver design-system §2.3.5); las otras usan `text-muted-foreground`.
- **D9 — "Descargar PDF" descarga el pedido completo** (una página por entrada, `ticketera-{code}.pdf`), igual que en la confirmación. La acción secundaria del diseño es **"Agregar al calendario"**, con el .ics de la 012. Ninguna es un botón muerto.
  - Para no duplicar los manejadores, se extrae `useTicketDownloads` de `ConfirmationActions` a `src/modules/checkout/hooks/`.
  - `tickets` lo importa desde `checkout`, que es dueño de los documentos de la entrada (PDF/ICS). Es la misma dirección de dependencia que ya hay entre `checkout`, `events` y `seating`.
- **D10 — Código de entrada `TK-XXXXX-NN`** (lienzo: `code + '-0' + n`; se generaliza con `padStart(2, "0")` para ≥ 10). No se agrega a `ConfirmationTicket` porque la confirmación no lo muestra. Vive en `UserTicket.code`.
- **D11 — "Próximas" vacía** (no está en el diseño; criterio propio): "No tienes entradas para próximos eventos" / "Cuando compres entradas, las verás aquí." + "Explorar eventos". Con el mock actual no se ve, pero la vista lo soporta y el test lo cubre.
- **D12 — Un solo `dl` en DOM, en el orden del desktop: Zona, [Asiento], Titular, Código, Estado.** El móvil del lienzo cambia el orden (Zona, Estado, Titular, Código). No se reordena con CSS, para que el orden visual y el de lectura coincidan. "Asiento" (criterio propio) aparece solo en entradas de teatro, como en la tarjeta de la confirmación.
- **D13 — Fecha larga en ambos tamaños.** En el detalle, `formatDateLong` también en móvil (el lienzo móvil usa la corta). En móvil la lista va en columna, así que entra.

## Diseño (transcrito de `MyTickets` / `MyTicketsMobile`)

Colores del lienzo → tokens: `#F4F4F5` → `bg-secondary`; `#FFFFFF` → `bg-card`; `#E4E4E7` → `border-border`; `#D4D4D8` → `border-input`; `#18181B` → `foreground`; `#52525B` → `text-muted-foreground`; `#4F46E5` → `primary`; `#15803D` → `text-success-foreground`.

**Fondo de página:** `bg-secondary`, bajo el header del layout `(site)`. Contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` (alineado con `SiteHeader`).

**Cabecera.**

- Desktop: `pt-10 pb-7`, fila `flex items-end justify-between`. `<h1>` "Mis entradas" 36px / 1.1 / 700 / −0.025em.
  - Pestañas: cápsula `p-1 gap-1 border border-border rounded-[14px] bg-card`.
  - Cada pestaña: `h-10 px-[18px] rounded-[10px] text-sm font-semibold`. Activa: `bg-foreground text-background`. Inactiva: transparente con `text-foreground`.
- Móvil: `pt-[22px] pb-4`, columna `gap-4`. `<h1>` 28px / 1.15. La cápsula es grid de 2 columnas a todo el ancho y cada pestaña mide `h-[42px]`.
- Textos de las pestañas: "Próximas ({n})" y "Pasadas ({n})".
- Nota de modo demo (D6, criterio propio): bajo el `<h1>`, `text-[13px] text-muted-foreground`.

**Panel con pedidos (desktop, `lg+`):** grid `grid-cols-[25rem_minmax(0,1fr)] gap-8 items-start`, `pb-20`.

- **Lista de pedidos:** `<ul aria-label="Pedidos">` en columna, `gap-3`. Cada pedido es un `<button>` a todo el ancho:
  - `p-3.5 flex items-center gap-3.5 rounded-[20px] bg-card text-left border-2`, con `border-primary` si está seleccionado y `border-border` si no;
  - miniatura 72×72 `rounded-[14px] object-cover`, `alt=""`;
  - título 16px/600, truncado con elipsis;
  - "{fecha corta} · {ciudad}" 13px muted (`formatDateShort`, p. ej. "sáb 4 oct · Lima");
  - "{n entradas} · {zonas}" 13px/500 `text-primary` (p. ej. "3 entradas · Sur, Oriente").
- **Entrada seleccionada:** `<article>` `rounded-[28px] border border-border bg-card overflow-hidden`.
  1. Imagen de 200px de alto (`object-cover`, `alt={event.imageAlt}`) con badge de fecha arriba a la izquierda (`top-4 left-4`, `w-15 rounded-2xl bg-card`): mes 11px/700 `tracking-[0.08em] text-primary` y día 24px/700 (`formatDateBadge`).
  2. Bloque `px-8 pt-[26px] pb-6 gap-3.5`: `<h2>` con el título 28px / 1.15 / 700 / −0.02em, y lista `flex-wrap gap-x-6 gap-y-2` 15px muted con iconos de 17px `aria-hidden`: `Calendar` + fecha larga, `Clock` + hora (`formatTime`) y `MapPin` + "{venue.name}, {venue.city}".
  3. Perforación: borde superior `1.5px dashed border-input`, con muescas de 24px en los extremos (`bg-secondary border border-border rounded-full`, `-top-3 -left-3` / `-right-3`).
  4. Bloque inferior `px-8 pt-7 pb-8`, fila `items-center gap-9`, solo desde `xl`. Entre `lg` y `xl` usa el layout móvil, porque la columna derecha (~530px) no entra en fila.
     - QR: caja 200×200 `p-3 rounded-[18px] border border-border bg-white` (zona de silencio blanca, como el objeto físico del QR, design-system §2.3.5/011) con `DecorativeQr seed={ticket.qrSeed}` (`aria-hidden`, ya lo trae).
     - Columna `flex-1 gap-[18px]` con:
       - fila "Entrada N de M" (20px/700, `aria-live="polite"`) + botones anterior/siguiente (44×44 `rounded-xl border-[1.5px] border-input bg-card`, `ChevronLeft`/`ChevronRight`, `aria-label` "Entrada anterior" / "Entrada siguiente");
       - `dl` grid de 2 columnas `gap-x-6 gap-y-3.5`: `dt` 12px muted y `dd` 16px/600 (Código con `tabular-nums`; Estado "Válida" en `text-success-foreground`);
       - acciones `flex flex-wrap gap-2.5`: "Descargar PDF" (`h-12 px-[18px] rounded-[14px] border-[1.5px] border-foreground bg-card text-sm font-semibold`, icono `Download`) y "Agregar al calendario" (igual, con `border-input` y `font-medium`, icono `CalendarPlus`);
       - región `role="status"` para los mensajes de descarga (criterio propio, como en la 012).

**Panel con pedidos (móvil, `< lg`):**

- Lista horizontal con scroll (`overflow-x-auto`, `gap-2.5`). Cada botón mide `w-[270px] p-2.5 gap-3 rounded-[18px]`, con miniatura 56×56 `rounded-xl`, título 14px/600, fecha · ciudad 12px y solo "{n entradas}" 12px/500 primary (las zonas se ocultan bajo `lg`). El anillo de foco no debe quedar recortado por el contenedor con scroll (dejarle padding interno).
- Debajo, la entrada: `mt-4 mb-8 rounded-[26px]`.
  - Imagen de 150px con badge `top-3 left-3 w-13 rounded-[14px]` (mes 10px, día 20px).
  - Bloque `px-5 py-[18px] gap-2.5`: `<h2>` 21px / 1.2, y lista en columna `gap-1.5` 14px.
  - Perforación igual que en desktop.
  - Bloque inferior en columna centrada `px-5 pt-[22px] pb-6 gap-[18px]`:
    - QR de 220×220;
    - fila a todo el ancho: anterior | "Entrada N de M" (16px/600) | siguiente;
    - `dl` de 2 columnas `gap-x-4 gap-y-3` (`dt` 11px, `dd` 15px);
    - acciones en grid de 2 columnas `gap-2.5`, `h-12`, `justify-center`. Texto visible "PDF" y "Calendario"; el nombre accesible es "Descargar PDF" / "Agregar al calendario" en todos los tamaños (p. ej. con `sr-only`).

**Estado vacío** (Pasadas, y Próximas por D11): `Empty*` como `ConfirmationNotFound`.

- Contenedor: `rounded-[28px] border-[1.5px] border-dashed border-input bg-card px-6 py-20` (móvil `rounded-3xl px-5 py-14`).
- `EmptyMedia` `size-14 rounded-[18px] bg-primary/10 text-primary` con icono `Ticket` (26px).
- Título como `<h2>` 20px/600 (móvil 17px).
- Descripción 15px / 1.55 muted, `max-w-[26.25rem]` (móvil 14px).
- Link "Explorar eventos" → `getEventsSearchHref()` (`/events`): `h-12 px-[22px] rounded-[14px] bg-foreground text-background font-semibold focus-ring` (móvil `px-5 text-sm`).
- Textos de Pasadas (transcritos): "Aún no tienes eventos pasados" / "Cuando vayas a tu primer evento, lo verás aquí."

Todos los interactivos propios llevan `focus-ring`. Claro y oscuro solo con tokens, excepto el `bg-white` de la caja del QR.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | agregar de shadcn | `src/components/ui/tabs.tsx` | `npx shadcn@latest add tabs` (base-nova sobre `@base-ui/react/tabs`; verificado con `npx shadcn@latest view tabs`). Se estiliza por `className` al usarlo: no se edita el archivo generado. |
| `Button` (`focusableWhenDisabled`, `buttonVariants`) | reutilizar | `src/components/ui/button.tsx` | Anterior/siguiente y acciones. |
| `Empty*` | reutilizar | `src/components/ui/empty.tsx` | Estados vacíos. |
| `DecorativeQr` | reutilizar | `src/components/shared/decorative-qr.tsx` | Con `qrSeed` de la entrada. |
| `ConfirmationTicket`, `buildConfirmationTickets` | **extender** | `src/modules/checkout/utils/order-confirmation.ts` | Nueva `createConfirmationTickets(orderCode, units)` y tipo exportado `ConfirmationTicketUnit` (hoy `TicketUnit` privado). `buildConfirmationTickets` delega en ella: su salida no cambia (D2). |
| `useTicketDownloads` | **crear (extraído)** | `src/modules/checkout/hooks/use-ticket-downloads.ts` | Se mueven, sin cambios de comportamiento, los manejadores de calendario y PDF de `ConfirmationActions` (mensajes, guard de doble clic con ref, estado de carga). Lo usan `ConfirmationActions` y `TicketDetail` (DRY, D9). |
| `ConfirmationActions` | **extender** | `src/modules/checkout/components/confirmation-actions.tsx` | Usa `useTicketDownloads`. "Ver mis entradas" pasa de `<Button onClick>` con mensaje mock a `<Link href={MY_TICKETS_PATH}>` con el mismo aspecto (`buttonVariants` + las clases actuales). Se elimina `MY_TICKETS_MESSAGE`. |
| `buildTicketPdfPages`, `getTicketPdfFileName`, `generateTicketPdf`, `buildEventCalendar`, `getCalendarFileName`, `CALENDAR_MIME_TYPE`, `downloadBlob` | reutilizar | `src/modules/checkout/utils/*`, `src/lib/download.ts` | Vía el hook. `UserTicket` extiende `ConfirmationTicket`, así que se pasa sin adaptar. |
| `formatSeatPosition` | reutilizar | `src/modules/seating/utils/seat-selection.ts` | Etiqueta de asiento del mock de teatro. |
| `isOrderCode` | reutilizar | `src/modules/checkout/utils/checkout-order.ts` | Valida el código del registro mock. |
| `formatDateBadge`, `formatDateShort`, `formatDateLong`, `formatTime` | reutilizar | `src/lib/format.ts` | No hay moneda en pantalla: los precios solo aparecen en el PDF (USD, vía `formatPrice` de la 012). |
| `eventsService.getAll`, `getTicketTypes`, `getReferenceDate` | reutilizar | `src/modules/events/services/events.service.ts` | El service de tickets depende de `eventsService`, no de los mocks de events (DIP). |
| `getEventsSearchHref` | reutilizar | `src/modules/events/utils/event-routes.ts` | "Explorar eventos". |
| `MY_TICKETS_PATH` | reutilizar | `src/lib/auth/auth-routes.ts` (013) | "Ver mis entradas" y `returnTo`. |
| `requireUser` | reutilizar | `src/lib/auth/guards.ts` (015) | En la página (D4). |
| `currentUser` | reutilizar (Clerk) | `@clerk/nextjs/server` | En la página (D4). |
| `EventCard` | no aplica | `src/modules/events/components/event-card.tsx` | Es un link-tarjeta a `/events/[slug]` con precio. Aquí cada pedido es un botón de selección con otra información: no es sustituible (L de SOLID). |
| `ConfirmationTicketCard` | no aplica | `src/modules/checkout/components/confirmation-ticket-card.tsx` | Muestra todas las entradas en horizontal con Precio. Mis entradas muestra una sola, en vertical, con navegación, Titular, Código, Estado y acciones. Comparten solo `DecorativeQr` y la idea de muescas: extraer un "ticket shell" común sería abstracción prematura. |
| `TicketStatus`, `UserOrderRecord`, `UserTicket`, `UserOrder`, `OrdersByTime` | crear | `src/modules/tickets/types/ticket.types.ts` | No existen. |
| `USER_ORDERS_MOCK` | crear | `src/modules/tickets/data/user-orders.mock.ts` | 3 pedidos (ver C4). |
| utils de Mis entradas | crear | `src/modules/tickets/utils/user-orders.ts` | Puros y testeados (C5). |
| `ticketsService` | crear | `src/modules/tickets/services/tickets.service.ts` | Mismo patrón que `eventsService` (objeto con métodos async). |
| `MyTicketsView` | crear | `src/modules/tickets/components/my-tickets-view.tsx` | `"use client"`: pestañas, selección y estados vacíos. |
| `OrderList` | crear | `src/modules/tickets/components/order-list.tsx` | Lista de pedidos (botones). |
| `TicketDetail` | crear | `src/modules/tickets/components/ticket-detail.tsx` | `"use client"`: entrada seleccionada, navegación y acciones. |

## Contratos

### C1 — Numeración compartida (`src/modules/checkout/utils/order-confirmation.ts`, extiende)

```ts
export type ConfirmationTicketUnit = Pick<ConfirmationTicket, "ticketTypeName" | "seatLabel" | "unitPrice">

/** Numera las unidades en el orden recibido: position 1..n, total = units.length,
 *  key = `${orderCode}-${position}`, qrSeed = Number(dígitos de orderCode) × 100 + position. [] → []. Pura. */
export function createConfirmationTickets(
  orderCode: string,
  units: readonly ConfirmationTicketUnit[]
): ConfirmationTicket[]

// buildConfirmationTickets(state, ticketTypes) = createConfirmationTickets(state.orderCode, getTicketUnits(state, ticketTypes)).
// Firma y salida sin cambios.
```

### C2 — Descargas (`src/modules/checkout/hooks/use-ticket-downloads.ts`, `"use client"`)

```ts
export type TicketDownloadsInput = {
  event: EventItem
  orderCode: string
  /** No vacío. */
  tickets: readonly ConfirmationTicket[]
}
export type TicketDownloads = {
  /** "" al inicio; luego el último mensaje (textos de la 012, sin cambios). */
  message: string
  isGeneratingPdf: boolean
  /** buildEventCalendar({ event, orderCode, now: new Date() }) → downloadBlob(Blob CALENDAR_MIME_TYPE, getCalendarFileName(orderCode)).
   *  Éxito: "Descargamos el evento para tu calendario."; error: "No pudimos crear el archivo del calendario. Inténtalo de nuevo." */
  addToCalendar: () => void
  /** Si ya hay una generación en curso (ref), no hace nada. Mensaje "Preparando tu PDF…" →
   *  generateTicketPdf(buildTicketPdfPages({ event, orderCode, tickets })) → downloadBlob(blob, getTicketPdfFileName(orderCode)).
   *  Éxito: "Descargamos tu PDF."; error: "No pudimos generar tu PDF. Inténtalo de nuevo.". Siempre libera el estado de carga. */
  downloadPdf: () => Promise<void>
}
export function useTicketDownloads(input: TicketDownloadsInput): TicketDownloads
```

- `jspdf` se sigue cargando solo al generar: el hook no lo importa al renderizar.

`ConfirmationActions`: mismas props (`event`, `orderCode`, `tickets`) y mismo aspecto. Usa el hook. "Ver mis entradas" es un `<Link href={MY_TICKETS_PATH}>` (con su icono `ArrowRight`) y no escribe en la región de estado.

### C3 — Tipos (`src/modules/tickets/types/ticket.types.ts`)

```ts
import type { ConfirmationTicket } from "@/modules/checkout/utils/order-confirmation"
import type { EventItem } from "@/modules/events/types/event.types"

/** ticket_status (System Design §6.3). */
export type TicketStatus = "valid" | "used" | "void"

/** Registro mock de un pedido pagado (futuro seed de orders + order_items + tickets). */
export type UserOrderRecord = {
  /** ORDER_CODE_PATTERN (TK-XXXXX). */
  orderCode: string
  eventId: string
  /** Una por entrada, en orden de emisión. seat solo en eventos de teatro. */
  units: readonly { ticketTypeId: string; seat: { rowLabel: string; number: number } | null }[]
}

export type UserTicket = ConfirmationTicket & {
  /** formatTicketCode(orderCode, position): "TK-24817-01". */
  code: string
  status: TicketStatus
}

/** Entradas del usuario agrupadas por pedido. Serializable (viaja de server a client). */
export type UserOrder = {
  orderCode: string
  event: EventItem
  /** No vacío; position 1..n en orden. */
  tickets: UserTicket[]
}

export type OrdersByTime = { upcoming: UserOrder[]; past: UserOrder[] }
```

### C4 — Mock (`src/modules/tickets/data/user-orders.mock.ts`)

`export const USER_ORDERS_MOCK: readonly UserOrderRecord[]`, en este orden. Solo lo importa `tickets.service.ts`.

| orderCode | eventId | units | Resultado esperado |
|---|---|---|---|
| `TK-24817` | `evt-002` (Clásico del Fútbol, 4 oct, zona) | `evt-002-sur`, `evt-002-sur`, `evt-002-oriente` (sin asiento) | 3 entradas · Sur, Oriente. Idénticas a las de la confirmación `?order=TK-24817&tickets=evt-002-sur:2,evt-002-oriente:1` (D2), más `code`/`status`. |
| `TK-24790` | `evt-004` (La Casa de Bernarda Alba, 22 oct, teatro) | `evt-004-platea` con `{ rowLabel: "F", number: 8 }` | 1 entrada · Platea, `seatLabel` "Fila F, asiento 8". |
| `TK-24852` | `evt-007` (Pop en Vivo: Gira 2026, 8 nov, zona) | `evt-007-campo` × 2 | 2 entradas · Campo. |

### C5 — Utils (`src/modules/tickets/utils/user-orders.ts`, puros)

```ts
export const TICKET_STATUS_LABELS: Readonly<Record<TicketStatus, string>> // { valid: "Válida", used: "Usada", void: "Anulada" }

/** `${orderCode}-${String(position).padStart(2, "0")}`. ("TK-24817", 1) → "TK-24817-01"; 12 → "TK-24817-12". */
export function formatTicketCode(orderCode: string, position: number): string

/** null si: !isOrderCode(record.orderCode), units vacío, record.eventId !== event.id, o algún ticketTypeId
 *  no está en ticketTypes. Si no: tickets = createConfirmationTickets(orderCode, units mapeadas a
 *  { ticketTypeName: type.name, unitPrice: type.price, seatLabel: seat ? formatSeatPosition(seat) : null })
 *  + { code: formatTicketCode(orderCode, position), status: "valid" } (TEMPORAL: estado real con la base).
 *  Los tipos agotados también valen (una entrada comprada puede ser de una zona hoy agotada). */
export function buildUserOrder(
  record: UserOrderRecord,
  event: EventItem,
  ticketTypes: readonly TicketType[]
): UserOrder | null

/** upcoming: event.startsAt >= now (inclusivo), por startsAt ascendente.
 *  past: event.startsAt < now, por startsAt descendente. Arrays nuevos; no muta la entrada. */
export function splitOrdersByEventDate(orders: readonly UserOrder[], now: Date): OrdersByTime

/** 1 → "1 entrada"; n ≠ 1 → "{n} entradas". */
export function getTicketCountLabel(count: number): string

/** Nombres de zona únicos en orden de aparición, unidos por ", ". [Sur, Sur, Oriente] → "Sur, Oriente". */
export function getOrderZonesLabel(tickets: readonly Pick<ConfirmationTicket, "ticketTypeName">[]): string

/** fullName sin espacios extremos si no queda vacío → si no, email si no está vacío → si no, "Sin nombre".
 *  null → "Sin nombre". */
export function getHolderName(user: { fullName?: string | null; email?: string | null } | null): string

/** El pedido con ese código; si no está (o orderCode es null), el primero; [] → null. */
export function resolveSelectedOrder(orders: readonly UserOrder[], orderCode: string | null): UserOrder | null

/** index + delta acotado a [0, total − 1]. total ≤ 0 → 0. */
export function stepTicketIndex(index: number, delta: -1 | 1, total: number): number
```

### C6 — Service (`src/modules/tickets/services/tickets.service.ts`)

```ts
export const ticketsService = {
  /** TEMPORAL (mock): no filtra por userId; devuelve los pedidos de USER_ORDERS_MOCK a cualquier usuario.
   *  Con la base: pedidos `paid` con entradas cuyo holder_user_id = userId (§6.4).
   *  Por registro: evento = (await eventsService.getAll()).find(id), tipos = await eventsService.getTicketTypes(eventId),
   *  buildUserOrder; descarta registros sin evento o que devuelvan null. Orden del mock. Objetos nuevos en cada llamada. */
  async getUserOrders(userId: string): Promise<UserOrder[]>,
}
```

- El parámetro `userId` es parte del contrato. La implementación no debe dejar warnings de lint por no usarlo.

### C7 — Componentes

```ts
// src/modules/tickets/components/my-tickets-view.tsx — "use client"
export type MyTicketsViewProps = {
  orders: readonly UserOrder[]
  /** ISO; "ahora" para separar Próximas/Pasadas (D3). */
  referenceDate: string
  /** getHolderName(...) ya resuelto en el servidor (D4). */
  holderName: string
}
export function MyTicketsView(props: MyTicketsViewProps): JSX.Element

// src/modules/tickets/components/order-list.tsx
export type OrderListProps = {
  /** No vacío. */
  orders: readonly UserOrder[]
  selectedOrderCode: string
  onSelect: (orderCode: string) => void
  /** id del <article> de la entrada (aria-controls). */
  controlsId: string
}
export function OrderList(props: OrderListProps): JSX.Element

// src/modules/tickets/components/ticket-detail.tsx — "use client"
export type TicketDetailProps = {
  order: UserOrder
  holderName: string
  /** id del <article> (destino de aria-controls). */
  id: string
}
export function TicketDetail(props: TicketDetailProps): JSX.Element
```

Comportamiento:

- **`MyTicketsView`**
  - `{ upcoming, past } = splitOrdersByEventDate(orders, new Date(referenceDate))`.
  - Estado: pestaña (`"upcoming" | "past"`, inicial `"upcoming"`) y `selectedOrderCode: string | null` (inicial `null`).
  - Renderiza `<h1>`, la nota demo y `Tabs` con dos `TabsTrigger` ("Próximas (n)", "Pasadas (n)") y dos `TabsContent`.
  - En cada panel, `selected = resolveSelectedOrder(lista, selectedOrderCode)`:
    - si es `null`, muestra el estado vacío (Pasadas: textos transcritos; Próximas: D11);
    - si no, muestra `OrderList` + `<TicketDetail key={selected.orderCode} …>`.
  - Ids únicos por panel con `useId`.
- **`OrderList`**
  - `<ul aria-label="Pedidos">` con un `<button type="button">` por pedido.
  - El seleccionado lleva `aria-current="true"`; los demás no tienen el atributo. Todos llevan `aria-controls={controlsId}`.
  - Clic → `onSelect(orderCode)`.
  - Contenido según "Diseño"; usa `getTicketCountLabel` y `getOrderZonesLabel`.
- **`TicketDetail`**
  - Estado local `ticketIndex` (inicial 0). Anterior/siguiente usan `stepTicketIndex`.
  - "Entrada {position} de {total}".
  - Anterior queda `aria-disabled` en la primera y siguiente en la última (`focusableWhenDisabled`): el foco no se pierde.
  - `dl`: Zona, Asiento (solo si `seatLabel`), Titular, Código (`ticket.code`) y Estado (`TICKET_STATUS_LABELS[ticket.status]`, color según D8).
  - Acciones con `useTicketDownloads({ event: order.event, orderCode: order.orderCode, tickets: order.tickets })`. Mientras genera, el botón PDF muestra `Loader2` (`motion-reduce:animate-none`) y `aria-busy`, igual que la 012.
  - `<article id={id} aria-labelledby={<id del h2>}>`.

### C8 — Página (`src/app/(site)/my-tickets/page.tsx`, reemplaza el placeholder C12 de la 013)

```tsx
export const metadata: Metadata = { title: "Mis entradas — Ticketera", robots: { index: false } }

export default async function MyTicketsPage() {
  const { userId } = await requireUser({ returnTo: MY_TICKETS_PATH })
  const [user, orders] = await Promise.all([currentUser(), ticketsService.getUserOrders(userId)])
  // <MyTicketsView orders={orders} referenceDate={eventsService.getReferenceDate()}
  //   holderName={getHolderName(user && { fullName: user.fullName, email: user.primaryEmailAddress?.emailAddress })} />
}
```

- Solo composición, sin lógica propia. El redirect de `requireUser` no se captura.

## Tareas

### Preparación (serie, en este orden)

- **P1** Agregar Tabs de shadcn: `npx shadcn@latest add tabs`. Archivos: `src/components/ui/tabs.tsx` (generado, no se edita a mano).
- **P2** Checkout: numeración compartida (C1), hook de descargas (C2) y `ConfirmationActions` (link y hook), con tests. Archivos:
  - `src/modules/checkout/utils/order-confirmation.ts`
  - `src/modules/checkout/utils/order-confirmation.test.ts`
  - `src/modules/checkout/hooks/use-ticket-downloads.ts`
  - `src/modules/checkout/components/confirmation-actions.tsx`
  - `src/modules/checkout/components/confirmation-actions.test.tsx`
- **P3** Contratos de `tickets`: tipos, mock, utils y service, con tests (C3–C6). Archivos:
  - `src/modules/tickets/types/ticket.types.ts`
  - `src/modules/tickets/data/user-orders.mock.ts`
  - `src/modules/tickets/utils/user-orders.ts`
  - `src/modules/tickets/utils/user-orders.test.ts`
  - `src/modules/tickets/services/tickets.service.ts`
  - `src/modules/tickets/services/tickets.service.test.ts`
- Verificación acotada al cerrar P2 y P3: `npx vitest run src/modules/checkout src/modules/tickets` y `npm run lint`.

### Paralelo (archivos disjuntos; nadie corre `npm install` ni `npm run build`)

- **T1** Vista y lista de pedidos (C7: `MyTicketsView`, `OrderList`, estados vacíos). Importa `TicketDetail` por su contrato C7: si T2 no terminó, el archivo puede no compilar todavía. Se verifica en I1. Archivos:
  - `src/modules/tickets/components/my-tickets-view.tsx`
  - `src/modules/tickets/components/order-list.tsx`
- **T2** Entrada seleccionada (C7: `TicketDetail`, navegación, `dl` y acciones). Archivos:
  - `src/modules/tickets/components/ticket-detail.tsx`

### Integración (serie)

- **I1** Página, test de la vista y corrección del doc. Archivos:
  - `src/app/(site)/my-tickets/page.tsx` (reemplaza el de la 013)
  - `src/modules/tickets/components/my-tickets-view.test.tsx`
  - `docs/design/design-system.md`: solo §2.3.5, donde "el estado "Válida" de Mis entradas (013)" pasa a "(016)".

**Tamaño:** 18 archivos: 13 de código (1 generado por la CLI), 5 de tests y 1 línea de doc. Supera la guía de ~14, pero:

- casi la mitad son tests obligatorios o el componente generado;
- separar las descargas o el mock en otra fase dejaría Mis entradas con botones muertos o sin datos.

**Archivos existentes que se modifican:**

- `src/modules/checkout/utils/order-confirmation.ts` (+ test)
- `src/modules/checkout/components/confirmation-actions.tsx` (+ test)
- `src/app/(site)/my-tickets/page.tsx` (creado por la 013)
- `docs/design/design-system.md` (1 línea)

## Criterios de aceptación

- [ ] AC1 Sin sesión, `/my-tickets` redirige a `/sign-in?redirect_url=%2Fmy-tickets` (proxy de la 013). Con sesión, la página llama `requireUser({ returnTo: "/my-tickets" })` antes de leer datos (verificable en el código), tiene `<title>` "Mis entradas — Ticketera" y `robots` noindex.
- [ ] AC2 Con sesión, se ve el `<h1>` "Mis entradas", la nota "Modo demo: estas entradas son de ejemplo. Tus compras todavía no se guardan aquí." y un `tablist` con las pestañas "Próximas (3)" (seleccionada, `aria-selected="true"`) y "Pasadas (0)".
- [ ] AC3 Las pestañas se manejan con teclado: con el foco en una pestaña, las flechas izquierda/derecha mueven el foco a la otra, y Enter o Espacio la activa y muestra su `tabpanel`.
- [ ] AC4 En Próximas, la lista `aria-label="Pedidos"` muestra, en este orden: "Clásico del Fútbol: Final de Temporada" (sáb 4 oct · Lima · 3 entradas · Sur, Oriente), "La Casa de Bernarda Alba" (1 entrada · Platea) y "Pop en Vivo: Gira 2026" (2 entradas · Campo). Bajo `lg` no se muestran las zonas.
- [ ] AC5 Al cargar, el primer pedido tiene `aria-current="true"` y borde `primary`; los demás no tienen `aria-current`. Al hacer clic en otro pedido, `aria-current` y el borde pasan a ese pedido, el panel muestra su evento (`<h2>`) y vuelve a "Entrada 1 de {M}".
- [ ] AC6 El panel de la entrada muestra:
  - imagen con badge de mes y día;
  - `<h2>` con el título;
  - fecha larga, hora y "{lugar}, {ciudad}";
  - perforación con muescas y QR decorativo;
  - "Entrada N de M";
  - `dl` con Zona, Titular, Código y Estado "Válida" en verde (`text-success-foreground`);
  - para TK-24790, además, "Asiento: Fila F, asiento 8".
- [ ] AC7 Con TK-24817 seleccionado: "Entrada anterior" está `aria-disabled="true"` en la 1 de 3. "Entrada siguiente" lleva a "Entrada 2 de 3" (Código "TK-24817-02") y a "Entrada 3 de 3" (Código "TK-24817-03"), donde siguiente queda `aria-disabled="true"` y el foco sigue en ese botón. "Entrada N de M" es una región `aria-live="polite"`. En un pedido de 1 entrada, ambos botones están deshabilitados.
- [ ] AC8 El QR de cada entrada de TK-24817 es el mismo que muestra la confirmación `/events/clasico-del-futbol-final-de-temporada/confirmation?order=TK-24817&tickets=evt-002-sur:2,evt-002-oriente:1` para esa posición (mismo `qrSeed`).
- [ ] AC9 "Titular" muestra el `fullName` del usuario de Clerk. Si no tiene nombre, muestra su email.
- [ ] AC10 "Descargar PDF" descarga `ticketera-{orderCode}.pdf`, con una página por entrada del pedido seleccionado, y muestra los mensajes de la 012 en una región `role="status"`. Mientras genera, el botón queda `aria-busy` y no inicia una segunda generación. "Agregar al calendario" descarga `ticketera-{orderCode}.ics` del evento del pedido. En móvil se ven "PDF" y "Calendario", pero el nombre accesible sigue siendo "Descargar PDF" / "Agregar al calendario".
- [ ] AC11 La pestaña "Pasadas (0)" muestra el estado vacío: "Aún no tienes eventos pasados", "Cuando vayas a tu primer evento, lo verás aquí." y el link "Explorar eventos" → `/events`.
- [ ] AC12 Con pedidos pasados (fecha de referencia posterior, en test), "Pasadas" lista esos pedidos con el mismo layout, del más reciente al más antiguo. Sin pedidos próximos, "Próximas" muestra "No tienes entradas para próximos eventos" con "Explorar eventos".
- [ ] AC13 Desktop (`lg+`): lista de 400px a la izquierda y entrada a la derecha (grid `25rem | 1fr`). Desde `xl`, QR a la izquierda y datos a la derecha. Móvil (390px): pestañas a todo el ancho, lista horizontal con scroll y la entrada debajo (QR centrado, nav "anterior | Entrada N de M | siguiente", acciones en 2 columnas). Ningún desborde horizontal de la página a 390px.
- [ ] AC14 Claro y oscuro: todo con tokens, salvo la caja blanca del QR. Todo interactivo tiene foco visible (`focus-ring` o el anillo de `Button`/`Tabs`), y el foco de la lista horizontal no queda recortado.
- [ ] AC15 En la confirmación, "Ver mis entradas" es un link (`<a href="/my-tickets">`) con el mismo aspecto que antes. Ya no existe el mensaje "Mis entradas estará disponible pronto…". "Agregar al calendario" y "Descargar PDF" de la confirmación se comportan igual que en la 012 (sus tests siguen pasando).
- [ ] AC16 El header no cambia: "Mis entradas" del header marca `aria-current="page"` en `/my-tickets` (comportamiento de la 013).
- [ ] AC17 Estructura: `src/app/(site)/my-tickets/page.tsx` solo compone. La lógica (separar por fecha, armar pedidos, códigos, etiquetas, navegación de índice, nombre del titular) vive en `src/modules/tickets/utils/user-orders.ts`. Los componentes no importan mocks: los datos llegan por `ticketsService`, y ningún componente de `tickets` duplica los manejadores de PDF/ICS (usan `useTicketDownloads`).
- [ ] AC18 `npm run lint`, `npm run test` y `npm run build` pasan sin errores ni warnings nuevos.

## Tests obligatorios

- **`src/modules/checkout/utils/order-confirmation.test.ts`** (se agregan casos; los existentes no cambian):
  - `createConfirmationTickets("TK-24817", 3 unidades)` → `position` 1..3, `total` 3, `key` "TK-24817-1".."-3", `qrSeed` 2481701..2481703, y los campos de cada unidad conservados;
  - `[]` → `[]`;
  - `buildConfirmationTickets` produce exactamente lo mismo que `createConfirmationTickets` con las unidades equivalentes (zona y teatro).
- **`src/modules/checkout/components/confirmation-actions.test.tsx`** (cubre `useTicketDownloads` a través del componente, que es su consumidor original; los casos de calendario, PDF, doble clic y errores **no cambian**):
  - se reemplaza el caso "Ver mis entradas mantiene su mensaje mock" por: "Ver mis entradas" es un link con `href="/my-tickets"`, y la región de estado sigue vacía al renderizar.
- **`src/modules/tickets/utils/user-orders.test.ts`**:
  - `formatTicketCode`: posición 1 → "TK-24817-01"; 12 → "TK-24817-12".
  - `buildUserOrder`:
    - registro TK-24817 → 3 tickets iguales a `buildConfirmationTickets(parseConfirmationState({ order: "TK-24817", tickets: "evt-002-sur:2,evt-002-oriente:1" }, …))`, más `code` "TK-24817-01".."-03" y `status` "valid";
    - registro de teatro → `seatLabel` "Fila F, asiento 8" y `unitPrice` del tipo;
    - tipo agotado (`evt-002-occidente`) → se acepta;
    - `null` si el código es inválido, si `units` está vacío, si `eventId` no coincide o si hay un `ticketTypeId` desconocido.
  - `splitOrdersByEventDate`:
    - `now` entre dos eventos → ambas listas, Próximas ascendente y Pasadas descendente;
    - `startsAt === now` → Próximas;
    - todos futuros → `past: []`;
    - todos pasados → `upcoming: []`;
    - no muta el array de entrada.
  - `getTicketCountLabel`: 1 → "1 entrada"; 2 → "2 entradas".
  - `getOrderZonesLabel`: [Sur, Sur, Oriente] → "Sur, Oriente".
  - `getHolderName`:
    - `fullName` "  Ana Torres " → "Ana Torres";
    - `fullName` vacío o null con email → email;
    - sin ambos, o `null` → "Sin nombre".
  - `resolveSelectedOrder`: código existente → ese pedido; código desconocido o `null` → el primero; `[]` → `null`.
  - `stepTicketIndex`: (0, −1, 3) → 0; (0, 1, 3) → 1; (2, 1, 3) → 2; total 0 → 0.
  - `TICKET_STATUS_LABELS.valid` → "Válida".
- **`src/modules/tickets/services/tickets.service.test.ts`**:
  - `getUserOrders("user_x")` → códigos ["TK-24817", "TK-24790", "TK-24852"], eventos `evt-002` / `evt-004` / `evt-007` y 3 / 1 / 2 entradas;
  - el ticket de TK-24790 tiene `seatLabel`;
  - mutar el resultado no afecta una segunda llamada;
  - con `splitOrdersByEventDate(…, new Date(eventsService.getReferenceDate()))` → 3 próximos y 0 pasados; con `new Date("2026-10-10T00:00:00-05:00")` → TK-24817 en `past` y 2 en `upcoming`.
- **`src/modules/tickets/components/my-tickets-view.test.tsx`** (RTL + user-event; `vi.mock("@/lib/download")` y `generateTicketPdf` como en `confirmation-actions.test.tsx`; datos de `ticketsService.getUserOrders`):
  1. pestañas "Próximas (3)" seleccionada y "Pasadas (0)";
  2. primer pedido con `aria-current="true"` y el resto sin el atributo;
  3. anterior/siguiente: estados y códigos de AC7, y `aria-live` en "Entrada N de M";
  4. clic en el segundo pedido → `aria-current` se mueve, `<h2>` "La Casa de Bernarda Alba", "Entrada 1 de 1", "Fila F, asiento 8" y ambos botones `aria-disabled`;
  5. Titular = `holderName` recibido; Estado "Válida";
  6. "Descargar PDF" → `generateTicketPdf` con 3 páginas y `downloadBlob(…, "ticketera-TK-24817.pdf")`; "Agregar al calendario" → `"ticketera-TK-24817.ics"`;
  7. teclado: foco en "Próximas", ArrowRight → foco en "Pasadas"; Enter → se muestra "Aún no tienes eventos pasados" con el link "Explorar eventos" (`href="/events"`);
  8. `referenceDate` "2026-10-10T00:00:00-05:00" → "Próximas (2)" / "Pasadas (1)", y Pasadas lista TK-24817;
  9. `orders=[]` → estado vacío de Próximas.
- No requieren test unitario propio: `OrderList` y `TicketDetail` (cubiertos por el test de la vista), `ticket.types.ts`, el mock y la página.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (solo al final, lo corre el reviewer; nunca durante el bloque paralelo)
- Manual (requiere 013–015 `done` y las claves de Clerk en `.env.local`; `npm run dev`):
  1. Sin sesión, abrir `/my-tickets` → `/sign-in?redirect_url=%2Fmy-tickets`. Ingresar → vuelve a `/my-tickets`.
  2. Desktop (1440px), claro y oscuro: comparar con §2.9 y la sección "Diseño". Recorrer las entradas de TK-24817 con mouse y teclado. Cambiar de pedido. Abrir "Pasadas (0)" → estado vacío → "Explorar eventos" lleva a `/events`.
  3. Entre 1024 y 1279px: el bloque inferior de la entrada usa el layout apilado, sin desbordes.
  4. Móvil (390px): pestañas a todo el ancho, lista horizontal desplazable (el foco visible no se recorta), entrada debajo, botones "PDF" y "Calendario".
  5. "Descargar PDF" abre/descarga `ticketera-TK-24817.pdf` con 3 páginas. "Agregar al calendario" descarga el .ics.
  6. Hacer una compra completa → en la confirmación, "Ver mis entradas" navega a `/my-tickets`. La compra no aparece (D6) y se ve la nota de modo demo.
  7. Titular: un usuario con nombre muestra su nombre; uno sin nombre (si existe) muestra su email.

## Preguntas abiertas

Ninguna bloqueante. Hay criterio propio revisable al aprobar, en particular:

1. **D3:** "Pasadas" queda vacía con el mock (se ve el estado vacío del diseño), en vez de agregar un evento pasado a `EVENTS_MOCK`.
2. **D6:** "Ver mis entradas" no preselecciona el pedido recién comprado, y se muestra la nota de modo demo. Alternativa descartada por KISS: pasar el pedido de la confirmación por query a `/my-tickets` y sumarlo a la lista.
3. **D9:** "Descargar PDF" descarga el pedido completo, no solo la entrada visible.
4. **D7:** `Tabs` (pestañas) en lugar de los botones `aria-pressed` del lienzo.
