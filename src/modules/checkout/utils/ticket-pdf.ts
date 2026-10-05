import { getDecorativeQrCells } from "@/components/shared/decorative-qr"
import { formatDateLongWithYear, formatPrice, formatTime } from "@/lib/format"
import type { ConfirmationTicket } from "@/modules/checkout/utils/order-confirmation"
import type { EventItem } from "@/modules/events/types/event.types"
import { formatVenueLocation } from "@/modules/events/utils/event-venue"

export type TicketPdfPage = {
  eventTitle: string
  /** "domingo 4 de octubre de 2026 · 4:00 p. m." */
  dateLabel: string
  /** "Apertura de puertas: 1:30 p. m." */
  doorsLabel: string
  /** formatVenueLocation(event.venue). */
  venueLabel: string
  zoneLabel: string
  /** "Fila F, asiento 12" en teatro; null en zona. */
  seatLabel: string | null
  /** "$30" */
  priceLabel: string
  /** getDecorativeQrCells(ticket.qrSeed): 441 celdas, fila por fila. */
  qrCells: boolean[]
  /** "Entrada 1 de 3" */
  positionLabel: string
  /** "Pedido N.º TK-24817" */
  orderLabel: string
}

export const TICKET_PDF_MIME_TYPE = "application/pdf"

/** Una página por ticket, en el orden recibido. Pura (sin jsPDF ni DOM). Sin PII. tickets vacío → []. */
export function buildTicketPdfPages(input: {
  event: Pick<EventItem, "title" | "startsAt" | "doorsOpenAt" | "venue">
  orderCode: string
  tickets: readonly ConfirmationTicket[]
}): TicketPdfPage[] {
  const { event, orderCode, tickets } = input
  const dateLabel = `${formatDateLongWithYear(event.startsAt)} · ${formatTime(event.startsAt)}`
  const doorsLabel = `Apertura de puertas: ${formatTime(event.doorsOpenAt)}`
  const venueLabel = formatVenueLocation(event.venue)
  const orderLabel = `Pedido N.º ${orderCode}`

  return tickets.map((ticket) => ({
    eventTitle: event.title,
    dateLabel,
    doorsLabel,
    venueLabel,
    zoneLabel: ticket.ticketTypeName,
    seatLabel: ticket.seatLabel,
    priceLabel: formatPrice(ticket.unitPrice),
    qrCells: getDecorativeQrCells(ticket.qrSeed),
    positionLabel: `Entrada ${ticket.position} de ${ticket.total}`,
    orderLabel,
  }))
}

/** "ticketera-TK-24817.pdf" */
export function getTicketPdfFileName(orderCode: string): string {
  return `ticketera-${orderCode}.pdf`
}
