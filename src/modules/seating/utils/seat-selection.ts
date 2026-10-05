import {
  getTicketQuantity,
  serializeTicketSelection,
  TICKETS_SEARCH_PARAM,
  type TicketSelection,
} from "@/modules/checkout/utils/ticket-selection"
import type { TicketType } from "@/modules/events/types/event.types"
import { getEventCheckoutHref } from "@/modules/events/utils/event-routes"
import type {
  EventSeatMap,
  Seat,
  SeatQuotas,
  SeatRow,
  SeatSelectionSummary,
  SeatZone,
  ToggleSeatOutcome,
  VenueLayout,
  ZoneSeatProgress,
} from "@/modules/seating/types/seating.types"

export const SEATS_SEARCH_PARAM = "seats"
const SEAT_ID_SEPARATOR = ","

export type SeatLookupEntry = { seat: Seat; zone: SeatZone; row: SeatRow }

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

function getQuota(quotas: SeatQuotas, zoneId: string): number {
  return Object.hasOwn(quotas, zoneId) ? quotas[zoneId] : 0
}

export function createSeatLookup(layout: VenueLayout): ReadonlyMap<string, SeatLookupEntry> {
  const lookup = new Map<string, SeatLookupEntry>()
  for (const zone of layout.zones) {
    for (const row of zone.rows) {
      for (const seat of row.seats) lookup.set(seat.id, { seat, zone, row })
    }
  }
  return lookup
}

/** zoneId → TicketType. Lanza Error si falta el tipo de una zona. */
export function getZoneTicketTypes(
  layout: VenueLayout,
  ticketTypes: readonly TicketType[]
): ReadonlyMap<string, TicketType> {
  const byId = new Map(ticketTypes.map((ticketType) => [ticketType.id, ticketType]))
  return new Map(
    layout.zones.map((zone) => {
      const ticketType = byId.get(zone.ticketTypeId)
      if (!ticketType) throw new Error(`Missing ticket type "${zone.ticketTypeId}" for zone "${zone.id}"`)
      return [zone.id, ticketType]
    })
  )
}

/** zoneId → cantidad de selection[zone.ticketTypeId] (solo > 0). */
export function getSeatQuotas(layout: VenueLayout, selection: TicketSelection): SeatQuotas {
  const quotas: Record<string, number> = {}
  for (const zone of layout.zones) {
    const quantity = getTicketQuantity(selection, zone.ticketTypeId)
    if (quantity > 0) quotas[zone.id] = quantity
  }
  return quotas
}

/** Orden de reglas: 1) ya elegido → "removed"; 2) vendido (o desconocido) → "unavailable"; 3) zona sin cuota →
 *  "zone-not-selected"; 4) zona con su cuota completa → "zone-full"; 5) "added" (al final).
 *  En 2–4 devuelve LA MISMA referencia de array. Nunca muta. */
export function toggleSeatSelection(
  selectedSeatIds: readonly string[],
  seatId: string,
  ctx: {
    lookup: ReadonlyMap<string, SeatLookupEntry>
    soldSeatIds: ReadonlySet<string>
    quotas: SeatQuotas
  }
): { selectedSeatIds: readonly string[]; outcome: ToggleSeatOutcome } {
  if (selectedSeatIds.includes(seatId)) {
    return { selectedSeatIds: selectedSeatIds.filter((id) => id !== seatId), outcome: "removed" }
  }

  const entry = ctx.lookup.get(seatId)
  if (!entry || ctx.soldSeatIds.has(seatId)) return { selectedSeatIds, outcome: "unavailable" }

  const quota = getQuota(ctx.quotas, entry.zone.id)
  if (quota <= 0) return { selectedSeatIds, outcome: "zone-not-selected" }

  const zoneCount = selectedSeatIds.filter((id) => ctx.lookup.get(id)?.zone.id === entry.zone.id).length
  if (zoneCount >= quota) return { selectedSeatIds, outcome: "zone-full" }

  return { selectedSeatIds: [...selectedSeatIds, seatId], outcome: "added" }
}

