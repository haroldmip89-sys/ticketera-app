# 009 — Búsqueda y listado de eventos (`/events`)

- **Estado:** done (APPROVED por reviewer en iteración 1)
- **Modo:** SDD
- **Módulo(s):** `src/modules/events` (búsqueda: utils, componentes, vista). Transversal: `src/components/ui` (shadcn `checkbox`, `radio-group`, `label`), `src/components/shared` (`ToggleChip` nuevo, `site-header.tsx`), `src/app/(site)/events/page.tsx` (ruta nueva).
- **Diseño fuente:** `docs/design/reference-design.md` §1 (sistema visual) y §2.3 (pantallas `Search` / `SearchMobile`). Los detalles que §2.3 no recoge se transcriben en la sección "Diseño transcrito" de esta spec (la copia local del lienzo no es durable).

**Roadmap:** 003 paleta + events + descubrimiento · 004 shell · 005 Hero · 006 detalle · 007 selección por zonas · 008 mapa de teatro · **009 búsqueda (esta)** · 010 checkout + confirmación · 011 login/registro · 012 Mis entradas · 013 panel de organizador · 014 crear evento. Orden de implementación: 009 → 010 → 011.

## Objetivo

Crear la página `/events` ("Explora eventos") con buscador, filtros (categoría, ciudad, mes y precio), orden (Fecha | Precio más bajo), chips de filtros activos, conteo accesible y estado vacío, en desktop y móvil, sobre los datos mock. El estado vive en la URL (query params). El buscador de la landing navega a `/events?…` y los links de la landing, del header y del detalle que hoy apuntan a `#` o a `/#eventos` pasan a `/events`. Al terminar, el proyecto queda en verde (lint, test, build).

## Fuera de alcance

- **Ciudades y zonas horarias de EE. UU.** (system design §11): el mock sigue con Lima y Arequipa y `America/Lima`. **No se modifica** `events.mock.ts`. Pendiente para el seed de la base.
- **Búsqueda real en backend** (`eventsService.search(filters)`, filtrado en servidor/SQL, índices de texto completo). Cuando exista la base, el filtrado pasa al service y la página lo invoca con los `searchParams` (el contrato de params de esta spec se mantiene).
- **Paginación** o "Cargar más" (el mock tiene 10 eventos).
- **Conteos facetados** (que el conteo de cada opción cambie según los demás filtros): el diseño muestra conteos fijos sobre el total.
- Filtro por **día exacto** (la fecha del buscador se traduce a mes; ver D4) y rango de precio libre (slider).
- Autocompletado, sugerencias y búsqueda en vivo al teclear (el texto se aplica al pulsar "Buscar").
- `aria-current="page"` en el link "Eventos" del header (necesita convertir el header en client component con `usePathname`). Fase futura de navegación.
- Chips de filtros activos en móvil (el diseño móvil no los muestra; ver D9).
- Categorías dentro del panel de filtros móvil (en móvil van como chips, como en el diseño).
- Aside sticky, persistencia de filtros (localStorage), `loading.tsx` o skeletons.
- Moneda: se mantiene `$` (`formatPrice`, USD según el system design). El diseño usa `S/`.
- Links del footer (siguen en `#`).

## Tamaño y por qué no se parte

La spec toca **20 archivos**, más que el ~15 recomendado. **No se parte** por lo siguiente:

- 3 los genera la CLI de shadcn (`checkbox`, `radio-group`, `label`) y no se escriben a mano.
- 3 son cambios de un solo `href` (`event-detail-hero.tsx`, `event-detail-view.tsx`, `site-header.tsx`).
- `event-routes.ts` + su test suman una función de una línea y tres casos.
- Lo sustancial son 11 archivos: utils + test, `ToggleChip`, 3 componentes, la vista + test, el formulario + test y la página.

Si se partiera, una spec entera (con su aprobación, developer y reviewer) solo serviría para cambiar 4 `href`, y mientras tanto la landing seguiría con links muertos aunque `/events` ya exista. Si el usuario prefiere partir, ver la pregunta abierta Q1.

## Inventario (existente vs. nuevo)

| Pieza | Acción | Ubicación | Notas |
|---|---|---|---|
| `Button` | reutilizar | `src/components/ui/button.tsx` | "Limpiar filtros", pie del panel. |
| `Badge` | reutilizar | `src/components/ui/badge.tsx` | Contador del botón "Filtros" en móvil. |
| `Empty` (+ `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription`, `EmptyContent`) | reutilizar | `src/components/ui/empty.tsx` | Estado vacío, mismo patrón que `EventDiscovery`. |
| `Sheet` (+ `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetFooter`, `SheetTrigger`) | reutilizar | `src/components/ui/sheet.tsx` | Panel de filtros a pantalla completa (Base UI Dialog: atrapa el foco y lo devuelve al trigger). Sin modificar el primitivo: el tamaño se ajusta con `className`. |
| `Checkbox` | agregar de shadcn | `src/components/ui/checkbox.tsx` | `npx shadcn@latest add checkbox`. Existe en base-nova (`@base-ui/react/checkbox`). También lo usarán 010/011. |
| `RadioGroup`, `RadioGroupItem` | agregar de shadcn | `src/components/ui/radio-group.tsx` | `npx shadcn@latest add radio-group`. Existe en base-nova. |
| `Label` | agregar de shadcn | `src/components/ui/label.tsx` | `npx shadcn@latest add label`. Envuelve cada fila de checkbox/radio (Base UI asocia el `aria-labelledby` automáticamente cuando el control está dentro de un `<label>`). También lo usarán 010/011. |
| `toggle-group` / `toggle` | **descartado** | — | El orden ("Fecha \| Precio más bajo") y los chips se resuelven con `<button aria-pressed>`, igual que los chips existentes de la landing. Sumaría 2 archivos sin ganar nada (YAGNI). |
| `ToggleChip` | crear (extraer) | `src/components/shared/toggle-chip.tsx` | Chip `aria-pressed` de 44 px. Hoy está inline en `event-discovery.tsx` y ahora lo necesitan dos lugares (chips de la landing y chips de categoría móviles de `/events`): se extrae (DRY). |
| `EventCard` (variante `ticket`) | reutilizar sin cambios | `src/modules/events/components/event-card.tsx` | Ya es **horizontal por debajo de `sm`** (132 px de alto, imagen de 108 px, perforación vertical) y vertical desde `sm`, como pide el diseño. Las muescas usan `bg-secondary`, igual que el fondo de resultados (D13 de la 003): encajan. |
| `EventSearchForm` | extender | `src/modules/events/components/event-search-form.tsx` | Prop opcional `filters`; al enviar navega con `router.push(getEventsSearchHref(…))`. `PRICE_RANGES` se traslada a `event-search.ts` sin cambios de valores ni labels. |
| `PRICE_RANGES` | mover | de `event-search-form.tsx` a `src/modules/events/utils/event-search.ts` | Única fuente de verdad para el `Select` del buscador y los radios "Precio desde". |
| `EventDiscovery` | extender (links + `ToggleChip`) | `src/modules/events/components/event-discovery.tsx` | "Ver calendario completo" y "Ver todos los eventos" → `/events`. Los chips pasan a `ToggleChip`. El conteo usa `formatEventCount`. |
| `EventDetailHero` | extender (hrefs) | `src/modules/events/components/event-detail-hero.tsx` | `EVENTS_HREF` ("Volver a eventos") → `/events`. Breadcrumb de categoría → `/events?category=<id>`. |
| `EventDetailView` | extender (href) | `src/modules/events/components/event-detail-view.tsx` | "Ver más {categoría}" → `/events?category=<id>`. |
| `siteNavLinks` | extender (href) | `src/components/shared/site-header.tsx` | "Eventos": `/#eventos` → `/events`. `SiteMobileMenu` recibe los mismos links (sin cambios propios). |
| `getEventsSearchHref` | crear | `src/modules/events/utils/event-routes.ts` | Junto a los demás constructores de rutas. |
| `event-search.ts` (contrato de params, parse/serialize, filtrado, orden, opciones, chips) | crear | `src/modules/events/utils/event-search.ts` | Funciones puras. Mismo patrón que `ticket-selection.ts` (tipos + utils en `utils/`). |
| `filterUpcomingEvents` / `EventCategoryFilter` | no se toca | `src/modules/events/utils/event-filters.ts` | Es otra cosa: el filtro de una sola categoría con límite 8 de la landing. |
| `eventsService.getUpcoming()` | reutilizar | `src/modules/events/services/events.service.ts` | Fuente de la página (10 eventos con el mock). |
| `EVENT_CATEGORIES` | reutilizar | `src/modules/events/data/event-categories.ts` | Orden y labels de categorías. |
| `getZonedDateParts`, `APP_TIME_ZONE` | reutilizar | `src/lib/date-time.ts` | Mes de cada evento en `America/Lima`. |
| `EventSearchFilters` (fieldsets) | crear | `src/modules/events/components/event-search-filters.tsx` | Lo usan el aside de desktop y el panel móvil (DRY), con densidad `default`/`touch`. |
| `EventSearchFiltersSheet` | crear | `src/modules/events/components/event-search-filters-sheet.tsx` | Botón "Filtros" con contador + panel a pantalla completa. |
| `EventSearchResults` | crear | `src/modules/events/components/event-search-results.tsx` | Conteo `aria-live`, chips removibles, orden segmentado, grid, estado vacío. |
| `EventSearchView` | crear | `src/modules/events/components/event-search-view.tsx` | Contenedor client: lee y escribe la URL y compone la página. |
| `useSearchParams`, `useRouter` | reutilizar (Next) | `next/navigation` | Sin hook propio: la sincronización con la URL son 2 líneas en la vista (KISS). |
| Página `/events` | crear | `src/app/(site)/events/page.tsx` | Solo composición. |

