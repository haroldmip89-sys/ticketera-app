# 003 — Paleta de la referencia, módulo de eventos, "Explora por categoría" y "Próximos eventos"

- **Estado:** done (APPROVED por reviewer en iteración 3)
- **Modo:** SDD
- **Módulo(s):** `src/modules/events` (nuevo, primer módulo de dominio). Transversal: `src/app/globals.css` y `docs/design/design-system.md` (paleta), `src/lib` (fecha y formato), `src/components/ui` (shadcn `badge`, `empty`), `src/components/shared` (`SectionHeader`), `src/app/page.tsx` (composición).
- **Diseño fuente:** `docs/design/reference-design.md` §1 (sistema visual), §2.1 (pantallas `Main` y `Mobile`: secciones Categorías y Próximos eventos) y §3.1.

## Roadmap (revisado para alinearse al diseño de referencia)

| Fase | Spec | Contenido |
|---|---|---|
| **003** | esta | Paleta nueva (índigo de marca, naranja de compra, neutros zinc), módulo `events`, sección de categorías y "Próximos eventos" con filtro por categoría compartido. |
| 004 | `004-landing-redesign.md` | Shell del sitio: grupo de rutas `(site)`, header blanco, intro + buscador, "Cómo funciona", newsletter y footer claro. Elimina el header transparente, `SearchTopbar`, el Hero de la 002 y `useScrolledPastViewport`. |
| 005 | `005-featured-events-hero.md` | Hero de destacados en panel partido con miniaturas de progreso. |
| 006 | `006-event-detail.md` | Detalle de evento `/events/[slug]`. |
| 007 | `007-ticket-selection-zones.md` | Selección de entradas por zona y cantidad (paso 1 de la compra) para todos los eventos. |
| 008 | `008-theater-seat-map.md` | Paso extra de teatro: mapa de asientos numerados. |
| 009–014 | sin redactar | 009 búsqueda `/events`, 010 checkout + confirmación, 011 login/registro, 012 Mis entradas, 013 panel de organizador, 014 crear evento. |

Orden de implementación: 003 → 004 → 005 → 006 → 007 → 008.

## Objetivo

Aplicar la paleta del diseño de referencia (tokens en claro y oscuro), crear el módulo `src/modules/events` con contratos, 10 eventos mock, service asíncrono y lógica de filtrado con tests, y construir el bloque de descubrimiento de la landing: **"Explora por categoría"** (8 tiles que filtran) y **"Próximos eventos"** (chips sincronizados con los tiles, tarjetas tipo ticket y estado vacío). Al terminar, `/` muestra el Hero actual de la 002 seguido de ese bloque, en móvil y desktop, claro y oscuro, y el proyecto queda en verde. Los contratos de esta spec los consumen 004–008.

## Fuera de alcance

- **004**: header, buscador, footer, "Cómo funciona", newsletter y eliminación del Hero/header de la 002. Esta spec no toca `site-header.tsx`, `site-footer.tsx`, `search-topbar.tsx`, `hero.tsx` ni `src/hooks/**`. Hasta la 004, el header transparente de la 002 convive con la paleta nueva (aceptado: sus colores salen de tokens).
- **005**: Hero de destacados (consume `eventsService.getFeatured()` y `isFeatured`).
- **006**: detalle `/events/[slug]` (consume `doorsOpenAt`, `minAge`, `venue.address`). Hasta entonces, las tarjetas enlazan a una ruta que devuelve 404 (D9).
- **007/008**: selección de entradas y mapa de teatro (consumen `availability` y `seatSelection`).
- **009**: página de búsqueda `/events`. Los links "Ver calendario completo" y "Ver todos los eventos" quedan en `href="#"` hasta entonces.
- Filtro por fecha/período: la referencia filtra por categoría. La lógica por mes que antes vivía en `event-period.ts` no se crea (YAGNI); si la necesita la búsqueda (009), se diseña allí.
- Schemas Zod (no hay entrada externa) y React Query (el service se consume desde un server component).
- Toggle de tema: no se toca (decisión de la 004).

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| Tokens de color `:root` / `.dark` | **extender (reescribir valores)** | `src/app/globals.css` | Paleta de la referencia (§1.1 del análisis). Ver C1. Cambio global → tarea serial P1. |
| `docs/design/design-system.md` | extender | `docs/design/design-system.md` | Fuente de verdad de tokens: se reescribe la regla del acento (C1.4) y las tablas de §2. |
| `Button` / `buttonVariants` | reutilizar | `src/components/ui/button.tsx` | Solo en el botón del estado vacío. Chips, tiles y tarjeta usan elementos propios porque su estilo no coincide con ninguna variante (KISS frente a sobrescribir 10 clases). Sin cambios en el archivo. |
| `badge` (shadcn) | agregar de shadcn | `src/components/ui/badge.tsx` | `npx shadcn@latest add badge`. Badges "Últimas entradas" y "Agotado". Se usa con `className`, sin editar el archivo generado. |
| `empty` (shadcn) | agregar de shadcn | `src/components/ui/empty.tsx` | `npx shadcn@latest add empty` (existe en base-nova). Estado vacío del filtro. |
| `toggle-group` (shadcn) | descartado | — | Los tiles y los chips comparten estado y viven en dos grupos distintos; `toggle-group` obliga a un solo grupo y permite valor vacío. `<button aria-pressed>` cubre el caso. |
| `Card` (shadcn) | no se usa | `src/components/ui/card.tsx` | Su `ring-1` y padding interno chocan con la tarjeta tipo ticket. |
| `CategoriesSection` (002) | **eliminar y reemplazar** | `src/components/shared/categories-section.tsx` | Tenía labels inline y "Vida nocturna". La reemplaza `EventCategoryTiles` (dominio events). |
| `SectionHeader` | crear | `src/components/shared/section-header.tsx` | h2 + subtítulo opcional + link opcional. 2 usos en esta fase (categorías, próximos eventos) y lo reutilizan 004 y 006. Sin dominio → `shared`. |
| `getZonedDateParts`, `APP_TIME_ZONE` | crear | `src/lib/date-time.ts` | No existe equivalente. |
| `formatPrice`, `formatDateShort`, `formatDateBadge` | crear | `src/lib/format.ts` | No existe equivalente. 005 y 006 añaden funciones a este archivo. |
| Tipos del dominio | crear | `src/modules/events/types/event.types.ts` | Ver C3. |
| `EVENT_CATEGORIES` | crear | `src/modules/events/data/event-categories.ts` | 8 categorías en el orden de la referencia. |
| `EVENTS_MOCK`, `MOCK_REFERENCE_DATE` | crear | `src/modules/events/data/events.mock.ts` | 10 eventos ficticios. Solo lo importa el service. |
| `eventsService` | crear | `src/modules/events/services/events.service.ts` | Frontera de datos. |
| `getEventHref` | crear | `src/modules/events/utils/event-routes.ts` | Única fuente de rutas del dominio; 005 y 007 añaden helpers aquí. |
| `filterUpcomingEvents`, `UPCOMING_EVENTS_LIMIT` | crear | `src/modules/events/utils/event-filters.ts` | Lógica pura con test. |
| `EventCard` | crear | `src/modules/events/components/event-card.tsx` | Tarjeta tipo ticket, horizontal en móvil. La 006 le añade una variante compacta. |
| `EventCategoryTiles` | crear | `src/modules/events/components/event-category-tiles.tsx` | Tiles con tinte e icono (mapeo de UI tipado). |
| `EventDiscovery` | crear | `src/modules/events/components/event-discovery.tsx` | Client: estado de categoría compartido entre tiles y chips, grid y estado vacío. |
| `EventDiscoverySection` | crear | `src/modules/events/components/event-discovery-section.tsx` | Server async: lee el service y pasa datos al client. |
| `next.config.ts` (`images.unsplash.com`) | reutilizar | `next.config.ts` | Ya permitido. Sin cambios. |