/** zones: una por zona con cuota, en orden del layout, con sus asientos en orden de selección;
 *  required = Σ cuotas; total = round2(Σ precio de los asientos elegidos); isComplete = cada zona tiene exactamente su cuota
 *  (y hay al menos una). Ignora ids desconocidos. */
export function buildSeatSelectionSummary(
  layout: VenueLayout,
  ticketTypes: readonly TicketType[],
  selectedSeatIds: readonly string[],
  quotas: SeatQuotas
): SeatSelectionSummary {
  const lookup = createSeatLookup(layout)
  const zoneTicketTypes = getZoneTicketTypes(layout, ticketTypes)
  const selectedEntries = selectedSeatIds.flatMap((id) => {
    const entry = lookup.get(id)
    return entry ? [entry] : []
  })

  const zones: ZoneSeatProgress[] = layout.zones.flatMap((zone) => {
    const quota = getQuota(quotas, zone.id)
    if (quota <= 0) return []

    const ticketType = zoneTicketTypes.get(zone.id) as TicketType
    const seats = selectedEntries
      .filter((entry) => entry.zone.id === zone.id)
      .map(({ seat, row }) => ({
        seatId: seat.id,
        zoneId: zone.id,
        zoneName: zone.name,
        rowLabel: row.label,
        number: seat.number,
        accessible: seat.accessible,
        price: ticketType.price,
      }))
    return [{ zoneId: zone.id, zoneName: zone.name, ticketTypeId: zone.ticketTypeId, quota, seats }]
  })

  const allSeats = zones.flatMap((zone) => zone.seats)
  const required = zones.reduce((sum, zone) => sum + zone.quota, 0)
  return {
    zones,
    count: allSeats.length,
    required,
    total: round2(allSeats.reduce((sum, seat) => sum + seat.price, 0)),
    isComplete: required > 0 && zones.every((zone) => zone.seats.length === zone.quota),
  }
}

/** getEventCheckoutHref(slug) + "?tickets=" + serializeTicketSelection(...) + "&seats=" + ids en orden del layout
 *  separados por coma (URLSearchParams). */
export function buildSeatCheckoutHref(
  slug: string,
  selection: TicketSelection,
  ticketTypes: readonly TicketType[],
  layout: VenueLayout,
  selectedSeatIds: readonly string[]
): string {
  const selected = new Set(selectedSeatIds)
  const orderedSeatIds = [...createSeatLookup(layout).keys()].filter((id) => selected.has(id))
  const params = new URLSearchParams({
    [TICKETS_SEARCH_PARAM]: serializeTicketSelection(selection, ticketTypes),
    [SEATS_SEARCH_PARAM]: orderedSeatIds.join(SEAT_ID_SEPARATOR),
  })
  return `${getEventCheckoutHref(slug)}?${params}`
}

/** value: ids separados por "," (array → primer valor; undefined/"" → sin ids). Conserva los ids que existen en el layout
 *  y no están vendidos, sin repetir (gana el primero). Devuelve el resumen si queda isComplete; si no, null.
 *  Los asientos de zonas sin cuota se descartan (el resumen no los incluye). */
export function parseCompleteSeatSelection(
  value: string | string[] | undefined,
  seatMap: EventSeatMap,
  selection: TicketSelection,
  ticketTypes: readonly TicketType[]
): SeatSelectionSummary | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (!raw) return null

  // buildSeatSelectionSummary ya ignora los ids desconocidos.
  const sold = new Set(seatMap.soldSeatIds)
  const seatIds = [...new Set(raw.split(SEAT_ID_SEPARATOR))].filter((id) => !sold.has(id))
  const summary = buildSeatSelectionSummary(
    seatMap.layout,
    ticketTypes,
    seatIds,
    getSeatQuotas(seatMap.layout, selection)
  )
  return summary.isComplete ? summary : null
}

/** "Fila F, asiento 12" (mismo texto que el resumen de la 008). */
export function formatSeatPosition(seat: { rowLabel: string; number: number }): string {
  return `Fila ${seat.rowLabel}, asiento ${seat.number}`
}
