import { describe, expect, it } from "vitest"

import { serializeTicketSelection, type TicketSelection } from "@/modules/checkout/utils/ticket-selection"
import type { TicketType } from "@/modules/events/types/event.types"
import type { EventSeatMap } from "@/modules/seating/types/seating.types"
import {
  buildSeatCheckoutHref,
  buildSeatSelectionSummary,
  createSeatLookup,
  formatSeatPosition,
  getSeatQuotas,
  getZoneTicketTypes,
  parseCompleteSeatSelection,
  SEATS_SEARCH_PARAM,
  toggleSeatSelection,
} from "@/modules/seating/utils/seat-selection"
import { buildTheaterLayout } from "@/modules/seating/utils/theater-layout"

const LAYOUT = buildTheaterLayout({
  id: "test-layout",
  venueId: "test-venue",
  zones: [
    {
      id: "platea",
      name: "Platea",
      ticketTypeId: "evt-x-platea",
      rowLabels: ["A", "B"],
      firstRowSeats: 5,
      seatsIncrementPerRow: 1,
    },
    {
      id: "mezzanine",
      name: "Mezzanine",
      ticketTypeId: "evt-x-mezzanine",
      rowLabels: ["A"],
      firstRowSeats: 6,
      seatsIncrementPerRow: 0,
    },
  ],
  accessibleSeatIds: ["platea-B-1"],
})

const TICKET_TYPES: TicketType[] = [
  { id: "evt-x-mezzanine", eventId: "evt-x", name: "Mezzanine", price: 19.99, availability: "available" },
  { id: "evt-x-platea", eventId: "evt-x", name: "Platea", price: 85, availability: "available" },
]

const LOOKUP = createSeatLookup(LAYOUT)
const SOLD = new Set(["platea-A-3"])

describe("createSeatLookup", () => {
  it("indexes every seat with its zone and row", () => {
    expect(LOOKUP.size).toBe(5 + 6 + 6)
    const entry = LOOKUP.get("platea-B-1")
    expect(entry?.seat.accessible).toBe(true)
    expect(entry?.zone.id).toBe("platea")
    expect(entry?.row.label).toBe("B")
  })
})

describe("getZoneTicketTypes", () => {
  it("maps each zone to its ticket type", () => {
    const map = getZoneTicketTypes(LAYOUT, TICKET_TYPES)
    expect(map.get("platea")?.price).toBe(85)
    expect(map.get("mezzanine")?.price).toBe(19.99)
  })

  it("throws when a zone has no ticket type", () => {
    expect(() => getZoneTicketTypes(LAYOUT, [TICKET_TYPES[1]])).toThrow(Error)
  })
})

describe("getSeatQuotas", () => {
  it("maps ticket quantities to zone quotas and ignores foreign types", () => {
    expect(getSeatQuotas(LAYOUT, { "evt-x-platea": 2, "evt-y-platea": 4 })).toEqual({ platea: 2 })
    expect(getSeatQuotas(LAYOUT, { "evt-x-platea": 1, "evt-x-mezzanine": 3 })).toEqual({
      platea: 1,
      mezzanine: 3,
    })
    expect(getSeatQuotas(LAYOUT, {})).toEqual({})
  })
})

describe("toggleSeatSelection", () => {
  const ctx = { lookup: LOOKUP, soldSeatIds: SOLD, quotas: { platea: 2 } }

  it("adds an available seat without mutating the input", () => {
    const selected: readonly string[] = ["platea-A-1"]
    const result = toggleSeatSelection(selected, "platea-A-2", ctx)
    expect(result).toEqual({ selectedSeatIds: ["platea-A-1", "platea-A-2"], outcome: "added" })
    expect(selected).toEqual(["platea-A-1"])
  })

  it("removes a selected seat", () => {
    const result = toggleSeatSelection(["platea-A-1", "platea-A-2"], "platea-A-1", ctx)
    expect(result).toEqual({ selectedSeatIds: ["platea-A-2"], outcome: "removed" })
  })

  it("returns the same reference for a sold seat", () => {
    const selected: readonly string[] = []
    const result = toggleSeatSelection(selected, "platea-A-3", ctx)
    expect(result.outcome).toBe("unavailable")
    expect(result.selectedSeatIds).toBe(selected)
  })

  it("returns the same reference for an unknown seat", () => {
    const selected: readonly string[] = []
    const result = toggleSeatSelection(selected, "platea-Z-9", ctx)
    expect(result.outcome).toBe("unavailable")
    expect(result.selectedSeatIds).toBe(selected)
  })

  it("returns the same reference for a zone without quota", () => {
    const selected: readonly string[] = ["platea-A-1"]
    const result = toggleSeatSelection(selected, "mezzanine-A-1", ctx)
    expect(result.outcome).toBe("zone-not-selected")
    expect(result.selectedSeatIds).toBe(selected)
  })

  it("returns the same reference when the zone is full", () => {
    const selected: readonly string[] = ["platea-A-1", "platea-A-2"]
    const result = toggleSeatSelection(selected, "platea-B-1", ctx)
    expect(result.outcome).toBe("zone-full")
    expect(result.selectedSeatIds).toBe(selected)
  })

  it("removes a selected seat that is now sold", () => {
    const result = toggleSeatSelection(["platea-A-3"], "platea-A-3", ctx)
    expect(result).toEqual({ selectedSeatIds: [], outcome: "removed" })
  })

  it("removes a seat from a full zone", () => {
    const result = toggleSeatSelection(["platea-A-1", "platea-A-2"], "platea-A-2", ctx)
    expect(result).toEqual({ selectedSeatIds: ["platea-A-1"], outcome: "removed" })
  })

  it("counts the quota per zone", () => {
    const result = toggleSeatSelection(["platea-A-1", "platea-A-2"], "mezzanine-A-1", {
      ...ctx,
      quotas: { platea: 2, mezzanine: 1 },
    })
    expect(result.outcome).toBe("added")
  })
})