**Recuento de archivos de producción:** 16 creados o modificados (2 generados por la CLI, 1 de composición) y 1 eliminado, más el documento de diseño. Pasa la guía de ~8 a propósito: (a) el usuario exigió que el cambio de tokens vaya en la primera spec que lo necesita, y es esta (precio naranja y tinte de urgencia en la tarjeta); (b) los tiles de categoría y los chips comparten estado, así que separarlos en otra fase obligaría a rehacer la frontera del componente; (c) 6 de los archivos son contratos declarativos o lógica pura sin UI. Cada tarea paralela toca 1 o 2 archivos.

## Contratos

### C1 — Paleta (P1, `src/app/globals.css`)

**C1.1 Valores.** Los hex son los del diseño de referencia (transcritos) salvo los marcados **(propio)**. Se escriben en `oklch()` (formato del design-system), convertidos desde el hex; tolerancia de verificación ±2 por canal RGB.

| Token | `:root` (claro) | `.dark` (oscuro) | Uso |
|---|---|---|---|
| `--background` | `#FFFFFF` | `#09090B` (propio) | Fondo de página |
| `--foreground` | `#18181B` | `#FAFAFA` (propio) | Texto principal; fondo de chip activo y badge "Agotado" |
| `--card` / `--popover` | `#FFFFFF` | `#18181B` (propio) | Tarjetas |
| `--card-foreground` / `--popover-foreground` | `#18181B` | `#FAFAFA` | |
| `--primary` | `#4F46E5` | `#818CF8` (propio) | Marca y navegación: logo, links, eyebrow, mes del badge, selección |
| `--primary-foreground` | `#FFFFFF` | `#18181B` (propio) | Texto sobre primario |
| `--secondary` | `#F4F4F5` | `#27272A` (propio) | Fondo de sección alterna (Próximos eventos) |
| `--secondary-foreground` | `#18181B` | `#FAFAFA` | |
| `--muted` | `#F4F4F5` | `#27272A` (propio) | Fondos sutiles, botón "−", estados deshabilitados |
| `--muted-foreground` | `#52525B` | `#A1A1AA` (propio) | Texto secundario |
| `--accent` | `#F4F4F5` (propio) | `#27272A` (propio) | **Superficie neutra de hover/foco de shadcn** (lo usa `SelectItem`). Deja de ser el coral (D2). |
| `--accent-foreground` | `#18181B` | `#FAFAFA` | |
| `--border` | `#E4E4E7` | `#3F3F46` (propio) | Bordes de tarjeta y divisores |
| `--input` | `#D4D4D8` | `#52525B` (propio) | Bordes de inputs, chips inactivos y botones outline |
| `--ring` | `#6366F1` (propio) | `#A5B4FC` (propio) | Foco (D3) |
| `--cta` **(nuevo)** | `#F97316` | `#F97316` | **Botones de compra/conversión** |
| `--cta-foreground` **(nuevo)** | `#18181B` | `#18181B` | Texto sobre el CTA (D1) |
| `--cta-hover` **(nuevo)** | `#EA580C` | `#FB923C` (propio) | Hover del CTA |
| `--price` **(nuevo)** | `#C2410C` | `#FB923C` (propio) | Precios ("Desde $45") |
| `--urgent` **(nuevo)** | `#FFEDD5` | `#431407` (propio) | Fondo del badge "Últimas entradas" |
| `--urgent-foreground` **(nuevo)** | `#9A3412` | `#FED7AA` (propio) | Texto e icono del badge "Últimas entradas" |

- `--destructive`, `--chart-*`, `--sidebar*` y `--radius` no cambian.
- En `@theme inline` se agregan `--color-cta`, `--color-cta-foreground`, `--color-cta-hover`, `--color-price`, `--color-urgent` y `--color-urgent-foreground`, para usar `bg-cta`, `text-price`, etc.

**C1.2 Tintes de categoría** (16 tokens nuevos, `--cat-<id>-bg` / `--cat-<id>-fg`). Claro = hex de la referencia (fondo del tile y color del icono). Oscuro = mismo hue, propio: fondo `oklch(0.30 0.05 H)` e icono `oklch(0.82 0.10 H)`.

| id | `:root` bg | `:root` fg | H (oscuro) |
|---|---|---|---|
| `concerts` | `#EEF0FF` | `#4338CA` | 277 |
| `sports` | `#E7F6EC` | `#15803D` | 150 |
| `theater` | `#FCEBEF` | `#BE123C` | 15 |
| `festivals` | `#FFF1E6` | `#C2410C` | 45 |
| `family` | `#E4F5F7` | `#0E7490` | 220 |
| `cinema` | `#F1ECFB` | `#6D28D9` | 293 |
| `comedy` | `#FDF5D8` | `#A16207` | 75 |
| `arts` | `#FBEAF6` | `#A21CAF` | 320 |

El icono va sobre un cuadro `bg-card` dentro del tile (blanco en claro, `#18181B` en oscuro). Contraste icono/cuadro ≥ 4.5:1 en los 16 pares (en claro el peor es comedy `#A16207` sobre blanco ≈ 4.9:1; en oscuro, L 0.82 sobre `#18181B` ≈ 9:1). El label del tile usa `text-foreground` sobre el fondo del tile (≥ 10:1 en ambos temas).

**C1.3 Utilidad de foco** (en `globals.css`):

```css
@utility focus-ring {
  &:focus-visible { outline: 3px solid var(--ring); outline-offset: 2px; }
}
```

Transcribe el foco de la referencia (outline de 3 px con offset de 2 px). La usan todos los elementos interactivos propios de 003–008 (tiles, chips, links-tarjeta, controles). Los `Button` de shadcn conservan su anillo (`ring-3 ring-ring/50`); si un `Button` queda sobre un fondo donde ese anillo no se ve, la spec que lo usa le añade `focus-ring`.

**C1.4 Contraste verificado (WCAG, fórmula de luminancia relativa)**

