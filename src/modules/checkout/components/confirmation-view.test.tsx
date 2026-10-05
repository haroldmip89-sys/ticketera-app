import type { ComponentProps } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"

import {
  ConfirmationNotFound,
  MY_TICKETS_HREF,
} from "@/modules/checkout/components/confirmation-not-found"
import { ConfirmationView } from "@/modules/checkout/components/confirmation-view"
import {
  buildConfirmationTickets,
  getConfirmationTotals,
  parseConfirmationState,
} from "@/modules/checkout/utils/order-confirmation"
import { eventsService } from "@/modules/events/services/events.service"
import { seatingService } from "@/modules/seating/services/seating.service"

vi.mock("next/image", () => ({
  default: ({ src, alt }: ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt} />
  ),
}))

afterEach(cleanup)

async function renderConfirmation(
  eventId: string,
  params: { order: string; tickets: string; seats?: string }
) {
  const event = (await eventsService.getAll()).find((item) => item.id === eventId)
  if (!event) throw new Error(`No existe el evento ${eventId}`)
  const ticketTypes = await eventsService.getTicketTypes(eventId)
  const seatMap =
    event.seatSelection === "seat" ? ((await seatingService.getSeatMap(eventId)) ?? null) : null
  const state = parseConfirmationState(params, { ticketTypes, seatMap })
  if (!state) throw new Error("Estado de confirmación inválido")

  render(
    <ConfirmationView
      event={event}
      orderCode={state.orderCode}
      tickets={buildConfirmationTickets(state, ticketTypes)}
      totals={getConfirmationTotals(state, ticketTypes)}
    />
  )
}

describe("ConfirmationView", () => {
  it("muestra el caso de referencia: pedido, resumen, 3 entradas y Qué sigue", async () => {
    await renderConfirmation("evt-002", {
      order: "TK-24817",
      tickets: "evt-002-sur:2,evt-002-oriente:1",
    })

    const headings = screen.getAllByRole("heading", { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0].textContent).toBe("¡Compra confirmada!")
    expect(screen.getByText("TK-24817")).toBeDefined()
    expect(screen.getByText(/Pedido N\.º/)).toBeDefined()
    expect(screen.getByText("$14.50")).toBeDefined()
    expect(screen.getByText("$144.50")).toBeDefined()
    expect(
      screen.getByText("Modo demo: no se realizó ningún cargo ni se envió ningún correo.")
    ).toBeDefined()

    const ticketsSection = screen.getByRole("region", { name: "Tus entradas" })
    const articles = within(ticketsSection).getAllByRole("article")
    expect(articles.map((article) => article.getAttribute("aria-label"))).toEqual([
      "Entrada 1 de 3: Sur",
      "Entrada 2 de 3: Sur",
      "Entrada 3 de 3: Oriente",
    ])
    for (const position of [1, 2, 3]) {
      expect(within(ticketsSection).getByText(`Entrada ${position} de 3`)).toBeDefined()
    }
    const qrs = ticketsSection.querySelectorAll('svg[aria-hidden="true"][viewBox="0 0 21 21"]')
    expect(qrs).toHaveLength(3)

    const nextSteps = screen.getByRole("region", { name: "Qué sigue" })
    expect(within(nextSteps).getAllByRole("listitem")).toHaveLength(3)
    expect(within(nextSteps).getByText("Revisa tu correo")).toBeDefined()
    expect(within(nextSteps).getByText("Muestra tu QR")).toBeDefined()
    expect(within(nextSteps).getByText("Todo en Mis entradas")).toBeDefined()

    expect(document.body.textContent).not.toMatch(/@/)
  })

  it("en teatro muestra el asiento de cada entrada", async () => {
    const seatMap = await seatingService.getSeatMap("evt-001")
    if (!seatMap) throw new Error("evt-001 sin mapa de asientos")
    const sold = new Set(seatMap.soldSeatIds)
    const platea = seatMap.layout.zones.find((zone) => zone.ticketTypeId === "evt-001-platea")
    const freeSeats = (platea?.rows ?? [])
      .flatMap((row) => row.seats.map((seat) => ({ seat, row })))
      .filter(({ seat }) => !sold.has(seat.id))
      .slice(0, 2)

    await renderConfirmation("evt-001", {
      order: "TK-10001",
      tickets: "evt-001-platea:2",
      seats: freeSeats.map(({ seat }) => seat.id).join(","),
    })

    const articles = within(screen.getByRole("region", { name: "Tus entradas" })).getAllByRole(
      "article"
    )
    expect(articles).toHaveLength(2)
    freeSeats.forEach(({ seat, row }, index) => {
      const seatLabel = `Fila ${row.label}, asiento ${seat.number}`
      expect(articles[index].getAttribute("aria-label")).toBe(
        `Entrada ${index + 1} de 2: Platea, ${seatLabel}`
      )
      expect(within(articles[index]).getByText("Asiento")).toBeDefined()
      expect(within(articles[index]).getByText(seatLabel)).toBeDefined()
    })
  })
})

describe("ConfirmationNotFound", () => {
  it("muestra el estado de pedido no encontrado con sus dos links", () => {
    render(<ConfirmationNotFound />)

    const headings = screen.getAllByRole("heading", { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0].textContent).toBe("No encontramos tu pedido")
    expect(
      screen.getByText(
        "El enlace de confirmación está incompleto o no es válido. Si ya compraste, tus entradas están en Mis entradas."
      )
    ).toBeDefined()

    const links = screen.getAllByRole("link")
    expect(links.map((link) => link.textContent)).toEqual(["Mis entradas", "Volver al inicio"])
    expect(links[0].getAttribute("href")).toBe(MY_TICKETS_HREF)
    expect(MY_TICKETS_HREF).toBe("/my-tickets")
    expect(links[1].getAttribute("href")).toBe("/")

    expect(screen.queryByRole("article")).toBeNull()
    expect(screen.queryByRole("status")).toBeNull()
  })
})
