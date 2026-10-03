# 008 — Paso extra de teatro: mapa de asientos numerados

- **Estado:** done (APPROVED por reviewer en iteración 3)
- **Modo:** SDD
- **Módulo(s):** `src/modules/seating` (extiende el módulo creado en la 007 con layouts de asientos). Consume `src/modules/events` (003, 006), `src/modules/checkout` (007), `src/hooks/use-prefers-reduced-motion.ts` (005). Ruta nueva: `src/app/(purchase)/events/[slug]/seats/page.tsx`. Dependencia nueva: `react-zoom-pan-pinch`.
- **Depende de:** 003–007 implementadas y en verde. Esta spec era la `006-seat-map-theater.md`; se renumeró y se adaptó al modelo híbrido elegido por el usuario.
- **Diseño fuente:** la referencia **no** tiene selección de asiento individual (`docs/design/reference-design.md` §2.5 y §3.4, opción "híbrido"). Se reutiliza su lenguaje visual (header del flujo, mini cabecera, tarjetas, tonos de zona, CTA naranja); la interacción del mapa es criterio propio validado en la versión anterior de esta spec.

**Roadmap:** 003 paleta + events + descubrimiento · 004 shell · 005 Hero · 006 detalle · 007 selección por zonas · **008 mapa de teatro (esta)** · 009 búsqueda · 010 checkout + confirmación · 011 login/registro · 012 Mis entradas · 013 panel de organizador · 014 crear evento.

## Objetivo

Para los teatros (`seatSelection: "seat"`: evt-001 y evt-004), agregar el paso extra que sigue a "Entradas": en `/events/[slug]/seats?tickets=…` el usuario ve el teatro en un mapa SVG con zoom y pan (`react-zoom-pan-pinch`), y elige **exactamente** la cantidad de asientos que pidió en cada zona en el paso de zonas (007). El mapa es operable por teclado (roving tabindex, flechas), tiene semántica para lector de pantalla y codificación no cromática. Al completar los asientos, "Continuar" lleva al checkout (010) con `?tickets=…&seats=…`. Debe funcionar a 375, 768 y 1280 px, en claro y oscuro, y el proyecto queda en verde.

## Fuera de alcance

- **010**: checkout y confirmación; lee `?seats=` (añadirá `parseSeatIds`). Hasta entonces, "Continuar" da 404 (aceptado).
- Mapas de asientos para estadios, arenas o festivales: usan zona + cantidad (007), por decisión del usuario.
- Holds, disponibilidad en tiempo real, "mejor asiento automático", minimapa, vista en lista.
- Persistencia de los asientos elegidos ante una recarga (la cantidad por zona sí persiste en la URL; D18).
- Cambios en `src/app/globals.css`, `src/app/layout.tsx`, `src/app/(site)/**`, `src/components/ui/**`, `src/components/shared/**` o en `src/modules/events/**`.

## Precondiciones (bloqueantes)

1. 003–007 implementadas y aprobadas.
2. Contratos de la 006: `TicketType` con `availability`; para evt-001 y evt-004, exactamente los tipos `{eventId}-platea` "Platea" y `{eventId}-mezzanine` "Mezzanine"; `getZoneTones`/`getZoneToneClassName`; contrato `data-mobile-action-bar`.
3. Contratos de la 007: `parseTicketSelection`, `buildPurchaseStepHref`, `serializeTicketSelection`, `TicketSelection`, `MAX_TICKETS_PER_ZONE` (6) en `src/modules/checkout/utils/ticket-selection.ts`; `PurchaseFlowHeader` y `EventPurchaseSummary`; `getEventSeatsHref`, `getEventCheckoutHref`, `getEventTicketsHref` en `event-routes.ts`; módulo `src/modules/seating` con `seating.types.ts` y `seatingService.getZoneMap`.
4. Contrato de la 005: `usePrefersReducedMotion` en `src/hooks/`.

Si alguno no existe con ese nombre y ubicación → `BLOCKED`.

## Librería de zoom/pan — validada

**Decisión validada por el usuario** (investigación previa): SVG propio en React + **`react-zoom-pan-pinch` 4.2.0** (MIT, `peerDependencies: { react: "*", "react-dom": "*" }`, compatible con React 19.2.8). Descartadas: seats.io y SeatLayer (propietarias, requieren backend y API keys), `@alisaitteke/seatmap-canvas` (peer `react ^18`), `seatchart` (abandonada). Plan B: `react-konva` (sin accesibilidad nativa; no aplica con ≤ 566 asientos).

