# 016 — Mis entradas (pedidos y entradas del usuario, leídos de la base de datos)

- **Estado:** draft
- **Actualizada tras 019–023:** 2026-10-08. Antes la spec usaba un mock fijo y el nombre de Clerk; ahora lee `tickets`/`orders`/`events` con Drizzle y usa el contexto de acceso de la 020. Debe **volver a aprobarse**.
- **Modo:** SDD
- **Módulo(s):**
  - `src/modules/tickets` (**módulo nuevo**, plural: colección de entradas; System Design §3.2): types, utils puros, service con Drizzle y componentes de Mis entradas.
  - `src/modules/checkout` (extiende): `order-confirmation.ts` expone la numeración de entradas y el tipo `TicketDocumentEvent`; los generadores de PDF/ICS aceptan ese tipo; hook nuevo `useTicketDownloads`, extraído de `ConfirmationActions`; "Ver mis entradas" pasa a ser un link a `/my-tickets`.
  - `src/components/ui/tabs.tsx` (shadcn, nuevo).
  - Ruta: `src/app/(site)/my-tickets/page.tsx` (reemplaza el placeholder de la 013).
  - `docs/design/design-system.md`: solo se corrige la referencia "Mis entradas (013)" de §2.3.5.
- **Depende de:**
  - **013, 014, 015, 019, 020 en `done` antes de implementar** (019–023 ya están implementadas en el árbol de trabajo; 013–015 siguen `draft`/pendientes de cierre). Consume:
    - **013:** `MY_TICKETS_PATH` (`src/lib/auth/auth-routes.ts`); `src/proxy.ts` ya exige sesión en `/my-tickets`; el header con sesión, que no se toca.
    - **020:** `requireUser(options?) → AccessContext` (`src/lib/auth/guards.ts`), con `userId` = `users.id` (uuid del espejo, enlazado a Clerk por `clerk_user_id`), `email` y `displayName`.
    - **019:** esquema Drizzle (`src/db/schema`: `tickets`, `orders`, `order_items`, `events`, `venues`, `ticket_types`, `seats`) y `getDb()` (`src/db/client.ts`).
    - **011/012:** `ConfirmationTicket`, `createConfirmationTickets` (se extrae aquí), `DecorativeQr`, `ConfirmationActions`, `buildTicketPdfPages`, `getTicketPdfFileName`, `generateTicketPdf`, `buildEventCalendar`, `getCalendarFileName`, `CALENDAR_MIME_TYPE`, `downloadBlob`.
    - **lib / events / seating:** `getEventsSearchHref`, `formatSeatPosition`, `formatDateBadge`, `formatDateShort`, `formatDateLong`, `formatTime`, `Empty*`, `Button`, `focus-ring`, token `--success-foreground`.
  - **Precondición de datos (ver D0):** hoy **ningún flujo crea `orders`/`tickets` en la base**. El checkout sigue con mocks (`checkout-order.ts`, código aleatorio `createMockOrderCode`) y el seed de la 022 solo crea catálogo y eventos. Esta spec entrega la **lectura** correcta; con la base sin pedidos la pantalla muestra los estados vacíos.
- **Roadmap:** 013 Auth base · 014 Registro y recuperación · 015 Roles y alta de organizador · 019–023 Base de datos, identidad y admin · **016 Mis entradas (esta)** · 017 Panel de organizador · 018 Crear evento. Pendiente fuera de este roadmap: **compra real** (reserva, Stripe y emisión de entradas, System Design §5.2–§5.4), que es lo que pobla `orders`/`tickets`.
- **Diseño fuente:** `docs/design/reference-design.md` §2.9 (y §2.7 para coherencia con la confirmación), y los lienzos `MyTickets` / `MyTicketsMobile`. La ruta original no es durable, así que lo necesario se transcribe en la sección "Diseño". System Design: §3.2 (dominios), §5.4 (las entradas nacen al confirmarse el pago), §6.3 (`ticket_status`), §6.4 (`orders`, `tickets.holder_user_id`, índice `tickets_holder_user_id_idx`) y §6.5 (Mis entradas lee `tickets`, `orders` y `events`).

## Objetivo

Reemplazar el placeholder de `/my-tickets` por la pantalla real de **Mis entradas**, en desktop y móvil, leyendo de la base:

- las entradas se obtienen con un service Drizzle filtrado por `tickets.holder_user_id = <users.id del usuario autenticado>`; nunca por un parámetro del cliente;
- pestañas **Próximas | Pasadas**, separadas por la fecha del evento respecto de "ahora" (hora real del servidor);
- lista de pedidos del usuario; la entrada seleccionada con QR decorativo, "Entrada N de M" y anterior/siguiente;
- Zona, Titular (nombre del usuario en la base), Código y Estado;
- "Descargar PDF" y "Agregar al calendario" reales, reutilizando la 012;
- estados vacíos de "Próximas" y "Pasadas".

Además, "Ver mis entradas" de la confirmación deja de ser un mensaje mock y navega a `/my-tickets`. El proyecto queda en verde.

## Fuera de alcance

- **Crear pedidos y entradas** (reserva, pago Stripe, webhook, `qr_token`, `seat_allocations` en `sold`): es la spec de **compra real** (System Design §5). Hasta entonces, una compra hecha en el checkout mock **no** aparece en Mis entradas (D0, pregunta Q1).
- **Seed de pedidos/entradas de desarrollo.** El seed de la 022 no los crea. Si se quiere ver datos antes de la compra real, es una spec propia (Q1).
- **Deep link a un pedido** (`/my-tickets?order=…` o `/my-tickets/[code]`) y preselección del pedido recién comprado (D5, D6).
- Transferencias (§5.7, `ticket_transfers`), reembolsos (§5.6), check-in (§5.8) y el **QR real** (`tickets.qr_token`). El QR sigue siendo el patrón decorativo de la 011 (D2).
- PDF de una sola entrada: "Descargar PDF" descarga el pedido completo (D9).
- Paginación o búsqueda de pedidos.
- Pasar `eventsService`/checkout a la base: esta spec solo lee la base en `tickets`; no toca `eventsService`.
- Zona horaria por recinto (`venues.timezone`) y moneda distinta de USD: los formateadores de `src/lib/format.ts` siguen como están (System Design §11).
- El header con sesión: lo resuelven 013 y 015.

