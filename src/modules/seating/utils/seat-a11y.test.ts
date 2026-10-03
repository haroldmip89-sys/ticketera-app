import { describe, expect, it } from "vitest"

import type { SeatRow, VenueLayout } from "@/modules/seating/types/seating.types"
import {
  getAdjacentSeatId,
  getInitialFocusSeatId,
  getSeatAriaLabel,
  getSeatName,
  getSelectionAnnouncement,
} from "@/modules/seating/utils/seat-a11y"

function row(zoneId: string, label: string, y: number, xs: number[]): SeatRow {
  return {
    label,
    seats: xs.map((x, index) => ({
      id: `${zoneId}-${label}-${index + 1}`,
      zoneId,
      rowLabel: label,
      number: index + 1,
      x,
      y,
      accessible: false,
    })),
    labelPositions: { start: { x: 0, y }, end: { x: 50, y } },
  }
}

// Coordenadas a mano para controlar distancias y empates.
const LAYOUT: VenueLayout = {
  id: "nav-layout",
  venueId: "nav-venue",
  kind: "theater",
  width: 60,
  height: 60,
  seatRadius: 2,
  stage: { x: 10, y: 0, width: 20, height: 5, label: "Escenario" },
  zones: [
    {
      id: "platea",
      name: "Platea",
      ticketTypeId: "evt-x-platea",
      labelPosition: { x: 20, y: 8 },
      rows: [row("platea", "A", 10, [10, 20, 30]), row("platea", "B", 20, [5, 15, 25, 35])],
    },
    {
      id: "mezzanine",
      name: "Mezzanine",
      ticketTypeId: "evt-x-mezzanine",
      labelPosition: { x: 20, y: 30 },
      rows: [row("mezzanine", "A", 40, [0, 20, 40])],
    },
  ],
}

describe("getAdjacentSeatId", () => {
  it("moves left and right within the row without wrapping", () => {
    expect(getAdjacentSeatId(LAYOUT, "platea-A-1", "ArrowRight")).toBe("platea-A-2")
    expect(getAdjacentSeatId(LAYOUT, "platea-A-2", "ArrowLeft")).toBe("platea-A-1")
    expect(getAdjacentSeatId(LAYOUT, "platea-A-1", "ArrowLeft")).toBeNull()
    expect(getAdjacentSeatId(LAYOUT, "platea-A-3", "ArrowRight")).toBeNull()
  })

  it("moves up and down to the closest seat", () => {
    expect(getAdjacentSeatId(LAYOUT, "platea-B-1", "ArrowUp")).toBe("platea-A-1")
    expect(getAdjacentSeatId(LAYOUT, "platea-A-3", "ArrowDown")).toBe("platea-B-3")
  })

  it("breaks ties by the lower number", () => {
    expect(getAdjacentSeatId(LAYOUT, "platea-A-2", "ArrowDown")).toBe("platea-B-2")
  })

  it("crosses from one zone to the next", () => {
    expect(getAdjacentSeatId(LAYOUT, "platea-B-4", "ArrowDown")).toBe("mezzanine-A-3")
    expect(getAdjacentSeatId(LAYOUT, "mezzanine-A-1", "ArrowUp")).toBe("platea-B-1")
  })

  it("returns null above the first row and below the last row", () => {
    expect(getAdjacentSeatId(LAYOUT, "platea-A-2", "ArrowUp")).toBeNull()
    expect(getAdjacentSeatId(LAYOUT, "mezzanine-A-2", "ArrowDown")).toBeNull()
  })

  it("jumps to the row ends with Home and End", () => {
    expect(getAdjacentSeatId(LAYOUT, "platea-B-3", "Home")).toBe("platea-B-1")
    expect(getAdjacentSeatId(LAYOUT, "platea-B-2", "End")).toBe("platea-B-4")
  })

  it("returns null for an unknown seat", () => {
    expect(getAdjacentSeatId(LAYOUT, "platea-Z-1", "ArrowRight")).toBeNull()
  })
})

describe("getInitialFocusSeatId", () => {
  it("returns the first non-sold seat of an included zone", () => {
    expect(getInitialFocusSeatId(LAYOUT, new Set(["platea-A-1"]), { platea: 2 })).toBe("platea-A-2")
    expect(getInitialFocusSeatId(LAYOUT, new Set(["mezzanine-A-1"]), { mezzanine: 1 })).toBe(
      "mezzanine-A-2"
    )
    expect(
      getInitialFocusSeatId(LAYOUT, new Set(["platea-A-1", "platea-A-2", "platea-A-3"]), { platea: 1 })
    ).toBe("platea-B-1")
  })

  it("falls back to the first seat of the layout", () => {
    expect(getInitialFocusSeatId(LAYOUT, new Set(), {})).toBe("platea-A-1")
    expect(
      getInitialFocusSeatId(LAYOUT, new Set(["mezzanine-A-1", "mezzanine-A-2", "mezzanine-A-3"]), {
        mezzanine: 1,
      })
    ).toBe("platea-A-1")
  })
})

