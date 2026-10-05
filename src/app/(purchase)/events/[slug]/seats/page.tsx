import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { EventPurchaseSummary } from "@/modules/checkout/components/event-purchase-summary"
import { PurchaseFlowHeader } from "@/modules/checkout/components/purchase-flow-header"
import {
  buildPurchaseStepHref,
  getTotalQuantity,
  parseTicketSelection,
} from "@/modules/checkout/utils/ticket-selection"
import { eventsService } from "@/modules/events/services/events.service"
import { getEventTicketsHref } from "@/modules/events/utils/event-routes"
import { SeatSelectionView } from "@/modules/seating/components/seat-selection-view"
import { seatingService } from "@/modules/seating/services/seating.service"

export async function generateMetadata(
  props: PageProps<"/events/[slug]/seats">
): Promise<Metadata> {
  const { slug } = await props.params
  const event = await eventsService.getBySlug(slug)
  if (!event) return {}

  return { title: `Elige tus asientos — ${event.title}` }
}

export default async function SeatsPage(props: PageProps<"/events/[slug]/seats">) {
  const { slug } = await props.params
  const { tickets } = await props.searchParams
  const event = await eventsService.getBySlug(slug)
  if (!event || event.seatSelection !== "seat") notFound()

  const [seatMap, ticketTypes] = await Promise.all([
    seatingService.getSeatMap(event.id),
    eventsService.getTicketTypes(event.id),
  ])
  if (!seatMap) notFound()

  const selection = parseTicketSelection(tickets, ticketTypes)
  if (getTotalQuantity(selection) === 0) redirect(getEventTicketsHref(slug))

  const ticketsHref = buildPurchaseStepHref(getEventTicketsHref(slug), selection, ticketTypes)

  return (
    <>
      <PurchaseFlowHeader
        currentStep={1}
        backHref={ticketsHref}
        backLabel="Volver a Entradas"
        mobileTitle="Elige tus asientos"
      />
      <main className="flex-1 bg-secondary">
        <EventPurchaseSummary event={event} backHref={ticketsHref} backLabel="Volver a Entradas" />
        <SeatSelectionView
          event={event}
          seatMap={seatMap}
          ticketTypes={ticketTypes}
          selection={selection}
        />
      </main>
    </>
  )
}
