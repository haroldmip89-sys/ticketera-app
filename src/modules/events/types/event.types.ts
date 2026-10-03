export type EventCategoryId =
  | "concerts"
  | "sports"
  | "theater"
  | "festivals"
  | "family"
  | "cinema"
  | "comedy"
  | "arts"

export type EventCategory = { id: EventCategoryId; label: string }

export type Venue = {
  id: string
  name: string
  city: string
  address: string
}

/** Disponibilidad visible (referencia: available | last-tickets | sold-out). */
export type EventAvailability = "available" | "last-tickets" | "sold-out"

/** Cómo se eligen las entradas (modelo híbrido):
 *  "zone" = zona + cantidad (estadios, arenas, festivales, general);
 *  "seat" = zona + cantidad y después asientos numerados en mapa (teatros). */
export type SeatSelectionMode = "zone" | "seat"

/** Serializable (sin Date ni funciones): viaja de server a client como prop. */
export type EventItem = {
  id: string
  /** kebab-case único → /events/[slug] */
  slug: string
  title: string
  description: string
  /** Objeto denormalizado: la UI no hace lookups. */
  category: EventCategory
  /** ISO 8601 con offset explícito "-05:00". */
  startsAt: string
  /** ISO 8601, anterior a startsAt. */
  doorsOpenAt: string
  /** null = todo público. */
  minAge: number | null
  venue: Venue
  imageUrl: string
  imageAlt: string
  /** Mínimo de los tipos de entrada. */
  priceFrom: number
  availability: EventAvailability
  seatSelection: SeatSelectionMode
  isFeatured: boolean
}

/** Tipo de entrada = zona del recinto (modelo de la referencia: zona + precio + estado). */
export type TicketType = {
  /** `${eventId}-${zona}`, p. ej. "evt-001-platea". */
  id: string
  eventId: string
  /** Visible en español. */
  name: string
  price: number
  availability: EventAvailability
}