Hechos de la API 4.2.0 que usa esta spec (comprobados en `dist/index.d.ts` y el código fuente):
- `TransformWrapper` (`initialScale`, `minScale` = 1 por defecto, `maxScale` = 8, `limitToBounds`, `centerOnInit`, `wheel`, `pinch`, `panning`, `doubleClick` **activo** por defecto en `zoomIn`, `keyboard` **desactivado** por defecto, `zoomAnimation`, `velocityAnimation`, `onTransform`) y `TransformComponent` (`wrapperStyle`, `contentStyle`, `wrapperProps`, `contentProps`).
- Handlers del ref o de `useControls()`: `zoomIn(step?, animationTime?)`, `zoomOut(...)`, `resetTransform(animationTime?)`, `zoomToElement(node | id, { scale?, animationTime? })`, `zoomToPoint(scale, clientX, clientY, animationTime?)`. `instance.state.scale` da la escala; `useTransformEffect(cb)` se suscribe sin re-renderizar el árbol.
- `zoomToElement` acepta el **id DOM como string** (usa `getElementById` + `getBoundingClientRect`), válido para elementos SVG.
- Pan y zoom se aplican por estilo DOM directo: no re-renderizan hijos de React.
- El paquete **no** tiene `"use client"`: solo se importa desde archivos `"use client"`. Su CSS se inyecta en runtime (seguro en SSR), así que los estilos críticos del wrapper (tamaño, `overflow`) van inline. El wrapper es `fit-content`: se fuerza el 100 % con `wrapperStyle`/`contentStyle`.
- No suprime el `click` que sigue a un arrastre (hay que filtrarlo, D12). Sin `ResizeObserver` (jsdom) lo omite: se puede renderizar en Vitest.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `Button`, `buttonVariants`, `cn` | reutilizar | `src/components/ui/button.tsx`, `src/lib/utils.ts` | Controles de zoom, "Limpiar", CTAs. |
| `formatPrice` | reutilizar (003) | `src/lib/format.ts` | |
| `EventItem`, `TicketType`, `getBySlug`, `getTicketTypes` | reutilizar (003/006) | `src/modules/events/**` | |
| `getZoneTones`, `getZoneToneClassName` | reutilizar (006) | `src/modules/events/utils/zone-tones.ts` | Muestras de zona en leyenda y resumen. |
| `getEventTicketsHref`, `getEventCheckoutHref` | reutilizar (005/007) | `src/modules/events/utils/event-routes.ts` | |
| `parseTicketSelection`, `buildPurchaseStepHref`, `serializeTicketSelection`, `TICKETS_SEARCH_PARAM` | reutilizar (007) | `src/modules/checkout/utils/ticket-selection.ts` | Cuotas por zona desde la URL. |
| `PurchaseFlowHeader`, `EventPurchaseSummary` | reutilizar (007) | `src/modules/checkout/components/` | Paso 1 del flujo; segundo uso real. |
| `usePrefersReducedMotion` | reutilizar (005) | `src/hooks/use-prefers-reduced-motion.ts` | |
| `seatingService`, `seating.types.ts` | extender (007) | `src/modules/seating/` | Se añaden tipos de asiento y `getSeatMap`. |
| `react-zoom-pan-pinch` | agregar dependencia | `package.json` | `npm install react-zoom-pan-pinch@^4.2.0`. |
| `buildTheaterLayout` | crear | `src/modules/seating/utils/theater-layout.ts` (+ test) | Generador puro y determinista. |
| Mock de asientos | crear | `src/modules/seating/data/seat-maps.mock.ts` | evt-001 y evt-004. Solo lo importa el service. |
| Lógica de selección de asientos | crear | `src/modules/seating/utils/seat-selection.ts` (+ test) | Cuotas por zona, toggle, resumen, URL. |
| Lógica de accesibilidad | crear | `src/modules/seating/utils/seat-a11y.ts` (+ test) | Navegación, `aria-label`, anuncios. |
| `SeatGlyph` | crear | `src/modules/seating/components/seat-glyph.tsx` | Compartido por mapa y leyenda. |
| `SeatMap` | crear | `src/modules/seating/components/seat-map.tsx` (+ test) | SVG + zoom/pan + teclado; controlado por props. |
| `SeatMapLegend` | crear | `src/modules/seating/components/seat-map-legend.tsx` | |
| `SeatSelectionSummary` | crear | `src/modules/seating/components/seat-selection-summary.tsx` | Resumen (aside desktop + barra móvil). |
| `SeatSelectionView` | crear | `src/modules/seating/components/seat-selection-view.tsx` (+ test) | Client: estado, mapa, leyenda, resumen y región viva. |
| Ruta | crear | `src/app/(purchase)/events/[slug]/seats/page.tsx` | Solo guardas y composición. |
| Store zustand | **retirado** (versión anterior) | — | La selección es local y viaja por URL (D17). |

**Recuento de archivos de producción:** 13 (+ `package.json`/lock). Supera la guía a propósito: 6 son contratos o lógica pura con test y los 4 de UI se reparten en un bloque paralelo con archivos disjuntos. Un corte más fino daría un mapa sin selección, no verificable como producto.

## Contratos

### C1 — Tipos (`src/modules/seating/types/seating.types.ts`, se añade)

```ts
export type Point = { x: number; y: number }            // unidades del viewBox, ≤ 2 decimales
export type Seat = {
  id: string          // `${zoneId}-${rowLabel}-${number}`, p. ej. "platea-F-12"
  zoneId: string
  rowLabel: string
  number: number      // 1..n de izquierda a derecha
  x: number; y: number
  accessible: boolean // atributo combinable con cualquier estado (D2)
}
export type SeatRow = { label: string; seats: Seat[]; labelPositions: { start: Point; end: Point } }
export type SeatZone = {
  id: string              // "platea" | "mezzanine"
  name: string            // "Platea" | "Mezzanine"
  ticketTypeId: string    // TicketType.id: el precio NO se duplica (D3)
  rows: SeatRow[]         // desde el escenario hacia atrás
  labelPosition: Point
}
export type Stage = { x: number; y: number; width: number; height: number; label: string } // "Escenario"
export type VenueLayout = {
  id: string; venueId: string; kind: "theater"
  width: number; height: number; seatRadius: number
  stage: Stage; zones: SeatZone[]
}
/** Geometría (estática) separada de disponibilidad (volátil) (D4). */
export type EventSeatMap = { eventId: string; layout: VenueLayout; soldSeatIds: string[] }

export type SeatStatus = "available" | "selected" | "sold"   // derivado: sold > selected > available
export type ToggleSeatOutcome = "added" | "removed" | "unavailable" | "zone-full" | "zone-not-selected"

/** zoneId → cantidad pedida en el paso de zonas (007). Zonas sin cuota = no incluidas. */
export type SeatQuotas = Readonly<Record<string, number>>
export type SelectedSeat = { seatId: string; zoneId: string; zoneName: string; rowLabel: string; number: number; accessible: boolean; price: number }
export type ZoneSeatProgress = { zoneId: string; zoneName: string; ticketTypeId: string; quota: number; seats: SelectedSeat[] }
export type SeatSelectionSummary = { zones: ZoneSeatProgress[]; count: number; required: number; total: number; isComplete: boolean }
```
Todo serializable (viaja de server a client como prop).

### C2 — Generador (`src/modules/seating/utils/theater-layout.ts`)

```ts
export type TheaterZoneConfig = { id: string; name: string; ticketTypeId: string; rowLabels: readonly string[]; firstRowSeats: number; seatsIncrementPerRow: number }
export type TheaterLayoutConfig = { id: string; venueId: string; zones: readonly TheaterZoneConfig[]; accessibleSeatIds?: readonly string[] }
/** Pura y determinista. Lanza Error si la config es inválida. */
export function buildTheaterLayout(config: TheaterLayoutConfig): VenueLayout
```

