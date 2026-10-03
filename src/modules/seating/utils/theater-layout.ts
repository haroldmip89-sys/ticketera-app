import type { Point, Seat, SeatRow, SeatZone, VenueLayout } from "@/modules/seating/types/seating.types"

export type TheaterZoneConfig = {
  id: string
  name: string
  ticketTypeId: string
  rowLabels: readonly string[]
  firstRowSeats: number
  seatsIncrementPerRow: number
}

export type TheaterLayoutConfig = {
  id: string
  venueId: string
  zones: readonly TheaterZoneConfig[]
  accessibleSeatIds?: readonly string[]
}

const SEAT_RADIUS = 5
/** Distancia entre centros de asientos contiguos, medida sobre el arco. */
const SEAT_STEP = 13
const ROW_SPACING = 15
const FIRST_ROW_RADIUS = 160
const ZONE_GAP = 45
const PADDING = 24
const STAGE_WIDTH = 200
const STAGE_HEIGHT = 40
/** Separación entre el borde inferior del escenario y el asiento más alto. */
const STAGE_GAP = 40
const STAGE_LABEL = "Escenario"

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/** Punto del arco de radio `radius` a una distancia `offset` (sobre el arco) del eje; centro en (0, 0), eje hacia abajo. */
function pointOnArc(radius: number, offset: number): Point {
  const angle = offset / radius
  return { x: radius * Math.sin(angle), y: radius * Math.cos(angle) }
}

/** Posición (0..n+1) de cada asiento: bloques floor(n/4), n − 2·floor(n/4), floor(n/4); cada pasillo ocupa una posición. */
function getSlot(seatNumber: number, seatCount: number): number {
  const sideBlock = Math.floor(seatCount / 4)
  if (seatNumber <= sideBlock) return seatNumber - 1
  if (seatNumber <= seatCount - sideBlock) return seatNumber
  return seatNumber + 1
}

/** Distancia sobre el arco desde el eje para una posición; n + 2 posiciones centradas. */
function getSlotOffset(slot: number, seatCount: number): number {
  return (slot - (seatCount + 1) / 2) * SEAT_STEP
}

function validate(config: TheaterLayoutConfig): void {
  if (config.zones.length === 0) throw new Error("Layout needs at least 1 zone")
  const zoneIds = new Set<string>()
  for (const zone of config.zones) {
    if (zoneIds.has(zone.id)) throw new Error(`Duplicated zone id "${zone.id}"`)
    zoneIds.add(zone.id)
    if (zone.rowLabels.length === 0) throw new Error(`Zone "${zone.id}" has no rows`)
    if (zone.firstRowSeats < 1) throw new Error(`Zone "${zone.id}" needs at least 1 seat per row`)
  }
}

/** Pura y determinista. Lanza Error si la config es inválida. */
export function buildTheaterLayout(config: TheaterLayoutConfig): VenueLayout {
  validate(config)

  const accessibleIds = new Set(config.accessibleSeatIds ?? [])
  const usedAccessibleIds = new Set<string>()
  const zoneRadii: { first: number; last: number }[] = []
  let radius = FIRST_ROW_RADIUS

  // Coordenadas locales: centro de los arcos en (0, 0).
  const zones: Omit<SeatZone, "labelPosition">[] = config.zones.map((zoneConfig) => {
    const firstRadius = radius
    const rows: SeatRow[] = zoneConfig.rowLabels.map((label, rowIndex) => {
      const rowRadius = firstRadius + rowIndex * ROW_SPACING
      const seatCount = zoneConfig.firstRowSeats + rowIndex * zoneConfig.seatsIncrementPerRow
      const seats: Seat[] = Array.from({ length: seatCount }, (_, index) => {
        const number = index + 1
        const id = `${zoneConfig.id}-${label}-${number}`
        const accessible = accessibleIds.has(id)
        if (accessible) usedAccessibleIds.add(id)
        const point = pointOnArc(rowRadius, getSlotOffset(getSlot(number, seatCount), seatCount))
        return { id, zoneId: zoneConfig.id, rowLabel: label, number, x: point.x, y: point.y, accessible }
      })
      return {
        label,
        seats,
        labelPositions: {
          start: pointOnArc(rowRadius, getSlotOffset(-1, seatCount)),
          end: pointOnArc(rowRadius, getSlotOffset(seatCount + 2, seatCount)),
        },
      }
    })

    const lastRadius = firstRadius + (zoneConfig.rowLabels.length - 1) * ROW_SPACING
    zoneRadii.push({ first: firstRadius, last: lastRadius })
    radius = lastRadius + ZONE_GAP

    return {
      id: zoneConfig.id,
      name: zoneConfig.name,
      ticketTypeId: zoneConfig.ticketTypeId,
      rows,
    }
  })

  for (const id of accessibleIds) {
    if (!usedAccessibleIds.has(id)) throw new Error(`Accessible seat "${id}" does not exist`)
  }

  const seats = zones.flatMap((zone) => zone.rows.flatMap((row) => row.seats))
  const topSeatY = Math.min(...seats.map((seat) => seat.y))
  const stageBottom = topSeatY - SEAT_RADIUS - STAGE_GAP
  const stage = {
    x: -STAGE_WIDTH / 2,
    y: stageBottom - STAGE_HEIGHT,
    width: STAGE_WIDTH,
    height: STAGE_HEIGHT,
  }
  // Rótulo de zona sobre el eje, a mitad de camino entre su primera fila y lo anterior (escenario o zona previa).
  const getZoneLabelPosition = (index: number): Point => {
    const previousEdge = index === 0 ? stageBottom : zoneRadii[index - 1].last
    return { x: 0, y: (previousEdge + zoneRadii[index].first) / 2 }
  }

  const labelPoints = zones.flatMap((zone) =>
    zone.rows.flatMap((row) => [row.labelPositions.start, row.labelPositions.end])
  )
  const extentPoints = [...seats, ...labelPoints]
  const minX = Math.min(stage.x, ...extentPoints.map((point) => point.x - SEAT_RADIUS))
  const maxX = Math.max(stage.x + stage.width, ...extentPoints.map((point) => point.x + SEAT_RADIUS))
  const minY = stage.y
  const maxY = Math.max(...extentPoints.map((point) => point.y + SEAT_RADIUS))

  const offsetX = PADDING - minX
  const offsetY = PADDING - minY
  const shift = (point: Point): Point => ({ x: round2(point.x + offsetX), y: round2(point.y + offsetY) })

  return {
    id: config.id,
    venueId: config.venueId,
    kind: "theater",
    width: round2(maxX - minX + 2 * PADDING),
    height: round2(maxY - minY + 2 * PADDING),
    seatRadius: SEAT_RADIUS,
    stage: { ...shift(stage), width: STAGE_WIDTH, height: STAGE_HEIGHT, label: STAGE_LABEL },
    zones: zones.map((zone, index) => ({
      ...zone,
      labelPosition: shift(getZoneLabelPosition(index)),
      rows: zone.rows.map((row) => ({
        label: row.label,
        seats: row.seats.map((seat) => ({ ...seat, ...shift(seat) })),
        labelPositions: { start: shift(row.labelPositions.start), end: shift(row.labelPositions.end) },
      })),
    })),
  }
}
