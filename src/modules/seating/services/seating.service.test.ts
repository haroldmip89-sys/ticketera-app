import { describe, expect, it } from "vitest"

import { eventsService } from "@/modules/events/services/events.service"
import { seatingService } from "@/modules/seating/services/seating.service"
import type {
  EventSeatMap,
  Seat,
  ZoneMap,
  ZoneMapArea,
  ZoneMapRowSize,
} from "@/modules/seating/types/seating.types"

const EVENTS_WITH_MAP = ["evt-001", "evt-002", "evt-003", "evt-004", "evt-007"]
const EVENTS_WITHOUT_MAP = ["evt-005", "evt-006", "evt-008", "evt-009", "evt-010"]
const AREA_VALUE = /^\d+( \/ -?\d+)?$/

async function getMap(eventId: string): Promise<ZoneMap> {
  const zoneMap = await seatingService.getZoneMap(eventId)
  if (!zoneMap) throw new Error(`Missing zone map for ${eventId}`)
  return zoneMap
}

function getAreas(zoneMap: ZoneMap): ZoneMapArea[] {
  return [zoneMap.stage.area, ...zoneMap.zones.map((zone) => zone.area)]
}

/** Última fila que ocupa un área ("3" → 3, "1 / 4" → 3, "2 / -1" → 2). */
function getLastRow(row: string): number {
  const [start, end] = row.split(" / ").map(Number)
  if (end === undefined || end < 0) return start
  return end - 1
}

describe("seatingService.getZoneMap", () => {
  it.each(EVENTS_WITH_MAP)("returns the map of %s", async (eventId) => {
    const zoneMap = await getMap(eventId)
    expect(zoneMap.eventId).toBe(eventId)
  })

  it.each([...EVENTS_WITHOUT_MAP, "evt-999", "toString"])(
    "returns null for %s",
    async (eventId) => {
      expect(await seatingService.getZoneMap(eventId)).toBeNull()
    }
  )

  it.each(EVENTS_WITH_MAP)(
    "includes every ticket type of %s exactly once and nothing else",
    async (eventId) => {
      const zoneMap = await getMap(eventId)
      const ticketTypeIds = (await eventsService.getTicketTypes(eventId)).map(
        (ticketType) => ticketType.id
      )
      const zoneIds = zoneMap.zones.map((zone) => zone.ticketTypeId)

      expect(new Set(zoneIds).size).toBe(zoneIds.length)
      expect([...zoneIds].sort()).toEqual([...ticketTypeIds].sort())
    }
  )

  it.each(EVENTS_WITH_MAP)("declares enough rows and valid areas in %s", async (eventId) => {
    const zoneMap = await getMap(eventId)
    for (const area of getAreas(zoneMap)) {
      expect(area.column).toMatch(AREA_VALUE)
      expect(area.row).toMatch(AREA_VALUE)
      expect(zoneMap.rows.length).toBeGreaterThanOrEqual(getLastRow(area.row))
    }
  })

  it("returns a deep copy on each call", async () => {
    const first = await getMap("evt-002")
    ;(first.rows as ZoneMapRowSize[]).push("lg")
    first.zones[0].ticketTypeId = "mutated"
    first.stage.area.row = "9"

    const second = await getMap("evt-002")
    expect(second.rows).toEqual(["sm", "lg", "sm"])
    expect(second.zones[0].ticketTypeId).toBe("evt-002-norte")
    expect(second.stage.area.row).toBe("2")
  })
})

const MIN_AVAILABLE_PER_ZONE = 6

async function getSeatMapOrThrow(eventId: string): Promise<EventSeatMap> {
  const seatMap = await seatingService.getSeatMap(eventId)
  if (!seatMap) throw new Error(`Missing seat map for ${eventId}`)
  return seatMap
}

function getLayoutSeats(seatMap: EventSeatMap): Seat[] {
  return seatMap.layout.zones.flatMap((zone) => zone.rows.flatMap((row) => row.seats))
}

