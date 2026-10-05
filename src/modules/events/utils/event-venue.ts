import type { Venue } from "@/modules/events/types/event.types"

const EDGE_SEPARATORS = /^[\s,]+|[\s,]+$/g
const DIACRITICS = /[\u0300-\u036f]/g

function normalizePlace(value: string): string {
  return value.replace(EDGE_SEPARATORS, "").toLowerCase().normalize("NFD").replace(DIACRITICS, "")
}

/** "{name}, {address}, {city}", omitiendo ", {city}" si el último segmento de la dirección (por comas) ya es la
 *  ciudad (sin distinguir mayúsculas, acentos ni espacios/comas en los extremos).
 *  Ej.: { "Estadio Nacional", "Av. del Deporte 1200, Lima", "Lima" } → "Estadio Nacional, Av. del Deporte 1200, Lima";
 *       { "Teatro Municipal", "Jr. Las Artes 377, Cercado de Lima", "Lima" } → "Teatro Municipal, Jr. Las Artes 377, Cercado de Lima, Lima". */
export function formatVenueLocation(venue: Pick<Venue, "name" | "address" | "city">): string {
  const address = venue.address.replace(/[\s,]+$/, "")
  const city = normalizePlace(venue.city)
  const lastSegment = normalizePlace(address.split(",").at(-1) ?? "")

  if (city && lastSegment === city) return `${venue.name}, ${address}`
  return `${venue.name}, ${venue.address}, ${venue.city}`
}
