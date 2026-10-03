import type { Venue } from "@/modules/events/types/event.types"

/** "/events/{slug}" (detalle). */
export function getEventHref(slug: string): string {
  return `/events/${slug}`
}

/** "/events/{slug}/tickets" (paso 1 de la compra, 007). */
export function getEventTicketsHref(slug: string): string {
  return `${getEventHref(slug)}/tickets`
}

/** "/events/{slug}/seats" (paso extra de asientos de teatro, 008). */
export function getEventSeatsHref(slug: string): string {
  return `${getEventHref(slug)}/seats`
}

/** "/events/{slug}/checkout" (datos y pago, 010). */
export function getEventCheckoutHref(slug: string): string {
  return `${getEventHref(slug)}/checkout`
}

/** Búsqueda de Google Maps por "{name}, {address}, {city}" ("Cómo llegar"). */
export function getVenueDirectionsUrl(venue: Venue): string {
  const query = encodeURIComponent(`${venue.name}, ${venue.address}, ${venue.city}`)
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}
