import { getZonedDateParts } from "@/lib/date-time"
import { EVENT_CATEGORIES } from "@/modules/events/data/event-categories"
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
export const EVENT_SORT_OPTIONS: readonly { value: EventSort; label: string }[] = [
  { value: "date", label: "Fecha" },
  { value: "price", label: "Precio más bajo" },
]

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

export const DEFAULT_EVENT_SEARCH_FILTERS: EventSearchFilters = {
  query: "",
  categories: [],
  cities: [],
  month: null,
  price: "any",
  sort: "date",
}

export type CategoryOption = { id: EventCategoryId; label: string; count: number }
export type CityOption = { city: string; count: number }
export type MonthOption = { value: string; label: string }
/** Chip removible. filtersWithout = filtros sin este (mismo sort). */
export type ActiveFilter = { id: string; label: string; filtersWithout: EventSearchFilters }

/** Lectura mínima compatible con URLSearchParams y ReadonlyURLSearchParams. */
export type SearchParamsReader = Pick<URLSearchParams, "get" | "getAll">

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const monthLabelFormatter = new Intl.DateTimeFormat("es", { month: "long", timeZone: "UTC" })

function isPriceRangeValue(value: string | null): value is PriceRangeValue {
  return PRICE_RANGES.some((range) => range.value === value)
}

function isEventSort(value: string | null): value is EventSort {
  return EVENT_SORT_OPTIONS.some((option) => option.value === value)
}

/** Ids conocidos, sin duplicados, en el orden de EVENT_CATEGORIES. */
function toCanonicalCategories(ids: readonly string[]): EventCategoryId[] {
  return EVENT_CATEGORIES.filter((category) => ids.includes(category.id)).map(
    (category) => category.id
  )
}

function normalizeCities(cities: readonly string[]): string[] {
  const trimmed = cities.map((city) => city.trim()).filter((city) => city !== "")
  return [...new Set(trimmed)]
}

/** Minúsculas y sin diacríticos (D10). */
function normalizeText(value: string): string {
  return value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
}

function getEventMonth(event: EventItem): string {
  const { year, month } = getZonedDateParts(event.startsAt)
  return formatMonthValue(year, month)
}

function matchesPrice(price: number, range: PriceRangeValue): boolean {
  switch (range) {
    case "any":
      return true
    case "free":
      return price === 0
    case "0-50":
      return price >= 0 && price <= 50
    case "50-100":
      return price > 50 && price <= 100
    case "100-200":
      return price > 100 && price <= 200
    case "200+":
      return price > 200
  }
}

function getStartsAtTime(event: EventItem): number {
  return new Date(event.startsAt).getTime()
}

/** Ver tabla de params. Nunca lanza. */
export function parseEventSearchParams(params: SearchParamsReader): EventSearchFilters {
  const query = (params.get("q") ?? "").trim().slice(0, EVENT_SEARCH_QUERY_MAX_LENGTH)
  const month = params.get("month")
  const price = params.get("price")
  const sort = params.get("sort")

  return {
    query,
    categories: toCanonicalCategories(params.getAll("category")),
    cities: normalizeCities(params.getAll("city")),
    month: month !== null && MONTH_PATTERN.test(month) ? month : null,
    price: isPriceRangeValue(price) ? price : DEFAULT_EVENT_SEARCH_FILTERS.price,
    sort: isEventSort(sort) ? sort : DEFAULT_EVENT_SEARCH_FILTERS.sort,
  }
}

/** Query string sin "?" (ver tabla). Todo default → "". */
export function serializeEventSearchParams(filters: EventSearchFilters): string {
  const params = new URLSearchParams()
  const query = filters.query.trim()

  if (query) params.append("q", query)
  toCanonicalCategories(filters.categories).forEach((id) => params.append("category", id))
  normalizeCities(filters.cities).forEach((city) => params.append("city", city))
  if (filters.month) params.append("month", filters.month)
  if (filters.price !== DEFAULT_EVENT_SEARCH_FILTERS.price) params.append("price", filters.price)
  if (filters.sort !== DEFAULT_EVENT_SEARCH_FILTERS.sort) params.append("sort", filters.sort)

  return params.toString()
}

/** Aplica q, categorías (OR), ciudades (OR), mes y precio (AND entre grupos) y ordena:
 *  "date" → startsAt asc; "price" → priceFrom asc y, a igual precio, startsAt asc. Array nuevo, no muta. */
