# 018 — Crear evento: formulario validado, tipos de entrada dinámicos y vista previa en vivo (mock, sin persistencia)

- **Estado:** draft
- **Modo:** SDD
- **Módulo(s):**
  - `src/modules/organizers`: schema zod del formulario, utils puros (reducer, ids, visibilidad de errores, mapeo a la vista previa, capacidad y precio mínimo), secciones del formulario, sección de portada, panel de vista previa y vista `CreateEventView`.
  - `src/app/(organizer)/organizer/events/new/page.tsx`: **reemplaza** el placeholder de la 017.
  - `src/modules/events`: `eventsService.getVenues()` (catálogo de recintos derivado del mock) y **extensión compatible** de `EventCard` (datos "por definir" y modo sin enlace).
  - `src/modules/checkout/components/checkout-fields.tsx`: pasa a importar `RequiredMark`, `RequiredFieldsNote`, `FormSection` y `FORM_CONTROL_CLASS_NAME` desde `src/components/shared` (DRY, sin cambio visual ni de HTML).
  - `src/components/shared`: `form-section.tsx` y `required-mark.tsx` (extraídos del checkout).
  - `src/hooks/use-object-url.ts`: gestión de una object URL (crear/revocar).
  - `src/components/ui/textarea.tsx`: vía CLI de shadcn.
- **Depende de:** **013, 014, 015, 016 y 017 en `done`**. Consume de la 017 (sin cambiarlos):
  - layout `src/app/(organizer)/layout.tsx` (`requireOrganizer()` + `<OrganizerShell>`; el `<main>` ya existe: la página **no** renderiza otro `main`);
  - `ORGANIZER_NEW_EVENT_PATH` (`src/modules/organizers/utils/organizer-routes.ts`) y `ORGANIZER_PATH` (`src/lib/auth/auth-routes.ts`, 013);
  - `formatCount` y `formatPrice` (`src/lib/format.ts`);
  - `requireOrganizer(options?)` (`src/lib/auth/guards.ts`, 015).
  - **No** usa `OrganizerEvent`, `ORGANIZER_EVENTS_MOCK`, `organizerEventsService` ni `OrganizerEventStatusBadge`: sin persistencia no hay evento que agregar al panel (D7). Quedan intactos.
- **Roadmap:** 013–017 · **018 Crear evento (esta)** · después (sin número): persistencia de eventos + subida de portada a GCS, edición de eventos, "Mis eventos".

## Objetivo

1. Un organizador que abre `/organizer/events/new` ve, dentro del shell del panel, el formulario "Crear evento" del diseño `OrgCreate` / `OrgCreateMobile`: Información básica, Fecha y lugar, Imagen de portada (dropzone accesible con preview local) y Tipos de entrada dinámicos con **Capacidad total** calculada.
2. Una **vista previa en vivo** con el `EventCard` del catálogo refleja lo que escribe (título, categoría, fecha, lugar, portada y "Desde" = precio mínimo), sin enlazar a ningún evento. Desktop (≥ `xl`): columna derecha sticky. Por debajo: al final del formulario.
3. "Guardar borrador" y "Publicar evento" validan con zod (borrador: solo nombre; publicar: todo), enfocan el primer error y dan feedback accesible. Son **mock**: nada se persiste ni aparece en el panel.

Todo en verde: `lint`, `test` y `build`.

## Fuera de alcance

- **Persistencia** (tablas `events`, `ticket_types`, `venues` simples) y Server Action de creación. Publicar o guardar no agrega nada a `ORGANIZER_EVENTS_MOCK` ni al catálogo público. Llega en la fase de base de datos.
- **Subida real de la portada** (GCS, `cover_key`), recorte o redimensionado. La imagen solo vive en el navegador como object URL.
- Stripe Connect y la regla "solo un organizador `active` con `charges_enabled` publica con venta" (System Design §4.5).
- **Edición** de eventos, despublicar o cancelar.
- Mapas de asientos, zonas del recinto (`layout_sections`, `section_id` en `ticket_types`) y selección por asiento: los tipos de entrada son "admisión general" (nombre + precio + cantidad).
- Fechas múltiples o funciones, hora de apertura de puertas (`doors_open_at`), edad mínima, fin del evento.
- Recintos administrables (alta de recintos curados por admins, Google Places, coordenadas, zona horaria por recinto).
- Aviso de "cambios sin guardar" al salir de la página (`beforeunload`).
- Ediciones manuales de `src/components/ui/**` (solo se agrega `textarea` con la CLI).
- Cambios en el shell, el sidebar o la vista Resumen de la 017.

## Precondiciones

- 013–017 en `done`. El developer verifica que existan `src/app/(organizer)/layout.tsx`, `src/app/(organizer)/organizer/events/new/page.tsx` (placeholder), `src/modules/organizers/utils/organizer-routes.ts`, `src/lib/auth/guards.ts` y `formatCount` en `src/lib/format.ts`. Si falta alguno → `BLOCKED`.
- **Sin dependencias npm nuevas.** `react-hook-form` **no** está instalado y no se agrega (D1).
- `textarea` existe en el registro `base-nova` (**verificado** con `npx shadcn@latest view textarea`: `<textarea>` nativo con `cn`, sin Base UI).

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `requireOrganizer` | reutilizar | `src/lib/auth/guards.ts` (015) | La página lo sigue llamando con `returnTo: ORGANIZER_NEW_EVENT_PATH` (017 D2). |
| `ORGANIZER_NEW_EVENT_PATH`, `ORGANIZER_PATH` | reutilizar | `organizer-routes.ts` (017), `auth-routes.ts` (013) | `returnTo` y "Volver al resumen". |
| Layout/shell del panel | reutilizar | `src/app/(organizer)/layout.tsx` (017) | Sin cambios. En esta ruta ningún ítem del sidebar queda activo (017 D4). |
| `EVENT_CATEGORIES`, `EventCategoryId`, `Venue` | reutilizar | `src/modules/events/data/event-categories.ts`, `types/event.types.ts` | Las 8 categorías del proyecto. **Coinciden** con las del diseño (mismos 8 labels y orden). |
| `eventsService.getReferenceDate()` | reutilizar | `src/modules/events/services/events.service.ts` | "Ahora" para exigir fecha futura (D4). |
| `eventsService.getVenues()` | **extender** | `src/modules/events/services/events.service.ts` | Catálogo de recintos = venues únicos de `EVENTS_MOCK` (C2). TEMPORAL. |
| `EventCard` | **extender (compatible)** | `src/modules/events/components/event-card.tsx` | Tipo de datos más permisivo (`EventCardData`, `EventItem` sigue siendo asignable) + prop `isLinked` (C3). Los 3 consumidores actuales no cambian. |
| `formatCount`, `formatPrice` | reutilizar | `src/lib/format.ts` (017 / 003) | Capacidad total y "Desde" en USD. |
| `Field`, `FieldLabel`, `FieldError`, `FieldDescription` | reutilizar | `src/components/ui/field.tsx` | Mismo patrón que `CheckoutFields`. |
| `Input` | reutilizar | `src/components/ui/input.tsx` | Texto, `type="date"`, `type="time"`, precio y cantidad (D3). |
| `Select*` | reutilizar | `src/components/ui/select.tsx` | Categoría y recinto (Base UI, `role="combobox"`; patrón de `event-search-form.tsx`). |
| `Button` | reutilizar | `src/components/ui/button.tsx` | Acciones, quitar fila, quitar imagen. |
| `Textarea` | agregar de shadcn | `src/components/ui/textarea.tsx` | `npx shadcn@latest add textarea`. |
| `Calendar` + `Popover` | no se usan | — | D3: `input type="date"`/`"time"` nativos (como el diseño). |
| `RequiredMark` + nota "Los campos marcados con * son obligatorios." | **mover** a shared | `src/components/shared/required-mark.tsx` | Hoy privados en `checkout-fields.tsx` (012 D3). Con este formulario hay 2 consumidores → DRY. Mismo HTML. |
| `Section` del checkout + clases del control | **mover** a shared | `src/components/shared/form-section.tsx` | `Section` (privado en `checkout-fields.tsx`) pasa a `FormSection`; el string de clases del `Input` del checkout pasa a `FORM_CONTROL_CLASS_NAME`. Mismo HTML en el checkout. |
| `QuantityStepper` | no aplica | `src/components/shared/quantity-stepper.tsx` | La cantidad de un tipo de entrada llega a miles: un stepper ±1 no sirve; input numérico. |
| Object URL de la portada | crear | `src/hooks/use-object-url.ts` | No existe (`createObjectURL` solo aparece en `src/lib/download.ts`, que la revoca al instante). Genérico, sin dominio → `src/hooks`. |
| Schema del formulario | crear | `src/modules/organizers/schemas/create-event.schema.ts` | C4. |
| Estado del formulario (reducer), ids, orden y visibilidad de errores | crear | `src/modules/organizers/utils/create-event-form.ts` | C5. Puro y testeado. |
| `startsAt`, capacidad, precio mínimo, mapeo a `EventCardData` | crear | `src/modules/organizers/utils/create-event-preview.ts` | C6. Puro y testeado. |
| Secciones del formulario | crear | `src/modules/organizers/components/create-event-details-fields.tsx`, `ticket-type-fields.tsx`, `cover-image-section.tsx` | C7. |
| Panel de vista previa | crear | `src/modules/organizers/components/create-event-preview-panel.tsx` | C7. |
| Vista | crear | `src/modules/organizers/components/create-event-view.tsx` | C8. |
| `react-hook-form` | no se agrega | — | D1. |

