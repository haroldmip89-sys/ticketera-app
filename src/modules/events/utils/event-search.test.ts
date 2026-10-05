import { beforeAll, describe, expect, it } from "vitest"

import { eventsService } from "@/modules/events/services/events.service"
import type { EventItem } from "@/modules/events/types/event.types"
import {
  clearAllFilters,
  clearPanelFilters,
  countPanelFilters,
  DEFAULT_EVENT_SEARCH_FILTERS,
  EVENT_SEARCH_QUERY_MAX_LENGTH,
  filterEvents,
  formatEventCount,
  formatMonthValue,
  getActiveFilters,
  getCategoryOptions,
  getCityOptions,
  getMonthOptions,
  parseEventSearchParams,
  serializeEventSearchParams,
  toggleValue,
  type EventSearchFilters,
} from "@/modules/events/utils/event-search"

const ids = (events: readonly EventItem[]) => events.map((event) => event.id)

const withFilters = (overrides: Partial<EventSearchFilters>): EventSearchFilters => ({
  ...DEFAULT_EVENT_SEARCH_FILTERS,
  ...overrides,
})

const parse = (query: string) => parseEventSearchParams(new URLSearchParams(query))

let upcoming: EventItem[]

beforeAll(async () => {
  upcoming = await eventsService.getUpcoming()
})

function makeEvent(overrides: Partial<EventItem>): EventItem {
  return { ...upcoming[0], ...overrides }
}

describe("parseEventSearchParams", () => {
  it("parses every valid param", () => {
    expect(
      parse("q=rock&category=theater&city=Lima&month=2026-11&price=0-50&sort=price")
    ).toEqual({
      query: "rock",
      categories: ["theater"],
      cities: ["Lima"],
      month: "2026-11",
      price: "0-50",
      sort: "price",
    })
  })

  it("reads repeated category keys", () => {
    expect(parse("category=concerts&category=comedy").categories).toEqual(["concerts", "comedy"])
  })

  it("drops unknown category ids", () => {
    expect(parse("category=foo&category=theater&category=Theater").categories).toEqual([
      "theater",
    ])
  })

  it("removes duplicate categories and returns them in canonical order", () => {
    expect(
      parse("category=arts&category=concerts&category=arts&category=theater").categories
    ).toEqual(["concerts", "theater", "arts"])
  })

  it("trims cities and drops empty ones, keeping order without duplicates", () => {
    expect(parse("city=&city=%20%20&city=%20Lima%20&city=Arequipa&city=Lima").cities).toEqual([
      "Lima",
      "Arequipa",
    ])
  })

  it.each(["2026-13", "2026-1", "abc", "2026-00", ""])("rejects invalid month %j", (month) => {
    expect(parse(`month=${month}`).month).toBeNull()
  })

  it("uses the first month when repeated", () => {
    expect(parse("month=2026-11&month=2026-12").month).toBe("2026-11")
  })

  it("falls back to defaults for invalid price and sort", () => {
    const filters = parse("price=bar&sort=x")
    expect(filters.price).toBe("any")
    expect(filters.sort).toBe("date")
  })

  it("trims the query and cuts it to the max length", () => {
    expect(parse("q=%20%20rock%20%20").query).toBe("rock")
    const long = "a".repeat(EVENT_SEARCH_QUERY_MAX_LENGTH + 20)
    expect(parse(`q=${long}`).query).toHaveLength(EVENT_SEARCH_QUERY_MAX_LENGTH)
  })

  it("ignores unknown params", () => {
    expect(parse("foo=bar&utm_source=x")).toEqual(DEFAULT_EVENT_SEARCH_FILTERS)
  })

  it("returns the defaults for empty params", () => {
    expect(parseEventSearchParams(new URLSearchParams())).toEqual(DEFAULT_EVENT_SEARCH_FILTERS)
  })
})

