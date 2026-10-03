import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"

import { EventTicketsPanel } from "@/modules/events/components/event-tickets-panel"
import { eventsService } from "@/modules/events/services/events.service"
import type { EventItem } from "@/modules/events/types/event.types"

afterEach(() => {
  cleanup()
})

async function getEvent(id: string): Promise<EventItem> {
  const event = (await eventsService.getAll()).find((item) => item.id === id)
  if (!event) throw new Error(`No existe el evento ${id}`)
  return event
}

async function renderPanel(id: string) {
  const event = await getEvent(id)
  const ticketTypes = await eventsService.getTicketTypes(id)
  render(<EventTicketsPanel event={event} ticketTypes={ticketTypes} />)
  return event
}

function getRows() {
  const section = screen.getByRole("region", { name: "Entradas" })
  return within(section).getAllByRole("listitem")
}

describe("EventTicketsPanel", () => {
  it("lista las zonas en el orden recibido con su precio o Agotado", async () => {
    await renderPanel("evt-002")

    const rows = getRows()
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining("Norte"),
      expect.stringContaining("Sur"),
      expect.stringContaining("Oriente"),
      expect.stringContaining("Occidente"),
    ])

    const occidente = rows[3]
    expect(within(occidente).getByText("Agotado")).toBeDefined()
    expect(occidente.textContent).not.toContain("$")

    expect(within(rows[2]).getByText("$70")).toBeDefined()
  })

  it("muestra el badge Últimas en las zonas con últimas entradas", async () => {
    await renderPanel("evt-001")

    const [mezzanine, platea] = getRows()
    expect(within(platea).getByText("Últimas")).toBeDefined()
    expect(within(mezzanine).queryByText("Últimas")).toBeNull()
  })

  it("enlaza el CTA Elegir entradas al paso de selección", async () => {
    const event = await renderPanel("evt-001")

    const cta = screen.getByRole("link", { name: "Elegir entradas" })
    expect(cta.getAttribute("href")).toBe(`/events/${event.slug}/tickets`)
  })

  it("deshabilita el CTA cuando el evento está agotado", async () => {
    await renderPanel("evt-006")

    const cta = screen.getByRole("button", { name: "Agotado" })
    expect(cta.getAttribute("aria-disabled")).toBe("true")
    expect(cta.hasAttribute("href")).toBe(false)
    expect(screen.queryByRole("link", { name: "Elegir entradas" })).toBeNull()
  })
})
