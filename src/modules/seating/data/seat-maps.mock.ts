import type { EventSeatMap, VenueLayout } from "@/modules/seating/types/seating.types"
import { buildTheaterLayout } from "@/modules/seating/utils/theater-layout"

/** PRNG entero determinista con semilla (mismo resultado en servidor y cliente). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Fisher–Yates parcial con semilla: Math.round(ratio · total) ids, devueltos en orden de layout. */
function pickSoldSeatIds(seatIds: readonly string[], ratio: number, seed: number): string[] {
  const random = mulberry32(seed)
  const pool = [...seatIds]
  const count = Math.round(ratio * pool.length)
  for (let index = 0; index < count; index++) {
    const swapIndex = index + Math.floor(random() * (pool.length - index))
    ;[pool[index], pool[swapIndex]] = [pool[swapIndex], pool[index]]
  }
  const sold = new Set(pool.slice(0, count))
  return seatIds.filter((seatId) => sold.has(seatId))
}

function getSeatIds(layout: VenueLayout): string[] {
  return layout.zones.flatMap((zone) => zone.rows.flatMap((row) => row.seats.map((seat) => seat.id)))
}

function buildSeatMap(eventId: string, layout: VenueLayout, soldRatio: number, seed: number): EventSeatMap {
  return { eventId, layout, soldSeatIds: pickSoldSeatIds(getSeatIds(layout), soldRatio, seed) }
}

const TEATRO_MUNICIPAL_LAYOUT = buildTheaterLayout({
  id: "teatro-municipal-sala-principal",
  venueId: "teatro-municipal",
  zones: [
    {
      id: "platea",
      name: "Platea",
      ticketTypeId: "evt-001-platea",
      rowLabels: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N"],
      firstRowSeats: 20,
      seatsIncrementPerRow: 1,
    },
    {
      id: "mezzanine",
      name: "Mezzanine",
      ticketTypeId: "evt-001-mezzanine",
      rowLabels: ["A", "B", "C", "D", "E", "F"],
      firstRowSeats: 30,
      seatsIncrementPerRow: 1,
    },
  ],
  accessibleSeatIds: [
    "platea-N-1",
    "platea-N-2",
    "platea-N-32",
    "platea-N-33",
    "mezzanine-A-1",
    "mezzanine-A-30",
  ],
})

const TEATRO_BRITANICO_LAYOUT = buildTheaterLayout({
  id: "teatro-britanico-sala-principal",
  venueId: "teatro-britanico",
  zones: [
    {
      id: "platea",
      name: "Platea",
      ticketTypeId: "evt-004-platea",
      rowLabels: ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"],
      firstRowSeats: 16,
      seatsIncrementPerRow: 1,
    },
    {
      id: "mezzanine",
      name: "Mezzanine",
      ticketTypeId: "evt-004-mezzanine",
      rowLabels: ["A", "B", "C", "D", "E"],
      firstRowSeats: 22,
      seatsIncrementPerRow: 1,
    },
  ],
  accessibleSeatIds: [
    "platea-J-1",
    "platea-J-2",
    "platea-J-24",
    "platea-J-25",
    "mezzanine-A-1",
    "mezzanine-A-22",
  ],
})

/** Solo eventos con seatSelection "seat". Vendidos: evt-001 70 % (semilla 1, coherente con Platea
 *  "Últimas entradas"); evt-004 35 % (semilla 4). Ambas semillas dejan ≥ 6 disponibles por zona. */
export const SEAT_MAPS_MOCK: Readonly<Record<string, EventSeatMap>> = {
  "evt-001": buildSeatMap("evt-001", TEATRO_MUNICIPAL_LAYOUT, 0.7, 1),
  "evt-004": buildSeatMap("evt-004", TEATRO_BRITANICO_LAYOUT, 0.35, 4),
}
