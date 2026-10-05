import { describe, expect, it } from "vitest"

import { calculateOrderTotals, getSubtotalCents } from "@/modules/checkout/utils/checkout-order"
import {
  buildConfirmationTickets,
  getConfirmationTotals,
  parseConfirmationState,
  type ConfirmationState,
} from "@/modules/checkout/utils/order-confirmation"
import { getSelectionLines } from "@/modules/checkout/utils/ticket-selection"
import type { TicketType } from "@/modules/events/types/event.types"
import type { EventSeatMap } from "@/modules/seating/types/seating.types"
import { buildTheaterLayout } from "@/modules/seating/utils/theater-layout"

const ZONE_TICKET_TYPES: TicketType[] = [
  { id: "evt-002-norte", eventId: "evt-002", name: "Norte", price: 30, availability: "available" },
  { id: "evt-002-sur", eventId: "evt-002", name: "Sur", price: 30, availability: "available" },
  { id: "evt-002-oriente", eventId: "evt-002", name: "Oriente", price: 70, availability: "available" },
  { id: "evt-002-occidente", eventId: "evt-002", name: "Occidente", price: 95, availability: "sold-out" },
]

const THEATER_TICKET_TYPES: TicketType[] = [
  { id: "evt-x-mezzanine", eventId: "evt-x", name: "Mezzanine", price: 45, availability: "available" },
  { id: "evt-x-platea", eventId: "evt-x", name: "Platea", price: 85, availability: "available" },
]

const SEAT_MAP: EventSeatMap = {
  eventId: "evt-x",
  soldSeatIds: ["platea-A-3"],
  layout: buildTheaterLayout({
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
    accessibleSeatIds: [],
  }),
}

const ZONE_CTX = { ticketTypes: ZONE_TICKET_TYPES, seatMap: null }
const THEATER_CTX = { ticketTypes: THEATER_TICKET_TYPES, seatMap: SEAT_MAP }
const REFERENCE_TICKETS = "evt-002-sur:2,evt-002-oriente:1"

function zoneState(): ConfirmationState {
  const state = parseConfirmationState({ order: "TK-24817", tickets: REFERENCE_TICKETS }, ZONE_CTX)
  if (!state) throw new Error("expected a valid state")
  return state
}

function theaterState(): ConfirmationState {
  const state = parseConfirmationState(
    {
      order: "TK-10001",
      tickets: "evt-x-platea:2,evt-x-mezzanine:1",
      seats: "mezzanine-A-4,platea-B-2,platea-A-1",
    },
    THEATER_CTX
  )
  if (!state) throw new Error("expected a valid state")
  return state
}

describe("parseConfirmationState", () => {
  it("parses a zone order and ignores seats", () => {
    expect(
      parseConfirmationState(
        { order: "TK-24817", tickets: REFERENCE_TICKETS, seats: "platea-A-1" },
        ZONE_CTX
      )
    ).toEqual({
      orderCode: "TK-24817",
      selection: { "evt-002-sur": 2, "evt-002-oriente": 1 },
      seatSummary: null,
    })
  })

  it.each([undefined, "TK-123", "tk-12345", "TK-123456"])("returns null for order %s", (order) => {
    expect(parseConfirmationState({ order, tickets: REFERENCE_TICKETS }, ZONE_CTX)).toBeNull()
  })

  it("uses the first value of an order array", () => {
    expect(
      parseConfirmationState({ order: ["TK-24817", "nope"], tickets: REFERENCE_TICKETS }, ZONE_CTX)
        ?.orderCode
    ).toBe("TK-24817")
    expect(
      parseConfirmationState({ order: ["nope", "TK-24817"], tickets: REFERENCE_TICKETS }, ZONE_CTX)
    ).toBeNull()
  })

  it.each([
    ["missing", undefined],
    ["empty", ""],
    ["only sold out", "evt-002-occidente:2"],
  ])("returns null when tickets is %s", (_, tickets) => {
    expect(parseConfirmationState({ order: "TK-24817", tickets }, ZONE_CTX)).toBeNull()
  })

  it("parses a complete theater selection", () => {
    const state = parseConfirmationState(
      { order: "TK-10001", tickets: "evt-x-platea:2", seats: "platea-A-1,platea-B-2" },
      THEATER_CTX
    )
    expect(state?.seatSummary?.isComplete).toBe(true)
  })

  it.each([
    ["incomplete", "platea-A-1"],
    ["with a sold seat", "platea-A-1,platea-A-3"],
    ["missing", undefined],
  ])("returns null when theater seats are %s", (_, seats) => {
    expect(
      parseConfirmationState({ order: "TK-10001", tickets: "evt-x-platea:2", seats }, THEATER_CTX)
    ).toBeNull()
  })
})

describe("buildConfirmationTickets", () => {
  it("creates one ticket per unit in selection-line order for zone events", () => {
    const tickets = buildConfirmationTickets(zoneState(), ZONE_TICKET_TYPES)

    expect(tickets.map((ticket) => ticket.ticketTypeName)).toEqual(["Sur", "Sur", "Oriente"])
    expect(tickets.map((ticket) => ticket.position)).toEqual([1, 2, 3])
    expect(tickets.every((ticket) => ticket.total === 3)).toBe(true)
    expect(tickets.every((ticket) => ticket.seatLabel === null)).toBe(true)
    expect(tickets.map((ticket) => ticket.unitPrice)).toEqual([30, 30, 70])
  })

  it("uses unique keys", () => {
    const keys = buildConfirmationTickets(zoneState(), ZONE_TICKET_TYPES).map((ticket) => ticket.key)
    expect(keys).toEqual(["TK-24817-1", "TK-24817-2", "TK-24817-3"])
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("derives a deterministic qrSeed that differs by position", () => {
    const first = buildConfirmationTickets(zoneState(), ZONE_TICKET_TYPES)
    const second = buildConfirmationTickets(zoneState(), ZONE_TICKET_TYPES)

    expect(first.map((ticket) => ticket.qrSeed)).toEqual([2481701, 2481702, 2481703])
    expect(second.map((ticket) => ticket.qrSeed)).toEqual(first.map((ticket) => ticket.qrSeed))
  })

  it("labels theater seats in summary order with the ticket type name", () => {
    const tickets = buildConfirmationTickets(theaterState(), THEATER_TICKET_TYPES)

    expect(tickets.map((ticket) => [ticket.ticketTypeName, ticket.seatLabel, ticket.unitPrice])).toEqual([
      ["Platea", "Fila B, asiento 2", 85],
      ["Platea", "Fila A, asiento 1", 85],
      ["Mezzanine", "Fila A, asiento 4", 45],
    ])
    expect(tickets.map((ticket) => `${ticket.position}/${ticket.total}`)).toEqual(["1/3", "2/3", "3/3"])
  })
})

describe("getConfirmationTotals", () => {
  it("matches the checkout calculation for the reference order", () => {
    const state = zoneState()
    const totals = getConfirmationTotals(state, ZONE_TICKET_TYPES)

    expect(totals).toEqual({ subtotalCents: 13000, serviceFeeCents: 1450, totalCents: 14450 })
    expect(totals).toEqual(
      calculateOrderTotals(getSubtotalCents(getSelectionLines(state.selection, ZONE_TICKET_TYPES)))
    )
  })
})
