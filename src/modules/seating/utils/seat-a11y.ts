import { formatPrice } from "@/lib/format"
import type {
  SeatQuotas,
  SeatRow,
  SeatStatus,
  ToggleSeatOutcome,
  VenueLayout,
} from "@/modules/seating/types/seating.types"

export const SEAT_NAVIGATION_KEYS = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
] as const
export type SeatNavigationKey = (typeof SEAT_NAVIGATION_KEYS)[number]

/** Orden global de navegación: zona por zona (orden del layout), del escenario hacia atrás. */
function getNavigationRows(layout: VenueLayout): SeatRow[] {
  return layout.zones.flatMap((zone) => zone.rows)
}

/** Asiento de `row` con menor |Δx| respecto de `x` (empate: menor number). */
function getClosestSeatId(row: SeatRow, x: number): string {
  let closest = row.seats[0]
  for (const seat of row.seats) {
    const delta = Math.abs(seat.x - x)
    const closestDelta = Math.abs(closest.x - x)
    if (delta < closestDelta || (delta === closestDelta && seat.number < closest.number)) closest = seat
  }
  return closest.id
}

/** ←/→ por number sin salto de fila; ↑/↓ a la fila anterior/siguiente del orden global (cruza zonas);
 *  Inicio/Fin a los extremos de la fila. null si no hay destino o el asiento no existe. */
export function getAdjacentSeatId(
  layout: VenueLayout,
  seatId: string,
  key: SeatNavigationKey
): string | null {
  const rows = getNavigationRows(layout)
  const rowIndex = rows.findIndex((row) => row.seats.some((seat) => seat.id === seatId))
  if (rowIndex === -1) return null

  const row = rows[rowIndex]
  const seatIndex = row.seats.findIndex((seat) => seat.id === seatId)
  const seat = row.seats[seatIndex]

  switch (key) {
    case "ArrowLeft":
      return row.seats[seatIndex - 1]?.id ?? null
    case "ArrowRight":
      return row.seats[seatIndex + 1]?.id ?? null
    case "Home":
      return row.seats[0].id
    case "End":
      return row.seats[row.seats.length - 1].id
    case "ArrowUp":
      return rowIndex > 0 ? getClosestSeatId(rows[rowIndex - 1], seat.x) : null
    case "ArrowDown":
      return rowIndex < rows.length - 1 ? getClosestSeatId(rows[rowIndex + 1], seat.x) : null
  }
}

/** Primer asiento no vendido de una zona incluida, en orden de navegación; si no hay, el primero del layout. */
export function getInitialFocusSeatId(
  layout: VenueLayout,
  soldSeatIds: ReadonlySet<string>,
  quotas: SeatQuotas
): string {
  for (const zone of layout.zones) {
    if (!Object.hasOwn(quotas, zone.id) || quotas[zone.id] <= 0) continue
    for (const row of zone.rows) {
      const seat = row.seats.find((item) => !soldSeatIds.has(item.id))
      if (seat) return seat.id
    }
  }
  return layout.zones[0].rows[0].seats[0].id
}

/** "Platea, fila F, asiento 12". */
export function getSeatName(input: { zoneName: string; rowLabel: string; number: number }): string {
  return `${input.zoneName}, fila ${input.rowLabel}, asiento ${input.number}`
}

const STATUS_LABELS: Record<Exclude<SeatStatus, "sold">, string> = {
  available: "disponible",
  selected: "seleccionado",
}

export function getSeatAriaLabel(input: {
  zoneName: string
  rowLabel: string
  number: number
  price: number
  accessible: boolean
  status: SeatStatus
  zoneIncluded: boolean
}): string {
  const parts = [getSeatName(input)]
  if (input.accessible) parts.push("accesible para silla de ruedas")
  if (input.status === "sold") return [...parts, "vendido"].join(", ")

  parts.push(formatPrice(input.price))
  parts.push(input.zoneIncluded ? STATUS_LABELS[input.status] : "no incluida en tu selección")
  return parts.join(", ")
}

function getProgress(zoneName: string, zoneCount: number, quota: number): string {
  return `Llevas ${zoneCount} de ${quota} ${quota === 1 ? "asiento" : "asientos"} en ${zoneName}.`
}

export function getSelectionAnnouncement(
  input:
    | {
        outcome: ToggleSeatOutcome
        seatName: string
        zoneName: string
        zoneCount: number
        quota: number
        isComplete: boolean
      }
    | { outcome: "cleared" }
): string {
  switch (input.outcome) {
    case "cleared":
      return "Quitaste todos los asientos."
    case "added": {
      const message = `Agregaste ${input.seatName}. ${getProgress(input.zoneName, input.zoneCount, input.quota)}`
      return input.isComplete ? `${message} Ya elegiste todos tus asientos.` : message
    }
    case "removed":
      return `Quitaste ${input.seatName}. ${getProgress(input.zoneName, input.zoneCount, input.quota)}`
    case "zone-full":
      return input.quota === 1
        ? `Ya elegiste tu asiento de ${input.zoneName}. Quítalo para elegir otro.`
        : `Ya elegiste los ${input.quota} asientos de ${input.zoneName}. Quita uno para elegir otro.`
    case "zone-not-selected":
      return `${input.zoneName} no está en tu selección. Para agregarla, vuelve a Entradas.`
    case "unavailable":
      return `${input.seatName} no está disponible.`
  }
}
