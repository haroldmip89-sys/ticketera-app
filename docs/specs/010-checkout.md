# 010 — Checkout: datos del comprador y pago (paso 2 de la compra, UI con datos mock)

- **Estado:** done (APPROVED por reviewer en iteración 1)
- **Modo:** SDD
- **Módulo(s):** `src/modules/checkout` (extiende: vista de checkout, schema del formulario, pedido mock, temporizador). Extiende `src/modules/seating` (validación de asientos que llegan por URL) y `src/modules/events` (helper de ruta de confirmación). Ruta nueva: `src/app/(purchase)/events/[slug]/checkout/page.tsx`. UI nueva de shadcn en `src/components/ui`.
- **Depende de:** 001–008 en `done`. La 009 (búsqueda `/events`, en redacción en paralelo) se implementa antes y probablemente agrega `checkbox` y `label` de shadcn: aquí se declaran como "agregar si no existe".
- **Consumida por:** `docs/specs/011-purchase-confirmation.md`, que usa los contratos de C1 (pedido mock, totales, `buildConfirmationHref`) y C3 (`parseCompleteSeatSelection`, `formatSeatPosition`).
- **Diseño fuente:** `docs/design/reference-design.md` §1 y §2.6, y los lienzos `Checkout` / `CheckoutMobile`, que se transcriben abajo porque la ruta original no es durable. Restricciones del system design aprobado: `docs/superpowers/specs/2026-10-04-system-design-design.md` §5.2, §5.3, §6.4 (`platform_settings`, `orders`) y §11.

## Objetivo

Crear `/events/[slug]/checkout`, el paso 2 ("Datos y pago") del flujo de compra, para eventos por zona y de teatro. Incluye:

- temporizador de reserva con estado de vencida;
- datos del comprador: nombre, email y celular opcional;
- pago con tarjeta como **único método**, con la apariencia de Stripe Payment Element y el aviso "Modo demo", solo mock;
- aceptación de términos;
- resumen con subtotal, **cargo por servicio** y total calculados en centavos enteros;
- CTA "Pagar $X", que lleva a la ruta de confirmación con un pedido mock `TK-XXXXX`.

Todo es UI con datos mock: no se envía ni se guarda nada. Debe verse bien en desktop y móvil, en tema claro y oscuro, y el proyecto debe quedar en verde.

## Fuera de alcance

- **011:** página de confirmación (`/events/[slug]/confirmation`), el stepper con conectores completados y la variante del header sin "volver". **Entre la 010 y la 011, "Pagar" navega a una ruta que da 404.** Se acepta, igual que pasó entre la 007 y la 008.
- Integración real con Stripe (Payment Element, PaymentIntent, webhooks, Connect).
- **Billeteras (Apple Pay, Google Pay):** no se muestran ni como opción mock (decisión del usuario). Se agregan con Stripe real, junto con el selector de método de pago.
- Reservas reales: `createReservation`, `expires_at` y bloqueo de inventario. La ruta futura `/checkout/[reservationId]` y la exigencia de sesión vendrán con backend.
- Crear órdenes, enviar correos (Resend) y persistir datos del comprador.
- Páginas de Términos y condiciones y de Política de privacidad. Por eso hoy esos textos no son links.
- Mis entradas, PDF y calendario reales.
- Ciudades y zona horaria de EE. UU. **Pendiente:** los mocks siguen con ciudades de Perú y `APP_TIME_ZONE = "America/Lima"`. No se cambian aquí (system design §11).
- **`round2` duplicado** en `ticket-selection.ts`, `theater-layout.ts` y `seat-selection.ts`: no entra en esta spec. La 010 calcula el dinero en centavos enteros con sus propios helpers (C1) y no usa `round2`. Mover el redondeo a `src/lib` toca tres archivos ajenos al checkout (uno es geometría del mapa) y llevaría esta spec a ~22 archivos. Se propone como chore en modo directo o dentro de la preparación de la 011 (ver Preguntas abiertas).
- **Botón de compra/"Agotado" duplicado** en hero, panel y barra de la 006: el checkout no lo reutiliza, así que no se unifica. Tampoco se unifica `ContinueAction`, duplicado entre `OrderSummary` (007) y `SeatSelectionSummary` (008): el checkout usa un botón `submit` distinto.
- Formateo automático de la tarjeta mientras se escribe (agrupar de a 4 o insertar la "/").

## Precondiciones (bloqueantes)

- 008 en `done` (`/seats` existe y envía `?tickets=…&seats=…` al checkout con `buildSeatCheckoutHref`).
- Sin instalar dependencias npm: `zod` 4, `@base-ui/react` y `lucide-react` ya están. **No** se agrega `react-hook-form` (KISS: el formulario es pequeño y se valida con zod).

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `PurchaseFlowHeader` | reutilizar | `src/modules/checkout/components/purchase-flow-header.tsx` | `currentStep={2}`, `mobileTitle="Datos y pago"`. No se modifica en la 010 (los conectores completados en índigo llegan en la 011). |
| `EventPurchaseSummary` | extender | `src/modules/checkout/components/event-purchase-summary.tsx` | Prop opcional `backLabel` (default `"Volver al evento"`). Su link "volver" solo se ve desde `lg`: en móvil el "volver" es el del `PurchaseFlowHeader`, que ya recibe `backLabel`. |
| `/seats` page | extender (1 prop) | `src/app/(purchase)/events/[slug]/seats/page.tsx` | Pasa `backLabel="Volver a Entradas"` a `EventPurchaseSummary` (pendiente de la 008). |
| `OrderSummary` | **no** reutilizar | `src/modules/checkout/components/order-summary.tsx` | Su CTA es un `Link` "Continuar" y su barra muestra "Total · N entradas". El checkout necesita un `submit` "Pagar $X", el desglose del cargo por servicio, "Cambiar entradas" y el aviso de términos. Extenderlo obligaría a meter props que la 007 no usa (ISP). Se crea `CheckoutSummary`, que reutiliza el mismo lenguaje visual. |
| Contrato `data-mobile-action-bar` | reutilizar | `src/app/globals.css` (006) | La barra "Pagar" lo cumple sin cambiar el token: su alto de contenido es ≤ `--mobile-action-bar-height` (5rem). Ver §Móvil. |
| `parseTicketSelection`, `getSelectionLines`, `getTotalQuantity`, `buildPurchaseStepHref`, `serializeTicketSelection`, `TICKETS_SEARCH_PARAM`, `SelectionLine`, `TicketSelection` | reutilizar | `src/modules/checkout/utils/ticket-selection.ts` | Sin cambios. |
| `buildSeatSelectionSummary`, `getSeatQuotas`, `createSeatLookup`, `SEATS_SEARCH_PARAM` | reutilizar | `src/modules/seating/utils/seat-selection.ts` | |
| `parseCompleteSeatSelection`, `formatSeatPosition` | crear (en archivo existente) | `src/modules/seating/utils/seat-selection.ts` | No existe un parser de `?seats=`. La 008 solo serializa. |
| `seatingService.getSeatMap`, `eventsService.getBySlug` / `getTicketTypes` | reutilizar | services existentes | |
| `formatPrice`, `formatDateShort` | reutilizar | `src/lib/format.ts` | `formatPrice` ya da "$67.50". |
| `getEventTicketsHref`, `getEventSeatsHref`, `getEventCheckoutHref` | reutilizar | `src/modules/events/utils/event-routes.ts` | |
| `getEventConfirmationHref` | crear (en archivo existente) | `src/modules/events/utils/event-routes.ts` | La 010 navega a esa ruta y la 011 crea la página. |
| `Input`, `Button`, `Empty*` | reutilizar | `src/components/ui/` | `Input` con clases del `.tk-field` del diseño. `Empty` para el estado de reserva vencida (mismo patrón que `EventNotFound`). |
| `Field`, `FieldLabel`, `FieldError`, `FieldDescription` | agregar de shadcn | `src/components/ui/field.tsx` | `npx shadcn@latest add field`. Existe en base-nova (verificado con `npx shadcn@latest view field`). Depende de `label` y `separator` (este ya existe: **no** sobrescribirlo). |
| `Collapsible` | agregar de shadcn | `src/components/ui/collapsible.tsx` | `npx shadcn@latest add collapsible` (Base UI `Collapsible`). Resumen plegable en móvil. |
| `Checkbox` | agregar de shadcn **si no existe** | `src/components/ui/checkbox.tsx` | Probablemente lo agrega la 009. |
| `RadioGroup` | no se usa | `src/components/ui/radio-group.tsx` | Con tarjeta como único método no hay selector de método de pago. Si la 009 lo agregó, no se toca. |
| `Label` | agregar de shadcn **si no existe** | `src/components/ui/label.tsx` | Probablemente lo agrega la 009. `field` lo requiere. |
| Pedido mock (settings, centavos, totales, código, href de confirmación) | crear | `src/modules/checkout/utils/checkout-order.ts` | No existe nada equivalente. Los helpers de centavos viven en el módulo porque hoy solo los usa checkout (YAGNI: pasan a `src/lib` cuando aparezca un segundo consumidor). |
| Schema del formulario | crear | `src/modules/checkout/schemas/checkout-form.schema.ts` | Primer schema zod del proyecto. |
| `useReservationCountdown` + helpers puros | crear | `src/modules/checkout/hooks/use-reservation-countdown.ts` | No existe un temporizador. `featured-carousel` usa animación CSS, no aplica. |
| `ReservationTimerNotice`, `ReservationExpired` | crear | `src/modules/checkout/components/reservation-notice.tsx` | |
| `CheckoutFields` | crear | `src/modules/checkout/components/checkout-fields.tsx` | Comprador + pago + términos (controlado). |
| `CheckoutSummary`, `CheckoutSummaryCollapsible`, `CheckoutPayBar` | crear | `src/modules/checkout/components/checkout-summary.tsx` | |
| `CheckoutView` | crear | `src/modules/checkout/components/checkout-view.tsx` | Client component: estado del formulario, timer y envío. |
| `use-prefers-reduced-motion` | no se usa | `src/hooks/` | Basta con `motion-reduce:` de CSS: no hay animación controlada por JS. |
| `Select` | no se usa | `src/components/ui/select.tsx` | Se elimina el selector DNI/CE/Pasaporte de la referencia. |