## Decisiones

### D1 — Estado propio + zod (patrón del checkout), sin `react-hook-form`

- El checkout (010/012) ya resuelve: valores controlados como strings, `getXFieldErrors(values)` con zod, errores visibles por campo tocado o intento de envío, foco al primer error por orden visual. Se reutiliza el patrón.
- La única novedad son las filas dinámicas: se resuelven con un **reducer puro** (`createEventFormReducer`, C5) testeado por transiciones, usado con `useReducer` en la vista. No hace falta un hook propio aparte (sería un wrapper trivial de `useReducer`).
- `react-hook-form` sería una segunda forma de hacer formularios en el proyecto para un único caso (KISS/YAGNI).

### D2 — Lugar: recinto del catálogo + "Otro lugar" (TEMPORAL)

- System Design §6.4: `events.venue_id` es obligatorio; los recintos son curados (admins) o "simples" creados por el organizador (§6.5: Crear evento escribe `venues (simple)`). El diseño usa texto libre "Lugar" + "Ciudad".
- Modelo mínimo coherente con ambos:
  - Select **"Recinto"** con los recintos de `eventsService.getVenues()` (10 venues únicos de `EVENTS_MOCK`; label `"{name} · {city}"`) y una última opción **"Otro lugar"** (`OTHER_VENUE_ID = "other"`).
  - Con "Otro lugar" aparecen **"Nombre del lugar"** y **"Ciudad"** (texto libre, placeholders del diseño "Ej. Estadio Nacional" / "Ej. Lima"): será el `venue` simple.
- **TEMPORAL:** el catálogo sale del mock de eventos (no hay tabla `venues`); con base, `getVenues()` lee `venues` curados y los simples del organizador. Dirección, coordenadas y zona horaria del lugar simple quedan fuera de alcance.

### D3 — Controles nativos para fecha y hora

- `Input type="date"` ("Fecha") e `Input type="time"` ("Hora de inicio"), como el diseño: teclado y lector de pantalla los soportan, en móvil abren el selector del sistema y se prueban con un `change`. El `Calendar` + `Popover` del buscador no aporta aquí y no tiene hora.
- Precio y cantidad son `type="text"` con `inputMode="decimal"` / `"numeric"` (como los campos numéricos del checkout): evita las rarezas de `type="number"` (rueda del ratón, `e`, valores vacíos ilegibles). La validación es la de zod.

### D4 — Fecha futura respecto a la fecha de referencia

- "Ahora" = `new Date(eventsService.getReferenceDate())` (`MOCK_REFERENCE_DATE`, 2026-10-02 12:00 -05:00), la misma referencia que usa el catálogo para "próximos". La página la pasa como ISO a la vista; el schema la recibe inyectada (tests deterministas).
- `startsAt = "{date}T{time}:00-05:00"` (C6). **TEMPORAL:** offset fijo de `APP_TIME_ZONE` (America/Lima, sin horario de verano), igual que el mock. Con base se usará `venues.timezone`.
- Regla: `startsAt` estrictamente posterior a "ahora". El error se muestra en "Fecha".

### D5 — Reglas de validación

| Campo | Borrador | Publicar | Regla (sobre el valor recortado) |
|---|---|---|---|
| Nombre del evento | **sí** | sí | 3–100 caracteres |
| Categoría | — | sí | id de `EVENT_CATEGORIES` (valor inicial `"concerts"`, como el diseño) |
| Descripción | — | sí | 20–2000 caracteres |
| Fecha / Hora de inicio | — | sí | `YYYY-MM-DD` de calendario real / `HH:MM` 00:00–23:59; juntas, futuras (D4) |
| Recinto | — | sí | id de `getVenues()` o `"other"` |
| Nombre del lugar / Ciudad | — | sí, solo con "Otro lugar" | 2–100 / 2–60 caracteres |
| Imagen de portada | — | sí | JPG o PNG (`image/jpeg`, `image/png`), ≤ 5 MB |
| Tipos de entrada | — | sí | ≥ 1 fila (la UI no deja quitar la última) |
| · Nombre | — | sí | 1–60 caracteres; único entre filas (comparación `trim` + `toLocaleLowerCase("es")`) |
| · Precio (USD) | — | sí | `^\d+(\.\d{1,2})?$`, de 0 a 100000. **Se permite 0** (entrada gratuita): `ticket_types.price_cents ≥ 0` (System Design) |
| · Cantidad | — | sí | entero `^\d+$`, de 1 a 100000 |

- **Borrador** = solo el nombre: un borrador es trabajo en curso. **Publicar** = todo.
- Mensajes exactos en C4.

### D6 — Feedback y destino de las acciones (mock)

- **Guardar borrador** (`type="button"`):
  - nombre inválido → muestra su error, enfoca "Nombre del evento" y anuncia "Revisa 1 campo marcado para guardar el borrador.";
  - válido → el formulario **sigue en pantalla**; el botón pasa a "Borrador guardado" (icono `Check`) y la región `role="status"` anuncia "Borrador guardado (modo demo). No se conserva al salir de esta página.". Cualquier cambio posterior en el formulario devuelve el botón a "Guardar borrador" y vacía el anuncio.
- **Publicar evento** (`type="submit"` del `<form noValidate>`; en móvil el texto visible es "Publicar"):
  - con errores → se muestran todos, se enfoca el primero en orden visual (C5) y se anuncia "Revisa N campos marcados para publicar." ("1 campo marcado" en singular);
  - válido → el formulario, la vista previa y la barra de acciones se reemplazan por un **estado de éxito** en la misma página: `h2` "Evento publicado (modo demo)" que recibe el foco, texto "“{título}” no se guardó y no aparecerá en tu panel.", link "Volver al resumen" → `ORGANIZER_PATH` y botón "Crear otro evento" (resetea el formulario, revoca la object URL y enfoca "Nombre del evento").
- Una nota fija bajo el `h1`: "Modo demo: los eventos no se guardan ni se publican de verdad.".
- No hay redirección a `/organizer` con aviso: obligaría a tocar la vista Resumen de la 017 para leer un parámetro (fuera de alcance).

### D7 — Sin persistencia ni store

- No hay store zustand ni `organizerEventsService.create()`: el evento creado no aparece en el panel (YAGNI; preferencia del orquestador). El tipo de salida del schema (`CreateEventData`, C4) queda como contrato para la futura Server Action.

### D8 — Vista previa con `EventCard` sin enlace

- `EventCard` hoy exige `EventItem` completo y enlaza el título a `/events/{slug}` con link estirado. En la vista previa no hay slug real y los datos pueden faltar.
- Extensión **compatible** (C3): tipo `EventCardData` con `startsAt`, `imageUrl` y `priceFrom` que admiten `null` ("por definir") y `venue` reducido a `name`/`city`; prop `isLinked` (por defecto `true`). `EventItem` sigue siendo asignable, así que ningún consumidor cambia.
- Con `isLinked={false}` el título es texto (sin `<a>`) y la tarjeta no tiene hover/elevación ni foco: no es interactiva. "Ver entradas" ya era un `span aria-hidden` decorativo y se mantiene (transcrito).
- Mapeo puro y testeado `buildEventCardPreview` (C6). Placeholders del diseño: "Nombre del evento", "Lugar · Ciudad", badge "MES"/"--", "Desde —".
- La tarjeta usa sus propios breakpoints (`sm`): horizontal en < 640 px (como `OrgCreateMobile`) y vertical desde `sm` (como `OrgCreate`).

### D9 — Layout responsive

