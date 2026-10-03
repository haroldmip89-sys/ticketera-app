"use client"

import { useMemo, useState } from "react"

import { EventPurchaseSummary } from "@/modules/checkout/components/event-purchase-summary"
import { OrderSummary } from "@/modules/checkout/components/order-summary"
import { TicketZoneList } from "@/modules/checkout/components/ticket-zone-list"
import {
  buildPurchaseStepHref,
  getSelectionLines,
  getSelectionTotal,
  getTicketQuantity,
  getTotalQuantity,
  setTicketQuantity,
  type TicketSelection,
} from "@/modules/checkout/utils/ticket-selection"
import type { EventItem, TicketType } from "@/modules/events/types/event.types"
import {
  getEventCheckoutHref,
  getEventHref,
  getEventSeatsHref,
} from "@/modules/events/utils/event-routes"
import { getZoneTones } from "@/modules/events/utils/zone-tones"
import { ZoneMap } from "@/modules/seating/components/zone-map"
import type { ZoneMap as ZoneMapData } from "@/modules/seating/types/seating.types"

export type TicketSelectionViewProps = {
  event: EventItem
  ticketTypes: TicketType[]
  zoneMap: ZoneMapData | null
  initialSelection: TicketSelection
}

const SEAT_STEP_NOTE = "En el siguiente paso eliges tus asientos."

export function TicketSelectionView({
  event,
  ticketTypes,
  zoneMap,
  initialSelection,
}: TicketSelectionViewProps) {
  const [selection, setSelection] = useState(initialSelection)
  const [selectedTicketTypeId, setSelectedTicketTypeId] = useState<string | null>(
    () =>
      ticketTypes.find((ticketType) => getTicketQuantity(initialSelection, ticketType.id) > 0)
        ?.id ?? null
  )

  const isSeatSelection = event.seatSelection === "seat"
  const tones = useMemo(() => getZoneTones(ticketTypes), [ticketTypes])
  const lines = useMemo(() => getSelectionLines(selection, ticketTypes), [selection, ticketTypes])
  const totalQuantity = useMemo(() => getTotalQuantity(selection), [selection])
  const totalPrice = useMemo(() => getSelectionTotal(selection, ticketTypes), [selection, ticketTypes])
  const continueHref = useMemo(() => {
    if (totalQuantity === 0) return null
    const baseHref = isSeatSelection
      ? getEventSeatsHref(event.slug)
      : getEventCheckoutHref(event.slug)
    return buildPurchaseStepHref(baseHref, selection, ticketTypes)
  }, [totalQuantity, isSeatSelection, event.slug, selection, ticketTypes])

  function handleQuantityChange(ticketType: TicketType, quantity: number) {
    setSelection((current) => setTicketQuantity(current, ticketType, quantity))
    setSelectedTicketTypeId(ticketType.id)
  }

  return (
    <>
      <EventPurchaseSummary event={event} backHref={getEventHref(event.slug)} />

      <div className="flex flex-col lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-[minmax(0,1fr)_26.25rem] lg:items-start lg:gap-8 lg:px-8 lg:pb-20">
        <div className="flex flex-col gap-4 p-4 lg:gap-6 lg:p-0">
          {zoneMap && (
            <ZoneMap
              zoneMap={zoneMap}
              ticketTypes={ticketTypes}
              tones={tones}
              selectedTicketTypeId={selectedTicketTypeId}
              onSelect={setSelectedTicketTypeId}
            />
          )}
          <TicketZoneList
            ticketTypes={ticketTypes}
            tones={tones}
            selection={selection}
            selectedTicketTypeId={selectedTicketTypeId}
            onQuantityChange={handleQuantityChange}
          />
          {isSeatSelection && (
            <p className="text-center text-[13px] text-muted-foreground lg:hidden">
              {SEAT_STEP_NOTE}
            </p>
          )}
        </div>

        <OrderSummary
          lines={lines}
          totalQuantity={totalQuantity}
          totalPrice={totalPrice}
          continueHref={continueHref}
          note={isSeatSelection ? SEAT_STEP_NOTE : undefined}
        />
      </div>
    </>
  )
}