## Decisiones (criterio propio, revisables al aprobar)

- **D0 — Fuente de datos y precondición.**
  - `ticketsService.getUserOrders(userId)` consulta la base con Drizzle (`getDb()`), une `tickets` con `orders`, `order_items`, `events`, `venues`, `ticket_types` y `seats` (izquierda), y filtra `tickets.holder_user_id = userId`.
  - `userId` es **siempre** `requireUser().userId` (uuid de `users`). La página no lee `searchParams`, no hay Server Action ni Route Handler en esta spec, y el service no recibe filtros del cliente.
  - **Precondición:** `orders`/`tickets` los crea la compra real (futura). **Estado de transición (TEMPORAL):** mientras no exista, la tabla está vacía y la pantalla muestra los dos estados vacíos; los criterios de datos se verifican con tests y fixtures. Datos reales de desarrollo → Q1.
  - No se muestran entradas de otro titular, aunque el pedido sea del usuario (`orders.user_id` no filtra): una entrada transferida deja de ser visible para quien la transfirió (§5.7).
- **D1 — Módulo `src/modules/tickets`.** Es el dominio `tickets` del System Design §3.2. No se crea `orders`: no hay lógica de pedidos propia (YAGNI). `UserOrder` es una agrupación de las entradas del usuario por pedido.
- **D2 — Entradas desde filas planas + numeración compartida.**
  - El service devuelve filas planas (`UserTicketRow`); la agrupación y el armado de `UserOrder` son una función pura (`buildUserOrders`), testeable sin base.
  - La numeración (`key`, `position`, `total`, `qrSeed`) reutiliza `createConfirmationTickets` (extraída de `buildConfirmationTickets`): la entrada de Mis entradas es del mismo tipo `ConfirmationTicket` que la confirmación.
  - `position`/`total` son relativos a **las entradas que el usuario tiene en ese pedido**, ordenadas por `tickets.created_at` y luego `tickets.id`.
  - `unitPrice` = `order_items.unit_price_cents / 100` (lo pagado, no el precio vigente del tipo).
  - **TEMPORAL:** `qrSeed` sale del código del pedido, como en la confirmación; el QR real (`qr_token`) llega con check-in (§5.8). `qr_token` **no** se selecciona ni viaja al cliente.
- **D3 — "Ahora" = hora real del servidor** (`new Date()` en la página, serializado como ISO). Antes era `getReferenceDate()` (mock). Las dos ramas se prueban con fecha inyectada.
  - "Próximo" si `startsAt >= now` (inclusivo); "pasado" si `startsAt < now`.
  - Orden: Próximas por `startsAt` ascendente; Pasadas por `startsAt` descendente.
- **D4 — Titular desde el contexto de acceso.** La página llama `requireUser({ returnTo: MY_TICKETS_PATH })` (defensa en profundidad además del proxy) y usa `displayName`/`email` del `AccessContext` (espejo en base de la 020). Ya no se llama a `currentUser()` ni al Backend API de Clerk. `getHolderName`: `displayName` → `email` → "Sin nombre". El titular mostrado es el usuario autenticado, que es el `holder_user_id` de todas las entradas listadas.
- **D5 — Selección en estado local, no en la query.** Pestaña, pedido y entrada viven en `useState`. Con `?order=` cada clic re-renderizaría la página de servidor (que consulta la base) y hoy no hay enlace entrante que la use. Al cambiar de pedido, la entrada vuelve a la 1 (`TicketDetail` con `key={orderCode}`).
- **D6 — "Ver mis entradas" → `/my-tickets`, sin preselección.** Con el checkout mock, el pedido recién creado no existe en la base. Cuando la compra sea real, se evaluará `?order=` (spec de compra real). No se muestra nota de "modo demo" (Q2).
- **D7 — Patrones accesibles.**
  - **Próximas | Pasadas** usa `Tabs` de shadcn (Base UI): `role="tablist"`/`tab`/`tabpanel`, `aria-selected`, flechas entre pestañas y activación con Enter/Espacio (`activateOnFocus` en su default `false`). Se aparta del lienzo (botones `aria-pressed`): el control cambia el panel visible, es una pestaña.
  - **Lista de pedidos:** `<button>` con `aria-current="true"` solo en el seleccionado y `aria-controls` hacia el panel de la entrada (maestro-detalle de selección única).
  - **Anterior/siguiente** usan `Button` con `focusableWhenDisabled`: en el extremo quedan `aria-disabled` sin perder el foco.
  - "Entrada N de M" es `aria-live="polite"`.
- **D8 — `TicketStatus` = `ticket_status` (§6.3): `valid | used | void`, con textos "Válida" / "Usada" / "Anulada".** Ahora son reales: lo que diga `tickets.status`. Solo "Válida" usa color (`text-success-foreground`, design-system §2.3.5); las otras usan `text-muted-foreground`. Se listan también entradas `used` y `void` (una entrada anulada por reembolso sigue siendo visible como "Anulada").
- **D9 — "Descargar PDF" descarga el pedido completo** (una página por entrada **del usuario en ese pedido**, `ticketera-{code}.pdf`), igual que en la confirmación. La acción secundaria es **"Agregar al calendario"** (.ics de la 012). Se extrae `useTicketDownloads` de `ConfirmationActions` a `src/modules/checkout/hooks/`; `tickets` lo importa de `checkout` (dueño de PDF/ICS).
  - Los generadores de PDF/ICS solo leen `id`, `title`, `startsAt`, `doorsOpenAt` y `venue`: su parámetro pasa de `EventItem` a `TicketDocumentEvent` (un `Pick`), sin cambio de comportamiento. `EventItem` sigue siendo compatible.