| Par | Claro | Oscuro |
|---|---|---|
| `--cta-foreground` sobre `--cta` | `#18181B`/`#F97316` = **6.3:1** | igual |
| `--cta-foreground` sobre `--cta-hover` | 5.0:1 | 7.8:1 |
| Blanco sobre `#F97316` (descartado) | **2.8:1, no cumple AA** | — |
| `--price` sobre `--card` | 5.2:1 | 7.8:1 |
| `--price` sobre `--secondary` | 4.7:1 | 6.6:1 |
| `--urgent-foreground` sobre `--urgent` | 6.4:1 | 11.6:1 |
| `--primary-foreground` sobre `--primary` | 6.3:1 | 5.9:1 |
| `--primary` sobre `--secondary` (eyebrow, links) | 5.7:1 | 5.0:1 |
| `--muted-foreground` sobre `--card` / `--secondary` | 7.7:1 / 7.0:1 | 6.9:1 / 5.8:1 |
| `--ring` contra `--background` (indicador de foco, ≥ 3:1) | 4.5:1 | 9.9:1 |

**C1.5 Regla de uso del color** (reemplaza la regla "80/15/5 con coral solo para urgencia" del design-system §1):
- **Neutros (zinc):** fondos, texto, bordes (~80 %).
- **Índigo (`primary`):** marca y navegación: logo, links, eyebrows, selección, foco, botones de marca no transaccionales ("Suscribirme", "Iniciar sesión").
- **Naranja (`cta`):** **solo** acciones de compra/conversión: "Buscar", "Comprar entradas", "Elegir entradas", "Continuar", "Pagar". "Ver entradas" en la tarjeta es un botón outline oscuro por diseño (no es naranja: es un indicador visual dentro de un link, no un CTA aislado). No se usa como fondo de sección ni para estados.
- **Precio (`price`):** texto de precios.
- **Urgencia (`urgent`):** "Últimas entradas" como **tinte suave + icono `Clock` + texto**, nunca solo color.
- **Agotado:** `bg-foreground text-background` + texto "Agotado" (sin token nuevo).
- Máximo un CTA naranja visible por bloque.

### C2 — Fecha y formato (`src/lib/date-time.ts`, `src/lib/format.ts`)

```ts
// date-time.ts
export const APP_TIME_ZONE = "America/Lima" // UTC-5, sin horario de verano
export type ZonedDateParts = { year: number; month: number; day: number; weekday: number; hour: number; minute: number }
/** month 1–12, weekday 0 = domingo. Acepta ISO string o Date. */
export function getZonedDateParts(value: string | Date, timeZone?: string /* = APP_TIME_ZONE */): ZonedDateParts

// format.ts
/** "$45", "$45.50", "$1,200", "$0". Entero → sin decimales; no entero → 2 decimales; miles con ",". */
export function formatPrice(amount: number): string
/** "sáb 3 oct" en APP_TIME_ZONE (referencia: "lun 5 oct"). */
export function formatDateShort(value: string | Date): string
/** Badge de fecha: { month: "OCT", day: "03" } en APP_TIME_ZONE. */
export function formatDateBadge(value: string | Date): { month: string; day: string }
```

Reglas de determinismo (evitan hydration mismatch y diferencias de ICU entre Node y navegadores):
- `Intl` solo para **partes numéricas**: `new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", hourCycle: "h23" }).formatToParts(...)`. `weekday` se calcula con `Date.UTC(y, m - 1, d)` + `getUTCDay()`.
- Nombres de días y meses desde **tablas fijas** en `format.ts`: días cortos `dom lun mar mié jue vie sáb`; meses cortos `ene feb mar abr may jun jul ago sep oct nov dic`. En minúscula, como la referencia. El badge usa el mes corto en mayúsculas (`"OCT"`). Las fases 005/006 añaden días y meses largos a estas tablas.
- Día en `formatDateShort` sin cero inicial (`"3"`); día del badge siempre con 2 dígitos (`"03"`).
- Moneda: **`$`** (decisión del usuario; la referencia usa S/ y no se sigue en esto). Moneda única, sin campo `currency`.

### C3 — Tipos del dominio (`src/modules/events/types/event.types.ts`)

```ts
export type EventCategoryId =
  | "concerts" | "sports" | "theater" | "festivals"
  | "family" | "cinema" | "comedy" | "arts"

export type EventCategory = { id: EventCategoryId; label: string }

export type Venue = {
  id: string
  name: string
  city: string
  address: string  // ficticia; la consume la 006 ("Lugar" y "Cómo llegar")
}

/** Disponibilidad visible (referencia: available | last-tickets | sold-out). */
export type EventAvailability = "available" | "last-tickets" | "sold-out"

/** Cómo se eligen las entradas (modelo híbrido):
 *  "zone" = zona + cantidad (estadios, arenas, festivales, general; 007);
 *  "seat" = zona + cantidad y después asientos numerados en mapa (teatros; 007 + 008). */
export type SeatSelectionMode = "zone" | "seat"

export type EventItem = {
  id: string               // "evt-001"
  slug: string             // kebab-case único → /events/[slug]
  title: string
  description: string      // 1–2 frases
  category: EventCategory  // objeto denormalizado: la UI no hace lookups
  startsAt: string         // ISO 8601 con offset explícito "-05:00"
  doorsOpenAt: string      // ISO 8601, anterior a startsAt (lo muestra la 006)
  minAge: number | null    // null = todo público (lo muestra la 006)
  venue: Venue
  imageUrl: string
  imageAlt: string
  priceFrom: number        // mínimo de los tipos de entrada (invariante verificado en la 006)
  availability: EventAvailability
  seatSelection: SeatSelectionMode
  isFeatured: boolean      // Hero (005)
}
```

- `EventItem` es **serializable** (sin `Date` ni funciones): viaja de server a client como prop.
- Se llama `EventItem` (no `Event`) para no sombrear el tipo global `Event` del DOM.
- `doorsOpenAt`, `minAge`, `venue.address`, `seatSelection` y `isFeatured` no los consume la UI de esta fase. Se definen aquí porque son contratos compartidos y así 005–008 no editan el mock de esta spec.

### C4 — Categorías (`src/modules/events/data/event-categories.ts`)

```ts
export const EVENT_CATEGORIES: readonly EventCategory[]
```

Orden y labels exactos (referencia): `concerts` Conciertos · `sports` Deportes · `theater` Teatro · `festivals` Festivales · `family` Familiar · `cinema` Cine · `comedy` Comedia · `arts` Arte y Exposiciones.

### C5 — Mock (`src/modules/events/data/events.mock.ts`)

```ts
export const MOCK_REFERENCE_DATE = "2026-10-02T12:00:00-05:00" // "hoy" del mock (viernes)
export const EVENTS_MOCK: readonly EventItem[]
```

Nombres, lugares y direcciones **ficticios** (decisión del usuario: no se copian artistas, marcas, equipos ni direcciones reales de la referencia). Imagen: `https://images.unsplash.com/<id>?auto=format&fit=crop&w=800&q=70`. Todos los `startsAt`/`doorsOpenAt` llevan `-05:00`. `category` toma el objeto de `EVENT_CATEGORIES`.

