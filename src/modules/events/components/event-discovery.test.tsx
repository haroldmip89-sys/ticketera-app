import type { ComponentProps } from "react"
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { EventDiscovery } from "@/modules/events/components/event-discovery"
import { eventsService } from "@/modules/events/services/events.service"
import type { EventItem } from "@/modules/events/types/event.types"

vi.mock("next/image", () => ({
  default: ({ src, alt }: ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt} />
  ),
}))

let events: EventItem[]

beforeAll(async () => {
  events = await eventsService.getUpcoming()
})

afterEach(() => {
  cleanup()
})

function renderDiscovery() {
  render(<EventDiscovery events={events} />)

  const tiles = within(screen.getByRole("region", { name: "Explora por categoría" }))
  const chips = within(screen.getByRole("group", { name: "Filtrar por categoría" }))
  return { tiles, chips }
}

function getCardByTitle(title: string) {
  const card = screen.getByRole("link", { name: title }).closest("article")
  if (!card) throw new Error(`No se encontró la tarjeta de "${title}"`)
  return card
}

describe("EventDiscovery", () => {
  it("shows the first 8 upcoming events with 'Todos' active and no tile pressed", () => {
    const { tiles, chips } = renderDiscovery()

    expect(screen.getAllByRole("article")).toHaveLength(8)
    expect(chips.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true")
    for (const tile of tiles.getAllByRole("button")) {
      expect(tile).toHaveAttribute("aria-pressed", "false")
    }
  })

  it("filters by the tile category and toggles back to 'Todos' on a second click", async () => {
    const user = userEvent.setup()
    const { tiles, chips } = renderDiscovery()
    const concertsTile = tiles.getByRole("button", { name: "Conciertos" })

    await user.click(concertsTile)

    expect(screen.getAllByRole("article")).toHaveLength(4)
    expect(concertsTile).toHaveAttribute("aria-pressed", "true")
    expect(chips.getByRole("button", { name: "Conciertos" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByText("4 eventos")).toHaveAttribute("aria-live", "polite")

    await user.click(concertsTile)

    expect(screen.getAllByRole("article")).toHaveLength(8)
    expect(concertsTile).toHaveAttribute("aria-pressed", "false")
    expect(chips.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true")
  })

  it("shows the empty state for a category without events and resets to all", async () => {
    const user = userEvent.setup()
    const { chips } = renderDiscovery()

    await user.click(chips.getByRole("button", { name: "Cine" }))

    expect(screen.getByText("Todavía no hay eventos de Cine")).toBeInTheDocument()
    expect(screen.queryAllByRole("article")).toHaveLength(0)

    await user.click(screen.getByRole("button", { name: "Ver todos los eventos" }))

    expect(screen.getAllByRole("article")).toHaveLength(8)
    expect(chips.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true")
  })

  it("links each card to its detail page with the title as accessible name", () => {
    renderDiscovery()

    for (const event of events.slice(0, 8)) {
      expect(screen.getByRole("link", { name: event.title })).toHaveAttribute(
        "href",
        `/events/${event.slug}`
      )
    }
  })

  it("shows the availability badges on the matching cards", () => {
    renderDiscovery()

    expect(within(getCardByTitle("Electro Night Sessions")).getAllByText("Agotado").length).toBeGreaterThan(0)
    expect(within(getCardByTitle("Noche de Rock Sinfónico")).getByText("Últimas entradas")).toBeInTheDocument()
    expect(within(getCardByTitle("Festival Sonidos del Sur")).getByText("Últimas entradas")).toBeInTheDocument()
  })
})