describe("serializeEventSearchParams", () => {
  it("returns an empty string for defaults", () => {
    expect(serializeEventSearchParams(DEFAULT_EVENT_SEARCH_FILTERS)).toBe("")
  })

  it("writes params in the order q, category, city, month, price, sort", () => {
    expect(
      serializeEventSearchParams({
        sort: "price",
        price: "50-100",
        month: "2026-10",
        cities: ["Lima", "Arequipa"],
        categories: ["concerts"],
        query: "rock",
      })
    ).toBe(
      "q=rock&category=concerts&city=Lima&city=Arequipa&month=2026-10&price=50-100&sort=price"
    )
  })

  it("writes categories in canonical order", () => {
    expect(serializeEventSearchParams(withFilters({ categories: ["theater", "concerts"] }))).toBe(
      "category=concerts&category=theater"
    )
  })

  it("encodes accented cities and spaces", () => {
    expect(serializeEventSearchParams(withFilters({ cities: ["Ciudad de México"] }))).toBe(
      "city=Ciudad+de+M%C3%A9xico"
    )
  })

  it.each(["", "   "])("omits an empty query %j", (query) => {
    expect(serializeEventSearchParams(withFilters({ query }))).toBe("")
  })

  it("round-trips through parse", () => {
    const filters = withFilters({
      query: "  rock  ",
      categories: ["arts", "concerts"],
      cities: ["Ciudad de México", "Lima"],
      month: "2027-01",
      price: "200+",
      sort: "price",
    })
    expect(parse(serializeEventSearchParams(filters))).toEqual({
      ...filters,
      query: "rock",
      categories: ["concerts", "arts"],
    })
  })
})

describe("filterEvents", () => {
  it.each<[string, Partial<EventSearchFilters>, string[]]>([
    ["concerts", { categories: ["concerts"] }, ["evt-001", "evt-006", "evt-007", "evt-008"]],
    ["Arequipa", { cities: ["Arequipa"] }, ["evt-008", "evt-010"]],
    ["2026-11", { month: "2026-11" }, ["evt-007", "evt-008", "evt-009"]],
    ["50-100", { price: "50-100" }, ["evt-003", "evt-007"]],
    ["Arequipa + 2026-11", { cities: ["Arequipa"], month: "2026-11" }, ["evt-008"]],
    ["cinema", { categories: ["cinema"] }, []],
    ["q sinfonico", { query: "sinfonico" }, ["evt-001"]],
    ["q TEATRO (Anfiteatro incluido)", { query: "  TEATRO " }, ["evt-001", "evt-004", "evt-008"]],
    ["q central", { query: "central" }, ["evt-007", "evt-010"]],
  ])("filters by %s", (_, overrides, expected) => {
    expect(ids(filterEvents(upcoming, withFilters(overrides)))).toEqual(expected)
  })

  it("returns 8 events for 0-50", () => {
    expect(filterEvents(upcoming, withFilters({ price: "0-50" }))).toHaveLength(8)
  })

  it("sorts by lowest price", () => {
    expect(ids(filterEvents(upcoming, withFilters({ sort: "price" })))).toEqual([
      "evt-010",
      "evt-009",
      "evt-005",
      "evt-002",
      "evt-004",
      "evt-008",
      "evt-006",
      "evt-001",
      "evt-007",
      "evt-003",
    ])
  })

  it("breaks price ties by startsAt", () => {
    const later = makeEvent({ id: "later", priceFrom: 10, startsAt: "2026-12-01T20:00:00-05:00" })
    const earlier = makeEvent({
      id: "earlier",
      priceFrom: 10,
      startsAt: "2026-11-01T20:00:00-05:00",
    })
    expect(ids(filterEvents([later, earlier], withFilters({ sort: "price" })))).toEqual([
      "earlier",
      "later",
    ])
  })

  it.each<[number, EventSearchFilters["price"][], EventSearchFilters["price"][]]>([
    [0, ["free", "0-50"], ["50-100", "100-200", "200+"]],
    [50, ["0-50"], ["free", "50-100"]],
    [100, ["50-100"], ["100-200"]],
    [200, ["100-200"], ["200+"]],
    [201, ["200+"], ["100-200"]],
  ])("handles the price edge %d", (priceFrom, included, excluded) => {
    const event = makeEvent({ priceFrom })
    included.forEach((price) =>
      expect(filterEvents([event], withFilters({ price }))).toHaveLength(1)
    )
    excluded.forEach((price) =>
      expect(filterEvents([event], withFilters({ price }))).toHaveLength(0)
    )
  })

  it("uses the Lima month, not the UTC one", () => {
    const event = makeEvent({ startsAt: "2026-10-31T23:30:00-05:00" })
    expect(filterEvents([event], withFilters({ month: "2026-10" }))).toHaveLength(1)
    expect(filterEvents([event], withFilters({ month: "2026-11" }))).toHaveLength(0)
  })

  it("does not mutate the input", () => {
    const input = [...upcoming]
    const snapshot = ids(input)
    filterEvents(input, withFilters({ sort: "price" }))
    expect(ids(input)).toEqual(snapshot)
  })
})