| id | slug | title | cat. | startsAt | doorsOpenAt | minAge | venue id · name · city | priceFrom | availability | seatSel. | feat. |
|---|---|---|---|---|---|---|---|---|---|---|---|
| evt-001 | `noche-de-rock-sinfonico` | Noche de Rock Sinfónico | concerts | 2026-10-03T20:00 | 2026-10-03T18:30 | 12 | `teatro-municipal` · Teatro Municipal · Lima | 45 | last-tickets | seat | ✓ |
| evt-002 | `clasico-del-futbol-final-de-temporada` | Clásico del Fútbol: Final de Temporada | sports | 2026-10-04T16:00 | 2026-10-04T13:30 | null | `estadio-nacional` · Estadio Nacional · Lima | 30 | available | zone | ✓ |
| evt-003 | `festival-sonidos-del-sur` | Festival Sonidos del Sur | festivals | 2026-10-16T14:00 | 2026-10-16T12:00 | 18 | `parque-de-la-exposicion` · Parque de la Exposición · Lima | 60 | last-tickets | zone | ✓ |
| evt-004 | `la-casa-de-bernarda-alba` | La Casa de Bernarda Alba | theater | 2026-10-22T19:30 | 2026-10-22T19:00 | 14 | `teatro-britanico` · Teatro Británico · Lima | 35 | available | seat | ✓ |
| evt-005 | `risas-sin-filtro-stand-up` | Risas sin Filtro: Stand-up | comedy | 2026-10-24T21:00 | 2026-10-24T20:00 | 18 | `centro-de-convenciones` · Centro de Convenciones · Lima | 25 | available | zone | |
| evt-006 | `electro-night-sessions` | Electro Night Sessions | concerts | 2026-10-30T23:00 | 2026-10-30T22:00 | 18 | `club-aura` · Club Aura · Lima | 40 | **sold-out** | zone | |
| evt-007 | `pop-en-vivo-gira-2026` | Pop en Vivo: Gira 2026 | concerts | 2026-11-08T20:00 | 2026-11-08T18:00 | null | `arena-central` · Arena Central · Lima | 55 | available | zone | ✓ |
| evt-008 | `jazz-al-atardecer` | Jazz al Atardecer | concerts | 2026-11-14T18:00 | 2026-11-14T17:00 | null | `anfiteatro-del-parque` · Anfiteatro del Parque · Arequipa | 38 | available | zone | |
| evt-009 | `circo-de-las-maravillas` | Circo de las Maravillas | family | 2026-11-22T16:00 | 2026-11-22T15:00 | null | `carpa-del-sol` · Carpa del Sol · Lima | 20 | available | zone | |
| evt-010 | `bienal-de-arte-urbano` | Bienal de Arte Urbano | arts | 2026-12-05T11:00 | 2026-12-05T10:00 | null | `galeria-central` · Galería Central · Arequipa | 15 | available | zone | |

Direcciones (ficticias, texto exacto): evt-001 "Jr. Las Artes 377, Cercado de Lima"; evt-002 "Av. del Deporte 1200, Lima"; evt-003 "Av. 28 de Julio 800, Lima"; evt-004 "Calle Bellavista 527, Miraflores"; evt-005 "Av. Las Convenciones 2500, San Borja"; evt-006 "Av. Costanera 1500, Miraflores"; evt-007 "Av. La Arena 450, Santiago de Surco"; evt-008 "Calle del Parque 210, Yanahuara"; evt-009 "Av. Los Circos 300, Santiago de Surco"; evt-010 "Calle Mercaderes 140, Cercado de Arequipa".

Imágenes (id Unsplash · alt):
- evt-001 `photo-1524368535928-5b5e00ddc76b` · "Público frente a un escenario con luces cálidas"
- evt-002 `photo-1574629810360-7efbbe195018` · "Balón de fútbol sobre el césped"
- evt-003 `photo-1492684223066-81342ee5ff30` · "Confeti cayendo sobre el público de un festival"
- evt-004 `photo-1503095396549-807759245b35` · "Escenario de teatro con telón rojo"
- evt-005 `photo-1585699324551-f6c309eedeca` · "Comediante en el escenario frente a un auditorio lleno"
- evt-006 `photo-1516450360452-9312f5e86fc7` · "DJ en el escenario con luces láser y público bailando"
- evt-007 `photo-1429962714451-bb934ecdc4ec` · "Público formando corazones con las manos en un concierto"
- evt-008 `photo-1507676184212-d03ab07a01bf` · "Micrófono vintage en un escenario con luces"
- evt-009 y evt-010: el developer elige una foto de Unsplash coherente (carpa de circo o malabaristas; mural de arte urbano o sala de exposición), **verifica que carga** (sin 404) y escribe un `imageAlt` descriptivo en español. El id elegido queda en el mock.

Descripciones (texto exacto):
1. "Los grandes clásicos del rock reinterpretados por una orquesta sinfónica completa."
2. "El partido decisivo de la temporada entre los dos equipos más grandes del país."
3. "Un día entero de música al aire libre con bandas nacionales e internacionales."
4. "El clásico de Federico García Lorca en una puesta en escena íntima y contemporánea."
5. "Una noche de stand-up con los comediantes más irreverentes de la escena local."
6. "DJs invitados y música electrónica hasta el amanecer."
7. "La gira más esperada del año llega con un show lleno de éxitos y sorpresas."
8. "Jazz en vivo al aire libre mientras cae el sol sobre la ciudad."
9. "Acróbatas, payasos y malabaristas en un espectáculo para toda la familia."
10. "Murales, instalaciones y obras de artistas urbanos de todo el país."

### C6 — Service (`src/modules/events/services/events.service.ts`)

```ts
export const eventsService: {
  /** Todos, por startsAt ascendente. */
  getAll(): Promise<EventItem[]>
  /** null si no existe. */
  getBySlug(slug: string): Promise<EventItem | null>
  /** isFeatured, por startsAt ascendente (Hero, 005). */
  getFeatured(): Promise<EventItem[]>
  /** startsAt >= now (inclusivo), ascendente. now por defecto = new Date(getReferenceDate()). */
  getUpcoming(now?: Date): Promise<EventItem[]>
  /** "Hoy" de referencia en ISO. Mock: MOCK_REFERENCE_DATE. */
  getReferenceDate(): string
}
```

Asíncrono (salvo `getReferenceDate`), devuelve **arrays nuevos** en cada llamada, y ningún componente importa `events.mock.ts`.

### C7 — Rutas (`src/modules/events/utils/event-routes.ts`)

```ts
/** "/events/{slug}" (detalle, 006). */
export function getEventHref(slug: string): string
```

### C8 — Filtro (`src/modules/events/utils/event-filters.ts`)

```ts
export const UPCOMING_EVENTS_LIMIT = 8
export type EventCategoryFilter = EventCategoryId | "all"
/** Filtra por categoría ("all" = sin filtro) conservando el orden de entrada y corta a UPCOMING_EVENTS_LIMIT. No muta la entrada. */
export function filterUpcomingEvents(events: readonly EventItem[], filter: EventCategoryFilter): EventItem[]
```

