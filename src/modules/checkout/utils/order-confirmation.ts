import {
  calculateOrderTotals,
  getSubtotalCents,
  isOrderCode,
  type OrderTotals,
} from "@/modules/checkout/utils/checkout-order"
import {
  getSelectionLines,
  getTotalQuantity,
  parseTicketSelection,
  type TicketSelection,
} from "@/modules/checkout/utils/ticket-selection"
import type { TicketType } from "@/modules/events/types/event.types"
import type { EventSeatMap, SeatSelectionSummary } from "@/modules/seating/types/seating.types"
import { formatSeatPosition, parseCompleteSeatSelection } from "@/modules/seating/utils/seat-selection"

export type ConfirmationState = {
  /** Cumple ORDER_CODE_PATTERN. */
  orderCode: string
  /** No vacía. */
  selection: TicketSelection
  /** Completa en teatro; null en eventos por zona. */
  seatSummary: SeatSelectionSummary | null
}

type SearchParamValue = string | string[] | undefined

/** order: array → primer valor; si !isOrderCode → null.
 *  selection = parseTicketSelection(tickets, ticketTypes); vacía → null.
 *  seatMap !== null (evento de teatro): seatSummary = parseCompleteSeatSelection(seats, seatMap, selection, ticketTypes);
 *  si es null → null. seatMap === null (evento por zona): `seats` se ignora y seatSummary = null. */
export function parseConfirmationState(
  params: { order?: SearchParamValue; tickets?: SearchParamValue; seats?: SearchParamValue },
  ctx: { ticketTypes: readonly TicketType[]; seatMap: EventSeatMap | null }
): ConfirmationState | null {
  const orderCode = Array.isArray(params.order) ? params.order[0] : params.order
  if (!isOrderCode(orderCode)) return null

  const selection = parseTicketSelection(params.tickets, ctx.ticketTypes)
  if (getTotalQuantity(selection) === 0) return null

  if (ctx.seatMap === null) return { orderCode, selection, seatSummary: null }

  const seatSummary = parseCompleteSeatSelection(params.seats, ctx.seatMap, selection, ctx.ticketTypes)
  return seatSummary ? { orderCode, selection, seatSummary } : null
}

export type ConfirmationTicket = {
  /** `${orderCode}-${position}` (único). */
  key: string
  /** 1..total. */
  position: number
  /** Cantidad de entradas del pedido. */
  total: number
  ticketTypeName: string
  /** formatSeatPosition(...) en teatro; null en zona. */
  seatLabel: string | null
  /** Dólares (precio del tipo de entrada). */
  unitPrice: number
  /** Number(dígitos del código) × 100 + position (determinista). */
  qrSeed: number
}

type TicketUnit = Pick<ConfirmationTicket, "ticketTypeName" | "seatLabel" | "unitPrice">

function getTicketUnits(state: ConfirmationState, ticketTypes: readonly TicketType[]): TicketUnit[] {
  if (state.seatSummary === null) {
    return getSelectionLines(state.selection, ticketTypes).flatMap((line) =>
      Array.from({ length: line.quantity }, () => ({
        ticketTypeName: line.name,
        seatLabel: null,
        unitPrice: line.unitPrice,
      }))
    )
  }

  const namesById = new Map(ticketTypes.map((ticketType) => [ticketType.id, ticketType.name]))
  return state.seatSummary.zones.flatMap((zone) =>
    zone.seats.map((seat) => ({
      ticketTypeName: namesById.get(zone.ticketTypeId) ?? zone.zoneName,
      seatLabel: formatSeatPosition(seat),
      unitPrice: seat.price,
    }))
  )
}

/** Una por unidad.
 *  Zona: por cada línea de getSelectionLines(selection, ticketTypes), en ese orden (precio ascendente), repetida `quantity` veces.
 *  Teatro: por cada zona de seatSummary.zones (orden del layout) y cada asiento en su orden; ticketTypeName = nombre del
 *  TicketType de zone.ticketTypeId; unitPrice = seat.price. */
export function buildConfirmationTickets(
  state: ConfirmationState,
  ticketTypes: readonly TicketType[]
): ConfirmationTicket[] {
  const units = getTicketUnits(state, ticketTypes)
  const orderNumber = Number(state.orderCode.replace(/\D/g, ""))

  return units.map((unit, index) => {
    const position = index + 1
    return {
      key: `${state.orderCode}-${position}`,
      position,
      total: units.length,
      ...unit,
      qrSeed: orderNumber * 100 + position,
    }
  })
}

/** calculateOrderTotals(getSubtotalCents(getSelectionLines(state.selection, ticketTypes))). Mismo cálculo que el checkout. */
export function getConfirmationTotals(
  state: ConfirmationState,
  ticketTypes: readonly TicketType[]
): OrderTotals {
  return calculateOrderTotals(getSubtotalCents(getSelectionLines(state.selection, ticketTypes)))
}
