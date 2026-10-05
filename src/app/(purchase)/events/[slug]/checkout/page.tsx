import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import { CheckoutView } from "@/modules/checkout/components/checkout-view"
import { PurchaseFlowHeader } from "@/modules/checkout/components/purchase-flow-header"
import {
  buildPurchaseStepHref,
  getTotalQuantity,
  parseTicketSelection,
} from "@/modules/checkout/utils/ticket-selection"
import { eventsService } from "@/modules/events/services/events.service"
import { getEventSeatsHref, getEventTicketsHref } from "@/modules/events/utils/event-routes"
import { seatingService } from "@/modules/seating/services/seating.service"
import type { SeatSelectionSummary } from "@/modules/seating/types/seating.types"
import { parseCompleteSeatSelection } from "@/modules/seating/utils/seat-selection"

export async function generateMetadata(
  props: PageProps<"/events/[slug]/checkout">
): Promise<Metadata> {
  const { slug } = await props.params
  const event = await eventsService.getBySlug(slug)
  if (!event) return {}

  return { title: `Datos y pago — ${event.title}`, robots: { index: false } }
}

export default async function CheckoutPage(props: PageProps<"/events/[slug]/checkout">) {
  const { slug } = await props.params
  const { tickets, seats } = await props.searchParams
  const event = await eventsService.getBySlug(slug)
  if (!event) notFound()

  const ticketTypes = await eventsService.getTicketTypes(event.id)
  const selection = parseTicketSelection(tickets, ticketTypes)
  if (getTotalQuantity(selection) === 0) redirect(getEventTicketsHref(slug))

  const ticketsHref = buildPurchaseStepHref(getEventTicketsHref(slug), selection, ticketTypes)
  let seatSummary: SeatSelectionSummary | null = null
  let backHref = ticketsHref
  let backLabel = "Volver a Entradas"

  if (event.seatSelection === "seat") {
    const seatMap = await seatingService.getSeatMap(event.id)
    if (!seatMap) notFound()

    const seatsHref = buildPurchaseStepHref(getEventSeatsHref(slug), selection, ticketTypes)
    seatSummary = parseCompleteSeatSelection(seats, seatMap, selection, ticketTypes)
    if (!seatSummary) redirect(seatsHref)
    backHref = seatsHref
    backLabel = "Volver a Asientos"
  }

  return (
    <>
      <PurchaseFlowHeader
        currentStep={2}
        backHref={backHref}
        backLabel={backLabel}
        mobileTitle="Datos y pago"
      />
      <main className="flex-1 bg-secondary">
        <CheckoutView
          event={event}
          ticketTypes={ticketTypes}
          selection={selection}
          seatSummary={seatSummary}
          backHref={backHref}
          backLabel={backLabel}
          changeTicketsHref={ticketsHref}
        />
      </main>
    </>
  )
}