## Contratos

### C1 — Pedido mock (`src/modules/checkout/utils/checkout-order.ts`)

```ts
/** Mock de `platform_settings` (system design §6.4). Cargo confirmado por el usuario: 10 % + $1.50 por pedido; reserva de 10 min. */
export type CheckoutSettings = {
  serviceFeeBps: number          // puntos básicos: 1000 = 10 %
  serviceFeeFixedCents: number   // cargo fijo por pedido, en centavos
  reservationMinutes: number
}
export const CHECKOUT_SETTINGS: Readonly<CheckoutSettings> = {
  serviceFeeBps: 1000,
  serviceFeeFixedCents: 150,
  reservationMinutes: 10,
}

export type OrderTotals = { subtotalCents: number; serviceFeeCents: number; totalCents: number }

/** Math.round(amount × 100). Lanza RangeError si amount no es finito o es < 0. 19.99 → 1999. */
export function toCents(amount: number): number
/** cents / 100 (para formatPrice). 6750 → 67.5. */
export function fromCents(cents: number): number
/** Σ toCents(line.unitPrice) × line.quantity (enteros: sin error de coma flotante). [] → 0. */
export function getSubtotalCents(lines: readonly SelectionLine[]): number
/** Fórmula §5.3: serviceFeeCents = Math.round(subtotalCents × bps / 10000) + fixedCents; totalCents = subtotal + fee.
 *  subtotalCents = 0 → { 0, 0, 0 } (sin cargo en un pedido vacío). Lanza RangeError si subtotalCents no es entero ≥ 0. */
export function calculateOrderTotals(
  subtotalCents: number,
  settings?: Pick<CheckoutSettings, "serviceFeeBps" | "serviceFeeFixedCents"> // default CHECKOUT_SETTINGS
): OrderTotals

export const ORDER_SEARCH_PARAM = "order"
/** Formato de `orders.code` (§6.4). */
export const ORDER_CODE_PATTERN = /^TK-\d{5}$/
/** "TK-" + (10000 + Math.floor(random() × 90000)). random() = 0 → "TK-10000"; 0.99999 → "TK-99999". */
export function createMockOrderCode(random?: () => number /* default Math.random */): string
export function isOrderCode(value: unknown): value is string

/** getEventConfirmationHref(slug) + "?" + URLSearchParams en este orden:
 *  order=<orderCode>, tickets=<serializeTicketSelection(selection, ticketTypes)> y, solo si seatIds no está vacío,
 *  seats=<seatIds unidos con ","> (en el orden recibido). Lanza Error si orderCode no cumple ORDER_CODE_PATTERN.
 *  NUNCA incluye datos del comprador ni de pago. */
export function buildConfirmationHref(input: {
  slug: string
  orderCode: string
  selection: TicketSelection
  ticketTypes: readonly TicketType[]
  seatIds?: readonly string[]
}): string
```

Ejemplo de referencia para tests y AC: evt-002 con 2 × Sur ($30). Subtotal 6000, cargo `round(6000 × 1000 / 10000) + 150 = 750`, total 6750: se muestra "$60", "$7.50" y "$67.50".

### C2 — Schema del formulario (`src/modules/checkout/schemas/checkout-form.schema.ts`)

```ts
/** Valores controlados del formulario (todo string salvo el checkbox). Tarjeta es el único método de pago:
 *  no hay campo de método (las billeteras llegan con Stripe real). */
export type CheckoutFormValues = {
  fullName: string
  email: string
  phone: string            // "" = no informado
  cardNumber: string
  cardExpiry: string
  cardCvc: string
  cardName: string
  acceptTerms: boolean
}
export type CheckoutFieldName = keyof CheckoutFormValues
export const EMPTY_CHECKOUT_FORM: CheckoutFormValues // strings vacíos, acceptTerms false
/** Orden visual de los campos: sirve para enfocar el primer campo inválido. */
export const CHECKOUT_FIELD_ORDER: readonly CheckoutFieldName[] // fullName, email, phone, cardNumber, cardExpiry, cardCvc, cardName, acceptTerms

/** `now` solo se usa para rechazar tarjetas vencidas (inyectable en tests). */
export function createCheckoutFormSchema(now?: Date /* default new Date() */): z.ZodType<CheckoutFormData, CheckoutFormValues>
export type CheckoutFormData = {
  fullName: string; email: string; phone: string | null
  card: { number: string; expiry: string; cvc: string; name: string }   // siempre presente
  acceptTerms: true
}
/** Primer mensaje por campo; {} si es válido. Los campos de tarjeta son siempre obligatorios. */
export function getCheckoutFieldErrors(
  values: CheckoutFormValues,
  now?: Date
): Partial<Record<CheckoutFieldName, string>>
```

