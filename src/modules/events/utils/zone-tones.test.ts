import { describe, expect, it } from "vitest"

import type { EventAvailability, TicketType } from "@/modules/events/types/event.types"
import { getZoneToneClassName, getZoneTones } from "@/modules/events/utils/zone-tones"

function ticketType(
  id: string,
  price: number,
  availability: EventAvailability = "available"
): TicketType {
  return { id, eventId: "evt-x", name: id, price, availability }
}

describe("getZoneTones", () => {
  it("reproduces the reference for evt-002", () => {
    const tones = getZoneTones([
      ticketType("evt-002-norte", 30),
      ticketType("evt-002-sur", 30),
      ticketType("evt-002-oriente", 70),
      ticketType("evt-002-occidente", 95, "sold-out"),
    ])
    expect(tones.get("evt-002-oriente")).toBe(1)
    expect(tones.get("evt-002-norte")).toBe(2)
    expect(tones.get("evt-002-sur")).toBe(3)
    expect(tones.get("evt-002-occidente")).toBeNull()
  })

  it("assigns 1, 2, 3, 4, 4, 4 to six available types by descending price", () => {
    const tones = getZoneTones([10, 60, 30, 50, 20, 40].map((price) => ticketType(`t-${price}`, price)))
    expect(["t-60", "t-50", "t-40", "t-30", "t-20", "t-10"].map((id) => tones.get(id))).toEqual([
      1, 2, 3, 4, 4, 4,
    ])
  })

  it("keeps the received order on price ties", () => {
    const tones = getZoneTones([ticketType("b", 50), ticketType("a", 50), ticketType("c", 50)])
    expect([tones.get("b"), tones.get("a"), tones.get("c")]).toEqual([1, 2, 3])
  })

  it("treats last-tickets as available", () => {
    const tones = getZoneTones([ticketType("a", 45), ticketType("b", 85, "last-tickets")])
    expect(tones.get("b")).toBe(1)
    expect(tones.get("a")).toBe(2)
  })

  it("returns null for every type when all are sold out", () => {
    const tones = getZoneTones([ticketType("a", 40, "sold-out"), ticketType("b", 90, "sold-out")])
    expect([...tones.values()]).toEqual([null, null])
  })

  it("does not reorder the input", () => {
    const types = [ticketType("a", 10), ticketType("b", 20)]
    getZoneTones(types)
    expect(types.map((type) => type.id)).toEqual(["a", "b"])
  })
})

describe("getZoneToneClassName", () => {
  it.each([
    [1, "bg-zone-1 text-zone-1-foreground"],
    [2, "bg-zone-2 text-zone-2-foreground"],
    [3, "bg-zone-3 text-zone-3-foreground"],
    [4, "bg-zone-4 text-zone-4-foreground"],
    [null, "bg-muted text-muted-foreground"],
  ] as const)("returns the classes for tone %s", (tone, expected) => {
    expect(getZoneToneClassName(tone)).toBe(expected)
  })
})