- **≥ `xl` (1280 px):** grid `xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-8 xl:items-start`, contenedor `max-w-6xl`. La vista previa es `xl:sticky xl:top-10`. Entre `lg` y `xl` el área de contenido (≈ 664 px) no entra formulario + 340 px (mismo criterio que la 017 D8): una columna, con la vista previa al final (`max-w-sm`).
- **Encabezado:** la barra móvil de la 017 (logo + menú) se queda como está. El "← Crear evento" de `OrgCreateMobile` va **debajo**, dentro de la página (no se extiende el shell): link `ArrowLeft` de 44 px con nombre accesible "Volver al resumen" + `h1` "Crear evento" en la misma fila; en `lg`, el link muestra además el texto "Resumen" y el `h1` va debajo a 32 px (como `OrgCreate`).
- **Acciones:** un único bloque en el DOM al final de la columna del formulario.
  - En `lg+`: estático, alineado a la derecha ("Guardar borrador" outline + "Publicar evento" primario, 52 px).
  - En `< lg`: barra fija inferior (`fixed inset-x-0 bottom-0`) con el contrato de la design-system §2.3.4: atributo `data-mobile-action-bar`, alto total ≤ `--mobile-action-bar-height` (5rem) con safe-area incluida: `pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]` + botones de 52 px. Así `globals.css` ya da `scroll-padding-bottom` para que ningún campo enfocado quede tapado.
  - La raíz de la vista lleva `pb-(--mobile-action-bar-height) lg:pb-0` para que la vista previa (último contenido) no quede bajo la barra. El texto del estado del borrador **no** va dentro de la barra (rompería el alto máximo): el cambio de etiqueta del botón es el feedback visual y la región `role="status"` (sr-only) el auditivo.

### D10 — Moneda USD

- El diseño usa "S/" y `toLocaleString('es-PE')`. El proyecto usa **USD** (System Design §6.1): labels "Precio (USD)", "Desde" con `formatPrice` (`$25`, `$25.50`) y "Capacidad total" con `formatCount` (`1,200 entradas`).

## Contratos

### C1 — Primitivos compartidos (extraídos del checkout)

```ts
// src/components/shared/required-mark.tsx
/** <span aria-hidden="true" className="text-destructive">*</span> (idéntico al de la 012 D3). */
export function RequiredMark(): React.JSX.Element
/** <p className={cn("text-[0.8125rem] text-muted-foreground", className)}>
 *   Los campos marcados con <RequiredMark /><span className="sr-only">asterisco</span> son obligatorios.</p> */
export function RequiredFieldsNote(props: { className?: string }): React.JSX.Element

// src/components/shared/form-section.tsx
/** Tarjeta de sección: el `Section` actual de checkout-fields.tsx, mismas clases y marcado
 *  (<section> + h2 + descripción opcional). */
export type FormSectionProps = { title: string; description?: React.ReactNode; children: React.ReactNode }
export function FormSection(props: FormSectionProps): React.JSX.Element
/** El string de clases que hoy lleva el Input de CheckoutFields ("h-13 rounded-[14px] … dark:bg-card"). */
export const FORM_CONTROL_CLASS_NAME: string
```

- `checkout-fields.tsx` borra sus copias privadas e importa estas piezas. Su HTML no cambia: los tests de la 010/012 siguen en verde **sin cambios**. La nota del checkout se renderiza como `<RequiredFieldsNote className="px-1 lg:px-0" />`.
- Criterio propio: el formulario de crear evento usa `FormSection` tal cual (radio 24 px y `h2` 20 px en `lg`, en vez de 22 px / 18 px del diseño), por consistencia entre formularios del producto.

### C2 — Catálogo de recintos (`eventsService`, agregado)

```ts
/** Recintos del catálogo: venues únicos (por id) de EVENTS_MOCK, ordenados por name con localeCompare("es").
 *  Array y objetos nuevos (mutarlos no altera el mock).
 *  TEMPORAL (mock): con base, `venues` curados + simples del organizador (D2). */
async getVenues(): Promise<Venue[]>
```

### C3 — `EventCard` (extensión compatible, `src/modules/events/components/event-card.tsx`)

```ts
/** Datos que necesita la tarjeta. EventItem es asignable (no cambia ningún consumidor). */
export type EventCardData = Pick<EventItem, "slug" | "title" | "category" | "imageAlt" | "availability"> & {
  venue: Pick<Venue, "name" | "city">
  /** null = fecha por definir. */
  startsAt: string | null
  /** null = sin imagen. */
  imageUrl: string | null
  /** null = precio por definir. */
  priceFrom: number | null
}

export type EventCardProps = {
  event: EventCardData
  variant?: "ticket" | "compact"
  /** false = sin <a> (título como texto), sin link estirado y sin hover/elevación/foco de tarjeta. Por defecto true. */
  isLinked?: boolean
  className?: string
}
```

En ambas variantes:
- `imageUrl === null` → en lugar de `next/image`, un bloque del mismo tamaño `bg-primary/10 text-primary flex items-center justify-center` con icono `ImagePlus` (lucide) `size-8 aria-hidden`. Con `imageUrl` string, `next/image` igual que hoy (una `blob:` URL se sirve sin optimizar automáticamente: verificado en `node_modules/next/dist/shared/lib/get-img-props.js`).
- `startsAt === null` → badge (ya `aria-hidden`) con "MES" y "--"; donde hoy hay `<time>` con la fecha corta se muestra el texto "Fecha por definir" (sin `<time>`).
- `priceFrom === null` → bajo "Desde", `<span aria-hidden="true">—</span><span className="sr-only">por definir</span>`.
- Con datos completos y `isLinked` por defecto, el HTML es **idéntico** al actual.

### C4 — Schema (`src/modules/organizers/schemas/create-event.schema.ts`)

```ts
import type { EventCategoryId } from "@/modules/events/types/event.types"

export const OTHER_VENUE_ID = "other"
export const COVER_IMAGE_ACCEPT = "image/jpeg,image/png"
export const COVER_IMAGE_MAX_BYTES = 5 * 1024 * 1024

export type TicketTypeField = "name" | "price" | "quantity"
export type TicketTypeRowValues = { id: string } & Record<TicketTypeField, string>

/** Valores controlados (strings salvo la portada). */
export type CreateEventFormValues = {
  title: string
  categoryId: string
  description: string
  /** "YYYY-MM-DD" o "". */
  date: string
  /** "HH:MM" o "". */
  time: string
  /** id de recinto, OTHER_VENUE_ID o "" (sin elegir). */
  venueId: string
  customVenueName: string
  customVenueCity: string
  coverImage: File | null
  ticketTypes: TicketTypeRowValues[]
}

export type CreateEventTextField = Exclude<keyof CreateEventFormValues, "coverImage" | "ticketTypes">

/** Claves de error. Las de fila usan el id estable de la fila (no el índice). */
export type CreateEventErrorKey =
  | CreateEventTextField
  | "coverImage"
  | "ticketTypes"
  | `ticketTypes.${string}.${TicketTypeField}`
export type CreateEventErrors = Partial<Record<CreateEventErrorKey, string>>

export type CreateEventValidationContext = { now: Date; venueIds: readonly string[] }

export type CreateEventData = {
  title: string
  categoryId: EventCategoryId
  description: string
  /** ISO con offset -05:00 (C6). */
  startsAt: string
  venue: { kind: "catalog"; venueId: string } | { kind: "custom"; name: string; city: string }
  coverImage: File
  /** price en USD (dólares, como TicketType.price). */
  ticketTypes: { name: string; price: number; capacity: number }[]
}

/** true si es JPG/PNG y pesa ≤ COVER_IMAGE_MAX_BYTES. Gating de la preview local. */
export function isAcceptedCoverImage(file: Pick<File, "type" | "size">): boolean

/** Schema completo (publicar). Recorta los strings. */
export function createPublishEventSchema(
  context: CreateEventValidationContext
): z.ZodType<CreateEventData, CreateEventFormValues>

/** Primer mensaje por clave; {} si es válido. Mapea path ["ticketTypes", i, campo] → `ticketTypes.${filas[i].id}.${campo}`. */
export function getPublishEventErrors(
  values: CreateEventFormValues,
  context: CreateEventValidationContext
): CreateEventErrors

/** Solo el nombre (D5). {} o { title }. */
export function getDraftEventErrors(values: Pick<CreateEventFormValues, "title">): CreateEventErrors
```

**Mensajes** (un mensaje por campo, el primero que aplique):