Reglas (los strings se recortan con `trim` antes de validar; los mensajes son exactos):

| Campo | Válido | Mensaje si falta | Mensaje si es inválido |
|---|---|---|---|
| `fullName` | 2–100 caracteres | "Ingresa tu nombre completo." | más de 100: "El nombre puede tener hasta 100 caracteres." |
| `email` | `z.email()` (zod 4) | "Ingresa tu correo electrónico." | "Ingresa un correo válido, por ejemplo tu@email.com." |
| `phone` | **opcional**: `""` o solo espacios → `null`. Si viene: solo dígitos, espacios, `(`, `)`, `-`, `.` y un `+` inicial. Se quitan los no dígitos; si quedan 11 y el primero es `1`, se quita ese `1`. Deben quedar 10 dígitos y el primero entre 2 y 9. Salida: los 10 dígitos. | — | "Ingresa un celular de EE. UU. de 10 dígitos." |
| `cardNumber` | se quitan espacios y guiones; 13–19 dígitos; pasa Luhn | "Ingresa el número de tu tarjeta." | "Revisa el número de tu tarjeta." |
| `cardExpiry` | `MM/AA` o `MM / AA`, con MM entre 01 y 12. Año = 2000 + AA. Vale hasta el último día de ese mes, comparado con `now`. | "Ingresa el vencimiento." | formato: "Usa el formato MM/AA."; vencida: "La tarjeta está vencida." |
| `cardCvc` | 3 o 4 dígitos | "Ingresa el CVC." | "Ingresa el CVC de 3 o 4 dígitos." |
| `cardName` | 2–100 caracteres | "Ingresa el nombre que figura en la tarjeta." | — |
| `acceptTerms` | `true` | "Acepta los términos para continuar." | — |

La estructura interna (objeto plano, `transform` o `superRefine`) la decide el developer. Los tipos y mensajes de la tabla son el contrato.

### C3 — Asientos que llegan por URL (`src/modules/seating/utils/seat-selection.ts`, se añade)

```ts
/** value: string con ids separados por "," (array → primer valor; undefined/"" → sin ids). Conserva los ids que existen
 *  en seatMap.layout y no están en seatMap.soldSeatIds, sin repetir (gana el primero). Devuelve
 *  buildSeatSelectionSummary(layout, ticketTypes, ids, getSeatQuotas(layout, selection)) si queda isComplete;
 *  si no, null. Los asientos de zonas sin cuota se descartan (el resumen no los incluye). */
export function parseCompleteSeatSelection(
  value: string | string[] | undefined,
  seatMap: EventSeatMap,
  selection: TicketSelection,
  ticketTypes: readonly TicketType[]
): SeatSelectionSummary | null

/** "Fila F, asiento 12" (mismo texto que el resumen de la 008). */
export function formatSeatPosition(seat: { rowLabel: string; number: number }): string
```

### C4 — Ruta (`src/modules/events/utils/event-routes.ts`, se añade)

```ts
/** "/events/{slug}/confirmation" (paso 3, la página la crea la 011). */
export function getEventConfirmationHref(slug: string): string
```

**Por qué esta ruta:** está en el mismo grupo `(purchase)` (header del flujo, sin la navegación del sitio) y cuelga del slug, como `/tickets`, `/seats` y `/checkout`. Así no se inventa un recurso "pedido" que todavía no existe. Cuando haya backend, el checkout pasa a `/checkout/[reservationId]` y la confirmación a una ruta por pedido (§5.1). Eso queda fuera de alcance.

### C5 — `EventPurchaseSummary` (se extiende)

```ts
export type EventPurchaseSummaryProps = {
  event: EventItem
  backHref: string
  /** Texto del link "volver" (solo visible desde lg). Default: "Volver al evento". */
  backLabel?: string
}
```

### C6 — Componentes (props públicas)

```ts
// src/modules/checkout/hooks/use-reservation-countdown.ts
/** Math.max(0, Math.ceil((expiresAtMs − nowMs) / 1000)). */
export function getRemainingSeconds(expiresAtMs: number, nowMs: number): number
/** "MM:SS" con ceros a la izquierda; negativos → "00:00"; los minutos no se limitan (3600 → "60:00"). */
export function formatCountdown(totalSeconds: number): string
/** > 300 → ""; 61–300 → "Quedan menos de 5 minutos para completar el pago.";
 *  1–60 → "Queda menos de 1 minuto para completar el pago."; 0 → "". */
export function getCountdownAnnouncement(remainingSeconds: number): string
/** Primer render (SSR incluido): remainingSeconds = durationSeconds. Al montar fija expiresAt = Date.now() + duración
 *  y, cada 1000 ms, recalcula con getRemainingSeconds(expiresAt, Date.now()), así tolera timers que se atrasan.
 *  En 0 detiene el intervalo. Limpia al desmontar. Si cambia durationSeconds, reinicia. Nunca devuelve negativos.
 *  No llama setState de forma síncrona en el cuerpo del effect (regla react-hooks del lint). */
export function useReservationCountdown(durationSeconds: number): { remainingSeconds: number; isExpired: boolean }

// src/modules/checkout/components/reservation-notice.tsx
export type ReservationTimerNoticeProps = { remainingSeconds: number }
export type ReservationExpiredProps = { reselectHref: string; reselectLabel: string; reservationMinutes: number }

// src/modules/checkout/components/checkout-fields.tsx
export function getCheckoutFieldId(name: CheckoutFieldName): string   // "checkout-" + name
export function getCheckoutErrorId(name: CheckoutFieldName): string   // "checkout-" + name + "-error"
export type CheckoutFieldsProps = {
  values: CheckoutFormValues
  /** Solo los errores que ya se deben mostrar (campo tocado o intento de pago). */
  errors: Partial<Record<CheckoutFieldName, string>>
  onValueChange: <K extends CheckoutFieldName>(name: K, value: CheckoutFormValues[K]) => void
  onFieldBlur: (name: CheckoutFieldName) => void
}

// src/modules/checkout/components/checkout-summary.tsx
export type PayState =
  | { status: "blocked"; hint: string }   // aria-disabled + aviso visible
  | { status: "ready" }
  | { status: "pending" }                 // "Procesando pago…"
type SummaryContent = {
  lines: SelectionLine[]
  /** ticketTypeId → ["Fila F, asiento 12", …]; vacío en eventos por zona. */
  seatLabels: ReadonlyMap<string, readonly string[]>
  totals: OrderTotals
  changeTicketsHref: string
}
export type CheckoutSummaryProps = SummaryContent & { payState: PayState }                      // aside, solo lg
export type CheckoutSummaryCollapsibleProps = SummaryContent & { event: EventItem; totalQuantity: number } // solo < lg
export type CheckoutPayBarProps = { totals: OrderTotals; payState: PayState }                    // solo < lg

// src/modules/checkout/components/checkout-view.tsx
export type CheckoutViewProps = {
  event: EventItem
  ticketTypes: TicketType[]
  selection: TicketSelection          // ya validada y no vacía
  seatSummary: SeatSelectionSummary | null // completa en teatros; null en eventos por zona
  backHref: string                    // /tickets?tickets=… (zona) o /seats?tickets=… (teatro)
  backLabel: string                   // "Volver a Entradas" | "Volver a Asientos"
  changeTicketsHref: string           // /tickets?tickets=…
}
```

