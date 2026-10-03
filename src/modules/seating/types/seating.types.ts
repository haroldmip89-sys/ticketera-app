/** Alto de cada fila del mapa; la UI lo traduce a px por breakpoint. */
export type ZoneMapRowSize = "stage" | "sm" | "md" | "lg"

/** Valores CSS de grid-column / grid-row, p. ej. "2", "1 / -1", "1 / 4". */
export type ZoneMapArea = { column: string; row: string }

/** Mapa esquemático (CSS grid) del recinto de un evento. */
export type ZoneMap = {
  eventId: string
  /** 3 = lateral izquierdo, centro, lateral derecho. */
  columns: 1 | 3
  rows: readonly ZoneMapRowSize[]
  stage: { label: string; area: ZoneMapArea }
  zones: readonly { ticketTypeId: string; area: ZoneMapArea }[]
}

/** Unidades del viewBox, con 2 decimales como máximo. */
export type Point = { x: number; y: number }

export type Seat = {
  /** `${zoneId}-${rowLabel}-${number}`, p. ej. "platea-F-12". */
  id: string
  zoneId: string
  rowLabel: string
  /** 1..n de izquierda a derecha. */
  number: number
  x: number
  y: number
  /** Atributo combinable con cualquier estado. */
  accessible: boolean
}

export type SeatRow = { label: string; seats: Seat[]; labelPositions: { start: Point; end: Point } }

export type SeatZone = {
  /** "platea" | "mezzanine". */
  id: string
  name: string
  /** TicketType.id: el precio no se duplica. */
  ticketTypeId: string
  /** Desde el escenario hacia atrás. */
  rows: SeatRow[]
  labelPosition: Point
}

export type Stage = { x: number; y: number; width: number; height: number; label: string }

export type VenueLayout = {
  id: string
  venueId: string
  kind: "theater"
  width: number
  height: number
  seatRadius: number
  stage: Stage
  zones: SeatZone[]
}

/** Geometría (estática) separada de disponibilidad (volátil). */
export type EventSeatMap = { eventId: string; layout: VenueLayout; soldSeatIds: string[] }

/** Derivado: sold > selected > available. */
export type SeatStatus = "available" | "selected" | "sold"
export type ToggleSeatOutcome = "added" | "removed" | "unavailable" | "zone-full" | "zone-not-selected"

/** zoneId → cantidad pedida en el paso de zonas (007). Zonas sin cuota = no incluidas. */
export type SeatQuotas = Readonly<Record<string, number>>

export type SelectedSeat = {
  seatId: string
  zoneId: string
  zoneName: string
  rowLabel: string
  number: number
  accessible: boolean
  price: number
}

export type ZoneSeatProgress = {
  zoneId: string
  zoneName: string
  ticketTypeId: string
  quota: number
  seats: SelectedSeat[]
}

export type SeatSelectionSummary = {
  zones: ZoneSeatProgress[]
  count: number
  required: number
  total: number
  isComplete: boolean
}
