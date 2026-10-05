# 012 — Campos obligatorios en el checkout y descargas reales en la confirmación (.ics y PDF)

- **Estado:** done (APPROVED por reviewer en iteración 1)
- **Modo:** SDD
- **Módulo(s):**
  - `src/modules/checkout`: asteriscos y `aria-required` en `CheckoutFields`; utils nuevos de calendario (.ics) y PDF; `ConfirmationActions` deja de ser mock en "Agregar al calendario" y "Descargar PDF".
  - `src/modules/events/utils`: helper nuevo `formatVenueLocation`, que omite la ciudad si la dirección ya termina en ella (DRY con `getVenueDirectionsUrl`).
  - `src/lib`: helper transversal nuevo `downloadBlob` y formateador nuevo `formatDateLongWithYear` (fecha con año, solo para el PDF).
  - Dependencia npm nueva: `jspdf`.
  - `docs/design/design-system.md`: solo se corrige la referencia a Mis entradas.
- **Depende de:** 010 y 011 en `done`. Consume:
  - de la 010: `CheckoutFields`, `getCheckoutFieldId`, `checkout-form.schema.ts` (mensajes de error, sin cambios) y el formulario `noValidate` de `CheckoutView`;
  - de la 011: `ConfirmationTicket` (`order-confirmation.ts`), `getDecorativeQrCells` / `DECORATIVE_QR_SIZE` (`decorative-qr.tsx`), `ConfirmationActions`, `ConfirmationView` y `MY_TICKETS_HREF`.
- **Roadmap:** 001–011 `done` · **012 ajustes de checkout y confirmación (esta)** · 013 Mis entradas · después, login/registro, panel de organizador y crear evento (se numeran desde 014 cuando se redacten).
  - La 011 reservaba el número 012 para "Mis entradas". Esta spec toma el 012 porque corrige lo que entregaron la 010 y la 011, y conviene cerrarlo antes de abrir un módulo nuevo. "Mis entradas" pasa a ser la **013**.
  - Las specs `done` no se editan: sus menciones a "Mis entradas (012)" quedan como registro histórico. Solo se corrigen las dos referencias vivas (I1):
    - el comentario de `MY_TICKETS_HREF` en `confirmation-not-found.tsx`;
    - `docs/design/design-system.md` §2.3.5.

## Objetivo

1. **Checkout:** los campos obligatorios se ven como tales:
   - asterisco rojo decorativo en el label;
   - `aria-required="true"` en el control;
   - una nota que explica el asterisco.

   La validación sigue siendo la de zod.
2. **Confirmación:** "Agregar al calendario" descarga un `.ics` (RFC 5545) del evento y "Descargar PDF" genera en el navegador un PDF con una página por entrada y el mismo QR decorativo de pantalla. "Ver mis entradas" sigue siendo un mock hasta la 013.

Todo ocurre en el cliente, sin backend, y el proyecto debe quedar en verde.

## Fuera de alcance

- **Mis entradas (013):** "Ver mis entradas" mantiene su mensaje mock de la 011 y `MY_TICKETS_HREF` sigue dando 404.
- QR real o firmado (`tickets.qr_token`). El QR del PDF es el mismo patrón decorativo y no codifica nada.
- Envío de correo con las entradas o el `.ics` adjunto (Resend).
- **Imagen del evento en el PDF.** Las imágenes vienen de Unsplash (otro origen). Incluirlas obliga a hacer `fetch` con CORS, convertir a data URL, detectar el formato y degradar si falla. No es trivial, y el PDF se entiende igual sin la imagen. Se puede sumar en una fase posterior.
- **Fuentes TTF embebidas en el PDF.** Se usa Helvetica estándar (WinAnsi), que cubre el español: tildes, ñ, "N.º", "·" y "—". Hoy los datos mock solo tienen caracteres Latin-1. Cuando haya datos reales con caracteres fuera de WinAnsi (emoji, otros alfabetos), habrá que embeber una fuente Unicode.
- Datos personales en el PDF o el `.ics` (nombre, email, tarjeta): **prohibido**. Además, no viajan a la confirmación (decisión de la 010).
- Recordatorios (`VALARM`), zona horaria con `VTIMEZONE` y enlaces "Agregar a Google Calendar". El `.ics` usa horas UTC, que cualquier calendario convierte a la hora local.
- Hora de fin real del evento: `EventItem` no tiene fin. Se usa una duración por defecto (C2). Un `endsAt` llegará con backend.
- Cambios en `src/components/ui/**`.

## Precondiciones (bloqueantes)