### C7 — Página (`src/app/(purchase)/events/[slug]/checkout/page.tsx`)

`searchParams` es una Promise en Next 16 (`await props.searchParams`); se tipa con `PageProps<"/events/[slug]/checkout">`, igual que `/seats`. La página es Server Component y solo compone:

1. Si el evento no existe: `notFound()`.
2. `selection = parseTicketSelection(tickets, ticketTypes)`. Si `getTotalQuantity(selection) === 0`: `redirect(getEventTicketsHref(slug))`. Esto cubre la selección vacía o inválida, los ids de otro evento y las zonas agotadas.
3. Si `event.seatSelection === "seat"`:
   - si no hay `seatMap`, `notFound()` (igual que `/seats`);
   - `seatSummary = parseCompleteSeatSelection(seats, seatMap, selection, ticketTypes)`;
   - si es `null`, `redirect(buildPurchaseStepHref(getEventSeatsHref(slug), selection, ticketTypes))`, que conserva las cantidades;
   - `backHref` = ese mismo href de `/seats`, con `backLabel="Volver a Asientos"`.
4. Si el evento es por zona, se ignora `seats`, `seatSummary = null` y `backHref = buildPurchaseStepHref(getEventTicketsHref(slug), selection, ticketTypes)`, con `backLabel="Volver a Entradas"`.
5. `changeTicketsHref = buildPurchaseStepHref(getEventTicketsHref(slug), selection, ticketTypes)`.
6. Renderiza `PurchaseFlowHeader currentStep={2} backHref backLabel mobileTitle="Datos y pago"` y, dentro de `<main className="flex-1 bg-secondary">`, el `CheckoutView`.
7. `generateMetadata`: `{ title: "Datos y pago — {event.title}", robots: { index: false } }`, o `{}` si el evento no existe.

## Especificación de la vista

### Estructura y estado (`CheckoutView`, `"use client"`)

- **Estado del componente:**
  - `values` (inicial `EMPTY_CHECKOUT_FORM`);
  - `touched: Set<CheckoutFieldName>`, que se marca en blur y, en el checkbox, también al cambiar;
  - `submitAttempted: boolean`;
  - `isPending` (de `useTransition`);
  - `useReservationCountdown(CHECKOUT_SETTINGS.reservationMinutes * 60)`.
- **Derivados con `useMemo`:**
  - `lines = getSelectionLines(selection, ticketTypes)` y `totalQuantity`;
  - `totals = calculateOrderTotals(getSubtotalCents(lines))`;
  - `seatLabels`, que se obtiene de `seatSummary.zones`, agrupado por `ticketTypeId` con `formatSeatPosition`;
  - `errors = getCheckoutFieldErrors(values)`;
  - `visibleErrors` = errores de campos tocados, o todos si `submitAttempted`.
- **`payState`:**
  - `pending` si `isPending`;
  - `ready` si `errors` está vacío;
  - si no, `blocked`, con un `hint` exacto:
    - solo falta `acceptTerms`: "Acepta los términos para continuar.";
    - términos aceptados pero hay otros errores: "Completa tus datos para continuar.";
    - ambos: "Completa tus datos y acepta los términos para continuar.".
- **Contenedor:** `<form noValidate onSubmit>` envuelve el bloque de campos, el aside y la barra móvil, así los dos botones "Pagar" son `submit` del mismo form, como en el diseño. Al hacer submit:
  1. `preventDefault()`.
  2. Si está `pending` o vencido, no hace nada.
  3. Si hay errores: `submitAttempted = true` y foco en el primer campo inválido según `CHECKOUT_FIELD_ORDER` (`document.getElementById(getCheckoutFieldId(name))`). No navega.
  4. Si es válido: `orderCode = createMockOrderCode()` y `startTransition(() => router.replace(buildConfirmationHref({ slug, orderCode, selection, ticketTypes, seatIds })))`, con `seatIds` = asientos de `seatSummary` en su orden (zonas del layout y orden de selección), o ninguno. Se usa `replace` y no `push` para que "atrás" desde la confirmación no vuelva a un checkout ya "pagado".
  5. Los valores del formulario **no** salen del componente: no van a la URL, `localStorage`, consola ni red.
- **Vencimiento:** cuando `isExpired`, la vista reemplaza todo el contenido (campos, aside, collapsible y barra) por `ReservationExpired`. Quedan el header y la cabecera del evento. `reselectHref = backHref`. `reselectLabel`: "Elegir entradas de nuevo" (zona) o "Elegir asientos de nuevo" (teatro).

### Desktop (≥ lg), transcrito del lienzo `Checkout` (1440 px)

Fondo de la página `bg-secondary` (`#F4F4F5`). Orden de arriba hacia abajo:

1. **Header del flujo** (existente): paso 2 activo (círculo oscuro "2"), paso 1 con check índigo, "Compra segura" con candado.
2. **`EventPurchaseSummary`** con `backLabel` ("← Volver a Entradas" o "← Volver a Asientos") y la mini cabecera del evento (64 px). Va dentro de un wrapper `hidden lg:block`. Ver "Transcrito del diseño vs. criterio propio".
3. **Aviso del temporizador** (`ReservationTimerNotice`), en el contenedor `max-w-7xl px-8`:
   - `<p role="timer">` de alto 56 px (`h-14`), `px-5`, `gap-3`, `rounded-2xl`, borde de 1 px;
   - tinte de urgencia: fondo `bg-urgent/60` (≈ `#FFF7ED`), borde `border-urgent-foreground/20` (≈ `#FED7AA`), texto `text-urgent-foreground` (`#9A3412`), 15 px;
   - icono `Clock` de 20 px `aria-hidden`;
   - texto: "Reservamos tus entradas por **MM:SS**. Completa el pago antes de que se liberen." (`<strong>` con `tabular-nums`).