describe("buildSeatSelectionSummary", () => {
  it("lists only zones with quota in layout order with seats in selection order", () => {
    const summary = buildSeatSelectionSummary(
      LAYOUT,
      TICKET_TYPES,
      ["mezzanine-A-4", "platea-B-1", "platea-A-2"],
      { mezzanine: 1, platea: 2 }
    )
    expect(summary.zones.map((zone) => zone.zoneId)).toEqual(["platea", "mezzanine"])
    expect(summary.zones[0]).toMatchObject({
      zoneName: "Platea",
      ticketTypeId: "evt-x-platea",
      quota: 2,
    })
    expect(summary.zones[0].seats).toEqual([
      {
        seatId: "platea-B-1",
        zoneId: "platea",
        zoneName: "Platea",
        rowLabel: "B",
        number: 1,
        accessible: true,
        price: 85,
      },
      {
        seatId: "platea-A-2",
        zoneId: "platea",
        zoneName: "Platea",
        rowLabel: "A",
        number: 2,
        accessible: false,
        price: 85,
      },
    ])
    expect(summary).toMatchObject({ count: 3, required: 3, total: 189.99, isComplete: true })
  })

  it("omits zones without quota", () => {
    const summary = buildSeatSelectionSummary(LAYOUT, TICKET_TYPES, [], { platea: 2 })
    expect(summary.zones.map((zone) => zone.zoneId)).toEqual(["platea"])
    expect(summary).toMatchObject({ count: 0, required: 2, total: 0, isComplete: false })
  })

  it("rounds the total to 2 decimals", () => {
    const summary = buildSeatSelectionSummary(
      LAYOUT,
      TICKET_TYPES,
      ["mezzanine-A-1", "mezzanine-A-2", "mezzanine-A-3"],
      { mezzanine: 3 }
    )
    expect(summary.total).toBe(59.97)
    expect(summary.isComplete).toBe(true)
  })

  it("is incomplete until every zone has its quota", () => {
    const summary = buildSeatSelectionSummary(LAYOUT, TICKET_TYPES, ["platea-A-1", "platea-A-2"], {
      platea: 2,
      mezzanine: 1,
    })
    expect(summary.isComplete).toBe(false)
    expect(summary.count).toBe(2)
  })

  it("ignores unknown seat ids", () => {
    const summary = buildSeatSelectionSummary(LAYOUT, TICKET_TYPES, ["nope", "platea-A-1"], {
      platea: 1,
    })
    expect(summary.count).toBe(1)
    expect(summary.isComplete).toBe(true)
  })
})

describe("buildSeatCheckoutHref", () => {
  it("links to checkout with the tickets and the seats in layout order", () => {
    const selection = { "evt-x-platea": 2, "evt-x-mezzanine": 1 }
    const href = buildSeatCheckoutHref("mi-evento", selection, TICKET_TYPES, LAYOUT, [
      "mezzanine-A-2",
      "platea-B-1",
      "platea-A-4",
    ])
    const url = new URL(href, "https://example.com")

    expect(url.pathname).toBe("/events/mi-evento/checkout")
    expect(url.searchParams.get("tickets")).toBe(serializeTicketSelection(selection, TICKET_TYPES))
    expect(url.searchParams.get(SEATS_SEARCH_PARAM)).toBe("platea-A-4,platea-B-1,mezzanine-A-2")
  })
})

describe("parseCompleteSeatSelection", () => {
  const SEAT_MAP: EventSeatMap = { eventId: "evt-x", layout: LAYOUT, soldSeatIds: ["platea-A-3"] }
  const SELECTION: TicketSelection = { "evt-x-platea": 2 }

  function parse(value: string | string[] | undefined, selection = SELECTION) {
    return parseCompleteSeatSelection(value, SEAT_MAP, selection, TICKET_TYPES)
  }

  it("returns the complete summary", () => {
    const summary = parse("platea-B-2,platea-A-1")
    expect(summary?.isComplete).toBe(true)
    expect(summary?.zones[0].seats.map((seat) => seat.seatId)).toEqual(["platea-B-2", "platea-A-1"])
  })

  it.each([
    ["incomplete", "platea-A-1"],
    ["with a sold seat", "platea-A-1,platea-A-3"],
    ["with an unknown id", "platea-A-1,nope"],
    ["empty", ""],
    ["undefined", undefined],
  ])("returns null when %s", (_, value) => {
    expect(parse(value)).toBeNull()
  })

  it("counts duplicated ids once", () => {
    expect(parse("platea-A-1,platea-A-1")).toBeNull()
    expect(parse("platea-A-1,platea-A-1,platea-A-2")?.count).toBe(2)
  })

  it("uses the first value of an array", () => {
    expect(parse(["platea-A-1,platea-A-2", "nope"])?.isComplete).toBe(true)
    expect(parse(["platea-A-1", "platea-A-1,platea-A-2"])).toBeNull()
  })

  it("drops seats of zones without quota", () => {
    const summary = parse("platea-A-1,mezzanine-A-1,platea-A-2")
    expect(summary?.zones.map((zone) => zone.zoneId)).toEqual(["platea"])
    expect(summary?.count).toBe(2)
  })

  it("returns null when there is no quota at all", () => {
    expect(parse("platea-A-1", {})).toBeNull()
  })
})

describe("formatSeatPosition", () => {
  it("describes the row and seat number", () => {
    expect(formatSeatPosition({ rowLabel: "F", number: 12 })).toBe("Fila F, asiento 12")
  })
})