- **D10 — Código de entrada `TK-XXXXX-NN`:** `formatTicketCode(orderCode, position)` con `padStart(2, "0")`. Usa `orders.code`. Vive en `UserTicket.code`.
- **D11 — Estados vacíos.** "Pasadas": "Aún no tienes eventos pasados" / "Cuando vayas a tu primer evento, lo verás aquí." "Próximas" (criterio propio): "No tienes entradas para próximos eventos" / "Cuando compres entradas, las verás aquí." + "Explorar eventos". **Con la base sin pedidos (D0) es lo que se ve.**
- **D12 — Un solo `dl` en DOM, en el orden del desktop: Zona, [Asiento], Titular, Código, Estado.** No se reordena con CSS. "Asiento" aparece solo si la entrada tiene `seat_id` (etiqueta vía `formatSeatPosition`).
- **D13 — Fecha larga en ambos tamaños** (`formatDateLong`).
- **D14 — Evento del pedido = `UserOrderEvent`**, no `EventItem` (la base no tiene `imageAlt`, categoría de UI ni `availability`):
  - `imageUrl` = `events.cover_key` (hoy una URL de Unsplash puesta por el seed 022; TEMPORAL hasta GCS, 022 Q6b). Si es `null`, se muestra un bloque `bg-muted` con icono `Ticket` en lugar de la imagen.
  - `imageAlt` = título del evento.
  - `doorsOpenAt` nulo → se usa `startsAt` (los generadores de PDF/ICS lo exigen).
  - `venue.address` = `venues.address_line ?? ""`.

## Diseño (transcrito de `MyTickets` / `MyTicketsMobile`)

Colores del lienzo → tokens: `#F4F4F5` → `bg-secondary`; `#FFFFFF` → `bg-card`; `#E4E4E7` → `border-border`; `#D4D4D8` → `border-input`; `#18181B` → `foreground`; `#52525B` → `text-muted-foreground`; `#4F46E5` → `primary`; `#15803D` → `text-success-foreground`.

**Fondo de página:** `bg-secondary`, bajo el header del layout `(site)`. Contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` (alineado con `SiteHeader`).

**Cabecera.**

- Desktop: `pt-10 pb-7`, fila `flex items-end justify-between`. `<h1>` "Mis entradas" 36px / 1.1 / 700 / −0.025em.
  - Pestañas: cápsula `p-1 gap-1 border border-border rounded-[14px] bg-card`.
  - Cada pestaña: `h-10 px-[18px] rounded-[10px] text-sm font-semibold`. Activa: `bg-foreground text-background`. Inactiva: transparente con `text-foreground`.
- Móvil: `pt-[22px] pb-4`, columna `gap-4`. `<h1>` 28px / 1.15. La cápsula es grid de 2 columnas a todo el ancho y cada pestaña mide `h-[42px]`.
- Textos de las pestañas: "Próximas ({n})" y "Pasadas ({n})".

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
| `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` | agregar de shadcn | `src/components/ui/tabs.tsx` | `npx shadcn@latest add tabs` (base-nova sobre `@base-ui/react/tabs`). Se estiliza por `className`: no se edita el archivo generado. |
| `Button` (`focusableWhenDisabled`, `buttonVariants`) | reutilizar | `src/components/ui/button.tsx` | Anterior/siguiente y acciones. |
| `Empty*` | reutilizar | `src/components/ui/empty.tsx` | Estados vacíos. |
| `DecorativeQr` | reutilizar | `src/components/shared/decorative-qr.tsx` | Con `qrSeed` de la entrada. |
| `getDb()`, esquema `tickets`/`orders`/`order_items`/`events`/`venues`/`ticket_types`/`seats` | reutilizar | `src/db/client.ts`, `src/db/schema/*` (019) | El service consulta con Drizzle. No hay módulo de acceso a datos previo para tickets. |
| `requireUser` / `AccessContext` | reutilizar | `src/lib/auth/guards.ts` (020) | `userId` (uuid), `displayName`, `email`. Reemplaza a `currentUser()` de Clerk (D4). |
| `usersService` | no aplica | `src/modules/users/services/users.service.ts` | Resuelve identidad para los guards; Mis entradas no lo llama directo. |
| `ConfirmationTicket`, `buildConfirmationTickets` | **extender** | `src/modules/checkout/utils/order-confirmation.ts` | Nueva `createConfirmationTickets(orderCode, units)`, tipo exportado `ConfirmationTicketUnit` (hoy `TicketUnit` privado) y `TicketDocumentEvent`. `buildConfirmationTickets` delega en ella: su salida no cambia (D2). |
| `buildTicketPdfPages`, `buildEventCalendar` | **extender (solo tipo)** | `src/modules/checkout/utils/ticket-pdf.ts`, `event-calendar.ts` | El parámetro `event` pasa de `EventItem` a `TicketDocumentEvent` (D9). Sin cambio de comportamiento; sus tests no cambian. |
| `getTicketPdfFileName`, `generateTicketPdf`, `getCalendarFileName`, `CALENDAR_MIME_TYPE`, `downloadBlob` | reutilizar | `src/modules/checkout/utils/*`, `src/lib/download.ts` | Vía el hook. |
| `useTicketDownloads` | **crear (extraído)** | `src/modules/checkout/hooks/use-ticket-downloads.ts` | Se mueven, sin cambios de comportamiento, los manejadores de calendario y PDF de `ConfirmationActions`. Lo usan `ConfirmationActions` y `TicketDetail` (DRY). |
| `ConfirmationActions` | **extender** | `src/modules/checkout/components/confirmation-actions.tsx` | Usa el hook. "Ver mis entradas" pasa de `<Button onClick>` con mensaje mock a `<Link href={MY_TICKETS_PATH}>` con el mismo aspecto. Se elimina `MY_TICKETS_MESSAGE`. |
| `formatSeatPosition` | **extender (solo tipo)** | `src/modules/seating/utils/seat-selection.ts` | `number: number` → `number: number \| string` (`seats.seat_number` es `text`). Misma salida. |
| `formatDateBadge`, `formatDateShort`, `formatDateLong`, `formatTime` | reutilizar | `src/lib/format.ts` | No hay moneda en pantalla (precios solo en el PDF). |
| `getEventsSearchHref` | reutilizar | `src/modules/events/utils/event-routes.ts` | "Explorar eventos". |
| `MY_TICKETS_PATH` | reutilizar | `src/lib/auth/auth-routes.ts` (013) | "Ver mis entradas" y `returnTo`. |
| `eventsService`, `EventItem`, mocks de eventos | no aplica | `src/modules/events/**` | Siguen en mock; Mis entradas **no** los usa (las filas traen el evento de la base, D14). Se deja de usar `getReferenceDate()` (D3). |
| `isOrderCode`, `USER_ORDERS_MOCK` | no aplica / **eliminado** | — | La versión anterior de esta spec creaba un mock de pedidos: ya no se crea. |
| `EventCard` | no aplica | `src/modules/events/components/event-card.tsx` | Link-tarjeta a `/events/[slug]` con precio; aquí cada pedido es un botón de selección (L de SOLID). |
| `ConfirmationTicketCard` | no aplica | `src/modules/checkout/components/confirmation-ticket-card.tsx` | Muestra todas las entradas en horizontal con Precio; aquí una sola, vertical, con navegación y acciones. Extraer un "ticket shell" sería abstracción prematura. |
| `TicketStatus`, `UserTicketRow`, `UserOrderEvent`, `UserTicket`, `UserOrder`, `OrdersByTime` | crear | `src/modules/tickets/types/ticket.types.ts` | No existen. |
| utils de Mis entradas | crear | `src/modules/tickets/utils/user-orders.ts` | Puros y testeados (C5). |
| `ticketsService` | crear | `src/modules/tickets/services/tickets.service.ts` | Objeto con métodos async (patrón de `eventsService`/`usersService`); consulta Drizzle. |
| `MyTicketsView`, `OrderList`, `TicketDetail` | crear | `src/modules/tickets/components/*.tsx` | Ver C7. |

## Contratos

### C1 — Numeración compartida y tipo de evento (`src/modules/checkout/utils/order-confirmation.ts`, extiende)

```ts
export type ConfirmationTicketUnit = Pick<ConfirmationTicket, "ticketTypeName" | "seatLabel" | "unitPrice">

/** Lo que PDF/ICS leen del evento. EventItem es asignable a este tipo. */
export type TicketDocumentEvent = Pick<EventItem, "id" | "title" | "startsAt" | "doorsOpenAt" | "venue">

