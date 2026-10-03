import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"

import type { TicketSelection } from "@/modules/checkout/utils/ticket-selection"
import type { EventItem, TicketType } from "@/modules/events/types/event.types"
import { SeatSelectionView } from "@/modules/seating/components/seat-selection-view"
import type { EventSeatMap } from "@/modules/seating/types/seating.types"
import { buildTheaterLayout } from "@/modules/seating/utils/theater-layout"

const EVENT: EventItem = {
  id: "evt-x",
  slug: "obra-de-prueba",
  title: "Obra de prueba",
  description: "Descripción",
  category: { id: "theater", label: "Teatro" },
  startsAt: "2026-11-20T20:00:00-05:00",
  doorsOpenAt: "2026-11-20T19:00:00-05:00",
  minAge: null,
  venue: { id: "teatro-prueba", name: "Teatro de prueba", city: "Lima", address: "Av. Siempre Viva 123" },
  imageUrl: "https://images.unsplash.com/photo-1",
  imageAlt: "",
  priceFrom: 45,
  availability: "available",
  seatSelection: "seat",
  isFeatured: false,
}

const TICKET_TYPES: TicketType[] = [
  { id: "evt-x-mezzanine", eventId: "evt-x", name: "Mezzanine", price: 45, availability: "available" },
  { id: "evt-x-platea", eventId: "evt-x", name: "Platea", price: 85, availability: "available" },
]

const SEAT_MAP: EventSeatMap = {
  eventId: "evt-x",
  layout: buildTheaterLayout({
    id: "test-layout",
    venueId: "teatro-prueba",
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
  }),
  soldSeatIds: ["platea-A-1"],
}

const SELECTION: TicketSelection = { "evt-x-platea": 2 }

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

function renderView() {
  render(
    <SeatSelectionView
      event={EVENT}
      seatMap={SEAT_MAP}
      ticketTypes={TICKET_TYPES}
      selection={SELECTION}
    />
  )
}

function clickSeat(seatId: string) {
  const seat = screen
    .getAllByRole("checkbox")
    .find((element) => element.getAttribute("data-seat-id") === seatId)
  if (!seat) throw new Error(`No existe el asiento ${seatId}`)
  fireEvent.click(seat)
}

function getAnnouncement() {
  return screen.getByRole("status")
}

function getSummary() {
  return screen.getByRole("complementary", { name: "Resumen de la compra" })
}

describe("SeatSelectionView", () => {
  it("elegir un asiento disponible de Platea actualiza el resumen y lo anuncia", () => {
    renderView()

    expect(within(getSummary()).getByText("Platea · 0 de 2")).toBeInTheDocument()
    clickSeat("platea-A-2")

    expect(within(getSummary()).getByText("Platea · 1 de 2")).toBeInTheDocument()
    expect(within(getSummary()).getByText("Fila A, asiento 2")).toBeInTheDocument()
    expect(getAnnouncement()).toHaveTextContent(
      "Agregaste Platea, fila A, asiento 2. Llevas 1 de 2 asientos en Platea."
    )
    expect(
      screen.getByRole("checkbox", { name: "Platea, fila A, asiento 2, $85, seleccionado" })
    ).toHaveAttribute("aria-checked", "true")
  })

  it("anuncia unavailable al tocar un vendido y zone-not-selected en Mezzanine", () => {
    renderView()

    clickSeat("platea-A-1")
    expect(getAnnouncement()).toHaveTextContent("Platea, fila A, asiento 1 no está disponible.")

    clickSeat("mezzanine-A-1")
    expect(getAnnouncement()).toHaveTextContent(
      "Mezzanine no está en tu selección. Para agregarla, vuelve a Entradas."
    )
    expect(within(getSummary()).getByText("Platea · 0 de 2")).toBeInTheDocument()
  })

  it("no elige un tercer asiento de Platea y repite el anuncio zone-full", () => {
    renderView()

    clickSeat("platea-A-2")
    clickSeat("platea-A-3")
    expect(getAnnouncement()).toHaveTextContent(
      "Agregaste Platea, fila A, asiento 3. Llevas 2 de 2 asientos en Platea. Ya elegiste todos tus asientos."
    )

    clickSeat("platea-A-4")
    const message = "Ya elegiste los 2 asientos de Platea. Quita uno para elegir otro."
    expect(getAnnouncement()).toHaveTextContent(message)
    const firstText = getAnnouncement().textContent

    clickSeat("platea-B-1")
    expect(getAnnouncement()).toHaveTextContent(message)
    expect(getAnnouncement().textContent).not.toBe(firstText)
    expect(within(getSummary()).getByText("Platea · 2 de 2")).toBeInTheDocument()
  })

  it("habilita Continuar con los asientos completos y enlaza con tickets y seats", () => {
    renderView()

    const disabled = screen.getAllByRole("button", { name: "Continuar" })
    expect(disabled).toHaveLength(2)
    disabled.forEach((cta) => expect(cta).toHaveAttribute("aria-disabled", "true"))
    expect(within(getSummary()).getByText("Te faltan 2 asientos.")).toBeInTheDocument()

    clickSeat("platea-B-2")
    expect(screen.queryByRole("link", { name: "Continuar" })).toBeNull()
    expect(within(getSummary()).getByText("Te falta 1 asiento.")).toBeInTheDocument()

    clickSeat("platea-A-2")
    const links = screen.getAllByRole("link", { name: "Continuar" })
    expect(links).toHaveLength(2)
    for (const link of links) {
      const url = new URL(link.getAttribute("href") ?? "", "http://localhost")
      expect(url.pathname).toBe("/events/obra-de-prueba/checkout")
      expect(url.searchParams.get("tickets")).toBe("evt-x-platea:2")
      expect(url.searchParams.get("seats")).toBe("platea-A-2,platea-B-2")
    }
  })

  it("Limpiar deja 0 asientos y anuncia cleared", () => {
    renderView()

    clickSeat("platea-A-2")
    fireEvent.click(within(getSummary()).getByRole("button", { name: "Limpiar" }))

    expect(within(getSummary()).getByText("Platea · 0 de 2")).toBeInTheDocument()
    expect(screen.getByText("0 de 2 asientos")).toBeInTheDocument()
    expect(getAnnouncement()).toHaveTextContent("Quitaste todos los asientos.")
    screen
      .getAllByRole("button", { name: "Limpiar" })
      .forEach((button) => expect(button).toBeDisabled())
  })

  it("los enlaces Cambiar cantidades vuelven a Entradas con la selección", () => {
    renderView()

    const links = screen.getAllByRole("link", { name: "Cambiar cantidades" })
    expect(links).toHaveLength(2)
    links.forEach((link) =>
      expect(link).toHaveAttribute("href", "/events/obra-de-prueba/tickets?tickets=evt-x-platea%3A2")
    )
  })
})