- 010 y 011 en `done` (cumplido).
- **Única dependencia npm nueva:** `jspdf` (MIT), que se instala en P0.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `Field`, `FieldLabel`, `FieldError` | reutilizar (sin cambios) | `src/components/ui/field.tsx` | **Verificado: no traen soporte de requeridos.** No hay prop `required` ni marcador, y `FieldLabel` es un `Label` con `flex gap-2`. `Field` es un `div role="group"` propio de shadcn, **no** `Field.Root` de Base UI. Por eso el `Input` de Base UI queda con el contexto por defecto: validación no-op y `getValidationProps` sin efecto (verificado en `@base-ui/react/internals/field-root-context/FieldRootContext.mjs`). El marcado de requerido vive en el módulo. |
| `Input` | reutilizar (sin cambios) | `src/components/ui/input.tsx` | **Verificado:** sus clases solo reaccionan a `aria-invalid:`, `focus-visible:` y `disabled:`. No tiene `invalid:` ni `user-invalid:`. |
| `Checkbox` | reutilizar (sin cambios) | `src/components/ui/checkbox.tsx` | Base UI: los props (incluido `aria-required`) llegan al `span role="checkbox"`. |
| `CheckoutFields` / `TEXT_FIELDS` | extender | `src/modules/checkout/components/checkout-fields.tsx` | Flag `isRequired` en la config, asterisco, `aria-required` y nota. |
| Helper de descarga de archivos | crear | `src/lib/download.ts` | **Verificado:** no existe. No hay `createObjectURL`, `download` ni `Blob` en `src/`. Es transversal (Mis entradas lo reutilizará), así que va a `src/lib`. |
| Formato "{name}, {address}, {city}" | extender (extraer) | `src/modules/events/utils/event-venue.ts` (nuevo) | Hoy está inline en `getVenueDirectionsUrl` (`event-routes.ts`). Con ICS y PDF hay 3 consumidores, así que se extrae (DRY) y `getVenueDirectionsUrl` pasa a usarlo. Decisión del usuario: se omite la ciudad cuando la dirección ya termina en ella (C3), así que "Cómo llegar" cambia solo en ese caso. |
| `formatDateLong`, `formatTime`, `formatPrice` | reutilizar | `src/lib/format.ts` | Fechas en `APP_TIME_ZONE`. `formatDateLong` no cambia (pantalla sin año). |
| `formatDateLongWithYear` | crear | `src/lib/format.ts` | Decisión del usuario: el PDF muestra el año. Función nueva junto a `formatDateLong` (no una opción), para no tocar su firma ni sus 4 usos actuales (KISS). |
| `getDecorativeQrCells`, `DECORATIVE_QR_SIZE` | reutilizar | `src/components/shared/decorative-qr.tsx` | El PDF dibuja exactamente la misma grilla que el SVG de pantalla. |
| `ConfirmationTicket` | reutilizar | `src/modules/checkout/utils/order-confirmation.ts` | Serializable. Ya llega a `ConfirmationView`. |
| Generador `.ics` | crear | `src/modules/checkout/utils/event-calendar.ts` | No existe nada equivalente. Lo usa solo checkout (YAGNI: se mueve si Mis entradas lo necesita). |
| Modelo de páginas del PDF | crear | `src/modules/checkout/utils/ticket-pdf.ts` | Puro y testeable. |
| Renderer del PDF (jsPDF) | crear | `src/modules/checkout/utils/ticket-pdf-renderer.ts` | Aislado del modelo (SRP). Constructor inyectable y `import()` dinámico. |
| `ConfirmationActions` | extender | `src/modules/checkout/components/confirmation-actions.tsx` | Recibe props (C6). Calendario y PDF pasan a ser reales. |
| `ConfirmationView` | extender (1 línea) | `src/modules/checkout/components/confirmation-view.tsx` | Pasa `event`, `orderCode` y `tickets` a `ConfirmationActions`. |
| `jspdf` | agregar (npm) | `package.json` | Ver §Decisión: librería PDF. |
| shadcn | no aplica | — | Ningún componente del registro cubre marcadores de requerido ni descargas. |

## Decisiones

### D1 — `aria-required` y no `required` nativo

Los 6 inputs y el checkbox de términos llevan **solo** `aria-required="true"`. **No** llevan el atributo `required`.

- El form tiene `noValidate` (`checkout-view.tsx`), así que `required` no mostraría burbujas nativas. Aun así, `required` hace que `:invalid` aplique desde la primera carga (campos vacíos), y `:user-invalid` tras interactuar.
- Hoy `input.tsx` no estiliza esas pseudoclases. Pero el riesgo existe:
  - algunos navegadores tienen estilos UA para `:user-invalid`;
  - un futuro `npx shadcn add input` podría traer clases `invalid:`;
  - Base UI `Field.Root` valida `validity` si algún día se envuelve el control.

  Cualquiera de esos casos generaría una segunda validación, en conflicto con la de zod.
- `aria-required` da lo necesario: los lectores anuncian "obligatorio" (WCAG 1.3.1 y 4.1.2). La única fuente de validación sigue siendo zod (KISS).

### D2 — Qué campos llevan asterisco

| Campo | Asterisco | `aria-required` | Label |
|---|---|---|---|
| fullName | sí | `"true"` | Nombre completo |
| email | sí | `"true"` | Correo electrónico |
| phone | **no** | ausente | "Celular (opcional)", sin cambios. Se mantiene "(opcional)": es explícito, y los tests de la 010 lo usan. |
| cardNumber | sí | `"true"` | Número de tarjeta |
| cardExpiry | sí | `"true"` | Vencimiento |
| cardCvc | sí | `"true"` | CVC |
| cardName | sí | `"true"` | Nombre en la tarjeta |
| acceptTerms (checkbox) | **sí** | `"true"` (en el `Checkbox`) | El asterisco va al final del texto del label, tras "Política de privacidad.". |

El checkbox de términos lleva asterisco porque el schema lo exige ("Acepta los términos para continuar."). WCAG 3.3.2 pide indicar todos los controles obligatorios, y dejarlo sin marca contradiría la nota "Los campos marcados con * son obligatorios".

### D3 — Marcado del asterisco y nota

- **Asterisco:** `<span aria-hidden="true" className="text-destructive">*</span>` (token, sin hex), justo después del texto del label y dentro del `<label>`. Es un componente local no exportado de `checkout-fields.tsx` (p. ej. `RequiredMark`). Como es `aria-hidden`, el nombre accesible del control no lo incluye: sigue siendo "Nombre completo".
- **Nota** (WCAG 3.3.2):
  - un `<p>` como **primer hijo** del contenedor de `CheckoutFields`, antes de la sección "Datos del comprador";
  - estilo `text-[0.8125rem] text-muted-foreground px-1 lg:px-0`, el mismo que el bloque de términos;
  - texto visible: "Los campos marcados con **\*** son obligatorios.";
  - marcado: `Los campos marcados con <span aria-hidden="true" class="text-destructive">*</span><span class="sr-only">asterisco</span> son obligatorios.`
  - Un lector lee "Los campos marcados con asterisco son obligatorios.", y cada control anuncia además "obligatorio" por `aria-required`.

### D4 — Librería PDF: `jspdf`