/** Numera las unidades en el orden recibido: position 1..n, total = units.length,
 *  key = `${orderCode}-${position}`, qrSeed = Number(dígitos de orderCode) × 100 + position
 *  (si el código no tiene dígitos, la parte numérica vale 0). [] → []. Pura. */
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
  event: TicketDocumentEvent
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
- `ConfirmationActions`: mismas props y mismo aspecto. Usa el hook. "Ver mis entradas" es un `<Link href={MY_TICKETS_PATH}>` (con su icono `ArrowRight`) y no escribe en la región de estado.

### C3 — Tipos (`src/modules/tickets/types/ticket.types.ts`)

```ts
import type { ConfirmationTicket } from "@/modules/checkout/utils/order-confirmation"
import type { EventItem } from "@/modules/events/types/event.types"

/** ticket_status (System Design §6.3). */
export type TicketStatus = "valid" | "used" | "void"

/** Fila plana del query de Mis entradas. NO incluye qr_token. Una fila por ticket. */
export type UserTicketRow = {
  ticketId: string
  ticketStatus: TicketStatus
  ticketCreatedAt: Date
  orderId: string
  orderCode: string
  unitPriceCents: number
  ticketTypeName: string
  seatRowLabel: string | null
  seatNumber: string | null
  eventId: string
  eventTitle: string
  eventCoverKey: string | null
  eventStartsAt: Date
  eventDoorsOpenAt: Date | null
  venueId: string
  venueName: string
  venueCity: string
  venueAddressLine: string | null
}

/** Evento tal como lo muestra Mis entradas (D14). Serializable. */
export type UserOrderEvent = Pick<EventItem, "id" | "title" | "startsAt" | "doorsOpenAt" | "venue" | "imageAlt"> & {
  /** null → bloque muted con icono. */
  imageUrl: string | null
}

export type UserTicket = ConfirmationTicket & {
  /** formatTicketCode(orderCode, position): "TK-24817-01". */
  code: string
  status: TicketStatus
}

/** Entradas del usuario agrupadas por pedido. Serializable (viaja de server a client). */
export type UserOrder = {
  orderCode: string
  event: UserOrderEvent
  /** No vacío; position 1..n en orden. */
  tickets: UserTicket[]
}

export type OrdersByTime = { upcoming: UserOrder[]; past: UserOrder[] }
```

### C4 — Service (`src/modules/tickets/services/tickets.service.ts`)