Resultado con `getUpcoming()` del mock: `all` → evt-001…evt-008 (8, la referencia muestra "las primeras 8 por fecha"); `concerts` → evt-001, evt-006, evt-007, evt-008; `sports` → evt-002; `theater` → evt-004; `festivals` → evt-003; `family` → evt-009; `cinema` → `[]`; `comedy` → evt-005; `arts` → evt-010.

### C9 — Componentes

```ts
// src/components/shared/section-header.tsx  (server)
export type SectionHeaderProps = {
  titleId: string
  title: string
  description?: string
  action?: { href: string; label: string; className?: string }   // link con ArrowRight; className se aplica al link
  className?: string
}
export function SectionHeader(props: SectionHeaderProps): JSX.Element

// src/modules/events/components/event-card.tsx  (server, presentacional)
export type EventCardProps = { event: EventItem; className?: string }
export function EventCard(props: EventCardProps): JSX.Element

// src/modules/events/components/event-category-tiles.tsx  (sin "use client"; solo se usa dentro de EventDiscovery)
export type EventCategoryTilesProps = {
  selected: EventCategoryFilter
  onSelect: (categoryId: EventCategoryId) => void  // quien llama decide el toggle
}
export function EventCategoryTiles(props: EventCategoryTilesProps): JSX.Element

// src/modules/events/components/event-discovery.tsx  ("use client")
export type EventDiscoveryProps = { events: EventItem[] }   // ya filtrados por getUpcoming
export function EventDiscovery(props: EventDiscoveryProps): JSX.Element

// src/modules/events/components/event-discovery-section.tsx  (server async, sin props)
export async function EventDiscoverySection(): Promise<JSX.Element>
//   const events = await eventsService.getUpcoming()  →  <EventDiscovery events={events} />
```

Estado de `EventDiscovery`: `selected: EventCategoryFilter`, inicial `"all"`.
- Tile de una categoría no activa → esa categoría. Tile de la categoría activa → `"all"` (referencia).
- Chip "Todos" → `"all"`. Chip de categoría → esa categoría (pulsar el chip activo no cambia nada: siempre hay un chip activo).
- Botón del estado vacío → `"all"`.

## Especificación visual

**Transcrito de la referencia** (`Main`, `Mobile`): copy, orden de categorías, estructura y medidas de tiles, chips, tarjeta tipo ticket (desktop y móvil), estado vacío, colores. **Criterio propio**: breakpoints exactos (la referencia solo tiene 1440 y 390 px), semántica del link de la tarjeta (D10), icono en "Últimas entradas" (decisión del usuario) y lo marcado con D en la sección de decisiones.

### `SectionHeader`
- Contenedor `flex flex-wrap items-end justify-between gap-4`.
- `<h2 id={titleId}>`: `text-2xl md:text-[2rem] leading-[1.2] font-bold tracking-[-0.02em]` (24 px móvil / 32 px desktop).
- `description`: `<p>` `text-sm md:text-[1.0625rem] leading-normal text-muted-foreground` (14 / 17 px).
- `action`: `next/link` `inline-flex min-h-11 items-center gap-1.5 text-[0.9375rem] font-semibold text-primary hover:underline focus-ring rounded-md` + `ArrowRight` 18 px `aria-hidden`.

### Sección "Explora por categoría" (dentro de `EventDiscovery`)
- `<section id="categorias" aria-labelledby="categories-title">`, fondo de página. Contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-8 md:pt-16 md:pb-20 flex flex-col gap-5 md:gap-8`.
- `SectionHeader` con `title="Explora por categoría"` y `description="Elige lo que te gusta y te mostramos lo que viene."`, sin `action`.
- `EventCategoryTiles`, una por `EVENT_CATEGORIES` en orden:
  - **Móvil (`< md`)**: fila con scroll horizontal (`flex gap-3 overflow-x-auto snap-x snap-mandatory`, sangrado a los bordes con `-mx-4 px-4`), tiles de `w-34 h-33` (136×132 px), `rounded-[22px]`, `p-4`, `snap-start shrink-0`. Cuadro del icono `size-12 rounded-2xl`, icono 26 px; label `text-sm font-semibold leading-tight`.
  - **`md`**: `grid grid-cols-4 gap-4`; **`xl`**: `grid-cols-8`. Tiles `h-42` (168 px), `rounded-3xl` (24 px), `p-5`. Cuadro del icono `size-14 rounded-[18px]`, icono 26 px; label `text-base font-semibold`.
  - Cada tile: `<button type="button" aria-pressed={selected === id}>` con `flex flex-col items-start justify-between text-left` + `tileClassName` (`bg-(--cat-<id>-bg)`), borde `border-2 border-transparent`; seleccionado: `border-primary` (anillo de 2 px de la referencia). Hover: `-translate-y-[3px] shadow-[0_14px_28px_-18px_rgb(24_24_27/0.4)]` en 250 ms, sin desplazamiento ni transición con `motion-reduce`. Foco: `focus-ring`.
  - Cuadro del icono: `bg-card` + `text-(--cat-<id>-fg)` + icono lucide `aria-hidden`. Label `text-foreground` con `category.label` (es el nombre accesible del botón).
  - Iconos (referencia §1.6): concerts `Music`, sports `Trophy`, theater `Drama`, festivals `PartyPopper`, family `Users`, cinema `Film`, comedy `MicVocal`, arts `Palette`. Mapeo de UI tipado `Record<EventCategoryId, { icon: LucideIcon; tileClassName: string; iconClassName: string }>` con strings estáticos completos (Tailwind debe detectarlos).

### Sección "Próximos eventos" (dentro de `EventDiscovery`)
- `<section id="eventos" aria-labelledby="upcoming-events-title">` a todo el ancho con `bg-secondary`. Contenedor `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-10 pb-12 md:pt-20 md:pb-24 flex flex-col`.
- `SectionHeader` con `title="Próximos eventos"`, `description="Ordenados por fecha. Asegura tu lugar antes de que se agoten."` y `action={{ href: "#", label: "Ver calendario completo", className: "hidden md:inline-flex" }}` (en móvil la referencia lo omite).
- **Chips** (`mt-4 md:mt-7`): `<div role="group" aria-label="Filtrar por categoría">`.
  - `< md`: una fila con scroll horizontal, sin wrap (`flex gap-2 overflow-x-auto -mx-4 px-4`), `whitespace-nowrap shrink-0`.
  - `≥ md`: `flex flex-wrap gap-2.5`.
  - Orden: "Todos" + las 8 categorías. `<button type="button" aria-pressed>` `h-11 rounded-full px-4 md:px-[18px] text-sm border-[1.5px] focus-ring`.
  - Activo: `bg-foreground text-background border-foreground font-semibold`. Inactivo: `bg-card text-foreground border-input font-medium`.
- Región `sr-only` `aria-live="polite"` con `"1 evento"` / `"{n} eventos"` (incluye `"0 eventos"`).
- **Lista** (`mt-5 md:mt-8`): `grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-4`. Una `EventCard` por evento de `filterUpcomingEvents(events, selected)`.
- **Estado vacío** (en lugar de la lista): `Empty` con `rounded-[22px] md:rounded-3xl border-[1.5px] border-dashed border-input bg-card px-5 py-12 md:py-18`:
  - Tile de icono `size-13 md:size-14 rounded-2xl bg-primary/10 text-primary` con `CalendarX2` `aria-hidden`.
  - Título **"Todavía no hay eventos de {label}"** (`text-[1.0625rem] md:text-xl font-semibold`).
  - Descripción **"Estamos sumando nuevas fechas. Mientras tanto, mira todo lo que viene."** (`text-sm md:text-[0.9375rem] text-muted-foreground max-w-[26rem]`).
  - Botón **"Ver todos los eventos"** (`Button`, `h-12 rounded-[14px] px-5 bg-foreground text-background hover:bg-foreground/90 font-semibold`) → `selected = "all"`.
- Link final centrado **"Ver todos los eventos"** + `ArrowRight` (`href="#"`, `mt-5 md:mt-10 mx-auto` en desktop y a todo el ancho en móvil, `h-13 rounded-[14px] border-[1.5px] border-foreground bg-card px-7 font-semibold text-foreground inline-flex items-center justify-center gap-2 focus-ring`).

### Tarjeta (`EventCard`)
Raíz `<article className="group relative ...">` con un único link: el título. `<h3><Link href={getEventHref(slug)} className="after:absolute after:inset-0 focus-visible:outline-none">` (stretched link), y el `<article>` muestra el foco con `has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring`. Toda la tarjeta es clicable con una sola parada de tabulación (D10). Hover (solo puntero): `-translate-y-1 shadow-[0_20px_40px_-20px_rgb(24_24_27/0.35)]` en 250 ms; nada con `motion-reduce`.

**Desktop (`≥ sm`), vertical** — `flex flex-col overflow-hidden rounded-[22px] border border-border bg-card text-card-foreground`:
1. Imagen `relative h-46` (184 px) `bg-border`, `next/image` `fill object-cover`, `alt={imageAlt}`, `sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"`, sin `preload`/`priority`.
   - Badge de fecha `absolute top-3 left-3 w-14 rounded-[14px] bg-card pt-1.5 pb-[7px] flex flex-col items-center shadow-[0_4px_14px_-6px_rgb(0_0_0/0.35)]`, `aria-hidden` (la fecha está en el cuerpo): mes `text-[11px] font-bold tracking-[0.08em] text-primary` ("OCT"), día `text-[22px] leading-[1.05] font-bold` ("03").
   - Badge de estado `absolute top-3 right-3` (si aplica): **"Últimas entradas"** = `Badge` `h-7 gap-1.5 rounded-full px-3 text-xs font-semibold bg-urgent text-urgent-foreground` + `Clock` `aria-hidden`; **"Agotado"** = `Badge` `h-7 rounded-full px-3 text-xs font-semibold bg-foreground text-background`.