## Decisiones

- **D1 — Filtrado en el cliente; la URL es la única fuente de verdad.**
  - La página (server) obtiene `eventsService.getUpcoming()` y se los pasa a `EventSearchView`.
  - La vista lee los filtros con `useSearchParams()` → `parseEventSearchParams` y filtra en memoria.
  - Cada cambio de filtro u orden escribe la URL con `window.history.replaceState(null, "", getEventsSearchHref(next))`. Next integra `replaceState` con `useSearchParams` (docs: *Linking and Navigating → window.history.replaceState*), así que no hay viaje al servidor ni estado duplicado.
  - Justificación (KISS): son 10 eventos que ya están en el cliente. Filtrar en el servidor con `router.replace` costaría un ida y vuelta RSC por cada checkbox.
- **D2 — Página dinámica con `await connection()`.**
  - La página llama a `await connection()` (de `next/server`) antes de obtener los datos. Así se renderiza por petición y `useSearchParams` tiene valor en el SSR, por lo que el HTML inicial de `/events?category=theater` ya trae los resultados filtrados.
  - Esto evita el `<Suspense>` obligatorio de una página prerenderizada (docs de `useSearchParams` → *Prerendering*), cuyo fallback dejaría los resultados fuera del HTML inicial.
  - No se usa la prop `searchParams` de la página: la vista ya lee la URL y pasarla sería duplicar.
- **D3 — `replaceState` y no `pushState` para filtros y orden.** "Atrás" vuelve a la página anterior y no deshace un checkbox a la vez. El envío del buscador sí usa `router.push` (es una navegación).
- **D4 — La fecha del buscador (un día del `Calendar`) se traduce a mes.**
  - Al enviar con una fecha elegida, se escribe `month=YYYY-MM` con el año y el mes **locales** del `Date` (`getFullYear()`, `getMonth() + 1`), coherente con D8 de la 004 (el `Calendar` devuelve medianoche local).
  - Motivo: el aside filtra por mes. Un filtro por día sería un sexto filtro que no está en el diseño (ver Q2).
- **D5 — `PRICE_RANGES` existente (en `$`) en lugar de los rangos del diseño (`S/`).**
  - Se alinea con el buscador de la 004 y con la moneda USD del system design.
  - Semántica sobre `priceFrom`:

    | Valor | Condición sobre `priceFrom` |
    |---|---|
    | `any` | sin filtro |
    | `free` | `p === 0` |
    | `0-50` | `0 <= p <= 50` |
    | `50-100` | `50 < p <= 100` |
    | `100-200` | `100 < p <= 200` |
    | `200+` | `p > 200` |

- **D6 — Conteos fijos sobre el total** de eventos recibidos, como en el diseño. Se muestran todas las categorías, también las de conteo 0 (Cine), habilitadas.
- **D7 — Las ciudades salen de los eventos** (distintas por `venue.city`), ordenadas por conteo descendente y, a igual conteo, alfabéticamente (`localeCompare(…, "es")`). Con el mock: Lima (8), Arequipa (2).
- **D8 — Los meses salen de los eventos.**
  - Meses distintos de `startsAt` en `America/Lima`, en orden cronológico. El label es el mes largo en español con mayúscula inicial ("Octubre").
  - Si las opciones abarcan más de un año, todas llevan año ("Octubre 2026", "Enero 2027").
  - Si la URL trae un mes válido sin eventos, se agrega a las opciones en su orden cronológico, para que el radio y el chip reflejen el estado.
  - El label se calcula con `Intl.DateTimeFormat("es", { month: "long" })` sobre una fecha UTC del día 1. No se tocan `src/lib/format.ts` ni `src/lib/date-time.ts`.
- **D9 — Chips de filtros activos solo desde `lg`**, como el diseño (en móvil no existen). En móvil, el estado activo se ve en los chips de categoría (presionados), en el contador del botón "Filtros" y en el texto del buscador.
- **D10 — Búsqueda de texto.**
  - Sin distinguir mayúsculas ni acentos (minúsculas + NFD sin diacríticos).
  - Es una coincidencia por subcadena del texto completo (trim) sobre `title`, `venue.name` y `venue.city`.
  - El placeholder "Artista, evento o ciudad" se mantiene.
  - El texto activo aparece como chip `“{q}”` (desktop). "Limpiar" y "Limpiar filtros" también lo borran.
- **D11 — El layout cambia en `lg` (1024 px), no en `sm`.**
  - Por debajo de `lg` se usa el layout móvil del diseño: botones "Filtros" y "Orden", chips de categoría y panel a pantalla completa.
  - Desde `lg` se usan el aside de 288 px y el orden segmentado.
  - Grid de tarjetas: 1 columna (tarjeta horizontal) por debajo de `sm`, 2 columnas de `sm` a `xl` y 3 columnas desde `xl`. Con aside, 3 columnas a 1024 px dejarían tarjetas de ~210 px.
