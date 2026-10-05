import {
  serializeTicketSelection,
  TICKETS_SEARCH_PARAM,
  type SelectionLine,
  type TicketSelection,
} from "@/modules/checkout/utils/ticket-selection"
import type { TicketType } from "@/modules/events/types/event.types"
import { getEventConfirmationHref } from "@/modules/events/utils/event-routes"
import { SEATS_SEARCH_PARAM } from "@/modules/seating/utils/seat-selection"

/** Mock de `platform_settings` (system design §6.4). Cargo confirmado por el usuario: 10 % + $1.50 por pedido; reserva de 10 min. */
export type CheckoutSettings = {
  /** Puntos básicos: 1000 = 10 %. */
  serviceFeeBps: number
  /** Cargo fijo por pedido, en centavos. */
  serviceFeeFixedCents: number
  reservationMinutes: number
}

export const CHECKOUT_SETTINGS: Readonly<CheckoutSettings> = {
  serviceFeeBps: 1000,
  serviceFeeFixedCents: 150,
  reservationMinutes: 10,
}

export type OrderTotals = { subtotalCents: number; serviceFeeCents: number; totalCents: number }

export const ORDER_SEARCH_PARAM = "order"
/** Formato de `orders.code` (§6.4). */
export const ORDER_CODE_PATTERN = /^TK-\d{5}$/

const SEAT_ID_SEPARATOR = ","
const BPS_DIVISOR = 10000

/** Math.round(amount × 100). Lanza RangeError si amount no es finito o es < 0. 19.99 → 1999. */
export function toCents(amount: number): number {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new RangeError(`Invalid amount: ${amount}`)
  }
  return Math.round(amount * 100)
}

/** cents / 100 (para formatPrice). 6750 → 67.5. */
export function fromCents(cents: number): number {
  return cents / 100
}

/** Σ toCents(line.unitPrice) × line.quantity (enteros: sin error de coma flotante). [] → 0. */
export function getSubtotalCents(lines: readonly SelectionLine[]): number {
  return lines.reduce((total, line) => total + toCents(line.unitPrice) * line.quantity, 0)
}

/** Fórmula §5.3: serviceFeeCents = Math.round(subtotalCents × bps / 10000) + fixedCents; totalCents = subtotal + fee.
 *  subtotalCents = 0 → { 0, 0, 0 } (sin cargo en un pedido vacío). Lanza RangeError si subtotalCents no es entero ≥ 0. */
export function calculateOrderTotals(
  subtotalCents: number,
  settings: Pick<CheckoutSettings, "serviceFeeBps" | "serviceFeeFixedCents"> = CHECKOUT_SETTINGS
): OrderTotals {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new RangeError(`Invalid subtotal in cents: ${subtotalCents}`)
  }
  if (subtotalCents === 0) return { subtotalCents: 0, serviceFeeCents: 0, totalCents: 0 }

  const serviceFeeCents =
    Math.round((subtotalCents * settings.serviceFeeBps) / BPS_DIVISOR) + settings.serviceFeeFixedCents
  return { subtotalCents, serviceFeeCents, totalCents: subtotalCents + serviceFeeCents }
}

/** "TK-" + (10000 + Math.floor(random() × 90000)). random() = 0 → "TK-10000"; 0.99999 → "TK-99999". */
export function createMockOrderCode(random: () => number = Math.random): string {
  return `TK-${10000 + Math.floor(random() * 90000)}`
}

export function isOrderCode(value: unknown): value is string {
  return typeof value === "string" && ORDER_CODE_PATTERN.test(value)
}

/** getEventConfirmationHref(slug) + "?" + order, tickets y, solo si seatIds no está vacío, seats (en el orden recibido).
 *  Lanza Error si orderCode no cumple ORDER_CODE_PATTERN. NUNCA incluye datos del comprador ni de pago. */
export function buildConfirmationHref(input: {
  slug: string
  orderCode: string
  selection: TicketSelection
  ticketTypes: readonly TicketType[]
  seatIds?: readonly string[]
}): string {
  const { slug, orderCode, selection, ticketTypes, seatIds = [] } = input
  if (!isOrderCode(orderCode)) throw new Error(`Invalid order code "${orderCode}"`)

  const params = new URLSearchParams({
    [ORDER_SEARCH_PARAM]: orderCode,
    [TICKETS_SEARCH_PARAM]: serializeTicketSelection(selection, ticketTypes),
  })
  if (seatIds.length > 0) params.set(SEATS_SEARCH_PARAM, seatIds.join(SEAT_ID_SEPARATOR))
  return `${getEventConfirmationHref(slug)}?${params}`
}