4. **Grid** `lg:grid-cols-[minmax(0,1fr)_26.25rem]` (1fr | 420 px), `gap-8`, `pt-6 pb-20 px-8`, `items-start`.
   - **Columna izquierda** (`flex-col gap-6`):
     - **Sección "Datos del comprador"**:
       - tarjeta `p-7 rounded-3xl border border-border bg-card`, `gap-5`;
       - `h2` 20 px/600 "Datos del comprador" y, debajo, 14 px `text-muted-foreground` "Enviaremos tus entradas al correo que indiques.";
       - grid de 2 columnas con `gap-x-5 gap-y-4.5`: "Nombre completo" | "Correo electrónico" en la primera fila y "Celular (opcional)" en la segunda, columna izquierda.
     - **Sección "Método de pago"** (misma tarjeta):
       - `h2` 20 px/600 "Método de pago";
       - **un único método, tarjeta**: no hay `RadioGroup` ni selector. Un indicador estático (no interactivo, no enfocable) con la apariencia de la pestaña activa de Stripe Payment Element: alto 76 px (`h-19`), `px-4.5`, `gap-3`, `border-2 border-primary bg-primary/10`, `rounded-2xl`, 15 px/600, icono `CreditCard` `aria-hidden` y el texto "Tarjeta". Desde `lg` mide lo mismo que una columna de un grid de 3 con `gap-3`, como la pestaña del lienzo;
       - campos de tarjeta, siempre visibles: grid de 4 columnas con `gap-x-5 gap-y-4.5`: "Número de tarjeta" (`col-span-2`), "Vencimiento", "CVC" y, debajo, "Nombre en la tarjeta" (`col-span-4`);
       - al pie: `Lock` de 16 px y, en 13 px `text-muted-foreground`, "Modo demo: no se procesa ningún pago ni se envían los datos de tu tarjeta.".
     - **Términos**: `Checkbox` de 20 px con label 14 px `text-foreground/80`: "Acepto los **Términos y condiciones** y la **Política de privacidad**.". Los nombres van en `font-medium` y **no** son links (no existen esas páginas). Su `FieldError` aparece debajo cuando corresponde.
   - **Columna derecha:** `CheckoutSummary` (aside `aria-label="Resumen de la compra"`, `lg:sticky lg:top-6`):
     - tarjeta `p-7 gap-5 rounded-3xl border bg-card`, sombra `shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)]`;
     - `h2` 20 px/600 "Tu compra";
     - lista de líneas: "{q} × {nombre}" y el subtotal en 15 px con el precio 600 `tabular-nums`; en teatros, bajo cada línea, los asientos en 13 px `text-muted-foreground` ("Fila F, asiento 12", uno por línea);
     - link 14 px/600 `text-primary` "Cambiar entradas" (→ `changeTicketsHref`);
     - desglose: "Subtotal" con monto y "Cargo por servicio" con monto (15 px, monto `tabular-nums`);
     - perforación `border-t-[1.5px] border-dashed border-input pt-4.5`;
     - "Total" (15 px/500) y monto de 28 px/700, `tracking-[-0.02em]`, `tabular-nums`;
     - botón "Pagar $X" de 56 px (`h-14`), `rounded-2xl`, 16 px/600, con `Lock` de 18 px;
     - si está bloqueado, el aviso va debajo, en 13 px `text-muted-foreground`, centrado.

### Móvil (< lg), transcrito del lienzo `CheckoutMobile` (390 px)

1. **Header del flujo** (existente): volver de 44 px con `aria-label` = `backLabel`, "Paso 2 de 3", "Datos y pago", candado y barra de progreso de 3 px.
2. `<h1 className="sr-only lg:hidden">Datos y pago: {event.title}</h1>`. En móvil el `h1` de `EventPurchaseSummary` está oculto con `display: none`, así que en cada breakpoint queda **un solo** `h1` expuesto.
3. Contenido `p-4 flex-col gap-4`:
   - **Aviso del temporizador**: `px-4 py-3.5`, `items-start`, `gap-2.5`, `rounded-2xl`, 14 px/1.45, `Clock` de 18 px con `mt-px`. Mismo texto y colores que en desktop. Es el mismo elemento, responsive.
   - **`CheckoutSummaryCollapsible`**: tarjeta `rounded-[20px] border bg-card overflow-hidden`.
     - Trigger: botón de ancho completo, `px-4 py-3.5`, `gap-3`, con miniatura de 48 px `rounded-xl`, título 15 px/600 truncado, "N entradas · $TOTAL" en 13 px `text-muted-foreground` y `ChevronDown` de 18 px que rota 180° al abrir (`transition-transform motion-reduce:transition-none`). Arranca cerrado. `aria-expanded` lo da Base UI.
     - Panel (`px-4 pb-4`, 14 px, `gap-2.5`): "{formatDateShort} · {venue.name}" con `border-t pt-3`, líneas (con asientos en teatro), Subtotal, Cargo por servicio, Total 600 y el link "Cambiar entradas".
   - **"Datos del comprador"**: tarjeta `px-4 py-5 rounded-[20px] gap-4`, `h2` 18 px/600, descripción 13 px "Enviaremos tus entradas a este correo." y los 3 campos apilados.
   - **"Método de pago"**: el mismo indicador estático de tarjeta, de ancho completo, alto 60 px (`h-15`), `rounded-[14px]`. Dice "Tarjeta de crédito o débito" en móvil y "Tarjeta" desde `lg` (dos `span` responsive). Campos: número de ancho completo; grid de 2 columnas con `gap-3` para vencimiento y CVC; nombre de ancho completo. Aviso demo al pie.
   - **Términos**: `px-1`, `items-start`, checkbox de 22 px, 14 px/1.5.
4. **`CheckoutPayBar`**: `sticky bottom-0 z-40`, `data-mobile-action-bar`, `role="region"`, `aria-label="Pago"`, `border-t bg-background`, sombra `shadow-[0_-12px_24px_-18px_rgb(24_24_27/0.35)]`, `px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]`, `flex-col gap-0.5`.
   - Botón "Pagar $X" de ancho completo, **44 px** (`h-11`), `rounded-[14px]`, 16 px/600, con `Lock`.
   - Si está bloqueado, aviso de 12 px/16 px (`text-xs leading-4`) centrado.
   - Alto del contenido: 8 + 44 + 2 + 16 + 8 = 78 px ≤ 5rem: cumple el contrato de la 006 sin tocar el token.
5. Inputs en móvil: 16 px (`text-base`) para evitar el zoom de iOS; desde `lg`, 15 px.

### Campos (`.tk-field` transcrito)

- **Field:** `Field` vertical con `gap-2`, `FieldLabel` 14 px/500 visible encima y `Input` con:
  - `h-13` (52 px), `px-4`, `rounded-[14px]`, `border-input`, `bg-card`;
  - placeholder `text-muted-foreground`;
  - foco `focus-visible:border-primary` + `focus-ring`.
- **Error:** `FieldError` (13 px `text-destructive`) con `id={getCheckoutErrorId(name)}`. El input lleva `aria-invalid="true"` y `aria-describedby` apuntando al error solo cuando el error está visible.
- **Atributos por campo:**

| Campo | Label | `type` / `inputMode` | `autoComplete` | Placeholder | Otros |
|---|---|---|---|---|---|
| fullName | Nombre completo | text | `name` | Como figura en tu documento | |
| email | Correo electrónico | email | `email` | tu@email.com | `spellCheck={false}` |
| phone | Celular (opcional) | tel / tel | `tel` | (555) 123-4567 | |
| cardNumber | Número de tarjeta | text / numeric | `cc-number` | 1234 1234 1234 1234 | `maxLength={23}`, `spellCheck={false}` |
| cardExpiry | Vencimiento | text / numeric | `cc-exp` | MM/AA | `maxLength={7}` |
| cardCvc | CVC | text / numeric | `cc-csc` | 3 o 4 dígitos | `maxLength={4}` |
| cardName | Nombre en la tarjeta | text | `cc-name` | Como aparece en la tarjeta | |

- Cada campo usa `id={getCheckoutFieldId(name)}`. El checkbox de términos debe poder enfocarse por ese id y marcarse al hacer clic en su texto. El developer verifica cómo asocia Base UI el `id` y el label en `Checkbox` y `Field`.

### Botón "Pagar" (`PayState`)

- **`ready`:** `bg-cta text-cta-foreground hover:bg-cta-hover`, texto "Pagar $X".
- **`blocked`:**
  - `type="submit"` con `aria-disabled="true"` (no `disabled`: sigue siendo enfocable);
  - estilo gris `bg-border text-muted-foreground hover:bg-border`;
  - `aria-describedby` apunta al aviso (`useId` en cada instancia);
  - pulsarlo **no navega**: revela los errores y enfoca el primer campo inválido (ver submit).