- **D12 — Destinos de los links.**
  - "Ver calendario completo" y "Ver todos los eventos" (landing), "Volver a eventos" (detalle móvil) y "Eventos" (header) → `/events`.
  - Breadcrumb de categoría y "Ver más {categoría}" del detalle → `/events?category=<id>`.
  - El botón "Ver todos los eventos" del **estado vacío** de la landing sigue reseteando el filtro local (no navega).

## Contratos

### Parámetros de URL de `/events`

| Param | Formato | Múltiple | Default (se omite al serializar) | Parse tolerante |
|---|---|---|---|---|
| `q` | texto libre | no (primer valor) | `""` | `trim`, se corta a `EVENT_SEARCH_QUERY_MAX_LENGTH` (100) caracteres; vacío → `""`. |
| `category` | `EventCategoryId` (`concerts`, `theater`, …) | sí, claves repetidas (`?category=concerts&category=theater`) | `[]` | Se descartan los ids desconocidos (comparación exacta); sin duplicados; salida en el orden de `EVENT_CATEGORIES`. |
| `city` | nombre de ciudad tal cual (`Lima`) | sí, claves repetidas | `[]` | `trim`; se descartan los vacíos; sin duplicados; se conserva el orden de aparición. No se valida contra las ciudades existentes: una desconocida da 0 resultados y su chip permite quitarla. |
| `month` | `YYYY-MM` (`/^\d{4}-(0[1-9]\|1[0-2])$/`) | no (primer valor) | `null` | Formato inválido → `null`. |
| `price` | valor de `PRICE_RANGES` | no (primer valor) | `"any"` | Desconocido → `"any"`. |
| `sort` | `date` \| `price` | no (primer valor) | `"date"` | Desconocido → `"date"`. |

- Los params desconocidos se ignoran. El parse **nunca lanza**.
- Serialización: `URLSearchParams` en el orden `q`, `category…`, `city…`, `month`, `price`, `sort`, omitiendo los defaults. Si todo es default → `""`.
- Ejemplos:
  - `getEventsSearchHref({ query: "rock", categories: ["theater", "concerts"], price: "0-50", sort: "price" })` → `/events?q=rock&category=concerts&category=theater&price=0-50&sort=price`.
  - `{ cities: ["Ciudad de México"] }` → `/events?city=Ciudad+de+M%C3%A9xico`.

### `src/modules/events/utils/event-search.ts`

```ts
import type { EventCategoryId, EventItem } from "@/modules/events/types/event.types"

export const PRICE_RANGES = [
  { value: "any", label: "Cualquier precio" },
  { value: "free", label: "Gratis" },
  { value: "0-50", label: "$0 - $50" },
  { value: "50-100", label: "$50 - $100" },
  { value: "100-200", label: "$100 - $200" },
  { value: "200+", label: "Más de $200" },
] as const
export type PriceRangeValue = (typeof PRICE_RANGES)[number]["value"]

export type EventSort = "date" | "price"
export const EVENT_SORT_OPTIONS: readonly { value: EventSort; label: string }[] // [{date,"Fecha"},{price,"Precio más bajo"}]

export const EVENT_SEARCH_QUERY_MAX_LENGTH = 100

export type EventSearchFilters = {
  query: string
  categories: EventCategoryId[]
  cities: string[]
  /** "YYYY-MM" o null (cualquier fecha). */
  month: string | null
  price: PriceRangeValue
  sort: EventSort
}
export const DEFAULT_EVENT_SEARCH_FILTERS: EventSearchFilters // { query:"", categories:[], cities:[], month:null, price:"any", sort:"date" }

export type CategoryOption = { id: EventCategoryId; label: string; count: number }
export type CityOption = { city: string; count: number }
export type MonthOption = { value: string; label: string }
/** Chip removible. filtersWithout = filtros sin este (mismo sort). */
export type ActiveFilter = { id: string; label: string; filtersWithout: EventSearchFilters }

/** Lectura mínima compatible con URLSearchParams y ReadonlyURLSearchParams. */
export type SearchParamsReader = Pick<URLSearchParams, "get" | "getAll">

/** Ver tabla de params. Nunca lanza. */
export function parseEventSearchParams(params: SearchParamsReader): EventSearchFilters
/** Query string sin "?" (ver tabla). Todo default → "". */
export function serializeEventSearchParams(filters: EventSearchFilters): string

/** Aplica q, categorías (OR), ciudades (OR), mes y precio (AND entre grupos) y ordena:
 *  "date" → startsAt asc; "price" → priceFrom asc y, a igual precio, startsAt asc. Array nuevo, no muta. */
export function filterEvents(events: readonly EventItem[], filters: EventSearchFilters): EventItem[]

/** Las 8 de EVENT_CATEGORIES en su orden, con conteo sobre `events` (D6). */
export function getCategoryOptions(events: readonly EventItem[]): CategoryOption[]
/** D7. */
export function getCityOptions(events: readonly EventItem[]): CityOption[]
/** D8. No incluye "Cualquier fecha" (lo agrega la UI). */
export function getMonthOptions(events: readonly EventItem[], selectedMonth: string | null): MonthOption[]

/** Orden: q, categorías (orden de EVENT_CATEGORIES), ciudades (orden de filters), mes, precio.
 *  Labels: `“{q}”`, label de categoría, ciudad, label de MonthOption (o el valor si no está en monthOptions), label de PRICE_RANGES.
 *  ids: "q", "category:<id>", "city:<nombre>", "month", "price". */
export function getActiveFilters(filters: EventSearchFilters, monthOptions: readonly MonthOption[]): ActiveFilter[]

/** Contador del botón "Filtros" (móvil): cities.length + (month ? 1 : 0) + (price !== "any" ? 1 : 0). */
export function countPanelFilters(filters: EventSearchFilters): number
/** Todo a default salvo sort ("Limpiar" del aside y "Limpiar filtros"). */
export function clearAllFilters(filters: EventSearchFilters): EventSearchFilters
/** cities [], month null, price "any"; conserva query, categories y sort ("Limpiar" del panel móvil). */
export function clearPanelFilters(filters: EventSearchFilters): EventSearchFilters
/** Quita el valor si está y lo agrega al final si no. Array nuevo. */
export function toggleValue<T>(list: readonly T[], value: T): T[]
/** (2026, 3) → "2026-03". */
export function formatMonthValue(year: number, month: number): string
/** 1 → "1 evento"; 0 y n > 1 → "{n} eventos". */
export function formatEventCount(count: number): string
```

### `src/modules/events/utils/event-routes.ts` (agregar)

```ts
/** "/events" + ("?" + serializeEventSearchParams({ ...DEFAULT_EVENT_SEARCH_FILTERS, ...filters }) si no es ""). */
export function getEventsSearchHref(filters?: Partial<EventSearchFilters>): string
```

### Componentes

