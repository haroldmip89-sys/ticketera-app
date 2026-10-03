import type { EventCategoryId, EventItem } from "@/modules/events/types/event.types"

export const UPCOMING_EVENTS_LIMIT = 8

export type EventCategoryFilter = EventCategoryId | "all"

/** Filtra por categoría ("all" = sin filtro) conservando el orden de entrada y corta a UPCOMING_EVENTS_LIMIT. No muta la entrada. */
export function filterUpcomingEvents(
  events: readonly EventItem[],
  filter: EventCategoryFilter
): EventItem[] {
  const matching =
    filter === "all" ? events : events.filter((event) => event.category.id === filter)
  return matching.slice(0, UPCOMING_EVENTS_LIMIT)
}