- **`pending`:** `aria-disabled="true"`, texto "Procesando pago…".
- Monto con `formatPrice(fromCents(totals.totalCents))`. Hay dos instancias en el DOM (aside y barra); CSS oculta una según el breakpoint, igual que `OrderSummary`.

### Temporizador y vencimiento

- `ReservationTimerNotice`:
  - `role="timer"` sin `aria-live` (el valor de `timer` es implícitamente `off`, así no anuncia cada segundo);
  - además, una región `sr-only` con `role="status" aria-live="polite"` cuyo contenido es `getCountdownAnnouncement(remainingSeconds)`: cambia solo al cruzar 5 min y 1 min (anuncios no ruidosos).
- `ReservationExpired`:
  - composición `Empty` en una tarjeta `rounded-3xl border bg-card`, centrada en `max-w-7xl px-4 lg:px-8 py-12 lg:py-16`;
  - tile de icono de 56 px `rounded-2xl bg-urgent text-urgent-foreground` con `TimerOff`;
  - `h2` con `tabIndex={-1}` que **recibe el foco al montarse** (20–24 px/600): "Tu reserva venció";
  - descripción: "Pasaron {reservationMinutes} minutos y liberamos tus entradas para otras personas. Vuelve a elegirlas para completar la compra.";
  - link CTA `bg-cta text-cta-foreground h-12 rounded-[14px] px-5 font-semibold focus-ring` con `reselectLabel` → `reselectHref`.

## Transcrito del diseño vs. criterio propio

**Transcrito del lienzo:**
- header del flujo;
- aviso naranja del temporizador con su texto;
- grid 1fr | 420 px;
- tarjetas de 24 px (20 px en móvil);
- `.tk-field` (52 px, radio 14, borde `#D4D4D8`, foco índigo);
- labels visibles de 14 px/500;
- títulos y descripciones de las secciones;
- estilo de la opción de pago activa (anillo índigo y fondo `#EEF2FF`), aplicado al indicador único de tarjeta;
- campos de tarjeta con `autocomplete cc-*` y su grid (2 + 1 + 1, y nombre a lo ancho);
- checkbox de términos;
- aside con líneas, "Cambiar entradas", perforación, Total de 28 px y CTA naranja de 56 px con candado;
- CTA gris hasta cumplir las condiciones con el aviso "Acepta los términos para continuar.";
- en móvil: resumen plegable arriba, formularios apilados y barra inferior con "Pagar" y aviso.

**Por el system design (cambios obligatorios sobre el lienzo):**
- se quitan Documento de identidad (DNI/CE/Pasaporte), Yape y PagoEfectivo;
- pago con tarjeta (apariencia de Stripe Payment Element);
- celular opcional;
- línea "Cargo por servicio";
- USD.

**Criterio propio:**
- **Desktop con `EventPurchaseSummary`** ("Volver a…" + mini cabecera) sobre el temporizador, y el aside **sin** cabecera del evento. El lienzo no tiene link de volver en desktop y pone el evento en el aside. Se elige la consistencia con los pasos 1 y asientos y se evita duplicar el evento (pedido explícito de usar `backLabel` en checkout). En móvil manda el lienzo: el evento va en el collapsible.
- Aside con título "Tu compra" (como en la 007) y desglose Subtotal / Cargo por servicio.
- **Solo tarjeta** (decisión del usuario): sin Apple Pay ni Google Pay, que llegan con Stripe real. Por eso no hay selector de método: la tarjeta se muestra como un indicador estático en lugar de las tarjetas radio del lienzo.
- Aviso "Modo demo".
- Términos sin link.
- Aviso del CTA en tres variantes según lo que falte (el diseño solo contempla términos, porque no validaba el formulario).
- Botón de la barra móvil de 44 px (el lienzo usa 54 px) para cumplir el contrato de 5rem de `data-mobile-action-bar`.
- Estado de reserva vencida (el lienzo no lo dibuja).
- Anuncios del timer en 5 y 1 min.
- `robots: noindex`.
- Placeholders de tarjeta al estilo Stripe ("1234 1234 1234 1234", "CVC").

## Supuestos mock

- **Reserva:** no existe. El vencimiento se calcula **al montar** `CheckoutView` (`Date.now() + 10 min`). Recargar o volver a entrar lo reinicia. En el futuro saldrá de `reservations.expires_at` (§5.2–5.3) y la URL dejará de ser la fuente de verdad.
- **Selección por URL:** hoy viaja en `?tickets=` (y `&seats=` en teatro), validada en el server en cada carga. Inventario estático: un asiento "libre" en el mock siempre lo está.
- **Cargo por servicio:** 10 % (`serviceFeeBps = 1000`) + $1.50 por pedido (`serviceFeeFixedCents = 150`), en `CHECKOUT_SETTINGS`. Cuando exista backend se reemplaza por la fila de `platform_settings`.
- **Pago:** no hay integración. Los valores de tarjeta solo viven en el estado de React mientras la página está abierta. "Pagar" con datos válidos genera `TK-` + 5 dígitos al azar en el cliente (no se garantiza unicidad: es decorativo) y navega.
- **Qué viaja a la confirmación:** `order`, `tickets` y `seats` (si es teatro). **No** viajan nombre, email, celular ni datos de pago: la URL queda en historial, logs y referers. La 011 no necesita PII porque usa textos genéricos ("Enviamos tus entradas a tu correo").

## Tareas

### Preparación (serie, en este orden)

- **P1** Componentes shadcn. Archivos: `src/components/ui/field.tsx`, `src/components/ui/collapsible.tsx` y, **solo si no existen**, `src/components/ui/checkbox.tsx`, `src/components/ui/label.tsx`.
  - Comando: `npx shadcn@latest add field collapsible` (más `checkbox label` si faltan). No se agrega `radio-group`.
  - Si la CLI propone sobrescribir archivos existentes (`separator.tsx`, `button.tsx`, `label.tsx`, …), responder **no**.
  - No editar a mano los generados, salvo que la CLI deje un import de icono roto (se corrige a `lucide-react`, igual que la 009).
  - `event-routes.ts` y su test ya recibieron `getEventsSearchHref` en la 009. P2 solo agrega `getEventConfirmationHref`: no hay conflicto, porque la 009 se implementa antes, en serie.
- **P2** Contratos con tests. Archivos:
  - `src/modules/checkout/utils/checkout-order.ts` + `checkout-order.test.ts` (C1);
  - `src/modules/checkout/schemas/checkout-form.schema.ts` + `checkout-form.schema.test.ts` (C2);
  - `src/modules/seating/utils/seat-selection.ts` + `seat-selection.test.ts` (C3, se añade; no cambia lo existente);
  - `src/modules/events/utils/event-routes.ts` + `event-routes.test.ts` (C4).
- **P3** Cambio en componente compartido. Archivos: `src/modules/checkout/components/event-purchase-summary.tsx` (C5) y `src/app/(purchase)/events/[slug]/seats/page.tsx` (pasar `backLabel="Volver a Entradas"`).

### Paralelo (archivos disjuntos; nadie corre `npm install` ni `npm run build`)

- **T1** Temporizador. Archivos: `src/modules/checkout/hooks/use-reservation-countdown.ts`, `src/modules/checkout/hooks/use-reservation-countdown.test.ts`, `src/modules/checkout/components/reservation-notice.tsx`.
- **T2** Campos del formulario. Archivos: `src/modules/checkout/components/checkout-fields.tsx`.
- **T3** Resumen, collapsible y barra de pago. Archivos: `src/modules/checkout/components/checkout-summary.tsx`.