| Criterio | `jspdf` (elegida) | `pdf-lib` | `@react-pdf/renderer` |
|---|---|---|---|
| Licencia / mantenimiento | MIT. Activa (rama 4.x). | MIT. Última versión 1.17.1 (2021), sin mantenimiento activo. | MIT. Activa. |
| Tamaño | Medio. Con carga diferida no afecta al bundle inicial. | Medio, similar. | El más pesado: motor de layout, fontkit y reconciliador propio. Excesivo para dibujar rectángulos y texto. |
| API para rectángulos y texto | `rect`, `text` y `splitTextToSize` (ajuste de línea incluido). | `drawRectangle` y `drawText`, sin ajuste de línea (hay que medir a mano). | Componentes React con flexbox. Otro paradigma y más superficie. |
| Acentos con fuentes estándar | Helvetica en WinAnsi: á é í ó ú ñ º · — sí. Lo que está fuera de WinAnsi se corrompe en silencio (ver Fuera de alcance). | WinAnsi: lanza error si un carácter no se puede codificar. | Requiere registrar fuentes. |
| Riesgo de build | Dependencias opcionales (`html2canvas`, `dompurify`, `canvg`, `core-js`) que importa dinámicamente solo para `html()` y `svg`. npm las instala por defecto, así que Turbopack las resuelve. No se usan. | Bajo. | Medio (ESM/workers). |

**Decisión:** `jspdf@^4`, cargado con `await import("jspdf")` solo al pulsar "Descargar PDF". Es el patrón documentado en `node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md` (sección "Loading External Libraries"), y no hace falta `next/dynamic` porque no es un componente. En `ticket-pdf-renderer.ts` solo se usa `import type { jsPDF } from "jspdf"` (se borra al compilar).

**Verificación del riesgo:**
- **P0:** `npm ls jspdf html2canvas dompurify canvg` debe listar las cuatro.
- **I1:** es el primer punto en que jspdf queda importado. Corre `npm run build` (es serie, fuera del bloque paralelo).
- **Si el build falla por jspdf:** no agregar configuración a ciegas (`turbopackIgnore`, `serverExternalPackages`, etc.). Reportar `BLOCKED` con `origen: spec`.

### D5 — Duración por defecto del evento: 3 horas

`DEFAULT_EVENT_DURATION_MINUTES = 180` es una constante nombrada en `event-calendar.ts`. Cubre conciertos, partidos y obras típicos. DTEND = DTSTART + 180 min.

### D6 — Imagen del evento en el PDF: fuera de alcance

Ver "Fuera de alcance". El PDF no hace peticiones de red.

## Contratos

### C1 — Descarga (`src/lib/download.ts`)

```ts
/** Descarga un Blob en el navegador:
 *  1. url = URL.createObjectURL(blob);
 *  2. crea un <a> con href = url y download = filename, lo agrega a document.body, llama a click() y lo quita;
 *  3. revoca el mismo url con setTimeout(() => URL.revokeObjectURL(url), 0) (Safari cancela la descarga si se revoca
 *     sincrónicamente).
 *  Sin dependencias de dominio. Solo cliente (usa document). */
export function downloadBlob(blob: Blob, filename: string): void
```

### C2 — Calendario (`src/modules/checkout/utils/event-calendar.ts`)

```ts
export const DEFAULT_EVENT_DURATION_MINUTES = 180
export const CALENDAR_MIME_TYPE = "text/calendar;charset=utf-8"

/** RFC 5545 §3.3.11 (TEXT): escapa "\" → "\\" (primero), ";" → "\;", "," → "\," y cualquier salto de línea
 *  ("\r\n", "\n", "\r") → "\n" literal (barra + n). */
export function escapeIcsText(value: string): string

/** RFC 5545 §3.1: si la línea supera 75 octetos UTF-8, la parte en líneas de ≤ 75 octetos unidas por "\r\n ".
 *  El espacio inicial de cada continuación cuenta dentro de sus 75 octetos. Nunca parte un carácter multibyte
 *  (recorre por code point). Una línea de ≤ 75 octetos se devuelve igual. */
export function foldIcsLine(line: string): string

/** UTC "YYYYMMDDTHHMMSSZ". Acepta ISO con offset o Date. Lanza RangeError si la fecha es inválida.
 *  "2026-10-04T16:00:00-05:00" → "20261004T210000Z". */
export function formatIcsDateTime(value: string | Date): string

/** VCALENDAR completo. Cada línea pasa por foldIcsLine y termina en "\r\n" (también la última). Sin PII. */
export function buildEventCalendar(input: {
  event: Pick<EventItem, "id" | "title" | "startsAt" | "doorsOpenAt" | "venue">
  orderCode: string
  now: Date // DTSTAMP (inyectable para tests)
}): string

/** "ticketera-TK-24817.ics" */
export function getCalendarFileName(orderCode: string): string
```

Líneas de `buildEventCalendar`, en este orden (antes de plegar):

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Ticketera//Ticketera//ES
CALSCALE:GREGORIAN
METHOD:PUBLISH
BEGIN:VEVENT
UID:{orderCode}-{event.id}@ticketera
DTSTAMP:{formatIcsDateTime(now)}
DTSTART:{formatIcsDateTime(event.startsAt)}
DTEND:{formatIcsDateTime(startsAt + DEFAULT_EVENT_DURATION_MINUTES)}
SUMMARY:{escapeIcsText(event.title)}
LOCATION:{escapeIcsText(formatVenueLocation(event.venue))}
DESCRIPTION:{escapeIcsText("Pedido N.º {orderCode}\nApertura de puertas: {formatTime(event.doorsOpenAt)} (hora local)")}
END:VEVENT
END:VCALENDAR
```

**Ejemplo de referencia** (evt-002, `TK-24817`, `now = 2026-10-04T17:00:00Z`):
- `UID:TK-24817-evt-002@ticketera`
- `DTSTAMP:20261004T170000Z`
- `DTSTART:20261004T210000Z`
- `DTEND:20261005T000000Z`
- `SUMMARY:Clásico del Fútbol: Final de Temporada` (48 octetos, sin plegar).
- `LOCATION:Estadio Nacional\, Av. del Deporte 1200\, Lima` (sin la ciudad repetida, ver C3).
- DESCRIPTION mide 78 octetos y se pliega en:
  - `DESCRIPTION:Pedido N.º TK-24817\nApertura de puertas: 1:30 p. m. (hora loc`
  - `\r\n al)`

### C3 — Ubicación del recinto (`src/modules/events/utils/event-venue.ts`)

```ts
/** "{name}, {address}, {city}", omitiendo ", {city}" si la dirección ya termina en la ciudad.
 *  Ej.: { "Estadio Nacional", "Av. del Deporte 1200, Lima", "Lima" } → "Estadio Nacional, Av. del Deporte 1200, Lima";
 *       { "Teatro Municipal", "Jr. Las Artes 377, Cercado de Lima", "Lima" } → "Teatro Municipal, Jr. Las Artes 377, Cercado de Lima, Lima". */
