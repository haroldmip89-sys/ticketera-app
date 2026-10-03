import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"

import { SeatMap } from "@/modules/seating/components/seat-map"
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
      firstRowSeats: 4,
      seatsIncrementPerRow: 1,
    },
    {
      id: "mezzanine",
      name: "Mezzanine",
      ticketTypeId: "evt-x-mezzanine",
      rowLabels: ["A"],
      firstRowSeats: 4,
      seatsIncrementPerRow: 0,
    },
  ],
  accessibleSeatIds: ["platea-B-1"],
})

const SEAT_COUNT = 4 + 5 + 4

beforeAll(() => {
  // jsdom no implementa matchMedia (usePrefersReducedMotion).
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }),
  })
})

afterEach(() => {
  cleanup()
})

function renderMap({
  sold = ["platea-A-1"],
  selected = ["platea-A-3"],
  included = ["platea"],
}: { sold?: string[]; selected?: string[]; included?: string[] } = {}) {
  const onSeatActivate = vi.fn()
  render(
    <SeatMap
      layout={LAYOUT}
      venueName="Teatro de prueba"
      soldSeatIds={new Set(sold)}
      selectedSeatIds={new Set(selected)}
      includedZoneIds={new Set(included)}
      zonePrices={
        new Map([
          ["platea", 85],
          ["mezzanine", 45],
        ])
      }
      onSeatActivate={onSeatActivate}
    />,
  )
  return { onSeatActivate }
}

function getSeat(name: string) {
  return screen.getByRole("checkbox", { name })
}

describe("SeatMap", () => {
  it("renders the map group with its description and one checkbox per seat", () => {
    renderMap()

    const map = screen.getByRole("group", { name: "Mapa de asientos, Teatro de prueba" })
    expect(map).toHaveAccessibleDescription(/Usa las flechas para moverte entre asientos y filas/)
    expect(screen.getByRole("group", { name: "Platea, $85" })).toBeInTheDocument()
    expect(
      screen.getByRole("group", { name: "Mezzanine, $45, no incluida en tu selección" }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole("checkbox")).toHaveLength(SEAT_COUNT)
  })

  it("labels each seat with its state", () => {
    renderMap()

    expect(getSeat("Platea, fila A, asiento 2, $85, disponible")).not.toHaveAttribute(
      "aria-disabled",
    )
    expect(
      getSeat("Platea, fila B, asiento 1, accesible para silla de ruedas, $85, disponible"),
    ).toBeInTheDocument()
    expect(getSeat("Platea, fila A, asiento 3, $85, seleccionado")).toHaveAttribute(
      "aria-checked",
      "true",
    )
    expect(getSeat("Platea, fila A, asiento 2, $85, disponible")).toHaveAttribute(
      "aria-checked",
      "false",
    )
    expect(getSeat("Platea, fila A, asiento 1, vendido")).toHaveAttribute("aria-disabled", "true")
    expect(
      getSeat("Mezzanine, fila A, asiento 1, $45, no incluida en tu selección"),
    ).toHaveAttribute("aria-disabled", "true")
  })

  it("has a single tab stop on the first unsold seat of an included zone", () => {
    renderMap()

    const tabStops = screen
      .getAllByRole("checkbox")
      .filter((seat) => seat.getAttribute("tabindex") === "0")
    expect(tabStops).toHaveLength(1)
    expect(tabStops[0]).toHaveAttribute("data-seat-id", "platea-A-2")
  })

  it("moves focus and the tab stop with ArrowRight and ArrowDown", () => {
    renderMap()

    const start = getSeat("Platea, fila A, asiento 2, $85, disponible")
    start.focus()
    fireEvent.keyDown(start, { key: "ArrowRight" })

    const right = getSeat("Platea, fila A, asiento 3, $85, seleccionado")
    expect(right).toHaveFocus()
    expect(right).toHaveAttribute("tabindex", "0")
    expect(start).toHaveAttribute("tabindex", "-1")

    fireEvent.keyDown(right, { key: "ArrowDown" })
    expect(document.activeElement).toHaveAttribute(
      "data-seat-id",
      expect.stringMatching(/^platea-B-/),
    )
    expect(
      screen.getAllByRole("checkbox").filter((seat) => seat.getAttribute("tabindex") === "0"),
    ).toEqual([document.activeElement])
  })

  it("calls onSeatActivate with Enter, Space and click", () => {
    const { onSeatActivate } = renderMap()

    const seat = getSeat("Platea, fila A, asiento 2, $85, disponible")
    fireEvent.keyDown(seat, { key: "Enter" })
    fireEvent.keyDown(seat, { key: " " })
    fireEvent.click(getSeat("Platea, fila A, asiento 1, vendido"))

    expect(onSeatActivate).toHaveBeenNthCalledWith(1, "platea-A-2")
    expect(onSeatActivate).toHaveBeenNthCalledWith(2, "platea-A-2")
    expect(onSeatActivate).toHaveBeenNthCalledWith(3, "platea-A-1")
  })

  it("ignores a click that ends a drag", () => {
    const { onSeatActivate } = renderMap()

    const seat = getSeat("Platea, fila A, asiento 2, $85, disponible")
    fireEvent.pointerDown(seat, { clientX: 10, clientY: 10 })
    fireEvent.click(seat, { clientX: 30, clientY: 10 })

    expect(onSeatActivate).not.toHaveBeenCalled()
  })

  it("renders the zoom controls", () => {
    renderMap()

    expect(screen.getByRole("group", { name: "Controles de zoom" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Acercar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Alejar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Restablecer vista" })).toBeInTheDocument()
  })
})
