import { describe, expect, it } from "vitest"

import {
  buildConfirmationHref,
  calculateOrderTotals,
  CHECKOUT_SETTINGS,
  createMockOrderCode,
  fromCents,
  getSubtotalCents,
  isOrderCode,
  ORDER_CODE_PATTERN,
  ORDER_SEARCH_PARAM,
  toCents,
} from "@/modules/checkout/utils/checkout-order"
import {
  getSelectionLines,
  serializeTicketSelection,
  TICKETS_SEARCH_PARAM,
  type SelectionLine,
} from "@/modules/checkout/utils/ticket-selection"
import type { TicketType } from "@/modules/events/types/event.types"
import { SEATS_SEARCH_PARAM } from "@/modules/seating/utils/seat-selection"

const EVT_002_TICKET_TYPES: TicketType[] = [
  { id: "evt-002-norte", eventId: "evt-002", name: "Norte", price: 30, availability: "available" },
  { id: "evt-002-sur", eventId: "evt-002", name: "Sur", price: 30, availability: "available" },
]

function line(unitPrice: number, quantity: number): SelectionLine {
  return { ticketTypeId: "t", name: "T", unitPrice, quantity, subtotal: unitPrice * quantity }
}

function parseHref(href: string): URL {
  return new URL(href, "https://example.com")
}

describe("CHECKOUT_SETTINGS", () => {
  it("charges 10 % + $1.50 and reserves for 10 minutes", () => {
    expect(CHECKOUT_SETTINGS).toEqual({
      serviceFeeBps: 1000,
      serviceFeeFixedCents: 150,
      reservationMinutes: 10,
    })
  })
})

describe("toCents", () => {
  it("rounds amounts to integer cents", () => {
    expect(toCents(19.99)).toBe(1999)
    expect(toCents(0.1 + 0.2)).toBe(30)
    expect(toCents(0)).toBe(0)
  })

  it("throws RangeError for negative or non-finite amounts", () => {
    expect(() => toCents(-1)).toThrow(RangeError)
    expect(() => toCents(Number.NaN)).toThrow(RangeError)
    expect(() => toCents(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })
})

describe("fromCents", () => {
  it("converts cents back to dollars", () => {
    expect(fromCents(6750)).toBe(67.5)
  })
})

describe("getSubtotalCents", () => {
  it("adds integer cents without floating point error", () => {
    expect(getSubtotalCents([line(19.99, 3)])).toBe(5997)
  })

  it("returns 0 for no lines", () => {
    expect(getSubtotalCents([])).toBe(0)
  })

  it("adds the real evt-002 lines", () => {
    const lines = getSelectionLines({ "evt-002-sur": 2, "evt-002-norte": 1 }, EVT_002_TICKET_TYPES)
    expect(getSubtotalCents(lines)).toBe(9000)
  })
})

describe("calculateOrderTotals", () => {
  it("applies 10 % + $1.50 by default", () => {
    expect(calculateOrderTotals(6000)).toEqual({
      subtotalCents: 6000,
      serviceFeeCents: 750,
      totalCents: 6750,
    })
  })

  it("rounds the percentage half up", () => {
    expect(calculateOrderTotals(1005).serviceFeeCents).toBe(251)
    expect(calculateOrderTotals(1004).serviceFeeCents).toBe(250)
  })

  it("charges nothing on an empty order", () => {
    expect(calculateOrderTotals(0)).toEqual({ subtotalCents: 0, serviceFeeCents: 0, totalCents: 0 })
  })

  it("accepts custom settings", () => {
    expect(calculateOrderTotals(10000, { serviceFeeBps: 250, serviceFeeFixedCents: 0 })).toEqual({
      subtotalCents: 10000,
      serviceFeeCents: 250,
      totalCents: 10250,
    })
  })

  it("throws RangeError for non-integer or negative subtotals", () => {
    expect(() => calculateOrderTotals(10.5)).toThrow(RangeError)
    expect(() => calculateOrderTotals(-100)).toThrow(RangeError)
    expect(() => calculateOrderTotals(Number.NaN)).toThrow(RangeError)
  })

  it("always totals subtotal + fee", () => {
    for (const subtotal of [1, 99, 1005, 5997, 123457]) {
      const totals = calculateOrderTotals(subtotal)
      expect(totals.totalCents).toBe(totals.subtotalCents + totals.serviceFeeCents)
    }
  })
})

describe("createMockOrderCode", () => {
  it("maps the random range to TK-10000..TK-99999", () => {
    expect(createMockOrderCode(() => 0)).toBe("TK-10000")
    expect(createMockOrderCode(() => 0.99999)).toBe("TK-99999")
  })

  it("matches the order code pattern by default", () => {
    expect(createMockOrderCode()).toMatch(ORDER_CODE_PATTERN)
  })
})

describe("isOrderCode", () => {
  it("accepts TK- followed by 5 digits", () => {
    expect(isOrderCode("TK-24817")).toBe(true)
  })

  it.each([["TK-1234"], ["TK-123456"], ["tk-24817"], ["TK24817"], [24817], [undefined]])(
    "rejects %j",
    (value) => {
      expect(isOrderCode(value)).toBe(false)
    }
  )
})

describe("buildConfirmationHref", () => {
  const selection = { "evt-002-sur": 2 }

  it("links to the confirmation with order and tickets for zone events", () => {
    const url = parseHref(
      buildConfirmationHref({
        slug: "x",
        orderCode: "TK-24817",
        selection,
        ticketTypes: EVT_002_TICKET_TYPES,
      })
    )

    expect(url.pathname).toBe("/events/x/confirmation")
    expect([...url.searchParams.keys()]).toEqual([ORDER_SEARCH_PARAM, TICKETS_SEARCH_PARAM])
    expect(url.searchParams.get(ORDER_SEARCH_PARAM)).toBe("TK-24817")
    expect(url.searchParams.get(TICKETS_SEARCH_PARAM)).toBe(
      serializeTicketSelection(selection, EVT_002_TICKET_TYPES)
    )
    expect(url.searchParams.has(SEATS_SEARCH_PARAM)).toBe(false)
  })

  it("adds the seats joined by comma in the given order", () => {
    const url = parseHref(
      buildConfirmationHref({
        slug: "x",
        orderCode: "TK-24817",
        selection,
        ticketTypes: EVT_002_TICKET_TYPES,
        seatIds: ["platea-B-2", "platea-A-1"],
      })
    )
    expect(url.searchParams.get(SEATS_SEARCH_PARAM)).toBe("platea-B-2,platea-A-1")
  })

  it("omits seats when the list is empty", () => {
    const url = parseHref(
      buildConfirmationHref({
        slug: "x",
        orderCode: "TK-24817",
        selection,
        ticketTypes: EVT_002_TICKET_TYPES,
        seatIds: [],
      })
    )
    expect(url.searchParams.has(SEATS_SEARCH_PARAM)).toBe(false)
  })

  it("throws for an invalid order code", () => {
    expect(() =>
      buildConfirmationHref({
        slug: "x",
        orderCode: "TK-1",
        selection,
        ticketTypes: EVT_002_TICKET_TYPES,
      })
    ).toThrow(Error)
  })
})