| Clave | Caso | Mensaje |
|---|---|---|
| title | < 3 | "Ingresa el nombre del evento (mínimo 3 caracteres)." |
| title | > 100 | "El nombre puede tener hasta 100 caracteres." |
| categoryId | no es una categoría | "Elige una categoría." |
| description | < 20 | "Describe el evento en al menos 20 caracteres." |
| description | > 2000 | "La descripción puede tener hasta 2000 caracteres." |
| date | vacía | "Elige la fecha." |
| date | formato o fecha inexistente (p. ej. 2026-02-30) | "Elige una fecha válida." |
| time | vacía | "Elige la hora de inicio." |
| time | formato | "Usa el formato HH:MM." |
| date | fecha y hora válidas pero ≤ now | "La fecha y hora deben ser futuras." |
| venueId | vacío | "Elige un recinto." |
| venueId | id desconocido | "Elige un recinto de la lista." |
| customVenueName | < 2 (solo con "other") | "Ingresa el nombre del lugar." |
| customVenueName | > 100 | "Usa hasta 100 caracteres." |
| customVenueCity | < 2 (solo con "other") | "Ingresa la ciudad." |
| customVenueCity | > 60 | "Usa hasta 60 caracteres." |
| coverImage | null | "Sube una imagen de portada." |
| coverImage | tipo | "Usa una imagen JPG o PNG." |
| coverImage | tamaño | "La imagen puede pesar hasta 5 MB." |
| ticketTypes | 0 filas | "Agrega al menos un tipo de entrada." |
| ·name | vacío | "Ingresa el nombre." |
| ·name | > 60 | "Usa hasta 60 caracteres." |
| ·name | repetido (2.ª aparición en adelante) | "Ya hay un tipo de entrada con este nombre." |
| ·price | vacío | "Ingresa el precio." |
| ·price | formato | "Usa un número como 25 o 25.50." |
| ·price | > 100000 | "El precio máximo es $100,000." |
| ·quantity | vacío | "Ingresa la cantidad." |
| ·quantity | no entero o < 1 | "Usa un número entero mayor que 0." |
| ·quantity | > 100000 | "La cantidad máxima es 100,000." |

- Con `venueId !== "other"`, `customVenueName`/`customVenueCity` no se validan.
- El "pasado" solo se evalúa si fecha y hora son válidas.

### C5 — Estado y errores del formulario (`src/modules/organizers/utils/create-event-form.ts`, puro)

```ts
export type CreateEventFormState = { values: CreateEventFormValues; nextTicketTypeSeq: number }

export type CreateEventFormAction =
  | { type: "setField"; field: CreateEventTextField; value: string }
  | { type: "setCoverImage"; file: File | null }
  | { type: "addTicketType" }
  | { type: "removeTicketType"; id: string }
  | { type: "setTicketTypeField"; id: string; field: TicketTypeField; value: string }
  | { type: "reset" }

/** title "", categoryId "concerts", description/date/time/venueId/custom* "", coverImage null,
 *  ticketTypes [{ id: "tt-1", name: "", price: "", quantity: "" }], nextTicketTypeSeq 2. Objeto nuevo en cada llamada. */
export function createInitialCreateEventFormState(): CreateEventFormState

/** Inmutable (nunca muta state). addTicketType agrega al final { id: `tt-${seq}`, … } y suma 1 a seq;
 *  removeTicketType no hace nada si queda 1 fila o el id no existe; setTicketTypeField con id inexistente no hace nada;
 *  reset = createInitialCreateEventFormState(). Sin cambio real → puede devolver el mismo state. */
export function createEventFormReducer(
  state: CreateEventFormState,
  action: CreateEventFormAction
): CreateEventFormState

/** "create-event-title", "create-event-ticketTypes-tt-2-price" (los "." pasan a "-"). */
export function getCreateEventFieldId(key: CreateEventErrorKey): string
/** `${getCreateEventFieldId(key)}-error` */
export function getCreateEventErrorId(key: CreateEventErrorKey): string

/** Orden visual: title, categoryId, description, date, time, venueId, [customVenueName, customVenueCity solo si
 *  venueId === OTHER_VENUE_ID], coverImage, ticketTypes, y por fila (en orden) name, price, quantity. */
export function getCreateEventErrorOrder(values: CreateEventFormValues): CreateEventErrorKey[]

/** Primera clave con error según getCreateEventErrorOrder; null si no hay. */
export function getFirstCreateEventErrorKey(
  errors: CreateEventErrors,
  values: CreateEventFormValues
): CreateEventErrorKey | null

export type CreateEventSubmitAttempt = "none" | "draft" | "publish"

/** "publish" → publishErrors completos. Si no: publishErrors de las claves tocadas, más draftErrors si attempt es
 *  "draft". Objeto nuevo. */
export function getVisibleCreateEventErrors(input: {
  publishErrors: CreateEventErrors
  draftErrors: CreateEventErrors
  touched: ReadonlySet<CreateEventErrorKey>
  attempt: CreateEventSubmitAttempt
}): CreateEventErrors

/** "Revisa 1 campo marcado para publicar." / "Revisa 3 campos marcados para publicar.";
 *  action "draft" → "… para guardar el borrador." */
export function getInvalidFieldsMessage(count: number, action: "draft" | "publish"): string
```

### C6 — Derivados y vista previa (`src/modules/organizers/utils/create-event-preview.ts`, puro)

```ts
/** TEMPORAL: offset fijo de APP_TIME_ZONE (America/Lima, sin DST). Con base: venues.timezone. */
export const EVENT_UTC_OFFSET = "-05:00"

/** "2026-10-20" + "20:30" → "2026-10-20T20:30:00-05:00". null si la fecha no es YYYY-MM-DD de calendario real o
 *  la hora no es HH:MM 00:00–23:59. (El schema la reutiliza.) */
export function buildEventStartsAt(date: string, time: string): string | null

/** "25" → 25, "25.5" → 25.5, "0" → 0; formato inválido, vacío o > 100000 → null. */
export function parseTicketPrice(raw: string): number | null
/** "150" → 150; vacío, no entero, < 1 o > 100000 → null. */
export function parseTicketQuantity(raw: string): number | null

/** Suma de las cantidades válidas (parseTicketQuantity); las inválidas cuentan 0. */
export function getTotalCapacity(rows: readonly Pick<TicketTypeRowValues, "quantity">[]): number
/** "0 entradas", "1 entrada", "1,200 entradas" (formatCount). */
export function formatCapacityLabel(total: number): string
/** Mínimo de los precios válidos (parseTicketPrice, incluye 0); ninguno → null. */
export function getMinTicketPrice(rows: readonly Pick<TicketTypeRowValues, "price">[]): number | null

/** Datos de la tarjeta de vista previa:
 *  slug ""; title = title recortado || "Nombre del evento";
 *  category = EVENT_CATEGORIES por id || EVENT_CATEGORIES[0];
 *  venue = recinto de `venues` por venueId → { name, city }; "other" → { customVenueName || "Lugar", customVenueCity || "Ciudad" }
 *          (recortados); "" o desconocido → { "Lugar", "Ciudad" };
 *  startsAt = fecha válida ? buildEventStartsAt(date, hora válida ? time : "00:00") : null;
 *  imageUrl = coverUrl; imageAlt ""; priceFrom = getMinTicketPrice(ticketTypes); availability "available". */
export function buildEventCardPreview(
  values: CreateEventFormValues,
  options: { venues: readonly Venue[]; coverUrl: string | null }
): EventCardData
```

### C7 — Componentes de sección (`src/modules/organizers/components/`)

```ts
// create-event-details-fields.tsx — secciones "Información básica" y "Fecha y lugar"
export type CreateEventDetailsFieldsProps = {
  values: CreateEventFormValues
  venues: readonly Venue[]
  /** Solo los errores visibles. */
  errors: CreateEventErrors
  onFieldChange: (field: CreateEventTextField, value: string) => void
  onFieldBlur: (key: CreateEventErrorKey) => void
}
export function CreateEventDetailsFields(props: CreateEventDetailsFieldsProps): React.JSX.Element

// ticket-type-fields.tsx ("use client") — sección "Tipos de entrada" + Capacidad total
export type TicketTypeFieldsProps = {
  rows: readonly TicketTypeRowValues[]
  errors: CreateEventErrors
  onAdd: () => void
  onRemove: (id: string) => void
  onRowChange: (id: string, field: TicketTypeField, value: string) => void
  onFieldBlur: (key: CreateEventErrorKey) => void
}
export function TicketTypeFields(props: TicketTypeFieldsProps): React.JSX.Element

// cover-image-section.tsx ("use client") — sección "Imagen de portada"
export type CoverImageSectionProps = {
  file: File | null
  /** Object URL solo si el archivo es aceptado; null si no. */
  previewUrl: string | null
  error?: string
  onFileChange: (file: File | null) => void
}
export function CoverImageSection(props: CoverImageSectionProps): React.JSX.Element

// create-event-preview-panel.tsx — vista previa
export type CreateEventPreviewPanelProps = { event: EventCardData; className?: string }
export function CreateEventPreviewPanel(props: CreateEventPreviewPanelProps): React.JSX.Element
```