**Invariantes** (obligatorios, testeados) y **constantes** de referencia (ajustables si la verificación visual lo pide, siempre que se cumplan los invariantes):
- Escenario arriba y centrado, `label: "Escenario"`.
- Filas en arcos concéntricos sobre el eje del escenario; cada fila con radio mayor que la anterior; entre la última fila de una zona y la primera de la siguiente hay un hueco mayor que la separación entre filas.
- 2 pasillos verticales por fila: bloques de `floor(n/4)`, `n − 2·floor(n/4)` y `floor(n/4)`; el hueco equivale a un asiento extra.
- Numeración 1..n de izquierda a derecha; simetría respecto al eje (asientos `k` y `n+1−k` en espejo).
- Coordenadas a 2 decimales; `width`/`height` = contenido + padding.
- `labelPosition` de zona entre su primera fila y lo anterior, sobre el eje; `labelPositions` de fila a un paso más allá de los extremos, siguiendo el arco.
- Constantes: `seatRadius` 5, paso 13, separación entre filas 15, radio de la primera fila 160, hueco entre zonas 45, padding 24.
- Errores: `rowLabels` vacío, `firstRowSeats < 1`, ids de zona duplicados o `accessibleSeatIds` inexistente → `throw new Error(...)`.

### C3 — Mock (`src/modules/seating/data/seat-maps.mock.ts`)

```ts
export const SEAT_MAPS_MOCK: Readonly<Record<string, EventSeatMap>> // "evt-001", "evt-004"
```
Se construye con `buildTheaterLayout` y un selector privado de vendidos `pickSoldSeatIds(seatIds, ratio, seed)`: PRNG `mulberry32(seed)` (aritmética entera con `Math.imul`) + Fisher–Yates parcial sobre los ids en orden de layout, tomando `Math.round(ratio · total)`. **Sin `Math.random`** (D6).

| Evento | Layout id · venueId | Zona | Filas | Asientos/fila | Total | ticketTypeId |
|---|---|---|---|---|---|---|
| evt-001 | `teatro-municipal-sala-principal` · `teatro-municipal` | `platea` "Platea" | A–N (14) | 20…33 (+1) | 371 | `evt-001-platea` |
| | | `mezzanine` "Mezzanine" | A–F (6) | 30…35 (+1) | 195 | `evt-001-mezzanine` |
| evt-004 | `teatro-britanico-sala-principal` · `teatro-britanico` | `platea` "Platea" | A–J (10) | 16…25 (+1) | 205 | `evt-004-platea` |
| | | `mezzanine` "Mezzanine" | A–E (5) | 22…26 (+1) | 120 | `evt-004-mezzanine` |

- Totales: evt-001 = **566**, evt-004 = **325**.
- Accesibles: evt-001 `platea-N-1`, `platea-N-2`, `platea-N-32`, `platea-N-33`, `mezzanine-A-1`, `mezzanine-A-30`; evt-004 `platea-J-1`, `platea-J-2`, `platea-J-24`, `platea-J-25`, `mezzanine-A-1`, `mezzanine-A-22`.
- Vendidos: evt-001 `ratio 0.7`, `seed 1` → **396** (coherente con Platea "Últimas entradas"); evt-004 `ratio 0.35`, `seed 4` → **114**. Si una zona queda con menos de `MAX_TICKETS_PER_ZONE` (6) disponibles, se cambia la semilla y se documenta en el archivo.

### C4 — Service (`seatingService`, se añade)

```ts
/** Mapa de asientos del evento; null si no tiene (todo evento con seatSelection "zone"). Copia profunda (structuredClone). */
getSeatMap(eventId: string): Promise<EventSeatMap | null>
```

### C5 — Selección (`src/modules/seating/utils/seat-selection.ts`)

```ts
export const SEATS_SEARCH_PARAM = "seats"
export type SeatLookupEntry = { seat: Seat; zone: SeatZone; row: SeatRow }
export function createSeatLookup(layout: VenueLayout): ReadonlyMap<string, SeatLookupEntry>
/** zoneId → TicketType. Lanza Error si falta el tipo de una zona. */
export function getZoneTicketTypes(layout: VenueLayout, ticketTypes: readonly TicketType[]): ReadonlyMap<string, TicketType>
/** zoneId → cantidad de selection[zone.ticketTypeId] (solo > 0). */
export function getSeatQuotas(layout: VenueLayout, selection: TicketSelection): SeatQuotas

/** Orden de reglas: 1) ya elegido → "removed"; 2) vendido → "unavailable"; 3) zona sin cuota → "zone-not-selected";
 *  4) zona con su cuota completa → "zone-full"; 5) "added" (al final).
 *  En 2–4 devuelve LA MISMA referencia de array. Nunca muta. */
export function toggleSeatSelection(
  selectedSeatIds: readonly string[],
  seatId: string,
  ctx: { lookup: ReadonlyMap<string, SeatLookupEntry>; soldSeatIds: ReadonlySet<string>; quotas: SeatQuotas },
): { selectedSeatIds: readonly string[]; outcome: ToggleSeatOutcome }

/** zones: una por zona con cuota, en orden del layout, con sus asientos en orden de selección;
 *  required = Σ cuotas; total = round2(Σ precio de los asientos elegidos); isComplete = cada zona tiene exactamente su cuota.
 *  Ignora ids desconocidos. */
export function buildSeatSelectionSummary(layout: VenueLayout, ticketTypes: readonly TicketType[], selectedSeatIds: readonly string[], quotas: SeatQuotas): SeatSelectionSummary

/** getEventCheckoutHref(slug) + "?tickets=" + serializeTicketSelection(...) + "&seats=" + ids en orden del layout separados por coma (URLSearchParams). */
export function buildSeatCheckoutHref(slug: string, selection: TicketSelection, ticketTypes: readonly TicketType[], layout: VenueLayout, selectedSeatIds: readonly string[]): string
```

### C6 — Accesibilidad (`src/modules/seating/utils/seat-a11y.ts`)

```ts
export const SEAT_NAVIGATION_KEYS = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"] as const
export type SeatNavigationKey = (typeof SEAT_NAVIGATION_KEYS)[number]
export function getAdjacentSeatId(layout: VenueLayout, seatId: string, key: SeatNavigationKey): string | null
/** Primer asiento no vendido de una zona incluida, en orden de navegación; si no hay, el primero del layout. */
export function getInitialFocusSeatId(layout: VenueLayout, soldSeatIds: ReadonlySet<string>, quotas: SeatQuotas): string
export function getSeatName(input: { zoneName: string; rowLabel: string; number: number }): string
export function getSeatAriaLabel(input: { zoneName: string; rowLabel: string; number: number; price: number; accessible: boolean; status: SeatStatus; zoneIncluded: boolean }): string
export function getSelectionAnnouncement(
  input:
    | { outcome: ToggleSeatOutcome; seatName: string; zoneName: string; zoneCount: number; quota: number; isComplete: boolean }
    | { outcome: "cleared" },
): string
```

