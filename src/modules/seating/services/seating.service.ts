import { SEAT_MAPS_MOCK } from "@/modules/seating/data/seat-maps.mock"
import { ZONE_MAPS_MOCK } from "@/modules/seating/data/zone-maps.mock"
import type { EventSeatMap, ZoneMap } from "@/modules/seating/types/seating.types"

export const seatingService = {
  /** Mapa esquemático del recinto del evento; null si no tiene plano. Copia profunda en cada llamada. */
  async getZoneMap(eventId: string): Promise<ZoneMap | null> {
    const zoneMap = Object.hasOwn(ZONE_MAPS_MOCK, eventId) ? ZONE_MAPS_MOCK[eventId] : undefined
    return zoneMap ? structuredClone(zoneMap) : null
  },

  /** Mapa de asientos del evento; null si no tiene (todo evento con seatSelection "zone"). Copia profunda en cada llamada. */
  async getSeatMap(eventId: string): Promise<EventSeatMap | null> {
    const seatMap = Object.hasOwn(SEAT_MAPS_MOCK, eventId) ? SEAT_MAPS_MOCK[eventId] : undefined
    return seatMap ? structuredClone(seatMap) : null
  },
}
