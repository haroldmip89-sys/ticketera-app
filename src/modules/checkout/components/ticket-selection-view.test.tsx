import type { ComponentProps } from "react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { TicketSelectionView } from "@/modules/checkout/components/ticket-selection-view"
import type { TicketSelection } from "@/modules/checkout/utils/ticket-selection"
import { eventsService } from "@/modules/events/services/events.service"
import { seatingService } from "@/modules/seating/services/seating.service"

vi.mock("next/image", () => ({
  default: ({ src, alt }: ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt} />
  ),
}))

afterEach(() => {
  cleanup()
})

async function renderView(eventId: string, initialSelection: TicketSelection = {}) {
  const event = (await eventsService.getAll()).find((item) => item.id === eventId)
  if (!event) throw new Error(`No existe el evento ${eventId}`)
  const [ticketTypes, zoneMap] = await Promise.all([
    eventsService.getTicketTypes(eventId),
    seatingService.getZoneMap(eventId),
  ])

  render(
    <TicketSelectionView
      event={event}
      ticketTypes={ticketTypes}
      zoneMap={zoneMap}
      initialSelection={initialSelection}
    />
  )
  return { event, user: userEvent.setup() }
}

function getMap() {
  return screen.getByRole("group", { name: "Mapa de zonas" })
}

function getSummary() {
  return screen.getByRole("complementary", { name: "Resumen de la compra" })
}

function getContinueLinks() {
  return screen.getAllByRole("link", { name: "Continuar" })
}

function getStepperValue(zoneName: string) {
  const group = screen.getByRole("group", { name: `Cantidad de ${zoneName}` })
  return within(group).getByRole("status").textContent
}

describe("TicketSelectionView", () => {
  it("arranca sin zonas seleccionadas, con el resumen vacío y Continuar deshabilitado", async () => {
    await renderView("evt-002")

    const zones = within(getMap()).getAllByRole("button")
    expect(zones).toHaveLength(4)
    zones.forEach((zone) => expect(zone.getAttribute("aria-pressed")).toBe("false"))

    expect(
      within(getSummary()).getByText(
        "Todavía no elegiste entradas. Toca una zona o usa los botones +."
      )
    ).toBeDefined()

    const ctas = screen.getAllByRole("button", { name: "Continuar" })
    expect(ctas).toHaveLength(2)
    ctas.forEach((cta) => expect(cta.getAttribute("aria-disabled")).toBe("true"))
    expect(screen.queryByRole("link", { name: "Continuar" })).toBeNull()
  })

  it("pulsar una zona del mapa la selecciona sin agregar entradas", async () => {
    const { user } = await renderView("evt-002")

    const norte = within(getMap()).getByRole("button", { name: "Norte, $30" })
    await user.click(norte)

    expect(norte.getAttribute("aria-pressed")).toBe("true")
    expect(within(getSummary()).getByText("(0 entradas)")).toBeDefined()
    expect(getStepperValue("Norte")).toBe("0")
    expect(screen.queryByRole("link", { name: "Continuar" })).toBeNull()
  })

  it("agregar entradas actualiza el resumen, la zona seleccionada y el destino de Continuar", async () => {
    const { event, user } = await renderView("evt-002")

    const addSur = screen.getByRole("button", { name: "Agregar una entrada de Sur" })
    await user.click(addSur)
    await user.click(addSur)

    const summary = getSummary()
    expect(within(summary).getByText("2 × Sur")).toBeDefined()
    expect(within(summary).getByText("(2 entradas)")).toBeDefined()
    expect(within(summary).getAllByText("$60")).toHaveLength(2)

    expect(
      within(getMap()).getByRole("button", { name: "Sur, $30" }).getAttribute("aria-pressed")
    ).toBe("true")

    const links = getContinueLinks()
    expect(links).toHaveLength(2)
    for (const link of links) {
      const url = new URL(link.getAttribute("href") ?? "", "http://localhost")
      expect(url.pathname).toBe(`/events/${event.slug}/checkout`)
      expect(url.searchParams.get("tickets")).toBe("evt-002-sur:2")
    }
  })

  it("limita a 6 entradas por zona", async () => {
    const { user } = await renderView("evt-002")

    const addNorte = screen.getByRole("button", { name: "Agregar una entrada de Norte" })
    for (let i = 0; i < 6; i++) await user.click(addNorte)

    expect(getStepperValue("Norte")).toBe("6")
    expect(addNorte.getAttribute("aria-disabled")).toBe("true")

    await user.click(addNorte)
    expect(getStepperValue("Norte")).toBe("6")
  })

  it("muestra Agotado sin stepper en las zonas agotadas", async () => {
    await renderView("evt-002")

    const occidente = screen
      .getAllByRole("listitem")
      .find((item) => item.textContent?.includes("Occidente"))
    expect(occidente).toBeDefined()
    expect(within(occidente as HTMLElement).getByText("Agotado")).toBeDefined()
    expect(screen.queryByRole("group", { name: "Cantidad de Occidente" })).toBeNull()
  })

  it("en teatros, Continuar lleva al paso de asientos y muestra la nota", async () => {
    const { event, user } = await renderView("evt-001")

    await user.click(screen.getByRole("button", { name: "Agregar una entrada de Platea" }))

    for (const link of getContinueLinks()) {
      const url = new URL(link.getAttribute("href") ?? "", "http://localhost")
      expect(url.pathname).toBe(`/events/${event.slug}/seats`)
      expect(url.searchParams.get("tickets")).toBe("evt-001-platea:1")
    }
    expect(screen.getAllByText("En el siguiente paso eliges tus asientos.")).toHaveLength(2)
  })

  it("refleja la selección inicial en el stepper, el mapa y el resumen", async () => {
    await renderView("evt-003", { "evt-003-general": 3 })

    expect(getStepperValue("General")).toBe("3")
    expect(within(getSummary()).getByText("3 × General")).toBeDefined()
    expect(within(getSummary()).getByText("(3 entradas)")).toBeDefined()
    expect(
      within(getMap())
        .getAllByRole("button")
        .find((zone) => zone.getAttribute("aria-label")?.startsWith("General"))
        ?.getAttribute("aria-pressed")
    ).toBe("true")
    expect(getContinueLinks()).toHaveLength(2)
  })
})