Navegación (D8, D9): orden global de filas zona por zona (en orden del layout) y del escenario hacia atrás; ←/→ por `number` en la fila, sin salto de línea en los extremos (`null`); ↑/↓ a la fila anterior/siguiente del orden global (cruzando de Platea a Mezzanine) al asiento de menor `|Δx|` (empate: menor `number`); Inicio/Fin a los extremos de la fila. Vendidos y asientos de zonas no incluidas **sí** participan.

Textos exactos (precio con `formatPrice`; ejemplo $85, cuota 2):

| Caso | Resultado |
|---|---|
| disponible | `Platea, fila F, asiento 12, $85, disponible` |
| disponible y accesible | `Platea, fila N, asiento 1, accesible para silla de ruedas, $85, disponible` |
| seleccionado | `Platea, fila F, asiento 12, $85, seleccionado` |
| vendido | `Platea, fila F, asiento 12, vendido` |
| zona no incluida (no vendido) | `Mezzanine, fila A, asiento 3, $45, no incluida en tu selección` |
| anuncio `added` | `Agregaste Platea, fila F, asiento 12. Llevas 1 de 2 asientos en Platea.` |
| `added` que completa todo | `Agregaste Platea, fila F, asiento 13. Llevas 2 de 2 asientos en Platea. Ya elegiste todos tus asientos.` |
| `removed` | `Quitaste Platea, fila F, asiento 12. Llevas 1 de 2 asientos en Platea.` |
| `zone-full` | `Ya elegiste los 2 asientos de Platea. Quita uno para elegir otro.` (cuota 1: `Ya elegiste tu asiento de Platea. Quítalo para elegir otro.`) |
| `zone-not-selected` | `Mezzanine no está en tu selección. Para agregarla, vuelve a Entradas.` |
| `unavailable` | `Platea, fila F, asiento 12 no está disponible.` |
| `cleared` | `Quitaste todos los asientos.` |

Con cuota 1, "Llevas 1 de 1 asiento en Platea." (singular).

### C7 — Componentes

```ts
// seat-glyph.tsx — presentacional, sin "use client". Devuelve un <g>.
export type SeatGlyphProps = { cx: number; cy: number; r: number; status: SeatStatus; accessible: boolean }

// seat-map.tsx — "use client"
export type SeatMapProps = {
  layout: VenueLayout
  venueName: string
  soldSeatIds: ReadonlySet<string>
  selectedSeatIds: ReadonlySet<string>
  includedZoneIds: ReadonlySet<string>
  zonePrices: ReadonlyMap<string, number>   // zoneId → precio
  onSeatActivate: (seatId: string) => void  // clic/tap/Enter/Espacio en cualquier asiento; decide quien llama
  className?: string
}

// seat-map-legend.tsx — sin "use client"
export type SeatMapLegendProps = { zones: readonly { id: string; name: string; price: number; quota: number; tone: ZoneTone | null }[]; className?: string }

// seat-selection-summary.tsx — sin "use client"
export type SeatSelectionSummaryProps = {
  summary: SeatSelectionSummary
  continueHref: string | null       // null hasta isComplete
  changeQuantitiesHref: string      // vuelve a /tickets con la selección
  onClear: () => void
}

// seat-selection-view.tsx — "use client"
export type SeatSelectionViewProps = { event: EventItem; seatMap: EventSeatMap; ticketTypes: TicketType[]; selection: TicketSelection }
```

Estado de `SeatSelectionView`: `useState<readonly string[]>([])` con los ids elegidos (sin store, D17); `lookup`, `soldSet`, `quotas`, `includedZoneIds`, `zonePrices`, `summary` y `continueHref` memoizados; `onSeatActivate` estable (`useCallback`).

### C8 — Ruta (`src/app/(purchase)/events/[slug]/seats/page.tsx`)

```ts
export async function generateMetadata(props: PageProps<"/events/[slug]/seats">): Promise<Metadata> // `Elige tus asientos — ${title}`; {} si no existe
export default async function SeatsPage(props: PageProps<"/events/[slug]/seats">): Promise<JSX.Element>
```
Flujo, sin otra lógica:
1. `const { slug } = await props.params; const { tickets } = await props.searchParams`.
2. `getBySlug`; `null` o `seatSelection !== "seat"` → `notFound()`.
3. `Promise.all([seatingService.getSeatMap(event.id), eventsService.getTicketTypes(event.id)])`; `seatMap === null` → `notFound()`.
4. `selection = parseTicketSelection(tickets, ticketTypes)`; sin entradas → `redirect(getEventTicketsHref(slug))` (D19).
5. `ticketsHref = buildPurchaseStepHref(getEventTicketsHref(slug), selection, ticketTypes)`.
6. Render `<PurchaseFlowHeader currentStep={1} backHref={ticketsHref} backLabel="Volver a Entradas" mobileTitle="Elige tus asientos" />` + `<main className="flex-1 bg-secondary">` con `<EventPurchaseSummary event backHref={ticketsHref} />` y `<SeatSelectionView … />`.

El 404 usa el `not-found` por defecto de Next (no hay segmento `(site)` aquí) salvo que el developer reutilice `EventNotFound` con un `not-found.tsx` en el segmento (opcional, mismo patrón que la 007).

## Especificación del `SeatMap`

**Estructura y zoom/pan:**

```tsx
<div className="relative h-full w-full">
  <TransformWrapper ref={transformRef} initialScale={1} minScale={1} maxScale={6} limitToBounds
    doubleClick={{ disabled: true }}  /* D11 */ keyboard={{ disabled: true }}  /* D10 */>
    <SeatMapZoomControls />            {/* interno, FUERA de TransformComponent */}
    <TransformComponent
      wrapperStyle={{ width: "100%", height: "100%", overflow: "hidden", touchAction: "none" }}
      contentStyle={{ width: "100%", height: "100%" }}>
      <svg viewBox={`0 0 ${layout.width} ${layout.height}`} width="100%" height="100%" preserveAspectRatio="xMidYMid meet" role="group" … />
    </TransformComponent>
  </TransformWrapper>
</div>
```
- Escala 1 = teatro completo (D20); `maxScale` 6; no se puede alejar más ni sacar el mapa de sus límites.
- Rueda: zoom hacia el cursor sin modificador (D14); valores por defecto de la librería salvo que una muesca cambie la escala más de 1.5× (entonces se ajusta `wheel.step` y se documenta). Pinch y arrastre para pan. `touch-action: none` en el wrapper.
- **Controles** arriba a la derecha: `role="group" aria-label="Controles de zoom"` con 3 `Button variant="outline" size="icon"` `bg-card`, `size-11` (44 px) por debajo de `lg` y `size-9` desde `lg`: **"Acercar"** (`Plus`), **"Alejar"** (`Minus`), **"Restablecer vista"** (`RotateCcw`); iconos `aria-hidden`. "Acercar" `disabled` en `maxScale`, "Alejar" en `minScale` (solo los controles se suscriben a la escala con `useTransformEffect`). "Restablecer vista" → `resetTransform`.
- **Reduced motion** (`usePrefersReducedMotion`): llamadas programáticas con `animationTime` 0 y `zoomAnimation`/`velocityAnimation` `disabled`.