**Reglas comunes de campo** (patrón de `CheckoutFields`, 010/012):
- `FieldLabel htmlFor` + id de `getCreateEventFieldId`. Obligatorios con `<RequiredMark />` en el label y `aria-required="true"` en el control (sin `required` nativo; el form es `noValidate`). Con error visible: `aria-invalid="true"` + `aria-describedby={getCreateEventErrorId(key)}` y `<FieldError id=…>`. Inputs y selects con `FORM_CONTROL_CLASS_NAME`.
- **Todos** los campos del formulario llevan asterisco y `aria-required`, porque publicar los exige todos (D5).

**`CreateEventDetailsFields`** (transcrito de `OrgCreate`/`OrgCreateMobile`):
- `FormSection` "Información básica":
  - "Nombre del evento" (`Input`, placeholder "Ej. Festival de verano 2026", `maxLength` no se fuerza).
  - "Categoría": `Select` con las 8 `EVENT_CATEGORIES`; `SelectTrigger` con `id` del campo, `aria-labelledby` al label (el label lleva `id`), `aria-required`, ancho completo.
  - "Descripción": `Textarea` (`rows={4}`, alto mínimo 120 px, `resize-y`, placeholder "Cuenta de qué trata el evento, quiénes se presentan y qué incluye la entrada.").
- `FormSection` "Fecha y lugar":
  - "Fecha" (`type="date"`) y "Hora de inicio" (`type="time"`) en 2 columnas (también en móvil, como el diseño).
  - "Recinto": `Select` con `"{name} · {city}"` por recinto y "Otro lugar" al final; placeholder "Elige un recinto". En desktop ocupa las 2 columnas.
  - Con "Otro lugar": "Nombre del lugar" (placeholder "Ej. Estadio Nacional") y "Ciudad" (placeholder "Ej. Lima"); 2 columnas en `lg`, apilados en móvil.
- `onFieldBlur` en blur de cada control (en los `Select`, al cerrarse el popup o en blur del trigger).

**`TicketTypeFields`**:
- `FormSection` "Tipos de entrada" con descripción "Cada tipo tiene su precio y su cantidad disponible.".
- Cabecera de columnas solo en `lg` y `aria-hidden`: "Nombre", "Precio (USD)", "Cantidad" (con `RequiredMark`), grid `lg:grid-cols-[minmax(0,1fr)_150px_150px_44px] gap-3`.
- Por fila (`n` = posición 1-based): `<fieldset>` con `<legend>` "Tipo de entrada {n}" (visible "Tipo {n}" en móvil con `<span className="sr-only">de entrada </span>`, todo `sr-only` en `lg`). En móvil, tarjeta `rounded-2xl border bg-muted/40 p-3.5` (transcrito `#FAFAFA`); en `lg`, fila del grid sin tarjeta.
  - 3 inputs con label visible en móvil y `sr-only` en `lg`: "Nombre", "Precio (USD)", "Cantidad", cada uno con `<span className="sr-only"> del tipo de entrada {n}</span>` → nombres accesibles "Nombre del tipo de entrada 1", "Precio (USD) del tipo de entrada 1", "Cantidad del tipo de entrada 1". Placeholders "Ej. General", "0", "0". Precio `inputMode="decimal"`, cantidad `inputMode="numeric"`.
  - Botón `Button variant="ghost" size="icon"` 44 px, icono `Trash2` `aria-hidden`, `aria-label="Quitar tipo de entrada {n}"`, `disabled` si hay 1 sola fila.
- Botón "Agregar tipo de entrada" (`type="button"`, icono `Plus`, `border-[1.5px] border-dashed border-primary/40 text-primary`, alto 48 px a todo el ancho en móvil, 44 px `w-fit` en `lg`), con `id={getCreateEventFieldId("ticketTypes")}` (destino de foco del error de lista).
- Foco: al agregar, el foco va al "Nombre" de la fila nueva; al quitar la fila `n`, al "Nombre" de la fila que queda en la posición `min(n, total)`.
- Anuncio en un `<p className="sr-only" aria-live="polite">` propio: "Tipo de entrada {n} agregado." / "Tipo de entrada {n} quitado." (`n` = posición de la fila agregada/quitada).
- Pie: `<p>` con borde superior, "Capacidad total" y `<strong className="tabular-nums">{formatCapacityLabel(getTotalCapacity(rows))}</strong>`.

**`CoverImageSection`**:
- `FormSection` "Imagen de portada" (`title` es un string: el asterisco va en el texto del label del dropzone, no en el `h2`).
- Sin archivo aceptado: **dropzone** = `<label htmlFor={id}>` (`h-[150px] lg:h-[180px] rounded-2xl lg:rounded-[18px] border-[1.5px] border-dashed border-primary/40 bg-primary/5 text-primary`, `has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring`, cursor pointer) con icono `ImagePlus` 30 px `aria-hidden`, texto "Arrastra una imagen o haz clic para subirla" en `lg` / "Subir imagen" en móvil + `RequiredMark`, y "JPG o PNG, horizontal (16:9), hasta 5 MB" (`id` usado en `aria-describedby`).
  - `<input type="file" accept={COVER_IMAGE_ACCEPT} className="sr-only">` con `id={getCreateEventFieldId("coverImage")}`, `aria-required`, `aria-describedby` = hint (+ error si lo hay), `aria-invalid` con error. Es enfocable con Tab y Enter/Espacio abre el selector (nativo).
  - Drag & drop sobre el label: `dragover` con `preventDefault` y estado visual (`border-primary bg-primary/10`); `drop` toma el **primer** archivo y llama a `onFileChange(file)`. Tras un `change`, el `value` del input se vacía para poder volver a elegir el mismo archivo.
- Con `previewUrl`: imagen 16:9 (`next/image` `fill`, `alt=""`, `rounded-2xl object-cover`), nombre del archivo, botón "Cambiar imagen" (abre el mismo input) y botón "Quitar imagen" (`onFileChange(null)` y foco al input).
- Con archivo **no** aceptado: el dropzone sigue visible y el error de C4 se muestra debajo (la vista marca `coverImage` como tocado al cambiar el archivo).

**`CreateEventPreviewPanel`**:
- `<aside aria-label="Vista previa">` con eyebrow "Vista previa" (`text-xs lg:text-[0.8125rem] font-semibold uppercase tracking-[0.06em] text-muted-foreground`, `aria-hidden` porque el `aria-label` ya lo nombra), `<EventCard event={event} isLinked={false} />` y `<p>` "Así verán tu evento los compradores en el listado." (`text-[0.8125rem] text-muted-foreground`).

### C8 — Vista y página

```ts
// src/modules/organizers/components/create-event-view.tsx ("use client")
export type CreateEventViewProps = {
  venues: readonly Venue[]
  /** ISO de eventsService.getReferenceDate(): "ahora" para la fecha futura (D4). */
  referenceDate: string
}
export function CreateEventView(props: CreateEventViewProps): React.JSX.Element
```

- Estado: `useReducer(createEventFormReducer, undefined, createInitialCreateEventFormState)`; `touched: Set<CreateEventErrorKey>`; `attempt: CreateEventSubmitAttempt`; `status: { kind: "idle" } | { kind: "draft-saved" } | { kind: "published"; title: string }`; anuncio de la región `role="status"`; `useObjectUrl()` para la portada.
- Derivados en render (`useMemo`): `publishErrors` (`getPublishEventErrors` con `{ now: new Date(referenceDate), venueIds }`), `draftErrors`, `visibleErrors`, `preview = buildEventCardPreview(values, { venues, coverUrl })`.
- Cambio de portada: `dispatch(setCoverImage)`, `setBlob(file && isAcceptedCoverImage(file) ? file : null)`, marca `coverImage` como tocado.
- Cualquier `dispatch` de cambio de valor vuelve `status` de `"draft-saved"` a `"idle"` y vacía el anuncio.
- Envío: D6 (foco con `document.getElementById(getCreateEventFieldId(firstKey))?.focus()`).
- Estructura (dentro del `main` del shell; raíz `div` `mx-auto w-full max-w-6xl flex flex-col gap-5 lg:gap-6 pb-(--mobile-action-bar-height) lg:pb-0`):
  1. Encabezado (D9) + nota de modo demo (D6).
  2. Si `status.kind === "published"`: estado de éxito (D6), con icono `CircleCheck` en círculo `bg-success text-success-foreground` (token de la 011) dentro de una tarjeta `rounded-[22px] border bg-card`. Nada más.
  3. Si no: `<form noValidate aria-labelledby={id del h1} onSubmit>` con grid D9: columna 1 = `RequiredFieldsNote`, `CreateEventDetailsFields`, `CoverImageSection`, `TicketTypeFields` y bloque de acciones (D9); columna 2 = `CreateEventPreviewPanel` (`max-w-sm xl:max-w-none`, `xl:sticky xl:top-10`).
  4. `<p role="status" className="sr-only">` con el anuncio (siempre en el DOM).
