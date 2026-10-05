import { describe, expect, it } from "vitest"

import { getDecorativeQrCells } from "@/components/shared/decorative-qr"
import {
  buildConfirmationTickets,
  parseConfirmationState,
  type ConfirmationTicket,
} from "@/modules/checkout/utils/order-confirmation"
import { buildTicketPdfPages, getTicketPdfFileName, type TicketPdfPage } from "@/modules/checkout/utils/ticket-pdf"
import { EVENTS_MOCK } from "@/modules/events/data/events.mock"
import { TICKET_TYPES_MOCK } from "@/modules/events/data/ticket-types.mock"
import type { EventItem } from "@/modules/events/types/event.types"

function getEvent(id: string): EventItem {
  const event = EVENTS_MOCK.find((item) => item.id === id)
  if (!event) throw new Error(`missing ${id}`)
  return event
}

function referenceTickets(): ConfirmationTicket[] {
  const ticketTypes = TICKET_TYPES_MOCK.filter((ticketType) => ticketType.eventId === "evt-002")
  const state = parseConfirmationState(
    { order: "TK-24817", tickets: "evt-002-sur:2,evt-002-oriente:1" },
    { ticketTypes, seatMap: null }
  )
  if (!state) throw new Error("expected a valid state")
  return buildConfirmationTickets(state, ticketTypes)
}

function referencePages(): TicketPdfPage[] {
  return buildTicketPdfPages({ event: getEvent("evt-002"), orderCode: "TK-24817", tickets: referenceTickets() })
}

const WIN_ANSI_EXTRAS = new Set(["—", "–", "‘", "’", "“", "”", "…", "•"])

describe("buildTicketPdfPages", () => {
  it("builds one page per ticket for the reference order", () => {
    const tickets = referenceTickets()
    const pages = referencePages()

    expect(pages).toHaveLength(3)
    expect(pages.map((page) => page.positionLabel)).toEqual(["Entrada 1 de 3", "Entrada 2 de 3", "Entrada 3 de 3"])
    expect(pages.map((page) => page.zoneLabel)).toEqual(["Sur", "Sur", "Oriente"])
    expect(pages.map((page) => page.priceLabel)).toEqual(["$30", "$30", "$70"])

    for (const [index, page] of pages.entries()) {
      expect(page.eventTitle).toBe("Clásico del Fútbol: Final de Temporada")
      expect(page.dateLabel).toBe("domingo 4 de octubre de 2026 · 4:00 p. m.")
      expect(page.doorsLabel).toBe("Apertura de puertas: 1:30 p. m.")
      expect(page.venueLabel).toBe("Estadio Nacional, Av. del Deporte 1200, Lima")
      expect(page.orderLabel).toBe("Pedido N.º TK-24817")
      expect(page.seatLabel).toBeNull()
      expect(page.qrCells).toHaveLength(441)
      expect(page.qrCells).toEqual(getDecorativeQrCells(tickets[index].qrSeed))
    }

    expect(pages[0].qrCells).not.toEqual(pages[1].qrCells)
    expect(pages[1].qrCells).not.toEqual(pages[2].qrCells)
  })

  it("keeps the seat labels of a theater order in ticket order", () => {
    const tickets: ConfirmationTicket[] = [
      { key: "TK-10001-1", position: 1, total: 2, ticketTypeName: "Platea", seatLabel: "Fila B, asiento 2", unitPrice: 85, qrSeed: 1000101 },
      { key: "TK-10001-2", position: 2, total: 2, ticketTypeName: "Platea", seatLabel: "Fila A, asiento 1", unitPrice: 85, qrSeed: 1000102 },
    ]

    const pages = buildTicketPdfPages({ event: getEvent("evt-001"), orderCode: "TK-10001", tickets })

    expect(pages.map((page) => page.seatLabel)).toEqual(["Fila B, asiento 2", "Fila A, asiento 1"])
    expect(pages[0].venueLabel).toBe("Teatro Municipal, Jr. Las Artes 377, Cercado de Lima, Lima")
  })

  it("returns no pages without tickets", () => {
    expect(buildTicketPdfPages({ event: getEvent("evt-002"), orderCode: "TK-24817", tickets: [] })).toEqual([])
  })

  it("only uses characters representable in WinAnsi", () => {
    for (const page of referencePages()) {
      const strings = Object.values(page).filter((value): value is string => typeof value === "string")
      for (const char of strings.join("")) {
        expect(char.codePointAt(0)! <= 0xff || WIN_ANSI_EXTRAS.has(char), `unexpected "${char}"`).toBe(true)
      }
    }
  })
})

describe("getTicketPdfFileName", () => {
  it("prefixes the order code", () => {
    expect(getTicketPdfFileName("TK-24817")).toBe("ticketera-TK-24817.pdf")
  })
})