2. Cuerpo `flex flex-1 flex-col gap-2 px-5 pt-4.5`:
   - Eyebrow `text-xs font-semibold tracking-[0.06em] uppercase text-primary` con `category.label`.
   - `<h3>` `min-h-[2.875rem] text-[1.0625rem] leading-[1.35] font-semibold line-clamp-2`.
   - Fila `MapPin` 16 px + `"{venue.name} · {venue.city}"` (`text-sm text-muted-foreground truncate`).
   - Fila `Calendar` 16 px + `<time dateTime={startsAt}>{formatDateShort(startsAt)}</time>` (`text-sm text-muted-foreground`).
3. **Perforación** (`aria-hidden`): `relative mt-4.5 border-t-[1.5px] border-dashed border-input` con dos muescas `absolute -top-2.5 size-5 rounded-full bg-secondary border border-border` en `-left-2.5` y `-right-2.5` (color del fondo de la sección).
4. Pie `flex items-center justify-between gap-3 px-5 pt-4 pb-5`:
   - "Desde" (`text-xs text-muted-foreground`) y `formatPrice(priceFrom)` (`text-[1.1875rem] font-bold tracking-[-0.01em] text-price`).
   - Indicador visual `aria-hidden` (no es un control): disponible → **"Ver entradas"** `h-11 inline-flex items-center rounded-xl border-[1.5px] border-foreground px-4 text-sm font-semibold`; agotado → **"Agotado"** `h-11 inline-flex items-center rounded-xl bg-muted px-4 text-sm font-semibold text-muted-foreground`.

**Móvil (`< sm`), horizontal** — misma raíz, `flex-row h-33` (132 px) `rounded-[20px]`:
- Imagen `w-27` (108 px) `shrink-0`, badge de fecha compacto `top-2 left-2 w-11 rounded-[11px]` (mes 10 px, día 17 px).
- Contenido `relative min-w-0 flex-1 flex flex-col gap-1 px-3.5 py-3` con **perforación vertical** `border-l-[1.5px] border-dashed border-input` y muescas `size-5` en `-top-2.5 -left-2.5` y `-bottom-2.5 -left-2.5`.
- Fila superior `flex items-center justify-between gap-1.5`: eyebrow (11 px) + badge de estado compacto (`h-[22px] px-2 text-[11px]`; "Últimas entradas" conserva el icono a 12 px).
- Título `text-[0.9375rem] leading-[1.3] font-semibold line-clamp-2`; `"{venue.name} · {venue.city}"` `text-xs`; abajo (`mt-auto`) "Desde" + precio `text-base font-bold text-price`.
- Sin fila de fecha ni indicador "Ver entradas" (la referencia los omite en móvil); la fecha sigue en el badge y en un `<time className="sr-only">` para lectores de pantalla.
- La tarjeta se reorganiza con clases responsive en **un solo árbol DOM** (no dos tarjetas).

### Jerarquía de headings en `/` al terminar esta fase
`h1` (Hero de la 002) → `h2` "Explora por categoría" → `h2` "Próximos eventos" → `h3` por tarjeta.

## Decisiones propias (no validadas) vs. validadas

**Validadas por el usuario:** paleta índigo/naranja/zinc de la referencia con naranja solo para compra; texto oscuro sobre naranja si el blanco no da AA; tokens claro y oscuro; "Últimas entradas" con tinte suave + icono; moneda `$`; Poppins; nombres ficticios; categorías y estados de la referencia; filtro por categoría.