```ts
export const ticketsService = {
  /** Lee de la base (Drizzle, getDb()): tickets con holder_user_id = userId, unidos a orders (code),
   *  order_items (unit_price_cents), ticket_types (name), events (title, cover_key, starts_at, doors_open_at),
   *  venues (id, name, city, address_line) y seats (row_label, seat_number; LEFT JOIN: tickets sin asiento).
   *  `userId` es users.id (uuid) de requireUser(); es el ÚNICO filtro de pertenencia. Sin entradas → [].
   *  Ordena por event.starts_at, orders.created_at, tickets.created_at, tickets.id y delega en buildUserOrders.
   *  No selecciona qr_token. No filtra por tickets.status (D8). */
  async getUserOrders(userId: string): Promise<UserOrder[]>,
}
```

### C5 — Utils (`src/modules/tickets/utils/user-orders.ts`, puros)

```ts
export const TICKET_STATUS_LABELS: Readonly<Record<TicketStatus, string>> // { valid: "Válida", used: "Usada", void: "Anulada" }

/** `${orderCode}-${String(position).padStart(2, "0")}`. ("TK-24817", 1) → "TK-24817-01"; 12 → "TK-24817-12". */
export function formatTicketCode(orderCode: string, position: number): string

/** Agrupa por orderId (orden de primera aparición). Dentro de cada pedido ordena por ticketCreatedAt y ticketId.
 *  event: UserOrderEvent según D14 (ISO con toISOString; doorsOpenAt ?? startsAt; address = venueAddressLine ?? "";
 *  imageUrl = eventCoverKey; imageAlt = eventTitle). Cada unidad: { ticketTypeName, unitPrice: unitPriceCents / 100,
 *  seatLabel: seatRowLabel y seatNumber presentes ? formatSeatPosition({ rowLabel, number: seatNumber }) : null }.
 *  tickets = createConfirmationTickets(orderCode, unidades) + { code: formatTicketCode(orderCode, position), status: ticketStatus }.
 *  [] → []. No muta la entrada. */
export function buildUserOrders(rows: readonly UserTicketRow[]): UserOrder[]

/** upcoming: event.startsAt >= now (inclusivo), por startsAt ascendente.
 *  past: event.startsAt < now, por startsAt descendente. Arrays nuevos; no muta la entrada. */
export function splitOrdersByEventDate(orders: readonly UserOrder[], now: Date): OrdersByTime

/** 1 → "1 entrada"; n ≠ 1 → "{n} entradas". */
export function getTicketCountLabel(count: number): string

/** Nombres de zona únicos en orden de aparición, unidos por ", ". [Sur, Sur, Oriente] → "Sur, Oriente". */
export function getOrderZonesLabel(tickets: readonly Pick<ConfirmationTicket, "ticketTypeName">[]): string

/** displayName sin espacios extremos si no queda vacío → si no, email si no está vacío → si no, "Sin nombre".
 *  null → "Sin nombre". */
export function getHolderName(user: { displayName?: string | null; email?: string | null } | null): string

/** El pedido con ese código; si no está (o orderCode es null), el primero; [] → null. */
export function resolveSelectedOrder(orders: readonly UserOrder[], orderCode: string | null): UserOrder | null

/** index + delta acotado a [0, total − 1]. total ≤ 0 → 0. */
export function stepTicketIndex(index: number, delta: -1 | 1, total: number): number
```

### C6 — Componentes

```ts
// src/modules/tickets/components/my-tickets-view.tsx — "use client"
export type MyTicketsViewProps = {
  orders: readonly UserOrder[]
  /** ISO; "ahora" del servidor para separar Próximas/Pasadas (D3). */
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
  - Renderiza `<h1>` y `Tabs` con dos `TabsTrigger` ("Próximas (n)", "Pasadas (n)") y dos `TabsContent`.
  - En cada panel, `selected = resolveSelectedOrder(lista, selectedOrderCode)`: si es `null`, estado vacío (D11); si no, `OrderList` + `<TicketDetail key={selected.orderCode} …>`.
  - Ids únicos por panel con `useId`.
- **`OrderList`**
  - `<ul aria-label="Pedidos">` con un `<button type="button">` por pedido. El seleccionado lleva `aria-current="true"`; los demás no tienen el atributo. Todos llevan `aria-controls={controlsId}`. Clic → `onSelect(orderCode)`.
  - Contenido según "Diseño"; usa `getTicketCountLabel` y `getOrderZonesLabel`. Miniatura: `imageUrl` o bloque muted (D14).
- **`TicketDetail`**
  - Estado local `ticketIndex` (inicial 0). Anterior/siguiente usan `stepTicketIndex`. "Entrada {position} de {total}". Anterior `aria-disabled` en la primera y siguiente en la última (`focusableWhenDisabled`).
  - `dl`: Zona, Asiento (solo si `seatLabel`), Titular (`holderName`), Código (`ticket.code`) y Estado (`TICKET_STATUS_LABELS[ticket.status]`, color según D8).
  - Acciones con `useTicketDownloads({ event: order.event, orderCode: order.orderCode, tickets: order.tickets })`. Mientras genera, el botón PDF muestra `Loader2` (`motion-reduce:animate-none`) y `aria-busy`.
  - `<article id={id} aria-labelledby={<id del h2>}>`.

### C7 — Página (`src/app/(site)/my-tickets/page.tsx`, reemplaza el placeholder de la 013)

```tsx
export const metadata: Metadata = { title: "Mis entradas — Ticketera", robots: { index: false } }