describe("getSeatName", () => {
  it("names the seat", () => {
    expect(getSeatName({ zoneName: "Platea", rowLabel: "F", number: 12 })).toBe(
      "Platea, fila F, asiento 12"
    )
  })
})

describe("getSeatAriaLabel", () => {
  const base = {
    zoneName: "Platea",
    rowLabel: "F",
    number: 12,
    price: 85,
    accessible: false,
    status: "available" as const,
    zoneIncluded: true,
  }

  it("labels an available seat", () => {
    expect(getSeatAriaLabel(base)).toBe("Platea, fila F, asiento 12, $85, disponible")
  })

  it("labels an available accessible seat", () => {
    expect(getSeatAriaLabel({ ...base, rowLabel: "N", number: 1, accessible: true })).toBe(
      "Platea, fila N, asiento 1, accesible para silla de ruedas, $85, disponible"
    )
  })

  it("labels a selected seat", () => {
    expect(getSeatAriaLabel({ ...base, status: "selected" })).toBe(
      "Platea, fila F, asiento 12, $85, seleccionado"
    )
  })

  it("labels a sold seat", () => {
    expect(getSeatAriaLabel({ ...base, status: "sold" })).toBe("Platea, fila F, asiento 12, vendido")
    expect(getSeatAriaLabel({ ...base, status: "sold", zoneIncluded: false })).toBe(
      "Platea, fila F, asiento 12, vendido"
    )
  })

  it("labels a seat of a zone not included", () => {
    expect(
      getSeatAriaLabel({
        ...base,
        zoneName: "Mezzanine",
        rowLabel: "A",
        number: 3,
        price: 45,
        zoneIncluded: false,
      })
    ).toBe("Mezzanine, fila A, asiento 3, $45, no incluida en tu selección")
  })
})

describe("getSelectionAnnouncement", () => {
  const base = { zoneName: "Platea", zoneCount: 1, quota: 2, isComplete: false }

  it("announces an added seat", () => {
    expect(
      getSelectionAnnouncement({ ...base, outcome: "added", seatName: "Platea, fila F, asiento 12" })
    ).toBe("Agregaste Platea, fila F, asiento 12. Llevas 1 de 2 asientos en Platea.")
  })

  it("announces an added seat that completes the selection", () => {
    expect(
      getSelectionAnnouncement({
        ...base,
        outcome: "added",
        seatName: "Platea, fila F, asiento 13",
        zoneCount: 2,
        isComplete: true,
      })
    ).toBe(
      "Agregaste Platea, fila F, asiento 13. Llevas 2 de 2 asientos en Platea. Ya elegiste todos tus asientos."
    )
  })

  it("uses the singular with quota 1", () => {
    expect(
      getSelectionAnnouncement({
        ...base,
        outcome: "added",
        seatName: "Platea, fila F, asiento 12",
        quota: 1,
      })
    ).toBe("Agregaste Platea, fila F, asiento 12. Llevas 1 de 1 asiento en Platea.")
  })

  it("announces a removed seat", () => {
    expect(
      getSelectionAnnouncement({ ...base, outcome: "removed", seatName: "Platea, fila F, asiento 12" })
    ).toBe("Quitaste Platea, fila F, asiento 12. Llevas 1 de 2 asientos en Platea.")
  })

  it("announces a full zone", () => {
    expect(
      getSelectionAnnouncement({ ...base, outcome: "zone-full", seatName: "x", zoneCount: 2 })
    ).toBe("Ya elegiste los 2 asientos de Platea. Quita uno para elegir otro.")
    expect(
      getSelectionAnnouncement({ ...base, outcome: "zone-full", seatName: "x", quota: 1 })
    ).toBe("Ya elegiste tu asiento de Platea. Quítalo para elegir otro.")
  })

  it("announces a zone not selected", () => {
    expect(
      getSelectionAnnouncement({
        ...base,
        outcome: "zone-not-selected",
        seatName: "Mezzanine, fila A, asiento 3",
        zoneName: "Mezzanine",
        zoneCount: 0,
        quota: 0,
      })
    ).toBe("Mezzanine no está en tu selección. Para agregarla, vuelve a Entradas.")
  })

  it("announces an unavailable seat", () => {
    expect(
      getSelectionAnnouncement({
        ...base,
        outcome: "unavailable",
        seatName: "Platea, fila F, asiento 12",
      })
    ).toBe("Platea, fila F, asiento 12 no está disponible.")
  })

  it("announces a cleared selection", () => {
    expect(getSelectionAnnouncement({ outcome: "cleared" })).toBe("Quitaste todos los asientos.")
  })
})
