import { EVENTS_MOCK, MOCK_REFERENCE_DATE } from "@/modules/events/data/events.mock"
import { TICKET_TYPES_MOCK } from "@/modules/events/data/ticket-types.mock"
import type { EventItem, TicketType } from "@/modules/events/types/event.types"

const DEFAULT_RELATED_LIMIT = 4

function sortByStartsAt(events: readonly EventItem[]): EventItem[] {
  return [...events].sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()
  )
}

function getReferenceDate(): string {
  return MOCK_REFERENCE_DATE
}

export const eventsService = {
  /** Todos, por startsAt ascendente. */
  async getAll(): Promise<EventItem[]> {
    return sortByStartsAt(EVENTS_MOCK)
  },

  /** null si no existe. */
  async getBySlug(slug: string): Promise<EventItem | null> {
    return EVENTS_MOCK.find((event) => event.slug === slug) ?? null
  },

  /** isFeatured, por startsAt ascendente (Hero). */
  async getFeatured(): Promise<EventItem[]> {
    return sortByStartsAt(EVENTS_MOCK.filter((event) => event.isFeatured))
  },

  /** startsAt >= now (inclusivo), ascendente. now por defecto = new Date(getReferenceDate()). */
  async getUpcoming(now: Date = new Date(getReferenceDate())): Promise<EventItem[]> {
    return sortByStartsAt(
      EVENTS_MOCK.filter((event) => new Date(event.startsAt).getTime() >= now.getTime())
    )
  },

  /** "Hoy" de referencia en ISO. Mock: MOCK_REFERENCE_DATE. */
  getReferenceDate,

  /** Tipos del evento por price ascendente (empates: orden del mock). Id inexistente → []. Array nuevo. */
  async getTicketTypes(eventId: string): Promise<TicketType[]> {
    return TICKET_TYPES_MOCK.filter((ticketType) => ticketType.eventId === eventId).sort(
      (a, b) => a.price - b.price
    )
  },

  /** Eventos próximos (getUpcoming()) sin el actual: primero misma categoría y luego el resto, cada grupo por startsAt. Corta en limit (4). Id inexistente → []. */
  async getRelated(eventId: string, limit: number = DEFAULT_RELATED_LIMIT): Promise<EventItem[]> {
    const current = EVENTS_MOCK.find((event) => event.id === eventId)
    if (!current) return []

    const others = (await eventsService.getUpcoming()).filter((event) => event.id !== eventId)
    const isSameCategory = (event: EventItem) => event.category.id === current.category.id
    return [
      ...others.filter(isSameCategory),
      ...others.filter((event) => !isSameCategory(event)),
    ].slice(0, limit)
  },
}