export function formatVenueLocation(venue: Pick<Venue, "name" | "address" | "city">): string
```

**Regla "la dirección ya termina en la ciudad"** (decisión del usuario):
- Se compara el **último segmento** de `address` separado por comas (no un sufijo de texto libre) con `city`. Así "Cercado de Lima" **no** cuenta como "Lima", y "Cercado de Arequipa" no cuenta como "Arequipa".
- Antes de comparar, ambos lados se normalizan: se recortan espacios y comas al final y al inicio, se pasa a minúsculas y se quitan los acentos (`normalize("NFD")` + eliminar marcas diacríticas U+0300–U+036F). Ej.: "Av. X 10, LIMA , " coincide con "Lima" y "Calle Y 5, Peten" con "Petén". No se tratan variantes ortográficas (p. ej. "Cusco" ≠ "Cuzco").
- Si coinciden, el resultado es "{name}, {address}" con `address` sin las comas/espacios finales; si no, "{name}, {address}, {city}".
- Si `city` está vacía tras normalizar, no se omite nada (se comporta como "no coincide").

`getVenueDirectionsUrl` (en `event-routes.ts`) pasa a usar `encodeURIComponent(formatVenueLocation(venue))`. Consecuencia: la URL de "Cómo llegar" deja de repetir la ciudad cuando la dirección ya termina en ella, y es idéntica a la de antes cuando no. Los tests actuales de `event-routes.test.ts` (Teatro Municipal, "Cercado de Lima") siguen pasando tal cual; se agrega un caso con ciudad repetida (ver Tests).

### C3b — Fecha larga con año (`src/lib/format.ts`)

```ts
/** "domingo 4 de octubre de 2026" en APP_TIME_ZONE. Igual que formatDateLong + " de {año}".
 *  formatDateLong no cambia (sigue sin año; la usa la pantalla). */
export function formatDateLongWithYear(value: string | Date): string
```

Solo la usa el PDF (C4). El `.ics` no se ve afectado (usa fechas UTC de C2).

### C4 — Modelo del PDF (`src/modules/checkout/utils/ticket-pdf.ts`)

```ts
export type TicketPdfPage = {
  eventTitle: string            // event.title
  dateLabel: string             // `${formatDateLongWithYear(startsAt)} · ${formatTime(startsAt)}` → "domingo 4 de octubre de 2026 · 4:00 p. m."
  doorsLabel: string            // `Apertura de puertas: ${formatTime(doorsOpenAt)}` → "Apertura de puertas: 1:30 p. m."
  venueLabel: string            // formatVenueLocation(event.venue) → "Estadio Nacional, Av. del Deporte 1200, Lima"
  zoneLabel: string             // ticket.ticketTypeName
  seatLabel: string | null      // ticket.seatLabel
  priceLabel: string            // formatPrice(ticket.unitPrice) → "$30"
  qrCells: boolean[]            // getDecorativeQrCells(ticket.qrSeed) (441 celdas)
  positionLabel: string         // `Entrada ${position} de ${total}`
  orderLabel: string            // `Pedido N.º ${orderCode}`
}

/** Una página por ticket, en el orden recibido. Pura (sin jsPDF ni DOM). Sin PII. tickets vacío → []. */
export function buildTicketPdfPages(input: {
  event: Pick<EventItem, "title" | "startsAt" | "doorsOpenAt" | "venue">
  orderCode: string
  tickets: readonly ConfirmationTicket[]
}): TicketPdfPage[]

export const TICKET_PDF_MIME_TYPE = "application/pdf"
/** "ticketera-TK-24817.pdf" */
export function getTicketPdfFileName(orderCode: string): string
```

### C5 — Renderer del PDF (`src/modules/checkout/utils/ticket-pdf-renderer.ts`)

```ts
import type { jsPDF } from "jspdf"

/** Subconjunto de jsPDF que usa el renderer (los fakes de test lo implementan). El developer puede ajustar la lista
 *  de métodos a los que realmente use, siempre como Pick<jsPDF, ...>. */
export type TicketPdfDocument = Pick<
  jsPDF,
  | "addPage" | "setFont" | "setFontSize" | "setTextColor" | "setFillColor" | "setDrawColor"
  | "setLineWidth" | "rect" | "line" | "text" | "splitTextToSize" | "output"
>
export type CreateTicketPdfDocument = () => TicketPdfDocument

/** Dibuja una página por elemento: usa la página inicial para la primera y addPage() para cada una de las
 *  siguientes. Devuelve doc.output("blob"). Lanza RangeError si pages está vacío. */
export function renderTicketPdf(
  pages: readonly TicketPdfPage[],
  createDocument: CreateTicketPdfDocument
): Blob

/** const { jsPDF } = await import("jspdf"); devuelve
 *  renderTicketPdf(pages, () => new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })). */
