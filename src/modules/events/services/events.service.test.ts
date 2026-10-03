import { describe, expect, it } from "vitest"

import { EVENT_CATEGORIES } from "@/modules/events/data/event-categories"
import { eventsService } from "@/modules/events/services/events.service"
import type { EventAvailability, EventItem, TicketType } from "@/modules/events/types/event.types"

const ids = (events: EventItem[]) => events.map((event) => event.id)
const ALL_IDS = Array.from({ length: 10 }, (_, i) => `evt-${String(i + 1).padStart(3, "0")}`)
const ISO_WITH_LIMA_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/

describe("eventsService.getAll", () => {
  it("returns the 10 events ordered by startsAt", async () => {
    const events = await eventsService.getAll()
    expect(ids(events)).toEqual(ALL_IDS)
    const times = events.map((event) => new Date(event.startsAt).getTime())
    expect(times).toEqual([...times].sort((a, b) => a - b))
  })

  it("has unique ids and slugs", async () => {
    const events = await eventsService.getAll()
    expect(new Set(events.map((event) => event.id)).size).toBe(events.length)
    expect(new Set(events.map((event) => event.slug)).size).toBe(events.length)
  })

  it("uses ISO dates with the -05:00 offset and opens doors before the start", async () => {
    for (const event of await eventsService.getAll()) {
      expect(event.startsAt).toMatch(ISO_WITH_LIMA_OFFSET)
      expect(event.doorsOpenAt).toMatch(ISO_WITH_LIMA_OFFSET)
      expect(new Date(event.doorsOpenAt).getTime()).toBeLessThan(
        new Date(event.startsAt).getTime()
      )
    }
  })

  it("uses categories from EVENT_CATEGORIES", async () => {
    for (const event of await eventsService.getAll()) {
      expect(EVENT_CATEGORIES).toContainEqual(event.category)
    }
  })

  it("covers availability and seat selection as specified", async () => {
    const events = await eventsService.getAll()
    const byAvailability = (availability: EventItem["availability"]) =>
      ids(events.filter((event) => event.availability === availability))

    expect(byAvailability("last-tickets")).toEqual(["evt-001", "evt-003"])
    expect(byAvailability("sold-out")).toEqual(["evt-006"])
    expect(byAvailability("available")).toHaveLength(7)
    expect(ids(events.filter((event) => event.seatSelection === "seat"))).toEqual([
      "evt-001",
      "evt-004",
    ])
  })

  it("returns a new array on each call", async () => {
    const first = await eventsService.getAll()
    first.pop()
    first.reverse()
    expect(ids(await eventsService.getAll())).toEqual(ALL_IDS)
  })
})

describe("eventsService.getBySlug", () => {
  it("returns the event when the slug exists", async () => {
    const event = await eventsService.getBySlug("la-casa-de-bernarda-alba")
    expect(event?.id).toBe("evt-004")
  })

  it("returns null when the slug does not exist", async () => {
    expect(await eventsService.getBySlug("no-existe")).toBeNull()
  })
})

describe("eventsService.getFeatured", () => {
  it("returns the featured events ordered by startsAt", async () => {
    expect(ids(await eventsService.getFeatured())).toEqual([
      "evt-001",
      "evt-002",
      "evt-003",
      "evt-004",
      "evt-007",
    ])
  })
})

describe("eventsService.getUpcoming", () => {
  it("defaults to the reference date and returns all 10 events", async () => {
    expect(eventsService.getReferenceDate()).toBe("2026-10-02T12:00:00-05:00")
    expect(ids(await eventsService.getUpcoming())).toEqual(ALL_IDS)
  })

  it("includes an event starting exactly at now", async () => {
    const events = await eventsService.getUpcoming(new Date("2026-10-24T21:00:00-05:00"))
    expect(ids(events)).toEqual(["evt-005", "evt-006", "evt-007", "evt-008", "evt-009", "evt-010"])
  })

  it("returns an empty array after the last event", async () => {
    expect(await eventsService.getUpcoming(new Date("2027-01-01T00:00:00-05:00"))).toEqual([])
  })

  it("is not affected by mutating a previous result", async () => {
    const first = await eventsService.getUpcoming()
    first.splice(0, first.length)
    expect(await eventsService.getUpcoming()).toHaveLength(10)
  })
})

function deriveAvailability(ticketTypes: TicketType[]): EventAvailability {
  if (ticketTypes.every((ticketType) => ticketType.availability === "sold-out")) return "sold-out"
  if (ticketTypes.some((ticketType) => ticketType.availability === "last-tickets")) {
    return "last-tickets"
  }
  return "available"
}

describe("eventsService.getTicketTypes", () => {
  it("has 23 ticket types with unique ids prefixed by their eventId", async () => {
    const ticketTypes = (
      await Promise.all(ALL_IDS.map((id) => eventsService.getTicketTypes(id)))
    ).flat()
    expect(ticketTypes).toHaveLength(23)
    expect(new Set(ticketTypes.map((ticketType) => ticketType.id)).size).toBe(23)
    for (const ticketType of ticketTypes) {
      expect(ticketType.id.startsWith(`${ticketType.eventId}-`)).toBe(true)
    }
  })

  it("matches priceFrom and availability of each event", async () => {
    for (const event of await eventsService.getAll()) {
      const ticketTypes = await eventsService.getTicketTypes(event.id)
      expect(ticketTypes.length).toBeGreaterThanOrEqual(2)
      expect(Math.min(...ticketTypes.map((ticketType) => ticketType.price))).toBe(event.priceFrom)
      expect(deriveAvailability(ticketTypes)).toBe(event.availability)
    }
  })

  it("gives theaters exactly platea and mezzanine", async () => {
    for (const id of ["evt-001", "evt-004"]) {
      const ticketTypes = await eventsService.getTicketTypes(id)
      expect(ticketTypes.map((ticketType) => ticketType.id).sort()).toEqual([
        `${id}-mezzanine`,
        `${id}-platea`,
      ])
    }
  })

  it("orders by ascending price keeping ties stable", async () => {
    const ticketTypes = await eventsService.getTicketTypes("evt-002")
    expect(ticketTypes.map((ticketType) => ticketType.id)).toEqual([
      "evt-002-norte",
      "evt-002-sur",
      "evt-002-oriente",
      "evt-002-occidente",
    ])
  })

  it("returns an empty array for an unknown event", async () => {
    expect(await eventsService.getTicketTypes("no-existe")).toEqual([])
  })

  it("is not affected by mutating a previous result", async () => {
    const first = await eventsService.getTicketTypes("evt-002")
    first.splice(0, first.length)
    expect(await eventsService.getTicketTypes("evt-002")).toHaveLength(4)
  })
})

describe("eventsService.getRelated", () => {
  it.each([
    ["evt-001", ["evt-006", "evt-007", "evt-008", "evt-002"]],
    ["evt-004", ["evt-001", "evt-002", "evt-003", "evt-005"]],
    ["evt-010", ["evt-001", "evt-002", "evt-003", "evt-004"]],
  ])("returns the related events of %s", async (eventId, expected) => {
    expect(ids(await eventsService.getRelated(eventId))).toEqual(expected)
  })

  it("respects the limit", async () => {
    expect(ids(await eventsService.getRelated("evt-001", 2))).toEqual(["evt-006", "evt-007"])
  })

  it("never includes the event itself", async () => {
    for (const id of ALL_IDS) {
      expect(ids(await eventsService.getRelated(id, 10))).not.toContain(id)
    }
  })

  it("returns an empty array for an unknown event", async () => {
    expect(await eventsService.getRelated("no-existe")).toEqual([])
  })
})