export default async function MyTicketsPage() {
  const { userId, displayName, email } = await requireUser({ returnTo: MY_TICKETS_PATH })
  const orders = await ticketsService.getUserOrders(userId)
  // <MyTicketsView orders={orders} referenceDate={new Date().toISOString()}
  //   holderName={getHolderName({ displayName, email })} />
}
```

- Solo composición. Sin `searchParams` ni parámetros de ruta. El redirect de `requireUser` no se captura.

## Tareas

### Preparación (serie, en este orden)

- **P1** Agregar Tabs de shadcn: `npx shadcn@latest add tabs`. Archivos: `src/components/ui/tabs.tsx` (generado, no se edita a mano).
- **P2** Checkout y seating: numeración compartida y tipo de evento (C1), tipos de PDF/ICS, hook de descargas (C2), `ConfirmationActions` y ampliación de tipo de `formatSeatPosition`, con tests. Archivos:
  - `src/modules/checkout/utils/order-confirmation.ts`
  - `src/modules/checkout/utils/order-confirmation.test.ts`
  - `src/modules/checkout/utils/ticket-pdf.ts`
  - `src/modules/checkout/utils/event-calendar.ts`
  - `src/modules/checkout/hooks/use-ticket-downloads.ts`
  - `src/modules/checkout/components/confirmation-actions.tsx`
  - `src/modules/checkout/components/confirmation-actions.test.tsx`
  - `src/modules/seating/utils/seat-selection.ts`
- **P3** Contratos de `tickets`: tipos, utils y service, con tests (C3–C5). Archivos:
  - `src/modules/tickets/types/ticket.types.ts`
  - `src/modules/tickets/utils/user-orders.ts`
  - `src/modules/tickets/utils/user-orders.test.ts`
  - `src/modules/tickets/services/tickets.service.ts`
  - `src/modules/tickets/services/tickets.service.test.ts`
- Verificación acotada al cerrar P2 y P3: `npx vitest run src/modules/checkout src/modules/seating src/modules/tickets` y `npm run lint`.

### Paralelo (archivos disjuntos; nadie corre `npm install` ni `npm run build`)

- **T1** Vista y lista de pedidos (C6: `MyTicketsView`, `OrderList`, estados vacíos). Importa `TicketDetail` por su contrato: si T2 no terminó, puede no compilar todavía; se verifica en I1. Archivos:
  - `src/modules/tickets/components/my-tickets-view.tsx`
  - `src/modules/tickets/components/order-list.tsx`
- **T2** Entrada seleccionada (C6: `TicketDetail`, navegación, `dl` y acciones). Archivos:
  - `src/modules/tickets/components/ticket-detail.tsx`

### Integración (serie)

- **I1** Página, test de la vista y corrección del doc. Archivos:
  - `src/app/(site)/my-tickets/page.tsx` (reemplaza el de la 013)
  - `src/modules/tickets/components/my-tickets-view.test.tsx`
  - `docs/design/design-system.md`: solo §2.3.5, donde "el estado "Válida" de Mis entradas (013)" pasa a "(016)".

**Tamaño:** 19 archivos (14 de código, 1 generado por la CLI; 5 de tests; 1 línea de doc), 1 menos que antes por eliminar el mock, pero con el service Drizzle. Supera la guía de ~8. Si el aprobador prefiere partir: **016a** = P1–P3 (lectura y contratos, sin UI) y **016b** = T1, T2, I1. La partición no cambia contratos.

**Archivos existentes que se modifican:** `order-confirmation.ts` (+ test), `ticket-pdf.ts`, `event-calendar.ts`, `confirmation-actions.tsx` (+ test), `seat-selection.ts`, `src/app/(site)/my-tickets/page.tsx` (013), `docs/design/design-system.md` (1 línea).

## Criterios de aceptación

- [ ] AC1 Sin sesión, `/my-tickets` redirige a `/sign-in?redirect_url=%2Fmy-tickets` (proxy de la 013). Con sesión, la página llama `requireUser({ returnTo: "/my-tickets" })` antes de leer datos, tiene `<title>` "Mis entradas — Ticketera" y `robots` noindex.
- [ ] AC2 **Aislamiento por titular.** `ticketsService.getUserOrders(userId)` filtra por `tickets.holder_user_id = userId` y el `userId` que la página le pasa es el de `requireUser()`. La página no lee `searchParams` ni parámetros de ruta, y no existe endpoint o Server Action en esta spec que acepte un id de usuario. El test del service verifica que la condición `WHERE` contiene `holder_user_id` y el `userId` recibido.
- [ ] AC3 El resultado no contiene `qr_token` (ni en `UserTicketRow` ni en `UserOrder`).
- [ ] AC4 Con pedidos, se ve el `<h1>` "Mis entradas" y un `tablist` con "Próximas (n)" (seleccionada, `aria-selected="true"`) y "Pasadas (m)", con n y m según la fecha del evento respecto de `referenceDate`. No hay nota de "modo demo".
- [ ] AC5 Las pestañas se manejan con teclado: flechas izquierda/derecha mueven el foco a la otra; Enter o Espacio la activa y muestra su `tabpanel`.
- [ ] AC6 En Próximas, la lista `aria-label="Pedidos"` muestra un botón por pedido con título, "{fecha corta} · {ciudad}" y "{n entradas} · {zonas}", ordenados por fecha del evento ascendente. Bajo `lg` no se muestran las zonas.
- [ ] AC7 Al cargar, el primer pedido tiene `aria-current="true"` y borde `primary`; los demás no tienen `aria-current`. Al hacer clic en otro pedido, `aria-current` y el borde pasan a ese pedido, el panel muestra su evento (`<h2>`) y vuelve a "Entrada 1 de {M}".
- [ ] AC8 El panel de la entrada muestra: imagen (o bloque muted si no hay `imageUrl`) con badge de mes y día; `<h2>` con el título; fecha larga, hora y "{lugar}, {ciudad}"; perforación con muescas y QR decorativo; "Entrada N de M"; `dl` con Zona, Titular, Código (`TK-XXXXX-NN`) y Estado (verde solo "Válida"). Si la entrada tiene asiento, además "Asiento: Fila F, asiento 8".
- [ ] AC9 En un pedido con 3 entradas: "Entrada anterior" está `aria-disabled="true"` en la 1 de 3; "Entrada siguiente" lleva a "Entrada 2 de 3" y a "Entrada 3 de 3" (Código `-02`, `-03`), donde siguiente queda `aria-disabled="true"` y el foco sigue en ese botón. "Entrada N de M" es `aria-live="polite"`. En un pedido de 1 entrada, ambos botones están deshabilitados.
- [ ] AC10 Estados reales: una entrada `used` muestra "Usada" y una `void` "Anulada", ambas sin color de éxito.
- [ ] AC11 "Titular" muestra `displayName` del `AccessContext`; si es vacío o nulo, el email; si tampoco hay, "Sin nombre". La página no llama a `currentUser()`.
- [ ] AC12 "Descargar PDF" descarga `ticketera-{orderCode}.pdf`, con una página por entrada del pedido seleccionado (las del usuario), y muestra los mensajes de la 012 en una región `role="status"`. Mientras genera, el botón queda `aria-busy` y no inicia una segunda generación. "Agregar al calendario" descarga `ticketera-{orderCode}.ics`. En móvil se ven "PDF" y "Calendario", pero el nombre accesible sigue siendo "Descargar PDF" / "Agregar al calendario".
- [ ] AC13 **Estados vacíos.** Sin pedidos pasados, "Pasadas (0)" muestra "Aún no tienes eventos pasados", "Cuando vayas a tu primer evento, lo verás aquí." y el link "Explorar eventos" → `/events`. Sin pedidos próximos, "Próximas (0)" muestra "No tienes entradas para próximos eventos" con "Explorar eventos". Con la base sin pedidos (precondición D0), la página muestra ambos estados vacíos sin errores.
- [ ] AC14 Con pedidos pasados (fecha de referencia posterior, en test), "Pasadas" lista esos pedidos con el mismo layout, del más reciente al más antiguo.
- [ ] AC15 Desktop (`lg+`): lista de 400px a la izquierda y entrada a la derecha (grid `25rem | 1fr`). Desde `xl`, QR a la izquierda y datos a la derecha. Móvil (390px): pestañas a todo el ancho, lista horizontal con scroll y la entrada debajo (QR centrado, nav "anterior | Entrada N de M | siguiente", acciones en 2 columnas). Ningún desborde horizontal a 390px.
- [ ] AC16 Claro y oscuro: todo con tokens, salvo la caja blanca del QR. Todo interactivo tiene foco visible, y el foco de la lista horizontal no queda recortado.
- [ ] AC17 En la confirmación, "Ver mis entradas" es un link (`<a href="/my-tickets">`) con el mismo aspecto que antes. Ya no existe el mensaje "Mis entradas estará disponible pronto…". "Agregar al calendario" y "Descargar PDF" de la confirmación se comportan igual que en la 012 (sus tests siguen pasando).
- [ ] AC18 El header no cambia: "Mis entradas" marca `aria-current="page"` en `/my-tickets` (013).
- [ ] AC19 Estructura: `src/app/(site)/my-tickets/page.tsx` solo compone. La lógica (agrupar filas, separar por fecha, códigos, etiquetas, índice, nombre del titular) vive en `src/modules/tickets/utils/user-orders.ts`; los componentes no importan `src/db` ni el service; ningún componente de `tickets` duplica los manejadores de PDF/ICS (usan `useTicketDownloads`). No quedan mocks de pedidos en el código.
- [ ] AC20 `npm run lint`, `npm run test` y `npm run build` pasan sin errores ni warnings nuevos.

## Tests obligatorios

- **`src/modules/checkout/utils/order-confirmation.test.ts`** (se agregan casos; los existentes no cambian):
  - `createConfirmationTickets("TK-24817", 3 unidades)` → `position` 1..3, `total` 3, `key` "TK-24817-1".."-3", `qrSeed` 2481701..2481703 y campos de cada unidad conservados;
  - `[]` → `[]`; código sin dígitos → `qrSeed` = `position` y no `NaN`;
  - `buildConfirmationTickets` produce lo mismo que `createConfirmationTickets` con las unidades equivalentes (zona y teatro).
- **`src/modules/checkout/components/confirmation-actions.test.tsx`** (cubre `useTicketDownloads` a través de su consumidor original; los casos de calendario, PDF, doble clic y errores **no cambian**): se reemplaza "Ver mis entradas mantiene su mensaje mock" por: es un link con `href="/my-tickets"` y la región de estado sigue vacía.
- **`src/modules/tickets/utils/user-orders.test.ts`**:
  - `formatTicketCode`: 1 → "TK-24817-01"; 12 → "TK-24817-12".
  - `buildUserOrders`:
    - filas de 2 pedidos intercalados → 2 `UserOrder` en orden de primera aparición, entradas ordenadas por `ticketCreatedAt`/`ticketId`, `position`/`total` por pedido, `code` "…-01", `status` copiado;
    - `unitPrice` = centavos / 100; `seatLabel` "Fila F, asiento 8" con `seatNumber` "8", `null` sin asiento;
    - `doorsOpenAt` nulo → `startsAt`; `venue.address` "" si no hay `addressLine`; `imageUrl` nulo se conserva; fechas en ISO;
    - `[]` → `[]`; no muta la entrada;
    - un pedido con entradas de varios estados (`valid`, `used`, `void`) conserva cada uno.
  - `splitOrdersByEventDate`: `now` entre dos eventos → ambas listas (Próximas asc, Pasadas desc); `startsAt === now` → Próximas; todos futuros → `past: []`; todos pasados → `upcoming: []`; no muta.
  - `getTicketCountLabel`: 1 → "1 entrada"; 2 → "2 entradas".
  - `getOrderZonesLabel`: [Sur, Sur, Oriente] → "Sur, Oriente".
  - `getHolderName`: `displayName` "  Ana Torres " → "Ana Torres"; vacío o null con email → email; sin ambos o `null` → "Sin nombre".
  - `resolveSelectedOrder`: código existente → ese pedido; desconocido o `null` → el primero; `[]` → `null`.
  - `stepTicketIndex`: (0, −1, 3) → 0; (0, 1, 3) → 1; (2, 1, 3) → 2; total 0 → 0.
  - `TICKET_STATUS_LABELS`: "Válida", "Usada", "Anulada".
- **`src/modules/tickets/services/tickets.service.test.ts`** (`vi.mock("@/db/client")` con una cadena Drizzle falsa que devuelve filas fijas y captura el argumento de `where`; sin base real):
  - `getUserOrders("uuid-x")` devuelve los `UserOrder` armados desde las filas (mismo resultado que `buildUserOrders`);
  - el `where` capturado, renderizado con `new PgDialect().sqlToQuery(...)`, contiene `holder_user_id` y el parámetro `"uuid-x"` (AC2);
  - sin filas → `[]`;
  - la selección no incluye `qr_token` (las columnas pedidas no contienen `qrToken`) (AC3).
- **`src/modules/tickets/components/my-tickets-view.test.tsx`** (RTL + user-event; `vi.mock("@/lib/download")` y `generateTicketPdf` como en `confirmation-actions.test.tsx`; fixtures construidas en el test con `buildUserOrders` a partir de filas sintéticas: un pedido de 3 entradas de zona, uno de 1 entrada con asiento y uno de 2):
  1. pestañas "Próximas (3)" seleccionada y "Pasadas (0)";
  2. primer pedido con `aria-current="true"` y el resto sin el atributo;
  3. anterior/siguiente: estados y códigos de AC9, y `aria-live`;
  4. clic en el segundo pedido → `aria-current` se mueve, `<h2>` nuevo, "Entrada 1 de 1", asiento y ambos botones `aria-disabled`;
  5. Titular = `holderName` recibido; Estado "Válida"; una entrada `used`/`void` muestra "Usada"/"Anulada";
  6. "Descargar PDF" → `generateTicketPdf` con 3 páginas y `downloadBlob(…, "ticketera-<código>.pdf")`; "Agregar al calendario" → `".ics"`;
  7. teclado: foco en "Próximas", ArrowRight → foco en "Pasadas"; Enter → estado vacío con "Explorar eventos" (`href="/events"`);
  8. `referenceDate` posterior a un evento → "Próximas (2)" / "Pasadas (1)", y Pasadas lista ese pedido;
  9. `orders=[]` → estado vacío en Próximas y en Pasadas;
  10. imagen ausente (`imageUrl: null`) → no hay `<img>` roto y se ve el bloque muted.
- No requieren test unitario propio: `OrderList` y `TicketDetail` (cubiertos por el test de la vista), `ticket.types.ts` y la página.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (solo al final, lo corre el reviewer; nunca durante el bloque paralelo)
- Manual (requiere 013–015 y 019–020 `done`, claves de Clerk y `DATABASE_URL` en `.env.local`; `npm run dev`):
  1. Sin sesión, abrir `/my-tickets` → `/sign-in?redirect_url=%2Fmy-tickets`. Ingresar → vuelve a `/my-tickets`.
  2. Con la base sin pedidos (estado actual): se ven los estados vacíos de Próximas y de Pasadas, sin errores; "Explorar eventos" lleva a `/events`.
  3. Con datos (solo si se insertaron pedidos/entradas de prueba a mano en la base, o tras la spec de compra real): comparar con §2.9 y "Diseño" en desktop (1440px), claro y oscuro; recorrer las entradas con mouse y teclado; probar 1024–1279px y 390px; "Descargar PDF" y "Agregar al calendario".
  4. Con dos usuarios con entradas distintas: cada uno ve **solo** las suyas.
  5. Hacer una compra con el checkout mock → "Ver mis entradas" navega a `/my-tickets`; la compra no aparece (D0).

## Preguntas abiertas

1. **Q1 — Datos para ver y verificar la pantalla antes de la compra real.** Hoy `orders`/`tickets` no se crean en ninguna parte y el seed de la 022 no los genera. Opciones:
   - **(a, supuesta por esta spec)** Entregar solo la lectura (tests + estados vacíos) y verificar con datos cuando exista la compra real; inserciones manuales para pruebas.
   - **(b)** Agregar una spec previa o hermana: seed de desarrollo de pedidos y entradas (`db:seed:orders --user-email`, no ejecutado, como la 022) para un usuario dado.
   - **(c)** Posponer la 016 hasta tener la spec de compra real.
   Decide el usuario; cambiar a (b) o (c) no altera los contratos de esta spec.
2. **Q2 — Nota de "modo demo".** Se retiró (la pantalla ya no es mock). ¿Se quiere un aviso temporal cuando no hay pedidos, mientras el checkout siga siendo mock ("Tus compras de prueba todavía no se guardan aquí")? Por defecto: no.
3. Criterios propios revisables: D3 (hora real en vez de `getReferenceDate`), D5 (selección local), D7 (`Tabs` en lugar de botones `aria-pressed`), D8 (se listan entradas `used`/`void`), D9 (PDF del pedido completo, solo las entradas del usuario), D14 (`cover_key` como imagen; bloque muted si falta).

**Resueltas desde la versión anterior:** el mock de pedidos y el "ahora" fijo (D3/D6 previos) quedan obsoletos; el titular ya no se obtiene de `currentUser()` (D4); el QR igual al de la confirmación (AC8 previo) se retira porque el `qrSeed` sale ahora del código real del pedido.