export function filterEvents(
  events: readonly EventItem[],
  filters: EventSearchFilters
): EventItem[] {
  const query = normalizeText(filters.query.trim())

  const matches = events.filter((event) => {
    if (
      query &&
      ![event.title, event.venue.name, event.venue.city].some((text) =>
        normalizeText(text).includes(query)
      )
    ) {
      return false
    }
    if (filters.categories.length > 0 && !filters.categories.includes(event.category.id)) {
      return false
    }
    if (filters.cities.length > 0 && !filters.cities.includes(event.venue.city)) return false
    if (filters.month && getEventMonth(event) !== filters.month) return false
    return matchesPrice(event.priceFrom, filters.price)
  })

  return matches.sort((a, b) =>
    filters.sort === "price"
      ? a.priceFrom - b.priceFrom || getStartsAtTime(a) - getStartsAtTime(b)
      : getStartsAtTime(a) - getStartsAtTime(b)
  )
}

/** Las 8 de EVENT_CATEGORIES en su orden, con conteo sobre `events` (D6). */
export function getCategoryOptions(events: readonly EventItem[]): CategoryOption[] {
  return EVENT_CATEGORIES.map((category) => ({
    id: category.id,
    label: category.label,
    count: events.filter((event) => event.category.id === category.id).length,
  }))
}

/** D7. */
export function getCityOptions(events: readonly EventItem[]): CityOption[] {
  const counts = new Map<string, number>()
  events.forEach((event) => counts.set(event.venue.city, (counts.get(event.venue.city) ?? 0) + 1))

  return [...counts]
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count || a.city.localeCompare(b.city, "es"))
}

/** D8. No incluye "Cualquier fecha" (lo agrega la UI). */
export function getMonthOptions(
  events: readonly EventItem[],
  selectedMonth: string | null
): MonthOption[] {
  const values = new Set(events.map(getEventMonth))
  if (selectedMonth) values.add(selectedMonth)

  const sorted = [...values].sort()
  const withYear = new Set(sorted.map((value) => value.slice(0, 4))).size > 1

  return sorted.map((value) => {
    const [year, month] = value.split("-").map(Number)
    const name = monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1)))
    const label = name.charAt(0).toUpperCase() + name.slice(1)
    return { value, label: withYear ? `${label} ${year}` : label }
  })
}

/** Orden: q, categorías (orden de EVENT_CATEGORIES), ciudades (orden de filters), mes, precio.
 *  Labels: `“{q}”`, label de categoría, ciudad, label de MonthOption (o el valor si no está en monthOptions), label de PRICE_RANGES.
 *  ids: "q", "category:<id>", "city:<nombre>", "month", "price". */
export function getActiveFilters(
  filters: EventSearchFilters,
  monthOptions: readonly MonthOption[]
): ActiveFilter[] {
  const active: ActiveFilter[] = []

  if (filters.query) {
    active.push({
      id: "q",
      label: `“${filters.query}”`,
      filtersWithout: { ...filters, query: "" },
    })
  }
  EVENT_CATEGORIES.filter((category) => filters.categories.includes(category.id)).forEach(
    (category) =>
      active.push({
        id: `category:${category.id}`,
        label: category.label,
        filtersWithout: {
          ...filters,
          categories: filters.categories.filter((id) => id !== category.id),
        },
      })
  )
  filters.cities.forEach((city) =>
    active.push({
      id: `city:${city}`,
      label: city,
      filtersWithout: { ...filters, cities: filters.cities.filter((value) => value !== city) },
    })
  )
  if (filters.month) {
    const month = filters.month
    active.push({
      id: "month",
      label: monthOptions.find((option) => option.value === month)?.label ?? month,
      filtersWithout: { ...filters, month: null },
    })
  }
  if (filters.price !== "any") {
    active.push({
      id: "price",
      label: PRICE_RANGES.find((range) => range.value === filters.price)?.label ?? filters.price,
      filtersWithout: { ...filters, price: "any" },
    })
  }

  return active
}

/** Contador del botón "Filtros" (móvil): cities.length + (month ? 1 : 0) + (price !== "any" ? 1 : 0). */
export function countPanelFilters(filters: EventSearchFilters): number {
  return filters.cities.length + (filters.month ? 1 : 0) + (filters.price !== "any" ? 1 : 0)
}

/** Todo a default salvo sort ("Limpiar" del aside y "Limpiar filtros"). */
export function clearAllFilters(filters: EventSearchFilters): EventSearchFilters {
  return { ...DEFAULT_EVENT_SEARCH_FILTERS, sort: filters.sort }
}

/** cities [], month null, price "any"; conserva query, categories y sort ("Limpiar" del panel móvil). */
export function clearPanelFilters(filters: EventSearchFilters): EventSearchFilters {
  return { ...filters, cities: [], month: null, price: "any" }
}

/** Quita el valor si está y lo agrega al final si no. Array nuevo. */
export function toggleValue<T>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value]
}

/** (2026, 3) → "2026-03". */
export function formatMonthValue(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

/** 1 → "1 evento"; 0 y n > 1 → "{n} eventos". */
export function formatEventCount(count: number): string {
  return count === 1 ? "1 evento" : `${count} eventos`
}
