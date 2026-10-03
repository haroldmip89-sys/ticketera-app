import { describe, expect, it } from "vitest"

import type { Seat, SeatRow, VenueLayout } from "@/modules/seating/types/seating.types"
import {
  buildTheaterLayout,
  type TheaterLayoutConfig,
} from "@/modules/seating/utils/theater-layout"

const SMALL_CONFIG: TheaterLayoutConfig = {
  id: "small-layout",
  venueId: "small-venue",
  zones: [
    {
      id: "platea",
      name: "Platea",
      ticketTypeId: "evt-x-platea",
      rowLabels: ["A", "B", "C"],
      firstRowSeats: 5,
      seatsIncrementPerRow: 1,
    },
    {
      id: "mezzanine",
      name: "Mezzanine",
      ticketTypeId: "evt-x-mezzanine",
      rowLabels: ["A", "B", "C"],
      firstRowSeats: 5,
      seatsIncrementPerRow: 1,
    },
  ],
  accessibleSeatIds: ["platea-C-1", "mezzanine-A-5"],
}

// Misma forma que el mock de evt-001 (el mock solo lo importa el service).
const EVT_001_CONFIG: TheaterLayoutConfig = {
  id: "teatro-municipal-sala-principal",
  venueId: "teatro-municipal",
  zones: [
    {
      id: "platea",
      name: "Platea",
      ticketTypeId: "evt-001-platea",
      rowLabels: "ABCDEFGHIJKLMN".split(""),
      firstRowSeats: 20,
      seatsIncrementPerRow: 1,
    },
    {
      id: "mezzanine",
      name: "Mezzanine",
      ticketTypeId: "evt-001-mezzanine",
      rowLabels: "ABCDEF".split(""),
      firstRowSeats: 30,
      seatsIncrementPerRow: 1,
    },
  ],
}

function getRows(layout: VenueLayout): SeatRow[] {
  return layout.zones.flatMap((zone) => zone.rows)
}

function getSeats(layout: VenueLayout): Seat[] {
  return getRows(layout).flatMap((row) => row.seats)
}

/** y del asiento más cercano al eje (el más bajo de la fila). */
function getAxisY(row: SeatRow): number {
  return Math.max(...row.seats.map((seat) => seat.y))
}