**Decisiones propias:**
- **D1** — Texto `#18181B` sobre el CTA naranja `#F97316` (6.3:1). Blanco da 2.8:1 y no cumple AA, así que se descarta un naranja más oscuro (cambiaría el color de la referencia) en favor del texto oscuro que ya usa la referencia.
- **D2** — El naranja **no** reutiliza `--accent`: se crea `--cta`. Motivo: shadcn usa `--accent` como superficie de hover/foco (`SelectItem` hoy; otros primitivos en el futuro); si `--accent` fuera naranja, los menús quedarían naranjas al navegar con teclado. `--accent` vuelve al valor neutro de la convención shadcn (`#F4F4F5` / `#27272A`).
- **D3** — `--ring` = `#6366F1` (indigo-500) en claro en vez del `#818CF8` de la referencia: el `#818CF8` da 2.98:1 contra blanco, por debajo de 3:1 para indicadores de foco. Se mantienen el grosor y el offset de la referencia (utilidad `focus-ring`).
- **D4** — Valores del modo oscuro: la referencia no tiene modo oscuro; se derivan de la escala zinc/indigo/orange de Tailwind (mismo hue, ajuste de L), con los contrastes de C1.4.
- **D5** — 10 eventos (antes 8) para cubrir las 8 categorías con datos coherentes y el "Todos = primeras 8" de la referencia: se añaden evt-009 (Familiar) y evt-010 (Arte y Exposiciones); evt-006 pasa de "Vida nocturna" a Conciertos. Cine queda sin eventos a propósito (muestra el estado vacío con el mock). 5 destacados como en la referencia (se suma evt-007).
- **D6** — Disponibilidad: evt-001 y evt-003 "Últimas entradas" (como antes), evt-006 "Agotado" (nuevo, para cubrir el tercer estado). Ciudades: 8 en Lima y 2 en Arequipa (la referencia muestra varias ciudades; se usan ciudades peruanas, coherentes con `America/Lima`).
- **D7** — Fechas en minúscula ("sáb 3 oct", mes del badge "OCT") como la referencia, desde tablas fijas (no `Intl`) por las diferencias de ICU entre Node y navegadores.
- **D8** — Modelo híbrido en el dominio: `seatSelection: "zone" | "seat"` reemplaza a `seating: "reserved" | "general"`. Solo los teatros (evt-001, evt-004) son `"seat"`; estadio y arena pasan a zona + cantidad (decisión del usuario).
- **D9** — No se crea un placeholder de `/events/[slug]`: lo crea la 006. Entre la 003 y la 006, las tarjetas llevan a un 404 (aceptado).
- **D10** — La referencia hace de toda la tarjeta un `<a>`. Aquí el link es el título estirado a toda la tarjeta (mismo comportamiento visual y de clic), para que el nombre accesible sea el título y no todo el texto de la tarjeta. "Ver entradas"/"Agotado" son indicadores visuales `aria-hidden`; el estado sigue anunciado por el badge con texto.
- **D11** — Tiles y chips viven en un único client component (`EventDiscovery`) que renderiza las dos secciones contiguas, en lugar de sincronizarlos por URL (`?categoria=`): evita convertir `/` en página dinámica y no requiere contexto ni store (KISS).
- **D12** — Al elegir una categoría no se hace scroll automático hacia la lista (la referencia no lo hace).
- **D13** — Las muescas de la perforación usan `bg-secondary` (fondo de "Próximos eventos"). Si la tarjeta se usa sobre otro fondo (búsqueda, 009), esa spec decide.
- **D14** — Breakpoints: tarjeta horizontal y chips con scroll por debajo de `sm`/`md` respectivamente; tiles en scroll por debajo de `md`, 4 columnas en `md`–`lg` y 8 desde `xl` (a 1024 px, 8 columnas dejarían "Arte y Exposiciones" en 3 líneas).

## Tareas

### Preparación (serie)
- **P1** Paleta y documentación — archivos: `src/app/globals.css` (C1.1, C1.2, C1.3 y mapeos `@theme inline`), `docs/design/design-system.md` (reescribir §1 con la regla C1.5; tablas §2.1/§2.2 con los valores de C1.1; nueva subsección "Tokens semánticos" con `cta`, `price`, `urgent`; nueva subsección "Tintes de categoría" con C1.2; tabla de contraste C1.4; utilidad `focus-ring`; nota en §7 de que el naranja pasa a CTA de compra por decisión del usuario).
- **P2** Primitivos de shadcn — archivos: `src/components/ui/badge.tsx`, `src/components/ui/empty.tsx` (`npx shadcn@latest add badge empty`, sin editar a mano; si la CLI toca `package.json`/`package-lock.json`, entran aquí).
- **P3** Fecha y formato con tests — archivos: `src/lib/date-time.ts`, `src/lib/date-time.test.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`.
- **P4** Contratos, datos, service, rutas y filtro con tests — archivos: `src/modules/events/types/event.types.ts`, `src/modules/events/data/event-categories.ts`, `src/modules/events/data/events.mock.ts`, `src/modules/events/services/events.service.ts`, `src/modules/events/services/events.service.test.ts`, `src/modules/events/utils/event-routes.ts`, `src/modules/events/utils/event-filters.ts`, `src/modules/events/utils/event-filters.test.ts`.
- **P5** Encabezado de sección compartido — archivos: `src/components/shared/section-header.tsx`.

### Paralelo (archivos disjuntos; dependen de P1–P5)
- **T1** Tarjeta (desktop y móvil) — archivos: `src/modules/events/components/event-card.tsx`.
- **T2** Tiles de categoría — archivos: `src/modules/events/components/event-category-tiles.tsx`.
- **T3** Bloque de descubrimiento (estado, dos secciones, chips, región viva, lista, estado vacío) — archivos: `src/modules/events/components/event-discovery.tsx`, `src/modules/events/components/event-discovery-section.tsx`. Importa `EventCard` y `EventCategoryTiles` por su contrato.

Durante el bloque paralelo nadie ejecuta `npm install` ni `npm run build`.

### Integración (serie)
- **I1** Composición, limpieza y test — archivos: `src/app/page.tsx` (`<Hero />` + `<EventDiscoverySection />`), eliminar `src/components/shared/categories-section.tsx`, crear `src/modules/events/components/event-discovery.test.tsx`.

## Criterios de aceptación

**Calidad**
- [ ] AC1 `npm run lint`, `npm run test` y `npm run build` pasan.
- [ ] AC2 `src/modules/events` tiene solo `types/`, `data/`, `services/`, `utils/`, `components/`. Grep: `events.mock` solo se importa en `events.service.ts`. No existe `src/components/shared/categories-section.tsx` ni `event-period.ts`.
- [ ] AC3 Los exports coinciden con C2–C9. `EventItem` no contiene `Date` ni funciones.
- [ ] AC4 No se modificaron `site-header.tsx`, `site-footer.tsx`, `search-topbar.tsx`, `hero.tsx`, `src/hooks/**`, `layout.tsx`, `next.config.ts` ni `src/components/ui/button.tsx`.

**Paleta**
- [ ] AC5 En claro, los valores computados (DevTools) de `--primary`, `--cta`, `--cta-foreground`, `--price`, `--urgent`, `--urgent-foreground`, `--foreground`, `--muted-foreground`, `--border` y `--secondary` equivalen a los hex de C1.1 (±2 por canal). En oscuro, a los de la columna `.dark`.
- [ ] AC6 `--accent` es neutro: al navegar con teclado un `Select` existente (buscador de la 002), la opción enfocada no se ve naranja.
- [ ] AC7 `docs/design/design-system.md` ya no dice que el acento cálido está reservado a urgencia: contiene la regla C1.5, los tokens `cta`/`price`/`urgent`, los 16 tintes de categoría, la tabla de contraste y `focus-ring`.