**Dibujo** (tokens existentes, D15/D16):
- Escenario: `rect` `fill-muted stroke-border` + "ESCENARIO" `fill-muted-foreground`, `aria-hidden`.
- Nombre de zona (mayúsculas, `font-semibold`) en `labelPosition` y letras de fila en ambos extremos, `fill-muted-foreground`, `aria-hidden`.
- Zona no incluida en la selección: su `<g>` con `opacity-40` (D21).
- `SeatGlyph`: la **forma** codifica accesibilidad y el **glifo** el estado; el color solo refuerza.

| Estado | Normal (círculo de radio `r`) | Accesible (cuadrado redondeado ≈ `2r`) |
|---|---|---|
| available | `fill-primary/15 stroke-primary`, sin glifo | igual + icono de silla de ruedas en `primary` |
| selected | `fill-primary stroke-primary` + check `stroke-primary-foreground` | igual (el check reemplaza al icono) |
| sold | `fill-muted-foreground/25`, sin borde, + "×" `stroke-muted-foreground` | igual (la "×" reemplaza al icono) |

Los glifos se reconocen a 20 px en la leyenda.
- Hover (solo con hover): disponible de zona incluida → `fill-primary/35`. Cursor `pointer` en disponibles/seleccionados de zonas incluidas; `not-allowed` en vendidos y zonas no incluidas.
- Foco: anillo propio alrededor del asiento (stroke `ring`, 2 unidades, a `r + 3`), visible solo con `:focus-visible` del `<g>` (`group/seat` + `group-focus-visible/seat:opacity-100`), `outline-none` en el `<g>`.

**Semántica (D8):**
- `<svg role="group">` con `aria-label="Mapa de asientos, {venueName}"` y `aria-describedby` a un `<p className="sr-only">` (id con `useId`): **"Usa las flechas para moverte entre asientos y filas, Inicio y Fin para ir al extremo de la fila, Enter o Espacio para elegir un asiento, y más o menos para acercar o alejar."**
- Cada zona: `<g role="group" aria-label="{zone.name}, {formatPrice(precio)}">` (zona no incluida: `"{zone.name}, {precio}, no incluida en tu selección"`).
- Cada asiento: `<g>` con `id` DOM único (prefijo `useId` + `seat.id`), `data-seat-id`, `role="checkbox"`, `aria-checked={selected}`, `aria-disabled="true"` si está vendido o su zona no está incluida (sigue enfocable), `aria-label={getSeatAriaLabel(...)}`, `tabIndex` 0/−1 (roving).

**Teclado (roving tabindex):**
- Una sola parada de Tab: el asiento activo (inicial `getInitialFocusSeatId`; después, el último enfocado o activado).
- `SEAT_NAVIGATION_KEYS` mueven el foco con `element.focus({ preventScroll: true })`. Enter/Espacio → `onSeatActivate(activeSeatId)`. `+`/`=` acercan, `-` aleja, `0` restablece. Todas con `preventDefault()`. Tab/Shift+Tab no se interceptan.
- Auto-pan: con foco **de teclado** (`:focus-visible`), si el asiento no está entero dentro del wrapper con 24 px de margen → `zoomToElement(domId, { scale: escalaActual, animationTime })` (solo pan). Con puntero no hay auto-pan.
- Guardia de scroll: si el wrapper `overflow: hidden` queda con `scrollTop`/`scrollLeft` ≠ 0 (al entrar con Tab), se devuelve a 0 antes del auto-pan.

**Puntero:**
- Delegación: un `onPointerDown` y un `onClick` en el `<svg>`, que resuelven el asiento con `closest("[data-seat-id]")`.
- Guardia de arrastre (D12): si entre `pointerdown` y `click` el puntero se movió > 6 px, el clic se ignora.
- Tap para acercar (D13): con `pointerType === "touch"` y asiento renderizado < 24 px de ancho, no se activa; se llama a `zoomToPoint(min(maxScale, escala · 28 / ancho), clientX, clientY, animationTime)`. Con ≥ 24 px, el tap activa. Mouse y teclado siempre activan.

**Rendimiento:** `SeatNode` interno con `React.memo` y props primitivas/estables (`seat`, `zoneName`, `price`, `status`, `zoneIncluded`, `isTabStop`); handlers delegados; `Set`/`Map` memoizados en la vista; pan y zoom sin renders de `SeatNode`.

## Especificación de la vista (`SeatSelectionView`)

**Transcrito/derivado de la referencia (lenguaje visual de `Tickets`)**: header del flujo, mini cabecera, tarjetas `rounded-3xl border bg-card`, muestras de color de zona, "Tu compra"/total con perforación, CTA naranja, barra inferior móvil. **Criterio propio**: todo lo específico del mapa de asientos.

- Contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6 lg:pb-20`; `grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-8 lg:items-start`.
- **Columna del mapa**: `<section aria-labelledby>` en tarjeta `rounded-[22px] lg:rounded-3xl border border-border bg-card p-4 lg:p-6 flex flex-col gap-3`:
  - `<h2>` **"Elige tus asientos"** (`text-lg lg:text-xl font-semibold`) y `<p>` **"Toca o haz clic en un asiento para elegirlo. Acerca con los botones, la rueda del mouse o pellizcando."** (`text-sm text-muted-foreground`).
  - Contenedor del mapa `relative overflow-hidden rounded-2xl bg-muted/50`: `< lg` `h-[min(calc(100dvh-var(--mobile-action-bar-height)-7rem),36rem)] min-h-80`; `lg` `lg:h-[min(calc(100dvh-4rem),760px)]` (D22). `dvh`, no `vh`.
- **Aside** (`lg:sticky lg:top-6 flex flex-col gap-4`):
  1. `SeatMapLegend` en tarjeta: `<h2>` **"Leyenda"** (`text-base font-semibold`); `<ul>` de estados con `<svg viewBox="0 0 24 24" className="size-5" aria-hidden><SeatGlyph cx={12} cy={12} r={9} …/></svg>`: **"Disponible"**, **"Seleccionado"**, **"Vendido"**, **"Accesible para silla de ruedas"**; `<ul>` de zonas: muestra `size-3.5 rounded-[4px]` con `getZoneToneClassName(tone)` + **"{name}"** + **"{precio}"** + (si `quota > 0`) **"· eliges {quota}"**. Por debajo de `lg` ambas listas en `flex flex-wrap gap-x-4 gap-y-2`.
  2. `SeatSelectionSummary`, aside `hidden lg:flex` en tarjeta `flex-col gap-4 p-6 shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)]`:
     - `<h2>` **"Tu compra"**.
     - Por zona con cuota: **"{zoneName} · {n} de {quota}"** (`font-semibold`) y la lista de asientos elegidos como texto **"Fila {row}, asiento {n}"** (`text-sm text-muted-foreground`), o **"Todavía no elegiste asientos en {zoneName}."**.
     - Perforación `border-t-[1.5px] border-dashed border-input` + **"Total"** y `formatPrice(summary.total)` (`text-[1.75rem] font-bold tabular-nums`).
     - Fila de acciones: **"Limpiar"** (`Button variant="ghost"`, deshabilitado con 0 asientos; llama a `onClear` y anuncia `cleared`) y CTA **"Continuar"** (`next/link` `h-14 rounded-2xl bg-cta text-cta-foreground hover:bg-cta-hover font-semibold focus-ring` a `continueHref`; sin `continueHref`, `Button disabled focusableWhenDisabled` con `bg-border text-muted-foreground`).
     - Si no está completa: **"Te faltan {k} asientos."** / **"Te falta 1 asiento."** (`text-[13px] text-muted-foreground`).
     - Link **"Cambiar cantidades"** a `changeQuantitiesHref` (`text-sm font-semibold text-primary focus-ring`).
  3. **Barra `< lg`** (misma instancia de componente, `lg:hidden`): `<div role="region" aria-label="Resumen de asientos" data-mobile-action-bar className="sticky bottom-0 z-40 border-t border-border bg-background shadow-[0_-12px_24px_-18px_rgb(24_24_27/0.35)]">` con interior `flex items-center justify-between gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]`: izquierda **"{count} de {required} asientos"** (`text-sm text-muted-foreground`) + **"Total {precio}"** (`text-lg font-bold`); derecha "Limpiar" (`ghost`, `h-11`) + "Continuar" (`h-11 px-5 rounded-[14px]`). Alto: 1 + 12 + 48 + 12 = **73 px ≤ 80 px**. "Cambiar cantidades" en móvil vive en el header de paso (botón volver) y como link bajo la leyenda.
- **Región viva**: `<p role="status" aria-live="polite" className="sr-only">` con `getSelectionAnnouncement`. Un mensaje idéntico al anterior debe volver a anunciarse (p. ej. alternando un sufijo invisible o vaciando y reponiendo el texto).
- **`onSeatActivate`**: `toggleSeatSelection(...)` → si cambia, `setSelectedSeatIds`; anuncia con el `zoneCount`, `quota` e `isComplete` resultantes.

## Decisiones propias (no validadas) vs. validadas

**Validadas por el usuario:** modelo híbrido con paso extra de asientos solo para teatros; SVG propio + `react-zoom-pan-pinch` 4.2.0 y los descartes; teclado y `aria`; lógica de selección con tests.

**Decisiones propias:**
- **D1** — El módulo se llama `seating` (concepto único) y agrupa mapas de zonas (007) y de asientos (esta).
- **D2** — "Accesible" es atributo del asiento, combinable con cualquier estado.
- **D3** — `ticketTypeId` a nivel de zona; el precio sale de `TicketType`.
- **D4** — Geometría separada de disponibilidad (`EventSeatMap`), forma típica de una API.
- **D5** — Filas curvas con 2 pasillos y 3 bloques; numeración 1..n de izquierda a derecha (sin par/impar).
- **D6** — Vendidos deterministas (`mulberry32` + Fisher–Yates con semilla); coordenadas a 2 decimales: mismo render en servidor y cliente.
- **D7** — Sin Zod: no hay entrada externa salvo `?tickets=`, ya validado de forma tolerante por `parseTicketSelection`.
- **D8** — Roving tabindex + `role="checkbox"`/`aria-checked`; no `role="grid"` (filas curvas de longitud variable). Vendidos y zonas no incluidas siguen enfocables con `aria-disabled`.
- **D9** — Las flechas no saltan vendidos ni zonas no incluidas: la navegación sigue la geometría visible.
- **D10** — Teclado de la librería desactivado: las flechas mueven el foco y el auto-pan lo sigue; zoom con `+`/`-`/`0`.
- **D11** — `doubleClick` desactivado: elegir dos asientos rápido no debe hacer zoom.
- **D12** — Guardia de arrastre de 6 px.
- **D13** — Tap para acercar en táctil por debajo de 24 px (WCAG 2.5.8).
- **D14** — La rueda hace zoom sin modificador; el mapa no ocupa todo el alto útil, así que hay superficie para hacer scroll.
- **D15** — Asientos con el mismo estilo en todas las zonas (`primary`): los tonos de zona claros (`#C7D2FE`) no alcanzan 3:1 contra la tarjeta como relleno de un gráfico pequeño. El color de zona aparece en la leyenda y el resumen, coherente con la 007.
- **D16** — Codificación no cromática: forma = accesibilidad, glifo = estado.
- **D17** — Sin store zustand (cambio respecto de la versión anterior): las cuotas llegan por URL desde la 007 y los asientos se envían por URL al checkout (`?seats=`); el estado intermedio es local de la vista.
- **D18** — Recargar la página conserva las cuotas pero no los asientos elegidos (aceptado; evita persistencia en esta fase).
- **D19** — Entrar a `/seats` sin entradas válidas redirige al paso de zonas.
- **D20** — La vista inicial muestra el teatro completo en todos los anchos.
- **D21** — Zonas no pedidas en el paso de zonas se dibujan atenuadas y no se pueden elegir (anuncio `zone-not-selected`), para que la cantidad elegida en la 007 sea la única fuente de verdad.
- **D22** — Alturas del mapa: el header del flujo no es sticky, así que no se resta `--site-header-height`; sí se resta `--mobile-action-bar-height` en móvil. Márgenes (7rem, 4rem, tope 36rem/760 px) ajustables en la verificación visual.

