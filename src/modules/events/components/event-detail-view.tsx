import { SectionHeader } from "@/components/shared/section-header"
import { EventCard } from "@/modules/events/components/event-card"
import { EventDetailHero } from "@/modules/events/components/event-detail-hero"
import { EventInfoSections } from "@/modules/events/components/event-info-sections"
import { EventTicketsPanel } from "@/modules/events/components/event-tickets-panel"
import { PurchaseBar } from "@/modules/events/components/purchase-bar"
import { eventsService } from "@/modules/events/services/events.service"
import type { EventItem } from "@/modules/events/types/event.types"
import { getEventsSearchHref } from "@/modules/events/utils/event-routes"

const RELATED_TITLE_ID = "related-events-title"

export type EventDetailViewProps = { event: EventItem }

export async function EventDetailView({ event }: EventDetailViewProps) {
  const [ticketTypes, related] = await Promise.all([
    eventsService.getTicketTypes(event.id),
    eventsService.getRelated(event.id),
  ])

  return (
    <div>
      <EventDetailHero event={event} />

      <div className="mx-auto flex max-w-7xl flex-col gap-10 px-4 pt-8 pb-12 sm:px-6 lg:grid lg:grid-cols-[minmax(0,1fr)_25rem] lg:items-start lg:gap-x-14 lg:gap-y-12 lg:px-8 lg:pt-14 lg:pb-18">
        <EventInfoSections event={event} />
        <EventTicketsPanel event={event} ticketTypes={ticketTypes} />
      </div>

      {related.length > 0 && (
        <section aria-labelledby={RELATED_TITLE_ID} className="bg-secondary">
          <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-10 sm:px-6 lg:gap-7 lg:px-8 lg:pt-16 lg:pb-20">
            <SectionHeader
              titleId={RELATED_TITLE_ID}
              title="También te puede interesar"
              action={{
                href: getEventsSearchHref({ categories: [event.category.id] }),
                label: `Ver más ${event.category.label.toLowerCase()}`,
                className: "hidden lg:inline-flex",
              }}
            />
            <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 py-2 -my-2 sm:-mx-6 sm:px-6 lg:m-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:p-0">
              {related.map((relatedEvent) => (
                <li key={relatedEvent.id} className="w-62.5 shrink-0 snap-start lg:w-auto">
                  <EventCard event={relatedEvent} variant="compact" className="h-full" />
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <PurchaseBar event={event} />
    </div>
  )
}
