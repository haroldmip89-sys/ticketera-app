import { describe, expect, it } from "vitest"

import {
  buildPurchaseStepHref,
  getSelectionLines,
  getSelectionTotal,
  getTicketQuantity,
  getTotalQuantity,
  MAX_TICKETS_PER_ZONE,
  parseTicketSelection,
  serializeTicketSelection,
  setTicketQuantity,
  TICKETS_SEARCH_PARAM,
  type TicketSelection,
} from "@/modules/checkout/utils/ticket-selection"
import type { TicketType } from "@/modules/events/types/event.types"

const general: TicketType = {
  id: "evt-003-general",
  eventId: "evt-003",
  name: "General",
  price: 60,
  availability: "last-tickets",
}
const vip: TicketType = {
  id: "evt-003-vip",
  eventId: "evt-003",
  name: "VIP",
  price: 150,
  availability: "sold-out",
}
const box: TicketType = {
  id: "evt-003-box",
  eventId: "evt-003",
  name: "Box",
  price: 19.99,
  availability: "available",
}
const types: TicketType[] = [general, vip, box]

describe("constants", () => {
  it("limits each zone to 6 tickets and uses the tickets param", () => {
    expect(MAX_TICKETS_PER_ZONE).toBe(6)
    expect(TICKETS_SEARCH_PARAM).toBe("tickets")
  })
})

describe("getTicketQuantity", () => {
  it("returns the stored quantity or 0", () => {
    expect(getTicketQuantity({ [general.id]: 2 }, general.id)).toBe(2)
    expect(getTicketQuantity({}, general.id)).toBe(0)
    expect(getTicketQuantity({}, "toString")).toBe(0)
  })
})

describe("setTicketQuantity", () => {
  it("sets the quantity", () => {
    expect(setTicketQuantity({}, general, 3)).toEqual({ [general.id]: 3 })
  })

  it("truncates decimals", () => {
    expect(setTicketQuantity({}, general, 2.7)).toEqual({ [general.id]: 2 })
  })

  it("removes the key with a negative quantity", () => {
    expect(setTicketQuantity({ [general.id]: 2 }, general, -1)).toEqual({})
  })

  it("caps the quantity at the maximum", () => {
    expect(setTicketQuantity({}, general, 9)).toEqual({ [general.id]: 6 })
  })

  it("removes the key with 0", () => {
    const next = setTicketQuantity({ [general.id]: 2, [box.id]: 1 }, general, 0)
    expect(next).toEqual({ [box.id]: 1 })
    expect(Object.hasOwn(next, general.id)).toBe(false)
  })

  it("returns the same reference for a sold-out type", () => {
    const selection: TicketSelection = { [general.id]: 1 }
    expect(setTicketQuantity(selection, vip, 2)).toBe(selection)
  })

  it("does not mutate the input", () => {
    const selection: TicketSelection = Object.freeze({ [general.id]: 1 })
    const next = setTicketQuantity(selection, general, 4)
    expect(next).not.toBe(selection)
    expect(selection).toEqual({ [general.id]: 1 })
    expect(next).toEqual({ [general.id]: 4 })
  })
})

describe("getTotalQuantity", () => {
  it("sums every quantity", () => {
    expect(getTotalQuantity({})).toBe(0)
    expect(getTotalQuantity({ [general.id]: 2, [box.id]: 3 })).toBe(5)
  })
})

describe("getSelectionLines", () => {
  it("follows the order of ticketTypes and ignores unknown ids", () => {
    const lines = getSelectionLines({ [box.id]: 3, unknown: 2, [general.id]: 1 }, types)
    expect(lines).toEqual([
      { ticketTypeId: general.id, name: "General", unitPrice: 60, quantity: 1, subtotal: 60 },
      { ticketTypeId: box.id, name: "Box", unitPrice: 19.99, quantity: 3, subtotal: 59.97 },
    ])
  })

  it("returns no lines for an empty selection", () => {
    expect(getSelectionLines({}, types)).toEqual([])
  })
})

describe("getSelectionTotal", () => {
  it("rounds decimals to cents", () => {
    expect(getSelectionTotal({ [box.id]: 3 }, types)).toBe(59.97)
    expect(getSelectionTotal({ [box.id]: 3, [general.id]: 2 }, types)).toBe(179.97)
  })

  it("is 0 for an empty selection", () => {
    expect(getSelectionTotal({}, types)).toBe(0)
  })
})

describe("serializeTicketSelection", () => {
  it("orders pairs by ticketTypes and ignores unknown ids", () => {
    expect(serializeTicketSelection({ [box.id]: 1, unknown: 2, [general.id]: 2 }, types)).toBe(
      "evt-003-general:2,evt-003-box:1"
    )
  })

  it("returns an empty string for an empty selection", () => {
    expect(serializeTicketSelection({}, types)).toBe("")
  })
})

describe("parseTicketSelection", () => {
  it("parses a valid value", () => {
    expect(parseTicketSelection("evt-003-general:3,evt-003-box:1", types)).toEqual({
      [general.id]: 3,
      [box.id]: 1,
    })
  })

  it("takes the first value of an array", () => {
    expect(parseTicketSelection(["evt-003-general:2", "evt-003-box:1"], types)).toEqual({
      [general.id]: 2,
    })
  })

  it("ignores unknown and sold-out ids", () => {
    expect(parseTicketSelection("xx:1,evt-003-vip:2,evt-003-general:1", types)).toEqual({
      [general.id]: 1,
    })
  })

  it.each(["abc", "0", "-1", "2.5", ""])("ignores the quantity %j", (quantity) => {
    expect(parseTicketSelection(`evt-003-general:${quantity}`, types)).toEqual({})
  })

  it("ignores pairs without quantity or malformed", () => {
    expect(parseTicketSelection("evt-003-general", types)).toEqual({})
    expect(parseTicketSelection("evt-003-general:1:2,,:3", types)).toEqual({})
  })

  it("keeps the first occurrence of a repeated id", () => {
    expect(parseTicketSelection("evt-003-general:2,evt-003-general:5", types)).toEqual({
      [general.id]: 2,
    })
  })

  it("caps quantities at the maximum", () => {
    expect(parseTicketSelection("evt-003-general:9", types)).toEqual({ [general.id]: 6 })
  })

  it("returns an empty selection for undefined", () => {
    expect(parseTicketSelection(undefined, types)).toEqual({})
  })

  it("round-trips with serializeTicketSelection", () => {
    const selection: TicketSelection = { [general.id]: 6, [box.id]: 2 }
    expect(parseTicketSelection(serializeTicketSelection(selection, types), types)).toEqual(
      selection
    )
  })
})

describe("buildPurchaseStepHref", () => {
  it("adds the serialized selection as the tickets param", () => {
    const href = buildPurchaseStepHref(
      "/events/festival-sonidos-del-sur/checkout",
      { [general.id]: 2 },
      types
    )
    const url = new URL(href, "http://localhost")
    expect(url.pathname).toBe("/events/festival-sonidos-del-sur/checkout")
    expect(url.searchParams.get("tickets")).toBe("evt-003-general:2")
  })

  it("returns the base href without ? for an empty selection", () => {
    expect(buildPurchaseStepHref("/events/x/checkout", {}, types)).toBe("/events/x/checkout")
  })
})