```ts
// src/components/shared/toggle-chip.tsx — sin lógica de dominio
export type ToggleChipProps = Omit<React.ComponentProps<"button">, "type" | "aria-pressed"> & { pressed: boolean }
export function ToggleChip(props: ToggleChipProps): JSX.Element
// <button type="button" aria-pressed={pressed}> con las clases exactas del chip actual de event-discovery.tsx
// (base: "h-11 shrink-0 rounded-full border-[1.5px] px-4 text-sm whitespace-nowrap focus-ring";
//  activo: "border-foreground bg-foreground font-semibold text-background";
//  inactivo: "border-input bg-card font-medium text-foreground"); className se mezcla con cn.
// EventDiscovery le pasa className="md:px-[18px]" para no cambiar su aspecto.

// src/modules/events/components/event-search-filters.tsx (client)
export type EventSearchFiltersProps = {
  filters: EventSearchFilters
  cityOptions: readonly CityOption[]
  monthOptions: readonly MonthOption[]
  /** Si se omite, no se renderiza el fieldset "Categoría" (panel móvil). */
  categoryOptions?: readonly CategoryOption[]
  /** "default" = aside desktop (filas de 38 px); "touch" = panel móvil (filas de 44 px). */
  size?: "default" | "touch"
  onFiltersChange: (next: EventSearchFilters) => void
  className?: string
}

// src/modules/events/components/event-search-filters-sheet.tsx (client) — botón "Filtros" + Sheet; maneja su propio open
export type EventSearchFiltersSheetProps = {
  filters: EventSearchFilters
  cityOptions: readonly CityOption[]
  monthOptions: readonly MonthOption[]
  resultCount: number
  onFiltersChange: (next: EventSearchFilters) => void
}

// src/modules/events/components/event-search-results.tsx
export type EventSearchResultsProps = {
  /** Ya filtrados y ordenados. */
  events: readonly EventItem[]
  activeFilters: readonly ActiveFilter[]
  sort: EventSort
  onSortChange: (sort: EventSort) => void
  /** Quitar un chip llama a onFiltersChange(chip.filtersWithout). */
  onFiltersChange: (next: EventSearchFilters) => void
  onClearFilters: () => void
}

// src/modules/events/components/event-search-view.tsx (client)
export type EventSearchViewProps = { events: EventItem[] }

// src/modules/events/components/event-search-form.tsx (client) — firma extendida
export type EventSearchFormProps = {
  className?: string
  /** Filtros vigentes (en /events). Inicializa query y price; al enviar conserva categories, cities, sort y month (si no se eligió fecha). Default: DEFAULT_EVENT_SEARCH_FILTERS. */
  filters?: EventSearchFilters
}
```

**Envío de `EventSearchForm`:**
- `preventDefault()` y después `router.push(getEventsSearchHref({ ...filters, query: query.trim(), price, month: date ? formatMonthValue(date.getFullYear(), date.getMonth() + 1) : filters.month }))`.
- El estado local inicial es `query = filters.query`, `price = filters.price` y `date = undefined`.
- En `/events` la vista lo renderiza con `key={`${filters.query}|${filters.price}|${filters.month ?? ""}`}` para que el estado local se reinicie cuando la URL cambia por otra vía (p. ej. al quitar un chip).

### Página

```tsx
// src/app/(site)/events/page.tsx
export const metadata: Metadata = {
  title: "Explora eventos — Ticketera",
  description: "Busca y filtra conciertos, deportes, teatro y más por categoría, ciudad, fecha y precio.",
}
export default async function EventsPage() {
  await connection()                                  // D2
  const events = await eventsService.getUpcoming()
  return <EventSearchView events={events} />
}
```

## Diseño transcrito

Valores en px del lienzo → clases Tailwind/tokens. Neutros y acentos mediante tokens (`bg-background`, `bg-secondary`, `bg-card`, `border-border`, `border-input`, `text-muted-foreground`, `text-primary`, `bg-foreground`/`text-background`), nunca hex.

### Estructura común

1. **Cabecera de página** (`bg-background border-b border-border`): contenedor `max-w-7xl px-4 sm:px-6 lg:px-8`.
   - Móvil: padding `20px 16px 18px`, gap 14 px. Desktop: padding `36px 80px 32px` (= `lg:pt-9 lg:pb-8`), gap 20 px.
   - **h1 "Explora eventos"**: 28 px / 1.15 / 700 / -0.025em en móvil y 36 px / 1.1 / 700 / -0.025em desde `lg`.
   - Debajo va `EventSearchForm` a todo el ancho del contenedor (`className` con `mt-0 lg:w-full` para anular el `lg:w-[42rem]` y el `mt-1.5` de la landing). El buscador conserva su aspecto actual: móvil 56 px con "Buscar"; desktop 76 px con "Qué quieres ver" | "Fecha" | "Precio" | "Buscar" naranja.
   - En móvil (`lg:hidden`) le sigue la **barra de botones** (ver Móvil).
2. **Zona de resultados** (`bg-secondary`, el `#F4F4F5` del lienzo): contenedor `max-w-7xl`.

### Desktop (`lg` en adelante; lienzo de 1440 px)

- **Grid** `grid-cols-[18rem_minmax(0,1fr)]`, gap 40 px (`gap-10`), `items-start`, padding `32px 0 80px` (`pt-8 pb-20`).
- **Aside** (`<aside aria-labelledby>` apuntando al h2):
  - Contenedor: `rounded-[22px] border border-border bg-card`, padding `8px 24px 24px`.
  - Cabecera de 60 px (`h-15`) con `border-b border-border`, `justify-between`:
    - **h2 "Filtros"**, 16 px / 600, con el icono `SlidersHorizontal` de 18 px (`aria-hidden`) y gap de 8 px.
    - **Botón "Limpiar"**, solo si `activeFilters.length > 0`: alto 44 px, padding 0 4 px, `text-primary` 14 px / 600, sin fondo, `focus-ring`, hover `text-primary/80`. Llama a `clearAllFilters`.
  - **4 fieldsets** (`EventSearchFilters size="default"`), cada uno con padding vertical 18 px y `border-b border-border` (el último sin borde ni padding inferior):
    - **legend** 14 px / 600, padding inferior 10 px.
    - **Filas** de 38 px: `Label` flex, gap 12 px, 14 px, `cursor-pointer`. Llevan un control de 18 px y el texto (`flex-1`). En los checkboxes se suma el conteo: 13 px, `text-muted-foreground`, `tabular-nums`, `aria-hidden`, más un texto `sr-only` "(N eventos)" o "(1 evento)". Nombre accesible resultante: "Conciertos (4 eventos)".
    - Los fieldsets son:
      1. "Categoría": `Checkbox` × 8.
      2. "Ciudad": `Checkbox` × ciudades.
      3. "Fecha": `RadioGroup` con "Cualquier fecha" (valor `any` = `month: null`) + meses.
      4. "Precio desde": `RadioGroup` con las 6 opciones de `PRICE_RANGES`.
    - Cada `RadioGroup` lleva `aria-labelledby` apuntando a su legend.