- Botones: "Guardar borrador" (`variant="outline"`, `border-[1.5px] border-input`, 52 px, `rounded-[14px]`) y "Publicar evento" (`bg-primary text-primary-foreground`, 52 px, `rounded-[14px]`; `<span className="lg:hidden">Publicar</span><span className="hidden lg:inline">Publicar evento</span>`). En móvil 2 columnas iguales (`grid grid-cols-2 gap-2.5`).

```ts
// src/hooks/use-object-url.ts ("use client")
/** Una única object URL. setBlob(blob) revoca la anterior (si hay) y crea una nueva; setBlob(null) revoca y deja null.
 *  Al desmontar revoca la vigente. La creación ocurre en el handler (no en render ni en un efecto con setState),
 *  así no choca con react-hooks/set-state-in-effect ni con el doble montaje de StrictMode. */
export function useObjectUrl(): { url: string | null; setBlob: (blob: Blob | null) => void }
```

**Página** `src/app/(organizer)/organizer/events/new/page.tsx` (reemplaza el placeholder, servidor, delgada):
- `export const metadata = { title: "Crear evento — Ticketera", robots: { index: false } }` (igual que el placeholder).
- `await requireOrganizer({ returnTo: ORGANIZER_NEW_EVENT_PATH })`;
- `const venues = await eventsService.getVenues()`;
- `return <CreateEventView venues={venues} referenceDate={eventsService.getReferenceDate()} />`.

## Tareas

### Preparación (serie)

- **P1** Primitivos y extensiones compartidas. Archivos:
  - `src/components/ui/textarea.tsx`: `npx shadcn@latest add textarea`. Si la CLI pide sobrescribir algo, responder **no**; si toca otro archivo, se revierte. No se edita a mano.
  - `src/components/shared/required-mark.tsx` (C1, nuevo)
  - `src/components/shared/form-section.tsx` (C1, nuevo)
  - `src/modules/checkout/components/checkout-fields.tsx` (C1: importar las piezas extraídas; sin cambio de HTML)
  - `src/hooks/use-object-url.ts` (C8) y `src/hooks/use-object-url.test.ts`
  - `src/modules/events/services/events.service.ts` (C2) y `events.service.test.ts` (ampliar)
  - `src/modules/events/components/event-card.tsx` (C3)

  Al terminar: `npm run lint`, `npm run test` (los tests de checkout, discovery, search y detail deben seguir en verde sin cambios).
- **P2** Contratos del formulario. Archivos:
  - `src/modules/organizers/schemas/create-event.schema.ts` (C4) y `create-event.schema.test.ts`
  - `src/modules/organizers/utils/create-event-form.ts` (C5) y `create-event-form.test.ts`
  - `src/modules/organizers/utils/create-event-preview.ts` (C6) y `create-event-preview.test.ts`

  Al terminar: `npm run lint`, `npm run test`.

### Paralelo (tras P2; archivos disjuntos; nadie corre `npm install` ni `npm run build`)

- **T1** Secciones del formulario. Archivos:
  - `src/modules/organizers/components/create-event-details-fields.tsx` (C7)
  - `src/modules/organizers/components/ticket-type-fields.tsx` (C7)
- **T2** Portada y vista previa. Archivos:
  - `src/modules/organizers/components/cover-image-section.tsx` (C7)
  - `src/modules/organizers/components/create-event-preview-panel.tsx` (C7)

T1 y T2 solo importan de P1/P2 y de primitivos existentes; no se importan entre sí. Verificación acotada: `npx eslint <archivos de la tarea>` y `npx vitest run src/modules/organizers` (los tests de P2 siguen verdes).

### Integración (serie, tras T1 y T2)

- **I1** Vista, página y test de interacción. Archivos:
  - `src/modules/organizers/components/create-event-view.tsx` (C8)
  - `src/modules/organizers/components/create-event-view.test.tsx`
  - `src/app/(organizer)/organizer/events/new/page.tsx` (C8, reemplaza el placeholder)

  Al terminar: `npm run lint`, `npm run test`. El reviewer corre `npm run build`.

**Tamaño:** 22 archivos: 1 generado por la CLI, 5 existentes modificados (`checkout-fields.tsx`, `events.service.ts`, `events.service.test.ts`, `event-card.tsx`, `page.tsx` del placeholder), 11 nuevos de código y 5 tests nuevos (+ 1 ampliado). Supera la guía de ~14 porque el pedido incluye en la misma fase formulario, filas dinámicas, portada y vista previa, y porque DRY obliga a extraer 2 piezas del checkout. 6 de los 22 son tests y 3 de los cambios son pequeños. Si se prefiere achicar, ver Preguntas abiertas (1).

## Criterios de aceptación

**A. Ruta y acceso**

- [ ] AC1 Un organizador que abre `/organizer/events/new` ve el formulario dentro del shell de la 017 (sidebar en desktop, barra móvil en < 1024 px), con un único `main` y un único `h1` "Crear evento". Ningún ítem del sidebar tiene `aria-current`.
- [ ] AC2 Sin sesión → `/sign-in?redirect_url=…`; con sesión sin rol → `/organizer/onboarding` (comportamiento de 013/015/017). `git grep -n "requireOrganizer" "src/app/(organizer)/organizer/events/new/page.tsx"` → 1 resultado con `ORGANIZER_NEW_EVENT_PATH`.
- [ ] AC3 "Volver al resumen" (link con ese nombre accesible; texto visible "Resumen" en ≥ 1024 px) lleva a `/organizer`.

**B. Formulario**

- [ ] AC4 Se ven las 4 secciones con `h2` "Información básica", "Fecha y lugar", "Imagen de portada" y "Tipos de entrada", y la nota "Los campos marcados con * son obligatorios.".
- [ ] AC5 "Categoría" ofrece exactamente las 8 categorías de `EVENT_CATEGORIES` en su orden y empieza en "Conciertos".
- [ ] AC6 "Recinto" lista los 10 recintos del mock como "{nombre} · {ciudad}" ordenados por nombre, más "Otro lugar" al final. Al elegir "Otro lugar" aparecen "Nombre del lugar" y "Ciudad"; al elegir un recinto desaparecen.
- [ ] AC7 Cada control obligatorio tiene label asociado, asterisco visible `aria-hidden` y `aria-required="true"`; ninguno tiene el atributo `required`. Con error visible: `aria-invalid="true"` y `aria-describedby` apuntando al mensaje.
- [ ] AC8 Los errores de un campo aparecen al salir de él (blur) o tras intentar publicar, con los mensajes exactos de C4.

**C. Tipos de entrada**

- [ ] AC9 Al inicio hay 1 fila y su botón "Quitar tipo de entrada 1" está deshabilitado.
- [ ] AC10 "Agregar tipo de entrada" agrega una fila al final, mueve el foco a su "Nombre del tipo de entrada {n}" y anuncia "Tipo de entrada {n} agregado.". Con 2+ filas, "Quitar tipo de entrada {n}" la elimina, renumera las siguientes, mueve el foco según C7 y anuncia "Tipo de entrada {n} quitado.".
- [ ] AC11 "Capacidad total" muestra la suma de las cantidades válidas en vivo: cantidades 1000 y 200 → "1,200 entradas"; una sola fila con 1 → "1 entrada"; vacía → "0 entradas".
- [ ] AC12 Dos filas con nombres "General" y " general " → la segunda muestra "Ya hay un tipo de entrada con este nombre." al publicar. Precio "0" es válido; "12.345" y "-5" no; cantidad "0" y "1.5" no.

**D. Portada**

- [ ] AC13 El input de archivo es enfocable con Tab (el dropzone muestra el anillo de foco), tiene nombre accesible desde su label y `accept="image/jpeg,image/png"`. Soltar un archivo sobre el dropzone equivale a elegirlo.
- [ ] AC14 Elegir un PNG o JPG ≤ 5 MB muestra su preview (también en la tarjeta de vista previa) con "Cambiar imagen" y "Quitar imagen". Un GIF muestra "Usa una imagen JPG o PNG." y no hay preview. "Quitar imagen" vuelve al dropzone y devuelve el foco al input.
- [ ] AC15 Cada object URL creada se revoca al reemplazar la imagen, al quitarla, al "Crear otro evento" y al salir de la página (verificado en tests con `URL.createObjectURL`/`revokeObjectURL` simulados). No hay peticiones de red por la portada.

**E. Vista previa**