describe("seatingService.getSeatMap", () => {
  it.each([
    {
      eventId: "evt-001",
      venueId: "teatro-municipal",
      zones: [
        { id: "platea", rows: 14, seats: 371 },
        { id: "mezzanine", rows: 6, seats: 195 },
      ],
      total: 566,
      sold: 396,
      accessible: [
        "mezzanine-A-1",
        "mezzanine-A-30",
        "platea-N-1",
        "platea-N-2",
        "platea-N-32",
        "platea-N-33",
      ],
    },
    {
      eventId: "evt-004",
      venueId: "teatro-britanico",
      zones: [
        { id: "platea", rows: 10, seats: 205 },
        { id: "mezzanine", rows: 5, seats: 120 },
      ],
      total: 325,
      sold: 114,
      accessible: [
        "mezzanine-A-1",
        "mezzanine-A-22",
        "platea-J-1",
        "platea-J-2",
        "platea-J-24",
        "platea-J-25",
      ],
    },
  ])("returns the theater of $eventId", async ({ eventId, venueId, zones, total, sold, accessible }) => {
    const seatMap = await getSeatMapOrThrow(eventId)
    const event = (await eventsService.getAll()).find((item) => item.id === eventId)

    expect(seatMap.eventId).toBe(eventId)
    expect(seatMap.layout.venueId).toBe(venueId)
    expect(seatMap.layout.venueId).toBe(event?.venue.id)
    expect(
      seatMap.layout.zones.map((zone) => ({
        id: zone.id,
        rows: zone.rows.length,
        seats: zone.rows.reduce((count, row) => count + row.seats.length, 0),
      }))
    ).toEqual(zones)
    expect(getLayoutSeats(seatMap)).toHaveLength(total)
    expect(seatMap.soldSeatIds).toHaveLength(sold)
    expect(
      getLayoutSeats(seatMap)
        .filter((seat) => seat.accessible)
        .map((seat) => seat.id)
        .sort()
    ).toEqual(accessible)
  })

  it("returns null for every event without numbered seats and for unknown ids", async () => {
    const zoneEvents = (await eventsService.getAll()).filter((event) => event.seatSelection === "zone")
    expect(zoneEvents.length).toBeGreaterThan(0)
    for (const event of zoneEvents) {
      expect(await seatingService.getSeatMap(event.id)).toBeNull()
    }
    expect(await seatingService.getSeatMap("evt-999")).toBeNull()
    expect(await seatingService.getSeatMap("toString")).toBeNull()
  })

  it.each(["evt-001", "evt-004"])("has valid sold seats in %s", async (eventId) => {
    const seatMap = await getSeatMapOrThrow(eventId)
    const seatIds = new Set(getLayoutSeats(seatMap).map((seat) => seat.id))

    expect(new Set(seatMap.soldSeatIds).size).toBe(seatMap.soldSeatIds.length)
    for (const seatId of seatMap.soldSeatIds) expect(seatIds.has(seatId)).toBe(true)
    // No triviales: no son un bloque contiguo del principio del layout.
    const firstIds = [...seatIds].slice(0, seatMap.soldSeatIds.length)
    expect(seatMap.soldSeatIds).not.toEqual(firstIds)
  })

  it.each(["evt-001", "evt-004"])(
    "leaves at least 6 available seats per zone in %s",
    async (eventId) => {
      const seatMap = await getSeatMapOrThrow(eventId)
      const sold = new Set(seatMap.soldSeatIds)
      for (const zone of seatMap.layout.zones) {
        const available = zone.rows
          .flatMap((row) => row.seats)
          .filter((seat) => !sold.has(seat.id))
        expect(available.length).toBeGreaterThanOrEqual(MIN_AVAILABLE_PER_ZONE)
      }
    }
  )

  it.each(["evt-001", "evt-004"])("links every zone to a ticket type of %s", async (eventId) => {
    const seatMap = await getSeatMapOrThrow(eventId)
    const ticketTypeIds = (await eventsService.getTicketTypes(eventId)).map(
      (ticketType) => ticketType.id
    )
    for (const zone of seatMap.layout.zones) {
      expect(ticketTypeIds).toContain(zone.ticketTypeId)
    }
  })

  it("is deterministic and returns a deep copy on each call", async () => {
    const first = await getSeatMapOrThrow("evt-001")
    const pristine = structuredClone(first)
    first.soldSeatIds.push("mutated")
    first.layout.zones[0].rows[0].seats[0].x = -1
    first.layout.zones[0].name = "mutated"

    const second = await getSeatMapOrThrow("evt-001")
    expect(second).toEqual(pristine)
  })
})