export async function generateTicketPdf(pages: readonly TicketPdfPage[]): Promise<Blob>
```

**Página** (A4 vertical, en mm). Fuente `helvetica` (estándar). El orden de arriba abajo es obligatorio; las medidas exactas quedan a criterio del developer, con margen ≥ 15 mm:

1. Cabecera: "Ticketera" (negrita) a la izquierda y `positionLabel` a la derecha.
2. `eventTitle` en negrita (≥ 20 pt), ajustado al ancho útil con `splitTextToSize`.
3. `dateLabel`, y debajo `doorsLabel`.
4. Etiqueta "Lugar" y `venueLabel` (también con ajuste de línea).
5. Fila de datos con etiqueta y valor: "Zona" `zoneLabel` · "Asiento" `seatLabel` (**solo** si no es `null`) · "Precio" `priceLabel`.
6. **QR**, centrado y de ≥ 50 mm de lado:
   - un `rect` de fondo blanco del tamaño del QR;
   - un `rect` relleno (`"F"`) de `lado / DECORATIVE_QR_SIZE` mm por cada celda `true` de `qrCells`, en la posición (columna, fila) = (índice % 21, ⌊índice / 21⌋). Es la misma grilla que `DecorativeQr`.
7. `orderLabel` bajo el QR.
8. Pie en gris: "Entrada de demostración: el código QR es decorativo y no da acceso al evento."

**Colores:** constantes RGB nombradas en el renderer. Los tokens CSS no existen en un PDF, y esta es la misma excepción que el QR de la 011.
- QR: fondo `[255, 255, 255]` y módulos `[24, 24, 27]` (zinc-900, como `fill-zinc-900` de pantalla).
- Texto principal `[24, 24, 27]` y secundario `[113, 113, 122]` (zinc-500).

### C6 — `ConfirmationActions` (`"use client"`)

```ts
export type ConfirmationActionsProps = {
  event: EventItem                       // ICS y PDF usan id, title, startsAt, doorsOpenAt y venue
  orderCode: string
  tickets: readonly ConfirmationTicket[] // no vacío
}
export function ConfirmationActions(props: ConfirmationActionsProps): React.JSX.Element
```

`ConfirmationView` renderiza `<ConfirmationActions event={event} orderCode={orderCode} tickets={tickets} />`. Ya recibe los tres props, y su contrato público (`ConfirmationViewProps`) no cambia. Los props son serializables (server → client).

**Comportamiento** (un único `<p role="status" aria-live="polite">`, igual que en la 011: vacío al cargar y con las mismas clases):

| Botón | Al pulsar | Mensaje en `role="status"` |
|---|---|---|
| "Ver mis entradas" | Sin cambios (mock). | "Mis entradas estará disponible pronto. Por ahora, tus entradas están en esta página." |
| "Agregar al calendario" | Síncrono: `downloadBlob(new Blob([buildEventCalendar({ event, orderCode, now: new Date() })], { type: CALENDAR_MIME_TYPE }), getCalendarFileName(orderCode))`. | Éxito: "Descargamos el evento para tu calendario." Si algo lanza: "No pudimos crear el archivo del calendario. Inténtalo de nuevo." |
| "Descargar PDF" | Asíncrono: `buildTicketPdfPages` → `await generateTicketPdf(pages)` → `downloadBlob(blob, getTicketPdfFileName(orderCode))`. | Al empezar: "Preparando tu PDF…". Éxito: "Descargamos tu PDF." Si algo lanza (incluido el `import()` de jspdf): "No pudimos generar tu PDF. Inténtalo de nuevo." |

**Estado de carga del PDF:**
- Mientras se genera, el botón recibe `disabled` + `focusableWhenDisabled` (Base UI Button). Así queda con `aria-disabled="true"`, conserva el foco y no responde a clics.
- Lleva además `aria-busy="true"`, y el icono `Download` se reemplaza por `Loader2` con `animate-spin motion-reduce:animate-none` (`aria-hidden`).
- El texto visible y el nombre accesible no cambian.
- Hay un guard con `useRef` que impide una segunda generación si llegan dos clics antes del re-render.
- Al terminar (éxito o error) el botón vuelve a su estado normal.
- Los estilos, los textos cortos en móvil ("Calendario") y el layout de la 011 no cambian.

## Tareas

### Preparación (serie)

- **P0** Dependencia, descarga, fecha con año y ubicación del recinto. Archivos:
  - `package.json`
  - `package-lock.json`
  - `src/lib/download.ts`
  - `src/lib/download.test.ts`
  - `src/lib/format.ts` (solo se agrega `formatDateLongWithYear`; `formatDateLong` no cambia)
  - `src/lib/format.test.ts`
  - `src/modules/events/utils/event-venue.ts`
  - `src/modules/events/utils/event-venue.test.ts`
  - `src/modules/events/utils/event-routes.ts`
  - `src/modules/events/utils/event-routes.test.ts`

  Pasos:
  1. `npm install jspdf@^4` y comprobar `npm ls jspdf html2canvas dompurify canvg` (D4).
  2. Revisar en `node_modules/jspdf/types/index.d.ts` que existen los métodos de `TicketPdfDocument` y la firma de `output("blob")`. Si alguno difiere en v4, anotarlo en el reporte para T2.
  3. Crear C1, C3 y C3b, y refactorizar `getVenueDirectionsUrl` para que use C3 (con la regla de ciudad duplicada).
  4. Correr `npm run lint` y `npm run test`. `npm run build` también debe seguir en verde, aunque jspdf todavía no se importa en ningún archivo.

### Paralelo (tras P0; archivos disjuntos; nadie corre `npm install` ni `npm run build`)

- **T1** Generador `.ics` (C2). Archivos:
  - `src/modules/checkout/utils/event-calendar.ts`
  - `src/modules/checkout/utils/event-calendar.test.ts`
- **T2** PDF: modelo (C4) y renderer (C5). Archivos:
  - `src/modules/checkout/utils/ticket-pdf.ts`
  - `src/modules/checkout/utils/ticket-pdf.test.ts`
  - `src/modules/checkout/utils/ticket-pdf-renderer.ts`
  - `src/modules/checkout/utils/ticket-pdf-renderer.test.ts`
- **T3** Campos obligatorios en el checkout (D1–D3). Archivos:
  - `src/modules/checkout/components/checkout-fields.tsx`
  - `src/modules/checkout/components/checkout-view.test.tsx`

### Integración (serie, después de T1–T3)

- **I1** Acciones reales y referencias a la 013. Archivos:
  - `src/modules/checkout/components/confirmation-actions.tsx`
  - `src/modules/checkout/components/confirmation-actions.test.tsx` (nuevo)
  - `src/modules/checkout/components/confirmation-view.tsx`
  - `src/modules/checkout/components/confirmation-view.test.tsx`: se reemplaza el test 3 de la 011 ("las acciones escriben su mensaje…"), que ya no aplica, por los nuevos de `confirmation-actions.test.tsx`. Los demás tests de este archivo quedan igual.
  - `src/modules/checkout/components/confirmation-not-found.tsx`: solo el comentario de `MY_TICKETS_HREF`, "Mis entradas (012)" → "Mis entradas (013)".
  - `docs/design/design-system.md`: solo la frase de §2.3.5 (línea ~146), "Mis entradas (012)" → "Mis entradas (013)".

  Al terminar, I1 corre `npm run lint`, `npm run test` y `npm run build` (D4).

**Tamaño:** 24 archivos: 10 de código, 11 de test, 2 de dependencias y 1 doc. Supera la guía de ~8 porque el usuario definió el alcance (A + B) en una sola fase, pero casi la mitad son tests y el trabajo pesado se reparte entre tres tareas paralelas pequeñas.

## Criterios de aceptación

**A. Checkout (`/events/{slug}/checkout`)**
- [ ] AC1 Los labels de Nombre completo, Correo electrónico, Número de tarjeta, Vencimiento, CVC y Nombre en la tarjeta, y el texto de términos, terminan en un `*` con clase `text-destructive` y `aria-hidden="true"`. "Celular (opcional)" no tiene asterisco.
- [ ] AC2 Esos 6 inputs y el checkbox de términos tienen `aria-required="true"`. El input de celular no tiene `aria-required`. Ninguno de los 8 controles tiene el atributo `required`.
- [ ] AC3 El nombre accesible de cada input no incluye el asterisco (p. ej. el textbox se llama exactamente "Nombre completo").
- [ ] AC4 Antes de "Datos del comprador" se ve la nota "Los campos marcados con * son obligatorios.", con el `*` en `text-destructive` y `aria-hidden`, y el texto "asterisco" en `sr-only`.
- [ ] AC5 Pulsar "Pagar" con el formulario vacío sigue mostrando los errores de zod de la 010: nombre, correo, número de tarjeta, vencimiento, CVC, nombre en la tarjeta y términos. Sigue enfocando "Nombre completo" y no muestra burbujas nativas del navegador. El celular vacío no da error.
- [ ] AC6 Sin hex ni clases de paleta nuevas en `checkout-fields.tsx`. El resto del checkout (layout, resumen, temporizador, navegación) se ve y funciona igual.

**B. Confirmación (`/events/{slug}/confirmation?...`)**
- [ ] AC7 Con `?order=TK-24817&tickets=evt-002-sur:2,evt-002-oriente:1`, pulsar "Agregar al calendario" descarga `ticketera-TK-24817.ics` (MIME `text/calendar;charset=utf-8`). La región de estado dice "Descargamos el evento para tu calendario.".
- [ ] AC8 El `.ics` se importa en un calendario (Google Calendar, Apple Calendar u Outlook) como "Clásico del Fútbol: Final de Temporada":
  - el 4 de octubre de 2026, de 16:00 a 19:00 en hora de Lima (UTC−5), convertido a la zona del dispositivo;
  - con la ubicación "Estadio Nacional, Av. del Deporte 1200, Lima" (sin "Lima" repetido);
  - y una descripción con "Pedido N.º TK-24817" y la apertura de puertas.
- [ ] AC9 El contenido del `.ics` cumple C2: CRLF en todas las líneas (también la última), UID `TK-24817-evt-002@ticketera`, escapado de `\ , ;` y saltos de línea, y ninguna línea de más de 75 octetos. No contiene nombre, email ni datos de tarjeta.
- [ ] AC10 Pulsar "Descargar PDF":
  - muestra "Preparando tu PDF…";
  - deja el botón con `aria-busy="true"` y `aria-disabled="true"`, con foco;
  - descarga `ticketera-TK-24817.pdf` y escribe "Descargamos tu PDF.".
  Un segundo clic durante la generación no genera otro PDF.
- [ ] AC11 El PDF tiene 3 páginas A4, una por entrada en el orden de pantalla (Sur, Sur, Oriente). Cada página muestra:
  - "Ticketera" y "Entrada N de 3";
  - el título;
  - "domingo 4 de octubre de 2026 · 4:00 p. m." (con año, solo en el PDF) y "Apertura de puertas: 1:30 p. m.";
  - "Lugar" con "Estadio Nacional, Av. del Deporte 1200, Lima" (C3, sin ciudad repetida);
  - "Zona" y "Precio" ($30 o $70);
  - un QR de 21×21 módulos igual al de esa entrada en pantalla;
  - "Pedido N.º TK-24817" y la nota de demostración.

  Las tildes y "N.º" se ven bien.
- [ ] AC12 En un teatro (evt-001 con 2 asientos de Platea), cada página del PDF muestra además "Asiento" con "Fila X, asiento N". En eventos por zona no aparece "Asiento".
- [ ] AC13 Si la generación del PDF falla (p. ej. falla `import("jspdf")`), la región de estado dice "No pudimos generar tu PDF. Inténtalo de nuevo." y el botón vuelve a estar habilitado. Si falla el `.ics`, dice "No pudimos crear el archivo del calendario. Inténtalo de nuevo.".
- [ ] AC14 "Ver mis entradas" mantiene su mensaje mock. El PDF y el `.ics` no contienen PII y el PDF no hace peticiones de red.
- [ ] AC15 jspdf no está en el JS inicial de la confirmación: solo se pide al pulsar "Descargar PDF". Verificable en la pestaña Red, o porque solo se importa con `import()` y como `import type`.
- [ ] AC16 El comentario de `MY_TICKETS_HREF` y `design-system.md` §2.3.5 dicen "Mis entradas (013)". No se editó ninguna spec `done`.
- [ ] AC17 "Cómo llegar" del detalle del evento (`getVenueDirectionsUrl`) deja de repetir la ciudad cuando la dirección ya termina en ella: en evt-002 el parámetro `query` es "Estadio Nacional, Av. del Deporte 1200, Lima". Cuando la dirección no termina en la ciudad, la URL es idéntica a la de antes: en evt-001 `query` es "Teatro Municipal, Jr. Las Artes 377, Cercado de Lima, Lima".
- [ ] AC18 Las fechas en pantalla (detalle, carrusel, resumen de compra, tarjetas de confirmación) siguen sin año: `formatDateLong` no cambia su salida.

## Tests obligatorios

- **`src/lib/download.test.ts`**. Mockear `URL.createObjectURL` / `URL.revokeObjectURL` (jsdom no los implementa) y espiar `HTMLAnchorElement.prototype.click` con `mockImplementation(() => {})` para evitar la navegación de jsdom. Casos:
  - crea el object URL con el blob recibido;
  - el `<a>` clicado tiene `href` = ese URL y `download` = filename;
  - tras el click el `<a>` ya no está en `document.body`;
  - `revokeObjectURL` se llama con el mismo URL después de avanzar los timers (fake timers), y no antes.
- **`src/lib/format.test.ts`** (ampliar): `formatDateLongWithYear("2026-10-04T16:00:00-05:00")` → `"domingo 4 de octubre de 2026"`; un instante que en UTC ya es el día/año siguiente usa la fecha de `APP_TIME_ZONE` (p. ej. `"2026-12-31T20:00:00-05:00"` → `"jueves 31 de diciembre de 2026"`); los tests existentes de `formatDateLong` siguen pasando sin cambios (sin año).
- **`src/modules/events/utils/event-venue.test.ts`**:
  - ciudad repetida: `{ name: "Estadio Nacional", address: "Av. del Deporte 1200, Lima", city: "Lima" }` → `"Estadio Nacional, Av. del Deporte 1200, Lima"`;
  - sin repetir: `{ name: "Teatro Municipal", address: "Jr. Las Artes 377, Cercado de Lima", city: "Lima" }` → `"Teatro Municipal, Jr. Las Artes 377, Cercado de Lima, Lima"` (el último segmento "Cercado de Lima" no es "Lima");
  - normalización: `address: "Av. X 10, LIMA , "` con `city: "Lima"` omite la ciudad y quita la coma final → `"{name}, Av. X 10, LIMA"`; `address: "Calle Y 5, Peten"` con `city: "Petén"` omite la ciudad;
  - ciudad distinta: `address: "Calle del Parque 210, Yanahuara"` con `city: "Arequipa"` → incluye ", Arequipa".
- **`src/modules/events/utils/event-routes.test.ts`** (ampliar): los 3 tests actuales (Teatro Municipal, "Cercado de Lima") siguen sin cambios y prueban que la URL es igual a la de antes cuando la ciudad no se repite. Caso nuevo: con `address: "Av. del Deporte 1200, Lima"` y `city: "Lima"`, `new URL(url).searchParams.get("query")` es `"Estadio Nacional, Av. del Deporte 1200, Lima"`.
- **`src/modules/checkout/utils/event-calendar.test.ts`**:
  - `escapeIcsText`:
    - `a\b` → `a\\b`;
    - `a,b;c` → `a\,b\;c`;
    - `"l1\nl2"`, `"l1\r\nl2"` y `"l1\rl2"` → `l1\nl2` (literal);
    - la barra se escapa antes que el resto: `\,` → `\\\,`.
  - `foldIcsLine`:
    - una línea de 75 octetos no se pliega;
    - una de 76 sí;
    - `"SUMMARY:" + "á".repeat(40)` da los segmentos de 74 y 15 octetos (`"\r\n "` como separador, sin partir la "á");
    - toda continuación empieza con un espacio y ningún segmento supera 75 octetos.
  - `formatIcsDateTime`:
    - `"2026-10-04T16:00:00-05:00"` → `"20261004T210000Z"`;
    - un cambio de día en UTC: `"2026-10-03T20:00:00-05:00"` → `"20261004T010000Z"`;
    - fecha inválida → `RangeError`.
  - `buildEventCalendar` con el ejemplo de referencia de C2:
    - las líneas exactas (incluida la DESCRIPTION plegada);
    - empieza en `BEGIN:VCALENDAR\r\n` y termina en `END:VCALENDAR\r\n`;
    - no hay `\n` sin `\r` delante;
    - DTEND = DTSTART + 180 min;
    - el UID es estable con distinto `now`;
    - no contiene "@" salvo en el UID.
  - `getCalendarFileName("TK-24817")` → `"ticketera-TK-24817.ics"`.
- **`src/modules/checkout/utils/ticket-pdf.test.ts`**:
  - el caso de referencia (evt-002, `TK-24817`, 3 tickets con `buildConfirmationTickets`) da 3 páginas con:
    - `positionLabel` "Entrada 1 de 3"…"3 de 3";
    - `zoneLabel` Sur, Sur, Oriente;
    - `priceLabel` "$30" / "$30" / "$70";
    - `dateLabel` "domingo 4 de octubre de 2026 · 4:00 p. m.";
    - `doorsLabel` "Apertura de puertas: 1:30 p. m.";
    - `venueLabel` "Estadio Nacional, Av. del Deporte 1200, Lima";
    - `orderLabel` "Pedido N.º TK-24817";
    - `seatLabel` `null`;
    - `qrCells` igual a `getDecorativeQrCells(ticket.qrSeed)` (441 celdas) y distinto entre páginas.
  - teatro: `seatLabel` "Fila …, asiento …" en el orden de los tickets.
  - `[]` → `[]`.
  - `getTicketPdfFileName("TK-24817")` → `"ticketera-TK-24817.pdf"`.
  - todos los strings de las páginas son representables en WinAnsi. Basta con comprobar que cada carácter es ≤ U+00FF o es uno de `— – ‘ ’ “ ” … •`.
- **`src/modules/checkout/utils/ticket-pdf-renderer.test.ts`** (fake `TicketPdfDocument` que registra las llamadas; `splitTextToSize` devuelve `[text]`):
  - con 3 páginas, `addPage` se llama 2 veces, `output` 1 vez con `"blob"`, y se devuelve ese blob;
  - por página, `text` recibe (como string o dentro del array) `eventTitle`, `dateLabel`, `doorsLabel`, `venueLabel`, `zoneLabel`, `priceLabel`, `positionLabel` y `orderLabel`;
  - "Asiento" y `seatLabel` solo aparecen si `seatLabel` no es `null`;
  - por página, la cantidad de `rect(..., "F")` con el tamaño de módulo es igual a la cantidad de `true` de `qrCells`. Además hay un fondo blanco del tamaño del QR, y dos celdas encendidas conocidas están en (x0 + col·m, y0 + fila·m);
  - `pages` vacío → `RangeError`;
  - `generateTicketPdf` con `vi.mock("jspdf")` (clase fake): construye con `{ unit: "mm", format: "a4", orientation: "portrait" }` y devuelve el blob de `output`.
- **`src/modules/checkout/components/checkout-view.test.tsx`** (ampliar):
  - el helper `getField` pasa a `screen.getByRole("textbox", { name: label })`. Motivo: `getByLabelText` compara con el `textContent` del `<label>`, que ahora incluye el `*` aunque sea `aria-hidden`, y dejaría de encontrar "Nombre completo";
  - test nuevo:
    - los 6 inputs requeridos y el checkbox tienen `aria-required="true"`;
    - "Celular (opcional)" no lo tiene;
    - ningún input ni el checkbox tiene el atributo `required`;
    - cada label requerido contiene un `span[aria-hidden="true"]` con texto `*` y el de celular no;
    - la nota existe y su `*` es `aria-hidden`;
  - ampliar el test "pulsar Pagar bloqueado…" para que también verifique "Ingresa el vencimiento.", "Ingresa el CVC." e "Ingresa el nombre que figura en la tarjeta.";
  - el resto de tests de la 010 siguen en verde.
- **`src/modules/checkout/components/confirmation-actions.test.tsx`** (nuevo; `vi.mock("@/lib/download")` y `vi.mock` de `@/modules/checkout/utils/ticket-pdf-renderer` para controlar `generateTicketPdf`). Casos:
  - "Agregar al calendario":
    - llama a `downloadBlob` una vez con un `Blob` de tipo `text/calendar;charset=utf-8` cuyo texto empieza con `BEGIN:VCALENDAR` y contiene `UID:TK-24817-evt-002@ticketera`, y con `"ticketera-TK-24817.ics"`;
    - el estado dice "Descargamos el evento para tu calendario.".
  - error del calendario (`downloadBlob` lanza): "No pudimos crear el archivo del calendario. Inténtalo de nuevo.".
  - "Descargar PDF" con una promesa pendiente:
    - el estado dice "Preparando tu PDF…" y el botón tiene `aria-busy="true"` y `aria-disabled="true"`;
    - un segundo clic no llama otra vez a `generateTicketPdf`;
    - al resolver, `generateTicketPdf` recibió 3 páginas, `downloadBlob` recibió el blob y `"ticketera-TK-24817.pdf"`, el estado dice "Descargamos tu PDF." y el botón ya no tiene `aria-busy`.
  - `generateTicketPdf` rechaza: "No pudimos generar tu PDF. Inténtalo de nuevo.", `downloadBlob` no se llama y el botón se rehabilita.
  - "Ver mis entradas" mantiene su mensaje mock.
- **`src/modules/checkout/components/confirmation-view.test.tsx`**: sale el test 3 de la 011. Los demás siguen en verde, y el caso de referencia sigue sin "@" en el texto.
- **Tests existentes en verde sin cambios:** `decorative-qr.test.tsx`, `order-confirmation.test.ts`, `checkout-form.schema.test.ts` y los de la 007–009.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- **Manual** (`npm run dev`):
  - checkout `/events/clasico-del-futbol-final-de-temporada/checkout?tickets=evt-002-sur:2`, en claro y oscuro, desktop y móvil: asteriscos rojos legibles y la nota (AC1, AC4). Pulsar "Pagar" vacío muestra los errores sin burbujas nativas (AC5). Con lector de pantalla (NVDA o VoiceOver), un campo anuncia "Nombre completo, obligatorio", sin "asterisco" (AC2, AC3).
  - `/events/clasico-del-futbol-final-de-temporada/confirmation?order=TK-24817&tickets=evt-002-sur:2,evt-002-oriente:1`:
    - descargar el `.ics` e importarlo en un calendario (AC7, AC8);
    - descargar el PDF y revisar las 3 páginas, las tildes y el QR frente a la pantalla (AC10, AC11);
    - en la pestaña Red, jspdf se pide solo al pulsar (AC15).
  - teatro: `/events/noche-de-rock-sinfonico/tickets` → 2 de Platea → asientos → checkout → pagar → "Descargar PDF" (AC12).
  - simular un error, p. ej. bloqueando el chunk de jspdf en DevTools (AC13).
  - "Cómo llegar" en `/events/clasico-del-futbol-final-de-temporada` busca "Estadio Nacional, Av. del Deporte 1200, Lima", sin "Lima" repetido; en `/events/noche-de-rock-sinfonico` la búsqueda es la misma de antes (AC17).
  - las fechas en pantalla siguen sin año (AC18).

## Preguntas abiertas (resueltas por el usuario, 2026-10-04)

1. **Ciudad duplicada en la ubicación — resuelta:** se omite la ciudad si la dirección ya termina en ella (último segmento por comas, sin distinguir mayúsculas, acentos ni espacios/comas finales). Aplica al `.ics`, al PDF y a "Cómo llegar". Ver C3, AC8, AC11, AC17.
2. **Año en el PDF — resuelta:** sí, solo en el PDF ("domingo 4 de octubre de 2026"), con la función nueva `formatDateLongWithYear` (C3b). La pantalla sigue sin año y el `.ics` no cambia. Ver C4, AC11, AC18.
3. **Tamaño de página — resuelta:** A4 vertical, una entrada por página (sin cambios respecto a C5).