describe("options", () => {
  it("lists the 8 categories with fixed counts", () => {
    const options = getCategoryOptions(upcoming)
    expect(options.map((option) => option.id)).toEqual([
      "concerts",
      "sports",
      "theater",
      "festivals",
      "family",
      "cinema",
      "comedy",
      "arts",
    ])
    expect(options.map((option) => option.count)).toEqual([4, 1, 1, 1, 1, 0, 1, 1])
  })

  it("lists cities by count", () => {
    expect(getCityOptions(upcoming)).toEqual([
      { city: "Lima", count: 8 },
      { city: "Arequipa", count: 2 },
    ])
  })

  it("lists months chronologically without year", () => {
    expect(getMonthOptions(upcoming, null)).toEqual([
      { value: "2026-10", label: "Octubre" },
      { value: "2026-11", label: "Noviembre" },
      { value: "2026-12", label: "Diciembre" },
    ])
  })

  it("adds a selected month without events and labels with year across years", () => {
    expect(getMonthOptions(upcoming, "2027-01")).toEqual([
      { value: "2026-10", label: "Octubre 2026" },
      { value: "2026-11", label: "Noviembre 2026" },
      { value: "2026-12", label: "Diciembre 2026" },
      { value: "2027-01", label: "Enero 2027" },
    ])
  })

  it("returns no months for no events", () => {
    expect(getMonthOptions([], null)).toEqual([])
  })
})

describe("getActiveFilters", () => {
  it("lists chips in order with labels and filtersWithout", () => {
    const filters = withFilters({
      query: "rock",
      categories: ["theater"],
      cities: ["Lima"],
      month: "2026-10",
      price: "0-50",
      sort: "price",
    })
    const active = getActiveFilters(filters, getMonthOptions(upcoming, filters.month))

    expect(active.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: "q", label: "“rock”" },
      { id: "category:theater", label: "Teatro" },
      { id: "city:Lima", label: "Lima" },
      { id: "month", label: "Octubre" },
      { id: "price", label: "$0 - $50" },
    ])
    expect(active.map((chip) => chip.filtersWithout)).toEqual([
      { ...filters, query: "" },
      { ...filters, categories: [] },
      { ...filters, cities: [] },
      { ...filters, month: null },
      { ...filters, price: "any" },
    ])
  })

  it("orders categories canonically and falls back to the month value", () => {
    const active = getActiveFilters(
      withFilters({ categories: ["arts", "concerts"], month: "2030-05" }),
      []
    )
    expect(active.map((chip) => chip.label)).toEqual([
      "Conciertos",
      "Arte y Exposiciones",
      "2030-05",
    ])
  })

  it("returns no chips for defaults", () => {
    expect(getActiveFilters(DEFAULT_EVENT_SEARCH_FILTERS, [])).toEqual([])
  })
})

describe("helpers", () => {
  it("counts panel filters", () => {
    expect(countPanelFilters(DEFAULT_EVENT_SEARCH_FILTERS)).toBe(0)
    expect(
      countPanelFilters(
        withFilters({
          query: "x",
          categories: ["theater"],
          cities: ["Lima", "Arequipa"],
          month: "2026-10",
          price: "free",
        })
      )
    ).toBe(4)
  })

  const full = withFilters({
    query: "rock",
    categories: ["theater"],
    cities: ["Lima"],
    month: "2026-10",
    price: "0-50",
    sort: "price",
  })

  it("clearAllFilters keeps only sort", () => {
    expect(clearAllFilters(full)).toEqual({ ...DEFAULT_EVENT_SEARCH_FILTERS, sort: "price" })
  })

  it("clearPanelFilters keeps query, categories and sort", () => {
    expect(clearPanelFilters(full)).toEqual({
      ...full,
      cities: [],
      month: null,
      price: "any",
    })
  })

  it("toggleValue adds and removes without mutating", () => {
    const list: readonly string[] = ["a", "b"]
    expect(toggleValue(list, "c")).toEqual(["a", "b", "c"])
    expect(toggleValue(list, "a")).toEqual(["b"])
    expect(list).toEqual(["a", "b"])
  })

  it("formats month values", () => {
    expect(formatMonthValue(2026, 3)).toBe("2026-03")
    expect(formatMonthValue(2026, 11)).toBe("2026-11")
  })

  it.each([
    [0, "0 eventos"],
    [1, "1 evento"],
    [2, "2 eventos"],
  ])("formats %d events", (count, expected) => {
    expect(formatEventCount(count)).toBe(expected)
  })
})