**Datos y lógica**
- [ ] AC8 `EVENTS_MOCK` tiene los 10 eventos de C5 con todos sus campos; slugs e ids únicos; todos los `startsAt` y `doorsOpenAt` con `-05:00` y `doorsOpenAt < startsAt`. `isFeatured` exactamente en evt-001, 002, 003, 004 y 007. `availability`: `last-tickets` en evt-001 y evt-003, `sold-out` en evt-006, `available` en el resto. `seatSelection === "seat"` exactamente en evt-001 y evt-004.
- [ ] AC9 `filterUpcomingEvents` devuelve los conjuntos de C8 (cubierto por test).

**UI (manual, `npm run dev`, `/`)**
- [ ] AC10 Tras el Hero aparece "Explora por categoría" con el subtítulo exacto y 8 tiles en el orden de C4, cada uno con fondo de tinte, cuadro con icono de color y label.
- [ ] AC11 A 1280 px los 8 tiles están en una fila; a 768 px en una grilla de 4×2; a 375 px en una fila con scroll horizontal y snap, sin scroll horizontal de la página.
- [ ] AC12 "Próximos eventos" tiene fondo `bg-secondary`, el subtítulo exacto, el link "Ver calendario completo" (desde 768 px) y el grupo `role="group"` "Filtrar por categoría" con 9 chips ("Todos" activo al cargar). Se ven 8 tarjetas (evt-001…evt-008) ordenadas por fecha.
- [ ] AC13 Pulsar el tile "Conciertos": su `aria-pressed` pasa a `"true"` con borde índigo, el chip "Conciertos" queda activo y hay 4 tarjetas. Pulsar de nuevo el tile: vuelve a "Todos" (8). Pulsar el chip "Teatro": el tile "Teatro" queda `aria-pressed="true"` y hay 1 tarjeta. La región viva anuncia "1 evento".
- [ ] AC14 Chip "Cine": se ve el estado vacío "Todavía no hay eventos de Cine", la descripción y el botón "Ver todos los eventos"; al pulsarlo vuelven las 8 tarjetas y "Todos" queda activo.
- [ ] AC15 Tarjeta desktop (≥ 640 px): imagen de 184 px con `alt`, badge de fecha "OCT"/"03", eyebrow "CONCIERTOS" en índigo, título, "Teatro Municipal · Lima", `<time dateTime="2026-10-03T20:00:00-05:00">sáb 3 oct</time>`, perforación punteada con dos muescas, "Desde $45" en color precio y "Ver entradas". Noche de Rock Sinfónico y Festival Sonidos del Sur muestran "Últimas entradas" con tinte suave e icono de reloj. Electro Night Sessions muestra el badge oscuro "Agotado" y "Agotado" en el pie en lugar de "Ver entradas".
- [ ] AC16 Tarjeta a 375 px: horizontal de 132 px de alto, imagen de 108 px a la izquierda con el badge de fecha, perforación vertical, eyebrow + badge de estado, título, lugar · ciudad y "Desde" + precio, sin botón. Los chips están en una fila con scroll horizontal.
- [ ] AC17 Cada tarjeta tiene un único elemento enfocable (el link del título, a `/events/<slug>`, nombre accesible = título) y hacer clic en cualquier punto de la tarjeta navega allí. Con foco visible, la tarjeta muestra el outline de 3 px.
- [ ] AC18 Teclado: Tab recorre tiles, link "Ver calendario completo", chips, tarjetas y link final, todos con indicador de foco visible (outline `--ring`) en claro y oscuro; Enter/Espacio activan tiles y chips.
- [ ] AC19 Contraste AA (inspector de DevTools, claro y oscuro): subtítulos, eyebrow, metadatos, "Desde", precio, chips activo e inactivo, badges "Últimas entradas" y "Agotado", labels de tiles y texto del estado vacío ≥ 4.5:1.
- [ ] AC20 Con `prefers-reduced-motion: reduce`, ni tarjetas ni tiles se desplazan en hover. La consola no muestra errores ni warnings de hidratación en claro ni en oscuro.

## Tests obligatorios

- `src/lib/date-time.test.ts` — `"2026-10-03T20:00:00-05:00"` → `{ 2026, 10, 3, weekday 6, 20, 0 }`; `"2026-11-01T03:00:00Z"` → 31 oct, sábado, 22:00; medianoche local → `hour: 0`; `Date` y `string` dan lo mismo.
- `src/lib/format.test.ts` — `formatPrice`: `45` → `"$45"`, `45.5` → `"$45.50"`, `1200` → `"$1,200"`, `0` → `"$0"`. `formatDateShort`: `"2026-10-03T20:00:00-05:00"` → `"sáb 3 oct"`; `"2026-10-22T19:30:00-05:00"` → `"jue 22 oct"`; `"2026-10-04T01:00:00Z"` → `"sáb 3 oct"` (zona). `formatDateBadge`: → `{ month: "OCT", day: "03" }`; `"2026-12-05T11:00:00-05:00"` → `{ month: "DIC", day: "05" }`.
- `src/modules/events/services/events.service.test.ts` — `getAll` = 10 en orden; ids y slugs únicos; offsets ISO; toda `category` ∈ `EVENT_CATEGORIES`; `doorsOpenAt < startsAt`; `getBySlug` existente → evento, inexistente → `null`; `getFeatured` → [001, 002, 003, 004, 007]; `getUpcoming()` → 10; `getUpcoming(new Date("2026-10-24T21:00:00-05:00"))` incluye evt-005 y devuelve 6; fecha posterior al último → `[]`; mutar un resultado no afecta la siguiente llamada.
- `src/modules/events/utils/event-filters.test.ts` — los 9 casos de C8 con el mock; con 12 eventos de prueba de una categoría devuelve 8; no muta la entrada; conserva el orden.
- `src/modules/events/components/event-discovery.test.tsx` (RTL + `user-event`; se puede mockear `next/image`):
  - Render inicial: 8 `article`, chip "Todos" `aria-pressed="true"`, ningún tile presionado.
  - Clic en el tile "Conciertos" → 4 `article`, tile y chip "Conciertos" presionados, región viva "4 eventos"; segundo clic en el tile → 8 y "Todos" activo.
  - Clic en el chip "Cine" → texto "Todavía no hay eventos de Cine", 0 `article`; clic en "Ver todos los eventos" → 8.
  - Cada link de tarjeta tiene `href="/events/<slug>"` y nombre accesible igual al título.
  - La tarjeta de evt-006 contiene el texto "Agotado"; las de evt-001 y evt-003, "Últimas entradas".
- **Sin test propio:** `EventCard`, `EventCategoryTiles`, `SectionHeader` (presentacionales, cubiertos por el test de `EventDiscovery`), `EventDiscoverySection` (composición), tipos, categorías y mock (validados por el test del service), `page.tsx`.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build`
- Manual (`npm run dev`, `/`), a 375, 768, 1024 y 1280 px, en claro y oscuro: AC5–AC6 (computed styles y `Select` del buscador de la 002), AC10–AC20 (tiles, chips, tarjetas, estado vacío con "Cine", recorrido con Tab, inspector de contraste, `prefers-reduced-motion` en Rendering, consola).