## Tareas

### Preparación (serie)
- **P1** Dependencia — archivos: `package.json`, `package-lock.json` (`npm install react-zoom-pan-pinch@^4.2.0`).
- **P2** Tipos y generador con test — archivos: `src/modules/seating/types/seating.types.ts` (añadir C1), `src/modules/seating/utils/theater-layout.ts`, `src/modules/seating/utils/theater-layout.test.ts`.
- **P3** Mock y service con test — archivos: `src/modules/seating/data/seat-maps.mock.ts`, `src/modules/seating/services/seating.service.ts` (añadir `getSeatMap`), `src/modules/seating/services/seating.service.test.ts` (añadir casos).
- **P4** Lógica de selección y accesibilidad con tests — archivos: `src/modules/seating/utils/seat-selection.ts`, `src/modules/seating/utils/seat-selection.test.ts`, `src/modules/seating/utils/seat-a11y.ts`, `src/modules/seating/utils/seat-a11y.test.ts`.
- **P5** Glifo compartido — archivos: `src/modules/seating/components/seat-glyph.tsx`.

### Paralelo (archivos disjuntos)
- **T1** Mapa interactivo con test — archivos: `src/modules/seating/components/seat-map.tsx` (incluye `SeatNode` y `SeatMapZoomControls` internos), `src/modules/seating/components/seat-map.test.tsx`.
- **T2** Leyenda — archivos: `src/modules/seating/components/seat-map-legend.tsx`.
- **T3** Resumen y barra — archivos: `src/modules/seating/components/seat-selection-summary.tsx`.

Durante el bloque paralelo nadie ejecuta `npm install` ni `npm run build`.

### Integración (serie)
- **I1** Vista, ruta y test — archivos: `src/modules/seating/components/seat-selection-view.tsx`, `src/modules/seating/components/seat-selection-view.test.tsx`, `src/app/(purchase)/events/[slug]/seats/page.tsx`.

## Criterios de aceptación

**Calidad y estructura**
- [ ] AC1 `npm run lint`, `npm run test` y `npm run build` pasan.
- [ ] AC2 `src/modules/seating` tiene solo `types/`, `utils/`, `data/`, `services/`, `components/`. Grep: `seat-maps.mock` solo se importa en `seating.service.ts`; ningún archivo de `src/modules/events` importa de `seating`; no hay `zustand` ni `Math.random` en `src/modules/seating`.
- [ ] AC3 `react-zoom-pan-pinch` en `dependencies` con `^4.2.0`, importado solo desde archivos `"use client"`.
- [ ] AC4 No se modificó `globals.css`, `layout.tsx`, `src/app/(site)/**`, `src/components/**` ni `src/modules/events/**`. `MAX_TICKETS_PER_ZONE` y `parseTicketSelection` se importan de `@/modules/checkout/utils/ticket-selection`; no hay rutas `/checkout`, `/seats` ni `/tickets` construidas a mano.

**Datos**
- [ ] AC5 `getSeatMap("evt-001")`: `venueId: "teatro-municipal"`, Platea 14 filas/371 y Mezzanine 6/195 (566), 396 vendidos. `getSeatMap("evt-004")`: 325 y 114. Resto de eventos e id inexistente → `null`.
- [ ] AC6 Cada `zone.ticketTypeId` existe en `getTicketTypes(eventId)`; cada zona tiene ≥ 6 disponibles; los accesibles son exactamente los de C3.

**Página (manual)**
- [ ] AC7 Desde `/events/noche-de-rock-sinfonico/tickets` con 2 Platea + 1 Mezzanine, "Continuar" abre `/events/noche-de-rock-sinfonico/seats?tickets=…`: header del flujo con el paso 1 actual, mini cabecera, "Elige tus asientos" y el teatro completo (escenario, "PLATEA", "MEZZANINE", letras de fila, filas curvas con 2 pasillos) a 375, 768 y 1280 px. La pestaña dice "Elige tus asientos — Noche de Rock Sinfónico".
- [ ] AC8 La leyenda muestra los 4 estados con el glifo del mapa y "Platea $85 · eliges 2", "Mezzanine $45 · eliges 1" con sus muestras de tono. Con Achromatopsia emulada se distinguen disponible, seleccionado, vendido y accesible.
- [ ] AC9 Clic en un disponible de Platea → seleccionado y "Platea · 1 de 2"; otro clic → disponible. Clic en un vendido → nada. Con 2 elegidos en Platea, un tercero no se elige (anuncio `zone-full`). Con selección solo de Platea en la URL, Mezzanine se ve atenuada y sus asientos no se eligen (anuncio `zone-not-selected`).
- [ ] AC10 "Continuar" está deshabilitado (`aria-disabled="true"`) hasta completar 2 Platea + 1 Mezzanine; entonces es un link a `/events/noche-de-rock-sinfonico/checkout?tickets=evt-001-mezzanine:1,evt-001-platea:2&seats=…` (decodificado; ids de asiento en orden del layout). "Te faltan N asientos" se actualiza. "Limpiar" deja 0. "Cambiar cantidades" y el botón volver llevan a `/tickets` con la selección precargada.
- [ ] AC11 Un arrastre > 6 px que empieza en un asiento mueve el mapa sin cambiar la selección; doble clic no hace zoom. Rueda, "Acercar", "Alejar" y "Restablecer vista" funcionan con sus límites (botones deshabilitados en los extremos).
- [ ] AC12 Táctil emulado a 375 px: tocar un asiento en la vista completa acerca sin seleccionar; con el asiento ≥ 24 px, tocar selecciona. Pinch y arrastre sobre el mapa no desplazan la página; fuera del mapa sí.
- [ ] AC13 `/events/noche-de-rock-sinfonico/seats` sin `?tickets=` redirige a `/events/noche-de-rock-sinfonico/tickets`. `/events/festival-sonidos-del-sur/seats` (zona) y `/events/no-existe/seats` responden 404.