- **Resultados** (`<section aria-labelledby>` con un `<h2 class="sr-only">Resultados</h2>`), columna con gap 20 px:
  - **Fila superior**: `min-h-11`, `justify-between`, gap 24 px.
    - **A la izquierda** (flex-wrap, gap 8 px):
      - El conteo es un `<p aria-live="polite">` con `formatEventCount(n)`, 16 px / 600, margen derecho 8 px.
      - Después van los chips removibles (`hidden lg:flex`, D9): `<button>` de 36 px de alto, padding `0 10px 0 14px`, gap 6 px, `rounded-full border border-primary/30 bg-primary/10 text-primary`, 13 px / 500.
      - Cada chip tiene el texto + el icono `X` de 14 px (`aria-hidden`) y `aria-label="Quitar filtro {label}"`.
      - Tinte índigo sin token propio → tokens con opacidad, según D6 de la 004.
    - **A la derecha**: "Ordenar por" (14 px, `text-muted-foreground`, con `id`) + un grupo `role="group"` con `aria-labelledby` a ese texto. El grupo es un contenedor con padding 4 px, gap 4 px, `border border-border rounded-[14px] bg-card` y 2 botones `aria-pressed`, "Fecha" y "Precio más bajo": alto 40 px, padding 0 16 px, `rounded-[10px]`, 14 px / 600, `focus-ring`. El activo es `bg-foreground text-background` y el inactivo `bg-transparent text-foreground`. El orden segmentado es `hidden lg:flex`.
  - **Grid**: `grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3`, con un `EventCard` (variante por defecto) por evento.
  - **Estado vacío** (en lugar del grid): `Empty` con `rounded-[22px] lg:rounded-3xl border-[1.5px] border-dashed border-input bg-card px-5 py-12 lg:px-6 lg:py-18`.
    - **Media**: `size-13 rounded-2xl lg:size-14 lg:rounded-[18px] bg-primary/10 text-primary` con el icono `Search` (24 px en móvil, 26 px en desktop, `aria-hidden`).
    - **Título**: "No encontramos eventos con esos filtros", 17 px en móvil y 20 px en desktop, 600.
    - **Descripción**: "Prueba quitando algún filtro o buscando otra ciudad.", 14 px en móvil y 15 px en desktop, `leading-[1.55]`, `text-muted-foreground`, `max-w-[26.25rem]`.
    - **Botón "Limpiar filtros"**: `h-12 rounded-[14px] bg-foreground text-background hover:bg-foreground/90 px-5 lg:px-[22px] font-semibold`, margen superior de 6 px en móvil y 8 px en desktop. Llama a `onClearFilters`.

### Móvil (por debajo de `lg`; lienzo de 390 px)

- **Barra de botones** (`flex gap-2 lg:hidden`, dentro de la cabecera, debajo del buscador):
  - **"Filtros"** (`SheetTrigger`): alto 44 px, padding 0 16 px, gap 8 px, `rounded-xl border-[1.5px] border-input bg-card`, 14 px / 600, icono `SlidersHorizontal` de 17 px (`aria-hidden`).
    - Si `countPanelFilters > 0`, muestra un `Badge` con el número (`aria-hidden`): `min-w-[22px] h-[22px] px-1.5 rounded-full bg-primary text-primary-foreground text-xs tabular-nums`.
    - El badge va acompañado de `sr-only` "(N activos)" o "(1 activo)" → nombre "Filtros (2 activos)".
  - **"Orden"** (`<button>`): alto 44 px, padding 0 16 px, gap 6 px, misma caja, 14 px / 500. Texto: "Orden:" (`text-muted-foreground`) + `<strong>` 600 con "Fecha" o "Precio" + `ChevronDown` de 16 px (`aria-hidden`).
    - Al pulsarlo, alterna entre `date` y `price`.
    - Su nombre accesible es el texto visible ("Orden: Fecha" / "Orden: Precio").
- **Chips de categoría** (`lg:hidden`): `role="group"` con `aria-label="Filtrar por categoría"`, scroll horizontal (`-mx-4 flex gap-2 overflow-x-auto px-4 pt-4 pb-1 sm:-mx-6 sm:px-6`).
  - El primero es `ToggleChip` "Todos", presionado si `categories` está vacío; al pulsarlo deja `categories: []`.
  - Le siguen las 8 categorías con `ToggleChip` (presionado si está incluida; al pulsarlo, `toggleValue`).
- **Resultados**: padding `12px 0 40px`, gap 12 px. Conteo de 15 px / 600 (es el mismo `<p aria-live>`, con tamaño responsivo). Lista de `EventCard`: horizontal por debajo de `sm` (132 px), 2 columnas verticales de `sm` a `lg`. Estado vacío con las medidas móviles de arriba.
- **Panel de filtros** (`EventSearchFiltersSheet`):
  - `SheetContent side="right" showCloseButton={false}` a pantalla completa: `w-full` y `data-[side=right]:sm:max-w-none`, sin borde lateral, `gap-0 p-0` y `motion-reduce:transition-none`.
  - **Cabecera** de 64 px, padding `0 8px 0 16px`, `border-b border-border`:
    - `SheetTitle` "Filtros" (h2) de 18 px / 600.
    - Botón de cerrar `size-11 rounded-xl` con `aria-label="Cerrar filtros"` e icono `X` de 22 px (`aria-hidden`).
  - **Cuerpo** (`flex-1 overflow-y-auto`, padding `4px 16px`): `EventSearchFilters size="touch"` **sin** `categoryOptions` (fieldsets Ciudad, Fecha y Precio desde). Medidas: padding vertical 16 px, legend 15 px / 600 con padding inferior 8 px, filas de 44 px y 15 px, controles de 20 px.
  - Los cambios se aplican al instante (la lista de fondo y el conteo se actualizan).
  - **Pie fijo** (padding `12px 16px 20px`, que pasa a `max(20px, env(safe-area-inset-bottom))`; gap 10 px; `border-t border-border`):
    - **"Limpiar"** (outline): alto 52 px, padding 0 18 px, `rounded-[14px] border-[1.5px] border-input bg-card`, 15 px / 600. Llama a `clearPanelFilters`.
    - **"Ver {formatEventCount(resultCount)}"** (oscuro): `flex-1`, alto 52 px, `rounded-[14px] bg-foreground text-background hover:bg-foreground/90`, 15 px / 600. Cierra el panel.

### Accesibilidad

- Un solo `h1`. Aside y resultados son regiones con nombre ("Filtros" y "Resultados"). Cada grupo de filtros es un `<fieldset>` con su `<legend>`.
- Todos los controles tienen nombre accesible: las filas por su `Label` envolvente, los chips por `aria-label` "Quitar filtro X" y el orden por `aria-pressed`.
- El conteo es un único `aria-live="polite"` en toda la vista.
- **Panel (Base UI Dialog modal)**:
  - Al abrir, el foco pasa al botón "Cerrar filtros", que es el primer elemento enfocable.
  - Mientras está abierto, Tab no sale del panel.
  - Escape, "Cerrar filtros" y "Ver N eventos" lo cierran y devuelven el foco al botón "Filtros".
- Áreas táctiles de 44 px en móvil (botones, chips y filas del panel; el cerrar es de 44 × 44). En desktop se aceptan las medidas del diseño (filas de 38 px, chips de 36 px, segmentos de 40 px) porque la fila completa es clicable.
- Foco visible en todo: `focus-ring` (outline de 3 px `--ring`) en botones propios y chips; anillo de shadcn en checkbox y radio.
- `prefers-reduced-motion`: sin transición de desplazamiento en el panel (`motion-reduce:transition-none`). Las tarjetas ya la anulan (003).
- Claro y oscuro: solo tokens.

