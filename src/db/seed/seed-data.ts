import type {
  NewCategory,
  NewEvent,
  NewLayoutSection,
  NewSeat,
  NewTicketType,
  NewVenue,
  NewVenueLayout,
} from "@/db/schema"
import { EVENT_CATEGORIES } from "@/modules/events/data/event-categories"
import { EVENTS_MOCK } from "@/modules/events/data/events.mock"
import { TICKET_TYPES_MOCK } from "@/modules/events/data/ticket-types.mock"
import { SEAT_MAPS_MOCK } from "@/modules/seating/data/seat-maps.mock"
import { ZONE_MAPS_MOCK } from "@/modules/seating/data/zone-maps.mock"

export const DEFAULT_ZONE_CAPACITY = 500

const LAST_TICKETS_REMAINING = 10
const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Filas con claves naturales para resolver las FK al insertar (slug de venue/evento, code de sección). */
export type SeedVenue = Omit<NewVenue, "ownerOrganizerId" | "createdBy"> & { slug: string }
export type SeedLayout = Pick<NewVenueLayout, "name" | "kind" | "stage"> & {
  layoutKey: string
  venueSlug: string
}
export type SeedSection = Omit<NewLayoutSection, "layoutId"> & { layoutKey: string }
export type SeedSeat = Omit<NewSeat, "sectionId"> & { layoutKey: string; sectionCode: string }
export type SeedEvent = Omit<
  NewEvent,
  "organizerId" | "categoryId" | "venueId" | "layoutId" | "publishedAt"
> & { categorySlug: string; venueSlug: string; layoutKey: string | null }
export type SeedTicketType = Omit<NewTicketType, "eventId" | "sectionId"> & {
  eventSlug: string
  layoutKey: string | null
  sectionCode: string | null
}

export type SeedPlan = {
  categories: NewCategory[]
  venues: SeedVenue[]
  layouts: SeedLayout[]
  sections: SeedSection[]
  seats: SeedSeat[]
  events: SeedEvent[]
  ticketTypes: SeedTicketType[]
}

function shiftDate(iso: string, days: number): Date {
  return new Date(new Date(iso).getTime() + days * MS_PER_DAY)
}

function soldCountFor(availability: string, capacity: number, hasSeats: boolean): number {
  if (hasSeats) return 0
  if (availability === "sold-out") return capacity
  if (availability === "last-tickets") return Math.max(0, capacity - LAST_TICKETS_REMAINING)
  return 0
}

export function buildSeedPlan({ dateOffsetDays }: { dateOffsetDays: number }): SeedPlan {
  const categories: NewCategory[] = EVENT_CATEGORIES.map((category, index) => ({
    slug: category.id,
    name: category.label,
    sortOrder: index,
  }))

  const venues: SeedVenue[] = []
  const layouts: SeedLayout[] = []
  const sections: SeedSection[] = []
  const seats: SeedSeat[] = []
  const events: SeedEvent[] = []
  const ticketTypes: SeedTicketType[] = []

  for (const event of EVENTS_MOCK) {
    if (!venues.some((venue) => venue.slug === event.venue.id)) {
      venues.push({
        slug: event.venue.id,
        name: event.venue.name,
        addressLine: event.venue.address,
        city: event.venue.city,
        country: "PE",
        timezone: "America/Lima",
        isCurated: false,
      })
    }

    const seatMap = SEAT_MAPS_MOCK[event.id]
    const zoneMap = ZONE_MAPS_MOCK[event.id]
    const layoutKey = seatMap || zoneMap ? event.slug : null
    // ticketTypeId → code de sección (solo eventos con plano)
    const sectionCodeByTicketType = new Map<string, string>()
    const seatCountByCode = new Map<string, number>()

    if (seatMap) {
      layouts.push({
        layoutKey: event.slug,
        venueSlug: event.venue.id,
        name: "Sala principal",
        kind: "seated",
        stage: seatMap.layout.stage,
      })
      seatMap.layout.zones.forEach((zone, index) => {
        sectionCodeByTicketType.set(zone.ticketTypeId, zone.id)
        sections.push({
          layoutKey: event.slug,
          code: zone.id,
          name: zone.name,
          kind: "seated",
          capacity: null,
          sortOrder: index,
        })
        let count = 0
        for (const row of zone.rows) {
          for (const seat of row.seats) {
            count++
            seats.push({
              layoutKey: event.slug,
              sectionCode: zone.id,
              rowLabel: seat.rowLabel,
              seatNumber: String(seat.number),
              x: String(seat.x),
              y: String(seat.y),
              isAccessible: seat.accessible,
            })
          }
        }
        seatCountByCode.set(zone.id, count)
      })
    } else if (zoneMap) {
      layouts.push({
        layoutKey: event.slug,
        venueSlug: event.venue.id,
        name: `Zonas — ${event.slug}`,
        kind: "zones",
        stage: {
          label: zoneMap.stage.label,
          area: zoneMap.stage.area,
          columns: zoneMap.columns,
          rows: zoneMap.rows,
        },
      })
      zoneMap.zones.forEach((zone, index) => {
        const code = zone.ticketTypeId.slice(`${event.id}-`.length)
        const ticketType = TICKET_TYPES_MOCK.find((item) => item.id === zone.ticketTypeId)
        sectionCodeByTicketType.set(zone.ticketTypeId, code)
        sections.push({
          layoutKey: event.slug,
          code,
          name: ticketType?.name ?? code,
          kind: "general_admission",
          capacity: DEFAULT_ZONE_CAPACITY,
          mapArea: zone.area,
          sortOrder: index,
        })
      })
    }

    events.push({
      slug: event.slug,
      title: event.title,
      description: event.description,
      categorySlug: event.category.id,
      venueSlug: event.venue.id,
      layoutKey,
      startsAt: shiftDate(event.startsAt, dateOffsetDays),
      doorsOpenAt: shiftDate(event.doorsOpenAt, dateOffsetDays),
      minAge: event.minAge,
      isFeatured: event.isFeatured,
      status: "published",
      coverKey: event.imageUrl,
    })

    TICKET_TYPES_MOCK.filter((item) => item.eventId === event.id).forEach((item, index) => {
      const sectionCode = sectionCodeByTicketType.get(item.id) ?? null
      const seatCount = sectionCode ? seatCountByCode.get(sectionCode) : undefined
      const capacity = seatCount ?? DEFAULT_ZONE_CAPACITY
      ticketTypes.push({
        eventSlug: event.slug,
        layoutKey: sectionCode ? layoutKey : null,
        sectionCode,
        name: item.name,
        priceCents: Math.round(item.price * 100),
        capacity,
        soldCount: soldCountFor(item.availability, capacity, seatCount !== undefined),
        sortOrder: index,
      })
    })
  }

  return { categories, venues, layouts, sections, seats, events, ticketTypes }
}