function distance(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function hasAtMostTwoDecimals(value: number): boolean {
  return Math.round(value * 100) / 100 === value
}

describe("buildTheaterLayout", () => {
  const layout = buildTheaterLayout(SMALL_CONFIG)
  const axisX = layout.stage.x + layout.stage.width / 2

  it("builds the layout metadata and a centered stage at the top", () => {
    expect(layout).toMatchObject({ id: "small-layout", venueId: "small-venue", kind: "theater", seatRadius: 5 })
    expect(layout.stage.label).toBe("Escenario")
    expect(axisX).toBeCloseTo(layout.width / 2, 1)
    for (const seat of getSeats(layout)) {
      expect(seat.y).toBeGreaterThan(layout.stage.y + layout.stage.height)
    }
  })

  it("creates the configured rows and seats with unique ids", () => {
    expect(layout.zones.map((zone) => zone.rows.map((row) => row.seats.length))).toEqual([
      [5, 6, 7],
      [5, 6, 7],
    ])
    const ids = getSeats(layout).map((seat) => seat.id)
    expect(ids).toHaveLength(36)
    expect(new Set(ids).size).toBe(36)
    expect(ids).toContain("platea-B-6")
  })

  it("numbers seats 1..n from left to right and propagates zone data", () => {
    for (const zone of layout.zones) {
      const config = SMALL_CONFIG.zones.find((item) => item.id === zone.id)
      expect(zone.ticketTypeId).toBe(config?.ticketTypeId)
      expect(zone.name).toBe(config?.name)
      for (const row of zone.rows) {
        expect(row.seats.map((seat) => seat.number)).toEqual(row.seats.map((_, index) => index + 1))
        for (const seat of row.seats) {
          expect(seat.zoneId).toBe(zone.id)
          expect(seat.rowLabel).toBe(row.label)
          expect(seat.id).toBe(`${zone.id}-${row.label}-${seat.number}`)
        }
        for (let index = 1; index < row.seats.length; index++) {
          expect(row.seats[index].x).toBeGreaterThan(row.seats[index - 1].x)
        }
      }
    }
  })

  it("orders rows away from the stage with a larger gap between zones", () => {
    const [platea, mezzanine] = layout.zones
    const rowSteps = layout.zones.flatMap((zone) =>
      zone.rows.slice(1).map((row, index) => getAxisY(row) - getAxisY(zone.rows[index]))
    )
    for (const step of rowSteps) expect(step).toBeGreaterThan(0)

    const zoneStep = getAxisY(mezzanine.rows[0]) - getAxisY(platea.rows[platea.rows.length - 1])
    expect(zoneStep).toBeGreaterThan(Math.max(...rowSteps))
  })

  it("places zone labels on the axis before their first row and row labels beyond the ends", () => {
    const [platea, mezzanine] = layout.zones
    expect(platea.labelPosition.x).toBeCloseTo(axisX, 1)
    expect(platea.labelPosition.y).toBeGreaterThan(layout.stage.y + layout.stage.height)
    expect(platea.labelPosition.y).toBeLessThan(getAxisY(platea.rows[0]))
    expect(mezzanine.labelPosition.x).toBeCloseTo(axisX, 1)
    expect(mezzanine.labelPosition.y).toBeGreaterThan(getAxisY(platea.rows[platea.rows.length - 1]))
    expect(mezzanine.labelPosition.y).toBeLessThan(getAxisY(mezzanine.rows[0]))

    for (const row of getRows(layout)) {
      expect(row.labelPositions.start.x).toBeLessThan(row.seats[0].x)
      expect(row.labelPositions.end.x).toBeGreaterThan(row.seats[row.seats.length - 1].x)
      expect(Math.abs(row.labelPositions.start.y - row.labelPositions.end.y)).toBeLessThanOrEqual(0.01)
    }
  })

  it("mirrors seat k and n + 1 − k across the axis", () => {
    for (const row of getRows(layout)) {
      const n = row.seats.length
      for (let k = 1; k <= n; k++) {
        const left = row.seats[k - 1]
        const right = row.seats[n - k]
        expect(Math.abs(left.y - right.y)).toBeLessThanOrEqual(0.01)
        expect(Math.abs(axisX - left.x - (right.x - axisX))).toBeLessThanOrEqual(0.02)
      }
    }
  })

  it("leaves exactly 2 aisles per row", () => {
    for (const row of getRows(layout)) {
      const gaps = row.seats.slice(1).map((seat, index) => distance(seat, row.seats[index]))
      const minGap = Math.min(...gaps)
      expect(gaps.filter((gap) => gap > 1.5 * minGap)).toHaveLength(2)
    }
  })

  it("rounds every coordinate to at most 2 decimals", () => {
    const values = [
      layout.width,
      layout.height,
      layout.stage.x,
      layout.stage.y,
      ...layout.zones.flatMap((zone) => [zone.labelPosition.x, zone.labelPosition.y]),
      ...getRows(layout).flatMap((row) => [
        row.labelPositions.start.x,
        row.labelPositions.start.y,
        row.labelPositions.end.x,
        row.labelPositions.end.y,
      ]),
      ...getSeats(layout).flatMap((seat) => [seat.x, seat.y]),
    ]
    for (const value of values) expect(hasAtMostTwoDecimals(value)).toBe(true)
  })

  it("marks exactly the configured accessible seats", () => {
    const accessible = getSeats(layout)
      .filter((seat) => seat.accessible)
      .map((seat) => seat.id)
    expect(accessible.sort()).toEqual(["mezzanine-A-5", "platea-C-1"])
  })

  it("is deterministic", () => {
    expect(buildTheaterLayout(SMALL_CONFIG)).toEqual(layout)
  })

  describe("with the evt-001 configuration", () => {
    const theater = buildTheaterLayout(EVT_001_CONFIG)
    const seats = getSeats(theater)
    const r = theater.seatRadius

    it("has 566 seats", () => {
      expect(seats).toHaveLength(566)
    })

    it("does not overlap seats", () => {
      for (let i = 0; i < seats.length; i++) {
        for (let j = i + 1; j < seats.length; j++) {
          expect(distance(seats[i], seats[j])).toBeGreaterThanOrEqual(2 * r + 1)
        }
      }
    })

    it("keeps every seat inside the viewBox and off the stage", () => {
      const { stage } = theater
      for (const seat of seats) {
        expect(seat.x - r).toBeGreaterThanOrEqual(0)
        expect(seat.y - r).toBeGreaterThanOrEqual(0)
        expect(seat.x + r).toBeLessThanOrEqual(theater.width)
        expect(seat.y + r).toBeLessThanOrEqual(theater.height)

        const overStage =
          seat.x + r > stage.x &&
          seat.x - r < stage.x + stage.width &&
          seat.y + r > stage.y &&
          seat.y - r < stage.y + stage.height
        expect(overStage).toBe(false)
      }
    })
  })

  describe("invalid configurations", () => {
    it("throws for an accessible seat that does not exist", () => {
      expect(() =>
        buildTheaterLayout({ ...SMALL_CONFIG, accessibleSeatIds: ["platea-Z-1"] })
      ).toThrow(Error)
    })

    it("throws for duplicated zone ids", () => {
      expect(() =>
        buildTheaterLayout({ ...SMALL_CONFIG, zones: [SMALL_CONFIG.zones[0], SMALL_CONFIG.zones[0]] })
      ).toThrow(Error)
    })

    it("throws for a zone without rows", () => {
      expect(() =>
        buildTheaterLayout({
          ...SMALL_CONFIG,
          accessibleSeatIds: [],
          zones: [{ ...SMALL_CONFIG.zones[0], rowLabels: [] }],
        })
      ).toThrow(Error)
    })

    it("throws for rows without seats", () => {
      expect(() =>
        buildTheaterLayout({
          ...SMALL_CONFIG,
          accessibleSeatIds: [],
          zones: [{ ...SMALL_CONFIG.zones[0], firstRowSeats: 0 }],
        })
      ).toThrow(Error)
    })
  })
})