## Transcrito del diseño vs. criterio propio

| Aspecto | Transcrito del diseño | Criterio propio (y por qué) |
|---|---|---|
| Textos | "Explora eventos", "Filtros", "Limpiar", "Categoría", "Ciudad", "Fecha", "Precio desde", "Cualquier fecha", "Ordenar por", "Fecha", "Precio más bajo", "N eventos"/"1 evento", "Quitar filtro X", "No encontramos eventos con esos filtros", "Prueba quitando algún filtro o buscando otra ciudad.", "Limpiar filtros", "Orden: Fecha/Precio", "Cerrar filtros", "Ver N eventos" | `sr-only` "(N eventos)" en filas y "(N activos)" en el badge; h2 `sr-only` "Resultados". |
| Layout desktop | Aside de 288 px + gap 40 px; fondo de resultados `#F4F4F5`; cabecera blanca; medidas del aside, filas, chips y segmentado | Grid de 2 columnas de `lg` a `xl` y 3 desde `xl` (D11). |
| Layout móvil | Botones "Filtros" (badge) y "Orden" que alterna; chips de categoría con scroll; tarjetas horizontales de 132 px; panel a pantalla completa con Ciudad/Fecha/Precio, filas de 44 px y pie Limpiar + Ver N | Corte en `lg` y no en un ancho fijo de 390 px; 2 columnas verticales de `sm` a `lg`; safe-area en el pie. |
| Precios | Fieldset "Precio desde" con radios | Opciones de `PRICE_RANGES` en `$` (D5) en lugar de `S/` (Hasta 50 / 50–150 / 150–300 / Más de 300). |
| Ciudades | Checkboxes con conteo | Derivadas de los datos (D7): Lima y Arequipa (no CDMX ni Madrid; el mock no cambia). |
| Meses | Radios "Cualquier fecha" + meses sin año | Derivados de los datos; con año si hay más de uno (D8). |
| Conteos | Fijos sobre el total | — |
| Chips activos | Solo desktop, tinte índigo, "×" | Chip `“q”` para el texto (D10). Tinte con `primary/10` y `primary/30` (sin hex). |
| Panel "Limpiar" | Limpia ciudad/fecha/precio (no categoría) | — |
| Aside "Limpiar" / "Limpiar filtros" | Limpia todo menos el orden | También borra `q` (D10). |
| Búsqueda de texto | El diseño no filtra por texto (solo `preventDefault`) | Filtra por título, recinto y ciudad sin acentos (D10). |
| Fecha del buscador | Botón "Cualquier día" | Se traduce a mes (D4). |
| Estado en URL | No existe (estado local) | Query params + `replaceState` (D1–D3). |
| Tarjeta | La misma de la landing | Se reutiliza `EventCard` sin cambios. |
| Header "Eventos" con `aria-current` | Sí | Solo cambia el href; `aria-current` queda fuera de alcance. |

## Tareas

### Preparación (serie)

- **P1** Agregar los primitivos de shadcn con `npx shadcn@latest add checkbox radio-group label`. No se editan a mano, salvo que la CLI deje un import de icono roto (se corrige a `lucide-react` `CheckIcon`). Archivos: `src/components/ui/checkbox.tsx`, `src/components/ui/radio-group.tsx`, `src/components/ui/label.tsx`.
- **P2** Contrato y utils de búsqueda + `getEventsSearchHref` + tests. Archivos: `src/modules/events/utils/event-search.ts`, `src/modules/events/utils/event-search.test.ts`, `src/modules/events/utils/event-routes.ts`, `src/modules/events/utils/event-routes.test.ts`.
- **P3** Extraer `ToggleChip`. Archivos: `src/components/shared/toggle-chip.tsx`. (`EventDiscovery` lo adopta en I2.)

Al terminar la preparación: `npm run lint` y `npm run test` en verde.

### Paralelo (archivos disjuntos; nadie instala dependencias ni corre `npm run build`)

- **T1** Filtros: fieldsets reutilizables + panel móvil con su botón "Filtros". Archivos: `src/modules/events/components/event-search-filters.tsx`, `src/modules/events/components/event-search-filters-sheet.tsx`. Importa `EventSearchFilters` según su contrato (el sheet lo usa con `size="touch"`).
- **T2** Resultados: conteo, chips removibles, orden segmentado, grid y estado vacío. Archivos: `src/modules/events/components/event-search-results.tsx`.
- **T3** Buscador con navegación: prop `filters`, `router.push(getEventsSearchHref(…))` e import de `PRICE_RANGES` desde `event-search.ts`. Se actualiza su test. Archivos: `src/modules/events/components/event-search-form.tsx`, `src/modules/events/components/event-search-form.test.tsx`.

### Integración (serie)

- **I1** Vista y ruta: `EventSearchView` (lee y escribe la URL según D1–D3; cabecera con h1, buscador con `key`, barra móvil, chips de categoría, aside con cabecera y "Limpiar", `EventSearchResults`), su test y la página. Archivos: `src/modules/events/components/event-search-view.tsx`, `src/modules/events/components/event-search-view.test.tsx`, `src/app/(site)/events/page.tsx`.
- **I2** Links y DRY:
  - `event-discovery.tsx`: los dos links a `/events` vía `getEventsSearchHref()`, chips con `ToggleChip` (`className="md:px-[18px]"`) y conteo con `formatEventCount`.
  - `event-detail-hero.tsx`: "Volver a eventos" → `getEventsSearchHref()`; breadcrumb → `getEventsSearchHref({ categories: [event.category.id] })`.
  - `event-detail-view.tsx`: "Ver más …" → `getEventsSearchHref({ categories: [event.category.id] })`.
  - `site-header.tsx`: "Eventos" → `/events`.
  - El test existente de `EventDiscovery` debe seguir en verde sin cambios.
  - Archivos: `src/modules/events/components/event-discovery.tsx`, `src/modules/events/components/event-detail-hero.tsx`, `src/modules/events/components/event-detail-view.tsx`, `src/components/shared/site-header.tsx`.

## Criterios de aceptación

**Ruta y datos**
- [ ] AC1 `/events` muestra la cabecera del sitio, el h1 "Explora eventos", el buscador, el aside (≥ 1024 px) y 10 tarjetas ordenadas por fecha (la primera es "Noche de Rock Sinfónico" y la última "Bienal de Arte Urbano"), con el conteo "10 eventos".
- [ ] AC2 `npm run build` lista `/events` como dinámica (ƒ). `curl -s "http://localhost:3000/events?category=theater"` (con `npm run start`) devuelve un HTML con exactamente 1 `<article` y el texto "1 evento".
- [ ] AC3 `src/app/(site)/events/page.tsx` solo compone (`connection`, `eventsService.getUpcoming()`, `<EventSearchView>`) y exporta `metadata` con el título "Explora eventos — Ticketera". El mock de eventos no cambió.

