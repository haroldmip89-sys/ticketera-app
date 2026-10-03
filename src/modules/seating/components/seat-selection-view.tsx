"use client"

import Link from "next/link"
import { useCallback, useId, useMemo, useRef, useState } from "react"

import {
  buildPurchaseStepHref,
  type TicketSelection,
} from "@/modules/checkout/utils/ticket-selection"
import type { EventItem, TicketType } from "@/modules/events/types/event.types"
import { getEventTicketsHref } from "@/modules/events/utils/event-routes"
import { getZoneTones } from "@/modules/events/utils/zone-tones"
import { SeatMap } from "@/modules/seating/components/seat-map"
import { SeatMapLegend } from "@/modules/seating/components/seat-map-legend"
import { SeatSelectionSummary } from "@/modules/seating/components/seat-selection-summary"
import type { EventSeatMap } from "@/modules/seating/types/seating.types"
import { getSeatName, getSelectionAnnouncement } from "@/modules/seating/utils/seat-a11y"
import {
  buildSeatCheckoutHref,
  buildSeatSelectionSummary,
  createSeatLookup,
  getSeatQuotas,
  getZoneTicketTypes,
  toggleSeatSelection,
} from "@/modules/seating/utils/seat-selection"

export type SeatSelectionViewProps = {
  event: EventItem
  seatMap: EventSeatMap
  ticketTypes: TicketType[]
  selection: TicketSelection
}

type Announcement = { message: string; repeat: boolean }

export function SeatSelectionView({ event, seatMap, ticketTypes, selection }: SeatSelectionViewProps) {
  const { layout } = seatMap
  const titleId = useId()

  const [selectedSeatIds, setSelectedSeatIds] = useState<readonly string[]>([])
  // Fuente síncrona para los handlers: permite un onSeatActivate estable.
  const selectedSeatIdsRef = useRef<readonly string[]>([])
  const [announcement, setAnnouncement] = useState<Announcement>({ message: "", repeat: false })

  const lookup = useMemo(() => createSeatLookup(layout), [layout])
  const soldSet = useMemo(() => new Set(seatMap.soldSeatIds), [seatMap.soldSeatIds])
  const quotas = useMemo(() => getSeatQuotas(layout, selection), [layout, selection])
  const includedZoneIds = useMemo(() => new Set(Object.keys(quotas)), [quotas])
  const zoneTicketTypes = useMemo(() => getZoneTicketTypes(layout, ticketTypes), [layout, ticketTypes])
  const zonePrices = useMemo(
    () => new Map([...zoneTicketTypes].map(([zoneId, ticketType]) => [zoneId, ticketType.price])),
    [zoneTicketTypes]
  )
  const selectedSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds])
  const summary = useMemo(
    () => buildSeatSelectionSummary(layout, ticketTypes, selectedSeatIds, quotas),
    [layout, ticketTypes, selectedSeatIds, quotas]
  )
  const continueHref = useMemo(
    () =>
      summary.isComplete
        ? buildSeatCheckoutHref(event.slug, selection, ticketTypes, layout, selectedSeatIds)
        : null,
    [summary.isComplete, event.slug, selection, ticketTypes, layout, selectedSeatIds]
  )
  const changeQuantitiesHref = useMemo(
    () => buildPurchaseStepHref(getEventTicketsHref(event.slug), selection, ticketTypes),
    [event.slug, selection, ticketTypes]
  )
  const legendZones = useMemo(() => {
    const tones = getZoneTones(ticketTypes)
    return layout.zones.map((zone) => ({
      id: zone.id,
      name: zone.name,
      price: zonePrices.get(zone.id) ?? 0,
      quota: quotas[zone.id] ?? 0,
      tone: tones.get(zone.ticketTypeId) ?? null,
    }))
  }, [layout, ticketTypes, zonePrices, quotas])

  // Un mensaje idéntico al anterior alterna un espacio invisible para volver a anunciarse.
  const announce = useCallback((message: string) => {
    setAnnouncement((current) => ({
      message,
      repeat: current.message === message ? !current.repeat : false,
    }))
  }, [])

  const updateSelection = useCallback((next: readonly string[]) => {
    selectedSeatIdsRef.current = next
    setSelectedSeatIds(next)
  }, [])

  const handleSeatActivate = useCallback(
    (seatId: string) => {
      const entry = lookup.get(seatId)
      if (!entry) return

      const result = toggleSeatSelection(selectedSeatIdsRef.current, seatId, {
        lookup,
        soldSeatIds: soldSet,
        quotas,
      })
      if (result.selectedSeatIds !== selectedSeatIdsRef.current) updateSelection(result.selectedSeatIds)

      const nextSummary = buildSeatSelectionSummary(layout, ticketTypes, result.selectedSeatIds, quotas)
      const zoneProgress = nextSummary.zones.find((zone) => zone.zoneId === entry.zone.id)
      announce(
        getSelectionAnnouncement({
          outcome: result.outcome,
          seatName: getSeatName({
            zoneName: entry.zone.name,
            rowLabel: entry.row.label,
            number: entry.seat.number,
          }),
          zoneName: entry.zone.name,
          zoneCount: zoneProgress?.seats.length ?? 0,
          quota: zoneProgress?.quota ?? 0,
          isComplete: nextSummary.isComplete,
        })
      )
    },
    [lookup, soldSet, quotas, layout, ticketTypes, updateSelection, announce]
  )

  const handleClear = useCallback(() => {
    updateSelection([])
    announce(getSelectionAnnouncement({ outcome: "cleared" }))
  }, [updateSelection, announce])

  return (
    <div className="flex flex-col gap-4 pt-4 lg:mx-auto lg:grid lg:max-w-7xl lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-8 lg:px-8 lg:pt-0 lg:pb-20">
      <section
        aria-labelledby={titleId}
        className="mx-4 flex flex-col gap-3 rounded-[22px] border border-border bg-card p-4 sm:mx-6 lg:mx-0 lg:rounded-3xl lg:p-6"
      >
        <h2 id={titleId} className="text-lg font-semibold lg:text-xl">
          Elige tus asientos
        </h2>
        <p className="text-sm text-muted-foreground">
          Toca o haz clic en un asiento para elegirlo. Acerca con los botones, la rueda del mouse o
          pellizcando.
        </p>
        <div className="relative h-[min(calc(100dvh-var(--mobile-action-bar-height)-7rem),36rem)] min-h-80 overflow-hidden rounded-2xl bg-muted/50 lg:h-[min(calc(100dvh-4rem),760px)]">
          <SeatMap
            layout={layout}
            venueName={event.venue.name}
            soldSeatIds={soldSet}
            selectedSeatIds={selectedSet}
            includedZoneIds={includedZoneIds}
            zonePrices={zonePrices}
            onSeatActivate={handleSeatActivate}
          />
        </div>
      </section>

      {/* < lg: `contents` deja la barra móvil como hija del contenedor completo para que quede sticky. */}
      <div className="contents lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-4">
        <SeatMapLegend zones={legendZones} className="mx-4 sm:mx-6 lg:mx-0" />
        <Link
          href={changeQuantitiesHref}
          className="mx-4 self-center text-sm font-semibold text-primary focus-ring sm:mx-6 lg:hidden"
        >
          Cambiar cantidades
        </Link>
        <SeatSelectionSummary
          summary={summary}
          continueHref={continueHref}
          changeQuantitiesHref={changeQuantitiesHref}
          onClear={handleClear}
        />
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {announcement.repeat ? `${announcement.message} ` : announcement.message}
      </p>
    </div>
  )
}