### Integración (serie)

- **I1** Vista, ruta y test. Archivos: `src/modules/checkout/components/checkout-view.tsx`, `src/modules/checkout/components/checkout-view.test.tsx`, `src/app/(purchase)/events/[slug]/checkout/page.tsx`.

**Tamaño:**
- Son 18 archivos propios: 8 de ellos son tests y 2 son ediciones de 1–3 líneas (`seats/page.tsx`, `event-purchase-summary.tsx`). A eso se suman 2–4 archivos generados por la CLI (ya no `radio-group.tsx`). Supera el "~15" orientativo, en línea con la 008 (≈19), que cerró en una sesión.
- No se parte porque la otra opción (sacar el temporizador a otra spec) deja el paso 2 sin una regla de negocio central del system design.
- Para no crecer más se dejó fuera el `round2` (ver Fuera de alcance).
- Si el usuario prefiere partir, el corte limpio es T1 + vencimiento a una spec aparte (ver Preguntas abiertas).

## Criterios de aceptación

**Ruta y validación**
- [ ] AC1 Ir a `/events/clasico-del-futbol-final-de-temporada/checkout?tickets=evt-002-sur:2` muestra el paso 2: stepper con "Datos y pago" `aria-current="step"`; en móvil, "Paso 2 de 3 · Datos y pago".
- [ ] AC2 Sin `tickets`, con ids inexistentes, con ids de otro evento o con solo zonas agotadas (p. ej. `?tickets=evt-002-occidente:2`): redirige a `/events/{slug}/tickets`.
- [ ] AC3 Un slug inexistente da la página 404.
- [ ] AC4 Teatro: `/events/noche-de-rock-sinfonico/checkout?tickets=evt-001-platea:2&seats=<2 ids libres de platea>` muestra el checkout con los asientos "Fila X, asiento N" bajo la línea "2 × Platea".
- [ ] AC5 Teatro: con `seats` ausente, incompleto, con un asiento vendido o con un id inexistente, redirige a `/events/noche-de-rock-sinfonico/seats?tickets=evt-001-platea%3A2`, conservando las cantidades.
- [ ] AC6 En un evento por zona, un `seats` presente se ignora (no redirige ni se muestra).
- [ ] AC7 Desde `/seats`, completar los asientos y pulsar "Continuar" llega al checkout sin redirección. El link "volver" de `/seats` en desktop dice "Volver a Entradas".

**Resumen y dinero**
- [ ] AC8 Con 2 × Sur (evt-002) el resumen muestra "2 × Sur" $60, "Subtotal" $60, "Cargo por servicio" $7.50 y "Total" $67.50, y los botones dicen "Pagar $67.50".
- [ ] AC9 "Cambiar entradas" lleva a `/events/{slug}/tickets?tickets=…` con la misma selección.
- [ ] AC10 En desktop, el link superior dice "Volver a Entradas" (zona) o "Volver a Asientos" (teatro) y apunta a `backHref`. El botón volver del header móvil tiene ese mismo `aria-label`.

**Formulario y CTA**
- [ ] AC11 No hay campo de documento ni opciones Yape, PagoEfectivo, Apple Pay o Google Pay. La sección "Método de pago" muestra un único indicador "Tarjeta" (en móvil, "Tarjeta de crédito o débito") que no es un control: no hay `radio`, `radiogroup` ni selector de método.
- [ ] AC12 Cada campo tiene un label visible asociado y el `autocomplete` de la tabla de campos (`name`, `email`, `tel`, `cc-number`, `cc-exp`, `cc-csc`, `cc-name`).
- [ ] AC13 Al cargar, los dos botones "Pagar" tienen `aria-disabled="true"` y estilo gris, y el aviso "Completa tus datos y acepta los términos para continuar." está asociado por `aria-describedby`.
- [ ] AC14 Con datos válidos pero sin términos, el aviso es "Acepta los términos para continuar.". Con términos pero datos inválidos, es "Completa tus datos para continuar.".
- [ ] AC15 Salir de "Correo electrónico" con "ana@" muestra "Ingresa un correo válido, por ejemplo tu@email.com.", el input queda con `aria-invalid="true"` y su `aria-describedby` incluye el id del error. Dejar "Celular (opcional)" vacío no produce error.
- [ ] AC16 Pulsar "Pagar" bloqueado no navega: muestra todos los errores pendientes y mueve el foco al primer campo inválido.
- [ ] AC17 Los cuatro campos de tarjeta están siempre visibles y son obligatorios: con nombre, email y términos válidos pero la tarjeta vacía, "Pagar" sigue con `aria-disabled="true"` y el aviso "Completa tus datos para continuar.".
- [ ] AC18 Con nombre, email, tarjeta `4242 4242 4242 4242`, vencimiento futuro, CVC `123`, nombre en tarjeta y términos aceptados, "Pagar" pasa a naranja sin `aria-disabled`. Al pulsarlo navega a `/events/{slug}/confirmation?order=TK-NNNNN&tickets=…` (`&seats=…` en teatro). La URL no contiene nombre, email, celular ni datos de tarjeta.
- [ ] AC19 Se muestra el aviso "Modo demo: no se procesa ningún pago ni se envían los datos de tu tarjeta.".

**Temporizador**
- [ ] AC20 Al cargar se lee "Reservamos tus entradas por 10:00. Completa el pago antes de que se liberen." en un elemento `role="timer"`, y el valor baja cada segundo (09:59, 09:58…).
- [ ] AC21 A los 10 minutos el formulario, el resumen y la barra se reemplazan por "Tu reserva venció" con el foco en ese título y el link "Elegir entradas de nuevo" (zona) o "Elegir asientos de nuevo" (teatro), que apunta a `backHref`.
- [ ] AC22 La región `role="status"` del timer está vacía hasta los 5 min restantes y solo cambia al cruzar 5 min y 1 min.

**Layout, temas y accesibilidad**
- [ ] AC23 Desktop (1440 px): grid de 2 columnas (formularios | aside de 420 px sticky). Comprador en 2 columnas; indicador "Tarjeta" del ancho de una de 3 columnas y campos de tarjeta en grid de 4 (número en 2).
- [ ] AC24 Móvil (390 px):
  - el resumen plegable está arriba y cerrado, y su trigger muestra "N entradas · $TOTAL" y `aria-expanded`;
  - al abrirlo aparecen las líneas, el desglose y "Cambiar entradas";
  - formularios apilados;
  - barra inferior fija con `data-mobile-action-bar` y "Pagar $X", más el aviso cuando está bloqueado, de ≤ 80 px de alto sin safe-area;
  - ningún campo enfocado queda tapado por la barra.
- [ ] AC25 Todos los controles interactivos miden ≥ 44 px de alto en móvil (inputs de 52 px, checkbox de términos con su label, botón de la barra de 44 px y trigger del collapsible). Todos muestran el foco visible (`focus-ring` o el anillo de shadcn).
- [ ] AC26 Hay un único `h1` expuesto por breakpoint.
- [ ] AC27 Con `prefers-reduced-motion: reduce` la rotación del chevron y la transición del panel no se animan.
- [ ] AC28 Claro y oscuro legibles, sin hex literales nuevos: solo tokens (`urgent`, `primary`, `cta`, `border`, `input`, `destructive`…).

## Tests obligatorios