**Filtros (desktop)**
- [ ] AC4 El aside muestra los fieldsets con legend "Categoría" (8 checkboxes en el orden de `EVENT_CATEGORIES`, con los conteos 4, 1, 1, 1, 1, 0, 1, 1), "Ciudad" (Lima 8, Arequipa 2), "Fecha" (Cualquier fecha, Octubre, Noviembre, Diciembre; "Cualquier fecha" marcado) y "Precio desde" (las 6 opciones de `PRICE_RANGES`; "Cualquier precio" marcado).
- [ ] AC5 Al marcar "Conciertos", el conteo pasa a "4 eventos", la URL a `/events?category=concerts`, aparece el chip "Conciertos" (`aria-label` "Quitar filtro Conciertos") y el botón "Limpiar" del aside. Al pulsar el chip vuelven los 10 eventos, la URL pasa a `/events` y desaparecen el chip y "Limpiar".
- [ ] AC6 "Arequipa" + "Noviembre" → 1 evento ("Jazz al Atardecer"), URL `/events?city=Arequipa&month=2026-11`. "Precio desde: $50 - $100" sin otros filtros → 2 eventos ("Festival Sonidos del Sur", "Pop en Vivo: Gira 2026").
- [ ] AC7 Al cambiar filtros no se recarga la página, no se hace scroll al inicio y "Atrás" del navegador vuelve a la página previa a `/events` (`replaceState`).
- [ ] AC8 Orden: "Fecha" está `aria-pressed="true"` al cargar. Al pulsar "Precio más bajo", ese botón queda presionado, la primera tarjeta es "Bienal de Arte Urbano" ($15), la última "Festival Sonidos del Sur" ($60) y la URL incluye `sort=price`.
- [ ] AC9 Estado vacío: con "Cine" marcado se ven el título "No encontramos eventos con esos filtros", la descripción "Prueba quitando algún filtro o buscando otra ciudad.", el botón "Limpiar filtros" y 0 tarjetas, con conteo "0 eventos". "Limpiar filtros" deja 10 eventos y la URL `/events` (si había `sort=price`, se conserva).
- [ ] AC10 URLs con valores inválidos (`/events?category=foo&city=&month=2026-13&price=bar&sort=x`) muestran 10 eventos ordenados por fecha, sin chips y sin errores en consola.
- [ ] AC11 `/events?q=sinfonico` → 1 evento ("Noche de Rock Sinfónico"), chip `“sinfonico”`, y el campo del buscador muestra "sinfonico". `/events?q=%20TEATRO%20` → 3 eventos ("Noche de Rock Sinfónico", "La Casa de Bernarda Alba", "Jazz al Atardecer" — su lugar "Anfiteatro del Parque" contiene "teatro" y D10 busca subcadenas). *(Corregido durante P2: el ejemplo original decía 2 y contradecía D10.)*

**Móvil (< 1024 px; verificar en 390 px)**
- [ ] AC12 Debajo del buscador se ven los botones "Filtros" y "Orden: Fecha". No se ven el aside, los chips removibles ni el orden segmentado. Se ve el grupo "Filtrar por categoría" con "Todos" presionado + 8 chips en scroll horizontal. A 390 px las tarjetas son horizontales (132 px de alto).
- [ ] AC13 Al pulsar "Orden: Fecha", el botón pasa a "Orden: Precio", la lista se ordena por precio y la URL incluye `sort=price`. Al pulsar de nuevo, vuelve a "Orden: Fecha".
- [ ] AC14 Los chips de categoría permiten seleccionar varias categorías ("Teatro" + "Comedia" → 2 eventos, "Todos" no presionado). "Todos" las quita.
- [ ] AC15 "Filtros" abre un diálogo "Filtros" a pantalla completa con los fieldsets Ciudad, Fecha y Precio desde (sin Categoría), filas de 44 px de alto y el foco en "Cerrar filtros". Al marcar "Arequipa", el pie dice "Ver 2 eventos" y la lista de fondo ya está filtrada. "Ver 2 eventos" cierra el panel, el foco vuelve a "Filtros" y su nombre accesible es "Filtros (1 activo)", con el badge "1" visible.
- [ ] AC16 "Limpiar" del panel borra ciudad, mes y precio, pero conserva las categorías elegidas con los chips y el orden. Escape y "Cerrar filtros" cierran el panel.
- [ ] AC17 Todos los controles interactivos de la vista móvil (botones, chips, filas del panel y cerrar) miden ≥ 44 px de alto.

**Buscador e integraciones**
- [ ] AC18 Desde `/` (landing), escribir "rock" y pulsar "Buscar" navega a `/events?q=rock`. Con el campo vacío navega a `/events`. Si se elige una fecha del 16 de octubre de 2026 en el `Calendar`, la URL incluye `month=2026-10`.
- [ ] AC19 En `/events?category=theater&sort=price`, buscar "casa" navega a `/events?q=casa&category=theater&sort=price` (conserva categoría y orden).
- [ ] AC20 Los links de la landing "Ver calendario completo" y "Ver todos los eventos" (link final) apuntan a `/events`. El botón "Ver todos los eventos" del estado vacío de la landing sigue reseteando el filtro sin navegar.
- [ ] AC21 En el detalle `/events/noche-de-rock-sinfonico`: el breadcrumb "Conciertos" y "Ver más conciertos" apuntan a `/events?category=concerts`, y "Volver a eventos" (móvil) apunta a `/events`. El link "Eventos" del header y del menú móvil apunta a `/events`.
- [ ] AC22 Ningún archivo de `src/` contiene `"/#eventos"` y `event-discovery.tsx` no contiene `href="#"` ni `href: "#"`.
- [ ] AC23 Los chips de la landing usan `ToggleChip` y se ven igual que antes (44 px, `md:px-[18px]`, activo oscuro). `event-discovery.test.tsx` pasa sin modificaciones.

**Accesibilidad y estilo**
- [ ] AC24 Hay un único `h1` y un único elemento `aria-live` en `/events`. Cada grupo de filtros es un `fieldset` con `legend`. Cada checkbox y cada radio tiene nombre accesible ("Conciertos (4 eventos)", "Octubre", "$0 - $50"…).
- [ ] AC25 Navegando solo con teclado se puede usar todo con foco visible en claro y oscuro: aplicar y quitar filtros (Espacio en checkbox, flechas en radios), quitar chips, cambiar el orden, abrir y cerrar el panel.
- [ ] AC26 Con `prefers-reduced-motion: reduce`, el panel abre y cierra sin desplazamiento ni transición, y las tarjetas no se elevan en hover.
- [ ] AC27 Los componentes nuevos no tienen literales hex ni colores fuera de los tokens. `PRICE_RANGES` está definido una sola vez (en `event-search.ts`).

## Tests obligatorios