- [ ] AC16 Con el formulario vacío la tarjeta muestra "Nombre del evento", "CONCIERTOS", "Lugar · Ciudad", badge "MES"/"--", "Fecha por definir" y "Desde —", con un placeholder de imagen.
- [ ] AC17 Al escribir el nombre, cambiar categoría, elegir recinto (o lugar propio), fecha y precios, la tarjeta se actualiza en vivo; "Desde" = precio mínimo válido en USD (precios 40 y 25.5 → "$25.50").
- [ ] AC18 La tarjeta de la vista previa no contiene ningún `<a>` ni elemento enfocable; está en un `aside` "Vista previa" con el texto "Así verán tu evento los compradores en el listado.".
- [ ] AC19 En ≥ 1280 px la vista previa está a la derecha (340 px) y queda fija al hacer scroll; por debajo aparece al final del formulario. En 390 px la tarjeta es horizontal (como `OrgCreateMobile`).

**F. Acciones**

- [ ] AC20 "Guardar borrador" con nombre vacío: error en "Nombre del evento", foco en ese campo y ningún otro error nuevo visible. Con nombre válido (resto vacío): el botón pasa a "Borrador guardado", se anuncia el texto de D6 y el formulario conserva sus valores; al editar cualquier campo vuelve a "Guardar borrador".
- [ ] AC21 "Publicar evento" con el formulario vacío muestra todos los errores, enfoca "Nombre del evento" y anuncia "Revisa N campos marcados para publicar." con N = número de errores visibles.
- [ ] AC22 Con todo válido, "Publicar evento" reemplaza el formulario por "Evento publicado (modo demo)" (encabezado enfocado), muestra el título del evento, "Volver al resumen" → `/organizer` y "Crear otro evento", que restaura el formulario vacío con el foco en "Nombre del evento".
- [ ] AC23 Nada se persiste: tras publicar, `/organizer` muestra los mismos 4 eventos y KPI de la 017.
- [ ] AC24 En < 1024 px las acciones están fijas abajo (`data-mobile-action-bar`, "Guardar borrador" / "Publicar"), su alto no supera 5rem con safe-area, y al hacer scroll al final la vista previa queda completa por encima de la barra. Un campo enfocado con Tab nunca queda tapado por la barra.

**G. Calidad y regresión**

- [ ] AC25 Controles con foco visible y áreas táctiles ≥ 44 px en móvil; se ve bien en claro y oscuro (solo tokens, sin hex).
- [ ] AC26 El checkout se ve y se comporta igual (tests de la 010/012 en verde sin cambios) y `EventCard` en landing, búsqueda y detalle renderiza igual que antes (tests existentes en verde sin cambios).
- [ ] AC27 `npm run lint`, `npm run test` y `npm run build` en verde.

## Tests obligatorios

- **`src/hooks/use-object-url.test.ts`** (`renderHook`; `URL.createObjectURL`/`revokeObjectURL` con `vi.fn`, p. ej. `vi.stubGlobal` o `Object.defineProperty` sobre `URL`, porque jsdom no los implementa):
  - inicial `url === null`; `setBlob(blobA)` → `url` = valor devuelto por `createObjectURL(blobA)`;
  - `setBlob(blobB)` revoca la URL de A y crea la de B;
  - `setBlob(null)` revoca la vigente y deja `null`; `setBlob(null)` sin URL no llama a `revoke`;
  - `unmount()` revoca la vigente.
- **`src/modules/events/services/events.service.test.ts`** (ampliar) — `getVenues()`: 10 recintos con ids únicos, ordenados por `name` (`localeCompare("es")`), incluye `{ id: "estadio-nacional", name: "Estadio Nacional", city: "Lima", … }`; mutar el resultado no altera `EVENTS_MOCK`.
- **`src/modules/organizers/schemas/create-event.schema.test.ts`** (`now = new Date("2026-10-02T12:00:00-05:00")`, `venueIds` del mock, `File` de jsdom):
  - formulario completo válido (recinto del catálogo, 2 filas) → `{}` y `createPublishEventSchema(...).parse` devuelve `startsAt` `"2026-10-20T20:30:00-05:00"`, `venue.kind "catalog"`, precios numéricos y strings recortados;
  - "Otro lugar" válido → `venue: { kind: "custom", name, city }`; "Otro lugar" sin nombre/ciudad → sus dos errores; recinto del catálogo con `customVenueName` vacío → sin error;
  - cada fila de la tabla de mensajes de C4 tiene al menos un caso (título de 2 y de 101 caracteres, descripción corta, fecha vacía, `"2026-02-30"`, hora `"25:00"`, fecha pasada `2026-10-02` + `11:00`, fecha = now exacto → error, `venueId` desconocido, portada null / GIF / 6 MB, `ticketTypes: []`, nombre repetido " General " vs "general" (error solo en la 2.ª), precio `"12.345"`, `"-5"`, `"100000.01"`, precio `"0"` válido, cantidad `"0"`, `"1.5"`, `"100001"`);
  - las claves de fila usan el id de la fila (`"ticketTypes.tt-3.price"`), no el índice;
  - `getDraftEventErrors({ title: "  " })` → `{ title: "Ingresa el nombre del evento (mínimo 3 caracteres)." }`; `{ title: "Feria" }` → `{}`;
  - `isAcceptedCoverImage`: PNG 1 MB → true; JPEG exactamente 5 MB → true; 5 MB + 1 → false; `image/gif` → false.
- **`src/modules/organizers/utils/create-event-form.test.ts`**:
  - reducer: estado inicial (C5); `setField` cambia solo ese campo y no muta el anterior; `addTicketType` ×2 → ids `tt-1`, `tt-2`, `tt-3` y `seq` 4; `removeTicketType("tt-2")` deja `tt-1`, `tt-3`; quitar la única fila o un id inexistente no cambia nada; un `add` tras un `remove` no reutiliza ids (`tt-4`); `setTicketTypeField` cambia solo esa fila; `setCoverImage`; `reset` vuelve al inicial;
  - `getCreateEventFieldId("ticketTypes.tt-2.price")` → `"create-event-ticketTypes-tt-2-price"`; `getCreateEventErrorId("title")` → `"create-event-title-error"`;
  - `getCreateEventErrorOrder`: sin "other" no incluye `customVenue*`; con "other" los incluye tras `venueId`; filas en orden con name, price, quantity;
  - `getFirstCreateEventErrorKey`: devuelve la primera según el orden aunque el objeto de errores tenga otro orden; `{}` → `null`;
  - `getVisibleCreateEventErrors`: `"none"` sin tocados → `{}`; con `description` tocado → solo `description`; `"draft"` → `title` + tocados; `"publish"` → todos;
  - `getInvalidFieldsMessage(1, "publish")`, `(3, "publish")`, `(1, "draft")` → textos de C5.
- **`src/modules/organizers/utils/create-event-preview.test.ts`**:
  - `buildEventStartsAt`: `("2026-10-20", "20:30")` → `"2026-10-20T20:30:00-05:00"`; `("2026-02-30", "10:00")`, `("2026-10-20", "24:00")`, `("", "10:00")`, `("20/10/2026", "10:00")` → `null`;
  - `parseTicketPrice`: `"25"` 25, `"25.5"` 25.5, `"0"` 0, `"100000"` 100000; `""`, `"abc"`, `"-1"`, `"1.234"`, `"100000.01"`, `"1,5"` → `null`;
  - `parseTicketQuantity`: `"150"` 150; `"0"`, `"1.5"`, `""`, `"100001"` → `null`;
  - `getTotalCapacity`: `["1000", "200"]` → 1200; `["10", "abc", ""]` → 10; `[]` → 0;
  - `formatCapacityLabel`: 0 → "0 entradas", 1 → "1 entrada", 1200 → "1,200 entradas";
  - `getMinTicketPrice`: `["40", "25.5"]` → 25.5; `["0", "10"]` → 0; `["", "x"]` → `null`;
  - `buildEventCardPreview`: valores iniciales → placeholders de D8 (`title "Nombre del evento"`, categoría "Conciertos", venue `{ "Lugar", "Ciudad" }`, `startsAt null`, `imageUrl null`, `priceFrom null`); con recinto `estadio-nacional` → `{ name: "Estadio Nacional", city: "Lima" }`; con "other" y solo ciudad → `{ "Lugar", "Arequipa" }`; con fecha válida y hora vacía → `"…T00:00:00-05:00"`; `coverUrl` se pasa a `imageUrl`; `availability "available"`.