**Teclado y lector de pantalla**
- [ ] AC14 El mapa es una sola parada de Tab: entra en el primer asiento no vendido de Platea fila A (o el último usado); ←/→, ↑/↓ (incluido Platea N → Mezzanine A), Inicio/Fin, Enter/Espacio y `+`/`-`/`0` funcionan sin desplazar la página; el anillo de foco se ve en claro y oscuro.
- [ ] AC15 Con zoom máximo, al moverse con flechas fuera de la vista, el mapa se desplaza sin cambiar la escala; tras salir con Tab, mover el mapa con el mouse y volver a entrar, el asiento activo se muestra y el wrapper mantiene `scrollTop === 0` y `scrollLeft === 0`.
- [ ] AC16 Árbol de accesibilidad: `<svg>` `group` "Mapa de asientos, Teatro Municipal" con la descripción; zonas `group` "Platea, $85" / "Mezzanine, $45"; asientos `checkbox` con los `aria-label` exactos de C6 y `aria-disabled` en vendidos y zonas no incluidas.
- [ ] AC17 La región `status` anuncia los textos exactos de C6 (incluido el de selección completa); dos intentos seguidos sobre una zona llena se anuncian las dos veces.

**Responsive, tema y rendimiento**
- [ ] AC18 Por debajo de 1024 px el resumen es una barra inferior con `data-mobile-action-bar` de alto ≤ 80 px que no tapa la leyenda; `scroll-padding-bottom` del `<html>` = 96 px; recorriendo con Tab ningún elemento queda oculto bajo la barra. Desde 1024 px el aside es sticky. Sin scroll horizontal en 375, 768 y 1280 px.
- [ ] AC19 Modo oscuro legible (header, rótulos, 4 casos de asiento, leyenda, controles, resumen); el borde del asiento disponible (`primary`) contra `bg-card` alcanza ≥ 3:1 en ambos temas.
- [ ] AC20 Con `prefers-reduced-motion: reduce`, zoom por botones, restablecer, auto-pan y tap para acercar ocurren sin animación.
- [ ] AC21 Profiler: elegir un asiento re-renderiza como máximo 3 `SeatNode`; pan y zoom no renderizan `SeatNode`.
- [ ] AC22 La consola no muestra errores ni warnings de hidratación al cargar ni al recargar.

## Tests obligatorios

- `src/modules/seating/utils/theater-layout.test.ts` — config pequeña (2 zonas × 3 filas, 5 asientos +1): conteos, ids únicos, `number` 1..n con `x` creciente, `ticketTypeId` propagado; orden hacia atrás y hueco entre zonas; simetría (±0.01 en `y`, ±0.02 en `x`); exactamente 2 huecos > 1.5 × distancia mínima por fila; con la config de evt-001: sin pares a menos de `2·seatRadius + 1`, todos dentro del viewBox, ninguno sobre el escenario; ≤ 2 decimales; `accessible` exacto; errores (accesible inexistente, zonas duplicadas, `rowLabels` vacío); determinismo.
- `src/modules/seating/services/seating.service.test.ts` (añadir) — evt-001 566/396 y `venueId` = `venue.id`; evt-004 325/114; `null` para el resto e inexistente; vendidos sin duplicados, ⊂ layout y no triviales; ≥ 6 disponibles por zona; `ticketTypeId` ∈ `getTicketTypes`; determinismo e inmutabilidad.
- `src/modules/seating/utils/seat-selection.test.ts` — `getSeatQuotas` desde una `TicketSelection` (ignora tipos ajenos); `toggleSeatSelection`: agrega, quita, vendido → `unavailable` misma referencia, zona sin cuota → `zone-not-selected` misma referencia, zona llena → `zone-full` misma referencia, quitar un elegido que ahora figura vendido → `removed`, quitar con zona llena funciona; `createSeatLookup` y `getZoneTicketTypes` (falta → lanza); `buildSeatSelectionSummary`: zonas en orden del layout solo con cuota, asientos en orden de selección, `required`, `total` (3 × 19.99 = 59.97), `isComplete` true/false, ids desconocidos ignorados; `buildSeatCheckoutHref`: `pathname` `/checkout`, `tickets` igual a `serializeTicketSelection`, `seats` en orden del layout aunque se eligieran en otro orden.
- `src/modules/seating/utils/seat-a11y.test.ts` — navegación (←/→ y extremos, ↑/↓ al más cercano, empate, cruce de zona, primera/última fila, Inicio/Fin); `getInitialFocusSeatId` (primer no vendido de zona incluida; ninguno → primer asiento); los 5 `aria-label` y los textos de anuncio de C6 (incluidos singular con cuota 1 y "Ya elegiste todos tus asientos").
- `src/modules/seating/components/seat-map.test.tsx` (RTL; fixture con `buildTheaterLayout`; no se testea el zoom de la librería) — un `checkbox` por asiento con su `aria-label`; vendido y zona no incluida con `aria-disabled="true"`; seleccionado con `aria-checked="true"`; exactamente un `tabindex="0"`; `ArrowRight`/`ArrowDown` mueven el foco (o el tab stop); Enter, Espacio y clic llaman a `onSeatActivate`; existen "Acercar", "Alejar" y "Restablecer vista".
- `src/modules/seating/components/seat-selection-view.test.tsx` (RTL; fixtures de `EventSeatMap`, `TicketType[]` y `selection` = `{ platea: 2 }` en el test) — clic en un disponible de Platea → "Platea · 1 de 2" y anuncio `added`; vendido → anuncio `unavailable`; asiento de Mezzanine → anuncio `zone-not-selected`; tercer asiento de Platea → `zone-full`; "Continuar" deshabilitado hasta 2 y luego link con `tickets` y `seats`; "Limpiar" → 0 y anuncio `cleared`.
- **Sin test propio:** tipos, mock (validado por el service), `SeatGlyph`, `SeatMapLegend`, `SeatSelectionSummary` (presentacionales, cubiertos por el test de la vista) y `page.tsx`.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- Manual (`npm run dev`): flujo completo desde `/events/noche-de-rock-sinfonico` → "Elegir entradas" → 2 Platea + 1 Mezzanine → "Continuar" → `/seats`, a 375, 768 y 1280 px: AC7–AC13 y AC18. Solo teclado: AC14–AC15. Árbol de accesibilidad y NVDA/VoiceOver si está disponible: AC16–AC17. Rendering → Achromatopsia (AC8) y `prefers-reduced-motion` (AC20). Modo oscuro: AC19. Profiler: AC21. Consola: AC22.