- `src/modules/events/utils/event-search.test.ts`. Los resultados con datos usan `eventsService.getUpcoming()` (10 eventos) y los bordes usan fixtures pequeños.
  - **parse**:
    - Todos los params válidos.
    - `category` repetido.
    - Ids desconocidos descartados.
    - Duplicados eliminados y orden canónico de categorías.
    - `city` vacío o con espacios.
    - `month` inválido (`2026-13`, `2026-1`, `abc`) → `null`.
    - Con varios `month`, se usa el primero.
    - `price` y `sort` inválidos → default.
    - `q` con trim y corte a 100 caracteres.
    - Params desconocidos ignorados.
    - `new URLSearchParams()` → `DEFAULT_EVENT_SEARCH_FILTERS`.
  - **serialize**:
    - Defaults → `""`.
    - Orden `q, category, city, month, price, sort`.
    - Categorías en orden canónico.
    - "Ciudad de México" → `city=Ciudad+de+M%C3%A9xico`.
    - `q` vacío o con solo espacios se omite.
    - Ida y vuelta `parse(new URLSearchParams(serialize(f)))` igual a `f` normalizado.
  - **filterEvents**:
    - `concerts` → evt-001, evt-006, evt-007, evt-008.
    - `Arequipa` → evt-008, evt-010.
    - `2026-11` → evt-007, evt-008, evt-009.
    - `0-50` → 8 eventos.
    - `50-100` → evt-003, evt-007.
    - `Arequipa` + `2026-11` → evt-008.
    - `cinema` → `[]`.
    - `q`: "sinfonico" → evt-001; "  TEATRO " → evt-001, evt-004, evt-008 (Anfiteatro); "central" → evt-007, evt-010.
    - `sort: "price"` → evt-010, evt-009, evt-005, evt-002, evt-004, evt-008, evt-006, evt-001, evt-007, evt-003.
    - Empates de precio → por `startsAt`.
    - Bordes de precio con fixtures: 0 cae en `free` y en `0-50`; 50 en `0-50` y no en `50-100`; 100 en `50-100`; 200 en `100-200`; 201 en `200+`.
    - Un evento con `startsAt` `2026-10-31T23:30:00-05:00` (1 de noviembre en UTC) cae en `2026-10`.
    - No muta la entrada.
  - **Opciones**:
    - `getCategoryOptions` devuelve 8 opciones con los conteos 4, 1, 1, 1, 1, 0, 1, 1.
    - `getCityOptions` → `[{ Lima, 8 }, { Arequipa, 2 }]`.
    - `getMonthOptions(events, null)` → Octubre, Noviembre, Diciembre (`2026-10`, `2026-11`, `2026-12`).
    - Con `"2027-01"` se agrega al final y todos los labels llevan año ("Octubre 2026" … "Enero 2027").
    - `[]` → `[]`.
  - **Chips y helpers**:
    - `getActiveFilters`: orden, labels (`“rock”`, "Teatro", "Lima", "Octubre", "$0 - $50") y `filtersWithout` correcto (conserva `sort`).
    - `countPanelFilters`.
    - `clearAllFilters` conserva `sort`.
    - `clearPanelFilters` conserva `query`, `categories` y `sort`.
    - `toggleValue` agrega y quita sin mutar.
    - `formatMonthValue(2026, 3)` → `"2026-03"`.
    - `formatEventCount(0 | 1 | 2)` → "0 eventos", "1 evento", "2 eventos".
- `src/modules/events/utils/event-routes.test.ts`: agregar `getEventsSearchHref()` → `/events`; `({ categories: ["concerts"] })` → `/events?category=concerts`; `({ query: "rock", sort: "price" })` → `/events?q=rock&sort=price`.
- `src/modules/events/components/event-search-form.test.tsx` (actualizar):
  - Mock de `next/navigation` con `useRouter` → `{ push }`.
  - Se mantienen el nombre del campo, el `preventDefault` y "Cualquier precio" por defecto.
  - Casos nuevos:
    - "  rock " + enviar → `push("/events?q=rock")`.
    - Vacío + enviar → `push("/events")`.
    - Con `filters={{ ...DEFAULT_EVENT_SEARCH_FILTERS, query: "jazz", categories: ["theater"], sort: "price" }}`, el campo muestra "jazz". Reemplazar por "casa" + enviar → `push("/events?q=casa&category=theater&sort=price")`.
- `src/modules/events/components/event-search-view.test.tsx` (RTL):
  - Mock de `next/navigation`:
    - `useSearchParams` refleja `window.location.search` y se vuelve a renderizar cuando se llama a `window.history.replaceState`, p. ej. con `useSyncExternalStore` y un envoltorio de `replaceState` que notifica.
    - `useRouter` → `{ push: vi.fn() }`.
  - Mock de `next/image` como en los tests existentes.
  - Antes de cada test, `history.replaceState(null, "", "/events…")`.
  - Casos:
    1. Sin params: "10 eventos", 10 `article`, "Fecha" presionado y sin chips.
    2. URL inicial `?category=theater`: "1 evento", checkbox "Teatro (1 evento)" marcado y chip "Quitar filtro Teatro".
    3. Marcar "Conciertos": "4 eventos" y `location.search === "?category=concerts"`. Quitar el chip: "10 eventos" y `search === ""`.
    4. "Arequipa" + radio "Noviembre": 1 evento ("Jazz al Atardecer"), `search === "?city=Arequipa&month=2026-11"`.
    5. Vacío con "Cine": textos del estado vacío y 0 `article`. "Limpiar filtros" → 10.
    6. "Precio más bajo": `aria-pressed`, primera tarjeta "Bienal de Arte Urbano" y `sort=price`. El botón móvil pasa a "Orden: Precio".
    7. Params inválidos → 10 eventos, sin chips.
    8. `?q=sinfonico` → 1 evento y chip `“sinfonico”`.
    9. Panel:
       - "Filtros" abre el diálogo "Filtros" sin el fieldset "Categoría".
       - Marcar "Arequipa" → botón "Ver 2 eventos".
       - Al pulsarlo, el diálogo se cierra, el foco queda en el trigger y su nombre es "Filtros (1 activo)".
       - "Limpiar" del panel conserva una categoría elegida antes.
    10. Chips de categoría: "Teatro" + "Comedia" → 2 eventos. "Todos" vuelve a 10 y queda presionado.
- **Sin test propio:** `checkbox`/`radio-group`/`label` (generados), `ToggleChip` (presentacional; cubierto por los tests de `EventDiscovery` y de la vista), `EventSearchFilters`, `EventSearchFiltersSheet` y `EventSearchResults` (cubiertos por el test de la vista), y `page.tsx` (composición). `event-discovery.test.tsx` debe pasar sin cambios.

## Verificación

- `npm run lint`
- `npm run test`
- `npm run build` (sin el error "Missing Suspense boundary with useSearchParams"; `/events` dinámica)
- Manual con `npm run dev` y luego `npm run start`:
  - `/` → buscar "rock" → `/events?q=rock`. Comprobar los links de la landing, del header y del detalle (AC20–AC21).
  - `/events` a 1440 px: aside, chips, orden, estado vacío con "Cine" y "Limpiar".
  - `/events` a 1024 px (2 columnas) y a 390 px (barra móvil, chips, tarjetas horizontales, panel con foco y Escape).
  - Tema oscuro y `prefers-reduced-motion: reduce` (DevTools → Rendering).
  - `curl` de AC2 con `npm run start`.

## Preguntas abiertas

- **Q1 — Tamaño.** La spec toca 20 archivos (ver "Tamaño y por qué no se parte"). Por defecto va completa. La alternativa es mover I2 (links + adopción de `ToggleChip` en la landing) a una spec propia posterior, pero entonces `ToggleChip` debería esperar a esa spec o duplicarse temporalmente.
- **Q2 — Fecha del buscador.** Por defecto, el día elegido en el `Calendar` se convierte a mes (`month=YYYY-MM`, D4). La alternativa es un param `date=YYYY-MM-DD` con filtro por día exacto y chip propio, que no está en el diseño y suma lógica y casos de test.
