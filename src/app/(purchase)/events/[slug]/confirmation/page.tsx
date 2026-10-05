import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { ConfirmationNotFound } from "@/modules/checkout/components/confirmation-not-found"
import { ConfirmationView } from "@/modules/checkout/components/confirmation-view"
import { PurchaseFlowHeader } from "@/modules/checkout/components/purchase-flow-header"
import {
  buildConfirmationTickets,
  getConfirmationTotals,
  parseConfirmationState,
} from "@/modules/checkout/utils/order-confirmation"
import { eventsService } from "@/modules/events/services/events.service"
import type { EventItem } from "@/modules/events/types/event.types"
import { seatingService } from "@/modules/seating/services/seating.service"
import type { EventSeatMap } from "@/modules/seating/types/seating.types"

type ConfirmationPageProps = PageProps<"/events/[slug]/confirmation">

/** Lee el pedido de la URL. null si un evento de teatro no tiene mapa de asientos (→ 404). */
async function loadConfirmation(event: EventItem, props: ConfirmationPageProps) {
  const { order, tickets, seats } = await props.searchParams
  const ticketTypes = await eventsService.getTicketTypes(event.id)
  let seatMap: EventSeatMap | null = null

  if (event.seatSelection === "seat") {
    seatMap = await seatingService.getSeatMap(event.id)
    if (!seatMap) return null
  }

  const state = parseConfirmationState({ order, tickets, seats }, { ticketTypes, seatMap })
  return { ticketTypes, state }
}

export async function generateMetadata(props: ConfirmationPageProps): Promise<Metadata> {
  const { slug } = await props.params
  const event = await eventsService.getBySlug(slug)
  if (!event) return {}

  const confirmation = await loadConfirmation(event, props)
  const title = confirmation?.state
    ? `Compra confirmada — ${event.title}`
    : `Pedido no encontrado — ${event.title}`

  return { title, robots: { index: false } }
}

export default async function ConfirmationPage(props: ConfirmationPageProps) {
  const { slug } = await props.params
  const event = await eventsService.getBySlug(slug)
  if (!event) notFound()

  const confirmation = await loadConfirmation(event, props)
  if (!confirmation) notFound()
  const { ticketTypes, state } = confirmation

  return (
    <>
      <PurchaseFlowHeader currentStep={3} />
      <main className="flex-1 bg-secondary">
        {state ? (
          <ConfirmationView
            event={event}
            orderCode={state.orderCode}
            tickets={buildConfirmationTickets(state, ticketTypes)}
            totals={getConfirmationTotals(state, ticketTypes)}
          />
        ) : (
          <ConfirmationNotFound />
        )}
      </main>
    </>
  )
}