- **`src/modules/organizers/components/create-event-view.test.tsx`** (RTL + `userEvent`; `next/image` mockeado como `img` como en los tests existentes; `next/navigation` si hace falta; `URL.createObjectURL`/`revokeObjectURL` simulados; `venues` = `await eventsService.getVenues()`, `referenceDate = "2026-10-02T12:00:00-05:00"`):
  - render: `h1` "Crear evento", los 4 `h2`, "Quitar tipo de entrada 1" deshabilitado, "0 entradas";
  - vista previa vacía: dentro de `getByRole("complementary", { name: "Vista previa" })` → "Nombre del evento", "Fecha por definir", sin `link`; escribir "Feria del Libro" la actualiza;
  - agregar fila: aparece "Nombre del tipo de entrada 2" con el foco, texto "Tipo de entrada 2 agregado." en la región `aria-live`; cantidades 1000 y 200 → "1,200 entradas"; precios 40 y 25.5 → "$25.50" en la vista previa; quitar la fila 1 → queda una fila renumerada "1" y el anuncio "Tipo de entrada 1 quitado.";
  - "Otro lugar" en el combobox "Recinto" muestra "Nombre del lugar" y "Ciudad";
  - portada: `userEvent.upload` de un PNG → `img` con la URL simulada y botón "Quitar imagen"; quitar → `revokeObjectURL` llamado con esa URL; subir un GIF (con `applyAccept: false`) → "Usa una imagen JPG o PNG." y sin `img` de portada;
  - borrador: clic con nombre vacío → error del título y foco en "Nombre del evento"; con nombre → botón "Borrador guardado" y anuncio de D6; escribir otra letra → vuelve a "Guardar borrador";
  - publicar vacío: foco en "Nombre del evento", `aria-invalid="true"` en él, y el anuncio "Revisa N campos marcados para publicar." con N igual a la cantidad de mensajes de error visibles;
  - publicar válido (todos los campos, 1 fila) → `h2` "Evento publicado (modo demo)" enfocado, link "Volver al resumen" con `href="/organizer"`; "Crear otro evento" → formulario vacío y foco en "Nombre del evento".

No requieren test unitario propio (SETUP §3): `create-event-details-fields`, `ticket-type-fields`, `cover-image-section`, `create-event-preview-panel` (presentacionales/composición; su lógica está en utils testeados y se ejercitan en el test de la vista), `event-card` (extensión cubierta por el test de la vista y regresión por los tests existentes), `form-section`, `required-mark` (cubiertos por los tests del checkout) y la página.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- **Manual** (`npm run dev`, usuario organizador):
  - 1440 px: `/organizer/events/new` → AC1, AC3–AC8, AC16–AC19 (vista previa sticky), AC20–AC22; Tab por todo el formulario (el dropzone muestra foco).
  - 1100 px: una columna, vista previa al final (D9).
  - 390 px: barra móvil del shell + fila "← Crear evento", tarjetas de tipos de entrada, tarjeta de vista previa horizontal, barra de acciones fija sin tapar contenido (AC24); probar en un iPhone/simulador con home indicator (safe-area).
  - Arrastrar un JPG al dropzone y luego un GIF (AC13, AC14).
  - Publicar y volver a `/organizer` (AC23).
  - Modo oscuro (AC25). Checkout completo y landing/búsqueda/detalle sin cambios visuales (AC26).

## Transcrito del diseño vs. criterio propio

| Transcrito (`OrgCreate` / `OrgCreateMobile`) | Criterio propio |
|---|---|
| Secciones Información básica, Fecha y lugar, Imagen de portada y Tipos de entrada; placeholders y textos de ayuda | `FormSection` del checkout (radio 24 px, `h2` 20 px en `lg`) por consistencia (C1); asteriscos + nota de obligatorios (patrón 012) |
| Select de categoría con 8 opciones, inicial "Conciertos" | Mismas 8 categorías del proyecto (coinciden); `Select` de Base UI |
| Fecha y hora nativas en 2 columnas | Fecha futura respecto a la fecha de referencia del mock (D4) |
| "Lugar" y "Ciudad" en texto libre | Select de recintos del catálogo + "Otro lugar" con nombre/ciudad libres (D2, TEMPORAL) |
| Dropzone punteado indigo, "Arrastra una imagen o haz clic para subirla" / "Subir imagen", "JPG o PNG, horizontal (16:9)", input file oculto | Drag & drop real, preview local con object URL, "Cambiar/Quitar imagen", límite 5 MB, obligatoria para publicar |
| Filas Nombre / Precio / Cantidad con cabecera `aria-hidden` en desktop y `fieldset` "Tipo n" en móvil; quitar deshabilitado con 1 fila; "Agregar tipo de entrada"; "Capacidad total … entradas" | Una fila inicial (el diseño arranca con 2); `fieldset` en ambos tamaños; foco y anuncio al agregar/quitar; nombres únicos; precio ≥ 0 |
| "Precio (S/)", "S/ —", `toLocaleString('es-PE')` | USD: "Precio (USD)", `formatPrice`, `formatCount` (D10) |
| Vista previa: tarjeta tipo ticket con badge de fecha, categoría, título, lugar, "Desde" y "Ver entradas"; placeholders "Nombre del evento", "Lugar · Ciudad", "MES"/"--" | `EventCard` real con extensión compatible y sin enlace (D8); "Fecha por definir"; título placeholder sin color atenuado; columna derecha desde `xl` (no `lg`) |
| Desktop: link "← Mis eventos" + h1 32 px; acciones "Guardar borrador" / "Publicar evento" a la derecha | "← Resumen" (no hay página "Mis eventos", 017 D4) |
| Móvil: header blanco 60 px "← Crear evento"; acciones fijas abajo "Guardar borrador" / "Publicar" | Fila "← Crear evento" bajo la barra del shell, sin header propio (D9); barra con el contrato `data-mobile-action-bar` (≤ 5rem, safe-area) |
| Acciones como links al panel | Validación zod, foco al primer error, borrador en página y éxito de publicación en página (D6), sin persistencia (D7) |

## Contratos que podrían consumir fases futuras

| Contrato | Archivo | Uso futuro |
|---|---|---|
| `createPublishEventSchema`, `CreateEventData` | `src/modules/organizers/schemas/create-event.schema.ts` | Validación en servidor de la Server Action de creación (System Design §4.3). |
| `eventsService.getVenues()` | `src/modules/events/services/events.service.ts` | Reemplazar por la tabla `venues`. |
| `EventCard` con `EventCardData` / `isLinked` | `src/modules/events/components/event-card.tsx` | Otras previsualizaciones (edición de eventos). |
| `FormSection`, `RequiredMark`, `RequiredFieldsNote`, `FORM_CONTROL_CLASS_NAME` | `src/components/shared/` | Cualquier formulario nuevo (configuración, edición). |
| `useObjectUrl` | `src/hooks/use-object-url.ts` | Previsualizaciones locales de archivos. |

**Archivos existentes que modifica esta spec:** `src/modules/checkout/components/checkout-fields.tsx` (010/012), `src/modules/events/services/events.service.ts` y `events.service.test.ts` (003+), `src/modules/events/components/event-card.tsx` (003/004) y `src/app/(organizer)/organizer/events/new/page.tsx` (placeholder de la 017, se reemplaza). Se agrega `src/components/ui/textarea.tsx` con la CLI.

## Preguntas abiertas

Ninguna bloqueante. Puntos de criterio propio para confirmar al aprobar:

1. **Tamaño (22 archivos):** si se quiere acercar a ~14, el corte natural es:
   - **018:** formulario + validación + tipos de entrada + acciones (P1 sin `use-object-url` ni `event-card`; P2; T1; I1 sin portada ni vista previa). Unos 14 archivos.
   - **018b:** portada (`useObjectUrl`, `CoverImageSection`) + vista previa (`EventCard` extendido, `buildEventCardPreview`, `CreateEventPreviewPanel`). Unos 8 archivos.
2. **Lugar (D2):** ¿se acepta select de recintos del mock + "Otro lugar", o se prefiere el texto libre "Lugar" + "Ciudad" del diseño (más simple, sin `getVenues()` ni `OTHER_VENUE_ID`)?
3. **Reglas de D5:** descripción **obligatoria** para publicar (20–2000) y **portada obligatoria** para publicar (el diseño no marca obligatorios); precio **≥ 0** (gratis permitido); límites de 100,000 en precio y cantidad; 1 fila inicial en vez de las 2 del diseño. ¿OK?
4. **"Ahora" = fecha de referencia del mock (D4)** (2026-10-02), coherente con el catálogo, en lugar del reloj real. ¿OK?
5. **Destino tras publicar (D6):** estado de éxito en la misma página en lugar de volver a `/organizer` con aviso (que obligaría a tocar la vista Resumen de la 017). ¿OK?
6. **Extensión de `EventCard` (C3):** se modifica un componente compartido de `events` (compatible: `EventItem` sigue siendo asignable y el HTML con datos completos no cambia). La alternativa sin tocarlo (envolver la tarjeta con `inert`) la sacaría del árbol de accesibilidad y no resuelve fecha/imagen/precio vacíos.
