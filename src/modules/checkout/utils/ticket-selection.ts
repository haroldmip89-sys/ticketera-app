import type { TicketType } from "@/modules/events/types/event.types"

/** Referencia: "Máximo 6 entradas por zona". */
export const MAX_TICKETS_PER_ZONE = 6
export const TICKETS_SEARCH_PARAM = "tickets"

/** ticketTypeId → cantidad entera 1..MAX. Las cantidades 0 no se guardan. */
export type TicketSelection = Readonly<Record<string, number>>

export type SelectionLine = {
  ticketTypeId: string
  name: string
  unitPrice: number
  quantity: number
  subtotal: number
}

const PAIR_SEPARATOR = ","
const QUANTITY_SEPARATOR = ":"
const POSITIVE_INTEGER = /^\d+$/

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function isSoldOut(ticketType: TicketType): boolean {
  return ticketType.availability === "sold-out"
}

export function getTicketQuantity(selection: TicketSelection, ticketTypeId: string): number {
  return Object.hasOwn(selection, ticketTypeId) ? selection[ticketTypeId] : 0
}

/** Selección NUEVA con la cantidad truncada y limitada a [0, MAX_TICKETS_PER_ZONE]; 0 elimina la clave.
 *  Si el tipo está agotado devuelve LA MISMA referencia. Nunca muta la entrada. */
export function setTicketQuantity(
  selection: TicketSelection,
  ticketType: TicketType,
  quantity: number
): TicketSelection {
  if (isSoldOut(ticketType)) return selection

  const clamped = Math.min(MAX_TICKETS_PER_ZONE, Math.max(0, Math.trunc(quantity) || 0))
  const next: Record<string, number> = { ...selection }
  if (clamped > 0) next[ticketType.id] = clamped
  else delete next[ticketType.id]
  return next
}

export function getTotalQuantity(selection: TicketSelection): number {
  return Object.values(selection).reduce((total, quantity) => total + quantity, 0)
}

/** Solo cantidades > 0, en el orden de ticketTypes; ignora ids desconocidos. subtotal = round2(unitPrice × quantity). */
export function getSelectionLines(
  selection: TicketSelection,
  ticketTypes: readonly TicketType[]
): SelectionLine[] {
  return ticketTypes.flatMap((ticketType) => {
    const quantity = getTicketQuantity(selection, ticketType.id)
    if (quantity <= 0) return []
    return [
      {
        ticketTypeId: ticketType.id,
        name: ticketType.name,
        unitPrice: ticketType.price,
        quantity,
        subtotal: round2(ticketType.price * quantity),
      },
    ]
  })
}

/** round2(Σ subtotal). */
export function getSelectionTotal(
  selection: TicketSelection,
  ticketTypes: readonly TicketType[]
): number {
  return round2(
    getSelectionLines(selection, ticketTypes).reduce((total, line) => total + line.subtotal, 0)
  )
}

/** "id:qty,id:qty" en el orden de ticketTypes (ignora desconocidos). Vacía → "". */
export function serializeTicketSelection(
  selection: TicketSelection,
  ticketTypes: readonly TicketType[]
): string {
  return getSelectionLines(selection, ticketTypes)
    .map((line) => `${line.ticketTypeId}${QUANTITY_SEPARATOR}${line.quantity}`)
    .join(PAIR_SEPARATOR)
}

/** Inverso tolerante: array → primer valor; ignora ids desconocidos o agotados, cantidades no enteras o ≤ 0
 *  y pares mal formados; trunca a MAX_TICKETS_PER_ZONE; si un id se repite, gana el primero. undefined → {}. */
export function parseTicketSelection(
  value: string | string[] | undefined,
  ticketTypes: readonly TicketType[]
): TicketSelection {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return {}

  const selectable = new Map(
    ticketTypes.filter((ticketType) => !isSoldOut(ticketType)).map((ticketType) => [ticketType.id, ticketType])
  )
  const selection: Record<string, number> = {}

  for (const pair of raw.split(PAIR_SEPARATOR)) {
    const parts = pair.split(QUANTITY_SEPARATOR)
    if (parts.length !== 2) continue

    const [ticketTypeId, rawQuantity] = parts
    if (!selectable.has(ticketTypeId) || Object.hasOwn(selection, ticketTypeId)) continue
    if (!POSITIVE_INTEGER.test(rawQuantity)) continue

    const quantity = Math.min(Number(rawQuantity), MAX_TICKETS_PER_ZONE)
    if (quantity > 0) selection[ticketTypeId] = quantity
  }

  return selection
}

/** baseHref + "?tickets=" + serialize (con URLSearchParams). Vacía → baseHref sin "?". */
export function buildPurchaseStepHref(
  baseHref: string,
  selection: TicketSelection,
  ticketTypes: readonly TicketType[]
): string {
  const serialized = serializeTicketSelection(selection, ticketTypes)
  if (!serialized) return baseHref
  return `${baseHref}?${new URLSearchParams({ [TICKETS_SEARCH_PARAM]: serialized })}`
}
