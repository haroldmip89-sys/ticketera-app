import type { Venue } from "@/modules/events/types/event.types"
import { formatVenueLocation } from "@/modules/events/utils/event-venue"
import {
  DEFAULT_EVENT_SEARCH_FILTERS,
  serializeEventSearchParams,
  type EventSearchFilters,
} from "@/modules/events/utils/event-search"

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

/** "/events/{slug}/confirmation" (paso 3, la página la crea la 011). */
export function getEventConfirmationHref(slug: string): string {
  return `${getEventHref(slug)}/confirmation`
}

/** "/events" + "?{query}" si algún filtro difiere del default (búsqueda, 009). */
export function getEventsSearchHref(filters?: Partial<EventSearchFilters>): string {
  const query = serializeEventSearchParams({ ...DEFAULT_EVENT_SEARCH_FILTERS, ...filters })
  return query ? `/events?${query}` : "/events"
}

/** Búsqueda de Google Maps por formatVenueLocation(venue) ("Cómo llegar"). */
export function getVenueDirectionsUrl(venue: Venue): string {
  const query = encodeURIComponent(formatVenueLocation(venue))
  return `https://www.google.com/maps/search/?api=1&query=${query}`
}
