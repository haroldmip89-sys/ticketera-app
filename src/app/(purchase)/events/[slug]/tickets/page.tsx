import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { PurchaseFlowHeader } from "@/modules/checkout/components/purchase-flow-header"
import { TicketSelectionView } from "@/modules/checkout/components/ticket-selection-view"
import { parseTicketSelection } from "@/modules/checkout/utils/ticket-selection"
import { eventsService } from "@/modules/events/services/events.service"
import { getEventHref } from "@/modules/events/utils/event-routes"
import { seatingService } from "@/modules/seating/services/seating.service"

export async function generateMetadata(
  props: PageProps<"/events/[slug]/tickets">
): Promise<Metadata> {
  const { slug } = await props.params
  const event = await eventsService.getBySlug(slug)
  if (!event) return {}

  return { title: `Elige tus entradas — ${event.title}` }
}

export default async function TicketsPage(props: PageProps<"/events/[slug]/tickets">) {
  const { slug } = await props.params
  const { tickets } = await props.searchParams
  const event = await eventsService.getBySlug(slug)
  if (!event) notFound()

  const [ticketTypes, zoneMap] = await Promise.all([
    eventsService.getTicketTypes(event.id),
    seatingService.getZoneMap(event.id),
  ])

  return (
    <>
      <PurchaseFlowHeader
        currentStep={1}
        backHref={getEventHref(slug)}
        backLabel="Volver al evento"
        mobileTitle="Elige tus entradas"
      />
      <main className="flex-1 bg-secondary">
        <TicketSelectionView
          event={event}
          ticketTypes={ticketTypes}
          zoneMap={zoneMap}
          initialSelection={parseTicketSelection(tickets, ticketTypes)}
        />
      </main>
    </>
  )
}