- `src/modules/checkout/utils/checkout-order.test.ts`:
  - `toCents`: 19.99 → 1999; 0.1 + 0.2 → 30; 0 → 0; negativo o `NaN` → `RangeError`.
  - `fromCents`: 6750 → 67.5.
  - `getSubtotalCents`: 3 × 19.99 → 5997 (sin error de coma flotante); [] → 0; líneas reales de evt-002.
  - `calculateOrderTotals`: 6000 → { 6000, 750, 6750 }; redondeo half-up 1005 → fee 251 (100.5 → 101) y 1004 → 250; 0 → { 0, 0, 0 }; con settings custom; no entero o negativo → `RangeError`; `total = subtotal + fee` siempre.
  - `createMockOrderCode`: random 0 → "TK-10000"; 0.99999 → "TK-99999"; sin argumento cumple `ORDER_CODE_PATTERN`.
  - `isOrderCode`: acepta "TK-24817"; rechaza "TK-1234", "TK-123456", "tk-24817", "TK24817", número y `undefined`.
  - `buildConfirmationHref`: zona → pathname `/events/x/confirmation`, `order` y `tickets` correctos y sin `seats`; con `seatIds` → `seats` unido por ","; `seatIds` vacío → sin `seats`; código inválido → lanza.
- `src/modules/checkout/schemas/checkout-form.schema.test.ts`:
  - válidos con tarjeta: `4242 4242 4242 4242`, `12/30`, `123`; con `now` inyectado y vencimiento en el mes actual también es válido.
  - la tarjeta es siempre obligatoria: comprador y términos válidos con los cuatro campos de tarjeta vacíos → inválido, con los mensajes de "falta" de cada campo.
  - celular: `""` y `"   "` → `phone: null`; `"(555) 123-4567"`, `"555.123.4567"` y `"+1 555 123 4567"` → `"5551234567"`.
  - inválidos, con el mensaje exacto: nombre vacío / de 1 carácter / de 101; email vacío / `"ana@"`; celular `"555-1234"`, `"123 456 7890"` (empieza en 1) y `"abc"`; tarjeta vacía, que falla Luhn (`4242 4242 4242 4241`), de 12 dígitos o con letras; vencimiento `13/30`, `1230` y vencido respecto de `now`; CVC `12` y `12a`; nombre de tarjeta vacío; términos `false`.
  - `getCheckoutFieldErrors`: `{}` si es válido; un mensaje por campo; no devuelve claves fuera de `CHECKOUT_FIELD_ORDER`.
- `src/modules/seating/utils/seat-selection.test.ts` (se añaden casos):
  - `parseCompleteSeatSelection`: completo → resumen con `isComplete`; incompleto, vendido, id inexistente o `undefined` → `null`; duplicados se cuentan una vez; array → primer valor; asientos de una zona sin cuota se descartan.
  - `formatSeatPosition` → "Fila F, asiento 12".
- `src/modules/events/utils/event-routes.test.ts`: `getEventConfirmationHref("x")` → "/events/x/confirmation".
- `src/modules/checkout/hooks/use-reservation-countdown.test.ts`:
  - helpers puros: `getRemainingSeconds` (exacto, fracción → `ceil`, pasado → 0); `formatCountdown` (600 → "10:00", 588 → "09:48", 59 → "00:59", 0 y negativos → "00:00", 3600 → "60:00"); `getCountdownAnnouncement` (601, 300, 61, 60, 1 y 0).
  - hook con `vi.useFakeTimers()` + `renderHook`: inicial 600 sin expirar; +1 s → 599; +599 s → 0 e `isExpired`; no baja de 0; al desmontar no quedan timers pendientes (`vi.getTimerCount() === 0`).
- `src/modules/checkout/components/checkout-view.test.tsx` (RTL; mockear `next/image` como en los tests existentes y `next/navigation` con un `replace` espía; fake timers con `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`):
  1. Resumen de evt-002 con 2 × Sur: $60, $7.50 y $67.50; dos botones "Pagar $67.50" con `aria-disabled="true"` y el aviso combinado.
  2. Pulsar "Pagar" bloqueado: `replace` no se llama, aparecen los errores, el nombre queda con `aria-invalid="true"` y el foco en "Nombre completo".
  3. Blur del email con "ana@" muestra el error con `aria-describedby`; el celular vacío no da error.
  4. Completar todo menos términos: aviso "Acepta los términos para continuar."; marcar términos: botones sin `aria-disabled`; pulsar: `replace` recibe una URL con pathname `/events/{slug}/confirmation`, `order` que cumple `ORDER_CODE_PATTERN`, `tickets=evt-002-sur:2`, sin `seats` y sin el nombre ni el email cargados.
  5. Solo tarjeta: no hay `radio` ni `radiogroup`, no aparecen "Apple Pay" ni "Google Pay", y con comprador + términos pero sin tarjeta los botones siguen con `aria-disabled="true"`.
  6. Timer: "10:00" dentro de `role="timer"`; +1 s → "09:59"; +600 s → "Tu reserva venció", el form ya no está y el link "Elegir entradas de nuevo" apunta a `backHref`.
  7. Teatro (evt-001, con `seatSummary` armado con `parseCompleteSeatSelection` y asientos libres del mock): aparecen las etiquetas "Fila …, asiento …" y la URL de `replace` incluye `seats`.
- Tests existentes que deben seguir en verde sin cambios: `ticket-selection-view.test.tsx` (el texto por defecto de `EventPurchaseSummary` no cambia), `seat-selection-view.test.tsx` y `seat-map.test.tsx`.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- **Manual** (`npm run dev`):
  - en desktop 1440 px y móvil 390 px, claro y oscuro: `/events/clasico-del-futbol-final-de-temporada/tickets` → agregar 2 Sur → Continuar → checkout (AC1, AC8, AC23, AC24);
  - teatro: `/events/noche-de-rock-sinfonico/tickets` → Platea 2 → asientos → Continuar (AC4, AC7);
  - probar URLs inválidas (AC2, AC5);
  - completar con tarjeta 4242… y pagar: la URL de destino (404 hasta la 011) cumple AC18;
  - para el vencimiento, bajar `CHECKOUT_SETTINGS.reservationMinutes` temporalmente a 1 **sin commitear**, o confiar en el test (AC21);
  - teclado solo: Tab por todo el formulario (el indicador "Tarjeta" no recibe foco), Espacio en el checkbox y foco visible.

## Preguntas abiertas

1. **Cargo por servicio:** resuelta. El usuario confirmó 10 % + $1.50 por pedido (`serviceFeeBps: 1000`, `serviceFeeFixedCents: 150`).
2. **`round2` duplicado:** no cabe en la 010 (ver Fuera de alcance). ¿Se hace como chore en modo directo (`src/lib/number.ts` + test y 3 imports) o se agrega a la preparación de la 011 (quedaría en ~16 archivos)?
3. **Desktop:** ¿se acepta `EventPurchaseSummary` ("Volver a…" + mini cabecera) arriba y el aside sin cabecera del evento? Es una desviación del lienzo, que no tiene "volver" en desktop y pone el evento en el aside.
4. **Apple Pay / Google Pay:** resuelta. Solo tarjeta; las billeteras quedan fuera de alcance hasta Stripe real.
5. **Tamaño:** la 010 tiene 18 archivos propios más los de la CLI. ¿Se acepta así o se parte, con el temporizador y la reserva vencida (T1 + parte de I1) en una spec aparte?
