"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, CalendarX2 } from "lucide-react"

import { SectionHeader } from "@/components/shared/section-header"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"
import { EventCard } from "@/modules/events/components/event-card"
import { EventCategoryTiles } from "@/modules/events/components/event-category-tiles"
import { EVENT_CATEGORIES } from "@/modules/events/data/event-categories"
import type { EventCategoryId, EventItem } from "@/modules/events/types/event.types"
import {
  filterUpcomingEvents,
  type EventCategoryFilter,
} from "@/modules/events/utils/event-filters"

const FILTER_CHIPS: readonly { id: EventCategoryFilter; label: string }[] = [
  { id: "all", label: "Todos" },
  ...EVENT_CATEGORIES,
]

export type EventDiscoveryProps = { events: EventItem[] }

export function EventDiscovery({ events }: EventDiscoveryProps) {
  const [selected, setSelected] = useState<EventCategoryFilter>("all")

  const visibleEvents = filterUpcomingEvents(events, selected)
  const selectedLabel = EVENT_CATEGORIES.find((category) => category.id === selected)?.label

  function handleTileSelect(categoryId: EventCategoryId) {
    setSelected((current) => (current === categoryId ? "all" : categoryId))
  }

  return (
    <>
      <section id="categorias" aria-labelledby="categories-title">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 pt-10 pb-8 sm:px-6 md:gap-8 md:pt-16 md:pb-20 lg:px-8">
          <SectionHeader
            titleId="categories-title"
            title="Explora por categoría"
            description="Elige lo que te gusta y te mostramos lo que viene."
          />
          <EventCategoryTiles selected={selected} onSelect={handleTileSelect} />
        </div>
      </section>

      <section id="eventos" aria-labelledby="upcoming-events-title" className="bg-secondary">
        <div className="mx-auto flex max-w-7xl flex-col px-4 pt-10 pb-12 sm:px-6 md:pt-20 md:pb-24 lg:px-8">
          <SectionHeader
            titleId="upcoming-events-title"
            title="Próximos eventos"
            description="Ordenados por fecha. Asegura tu lugar antes de que se agoten."
            action={{
              href: "#",
              label: "Ver calendario completo",
              className: "hidden md:inline-flex",
            }}
          />

          <div
            role="group"
            aria-label="Filtrar por categoría"
            className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:mt-7 md:flex-wrap md:gap-2.5 md:overflow-visible md:px-0"
          >
            {FILTER_CHIPS.map((chip) => {
              const isActive = selected === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => setSelected(chip.id)}
                  className={cn(
                    "h-11 shrink-0 rounded-full border-[1.5px] px-4 text-sm whitespace-nowrap focus-ring md:px-[18px]",
                    isActive
                      ? "border-foreground bg-foreground font-semibold text-background"
                      : "border-input bg-card font-medium text-foreground"
                  )}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>

          <p className="sr-only" aria-live="polite">
            {visibleEvents.length === 1 ? "1 evento" : `${visibleEvents.length} eventos`}
          </p>

          {visibleEvents.length > 0 ? (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 md:mt-8 lg:grid-cols-3 xl:grid-cols-4">
              {visibleEvents.map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          ) : (
            <Empty className="mt-5 rounded-[22px] border-[1.5px] border-dashed border-input bg-card px-5 py-12 md:mt-8 md:rounded-3xl md:py-18">
              <EmptyHeader className="max-w-[26rem]">
                <EmptyMedia className="size-13 rounded-2xl bg-primary/10 text-primary md:size-14">
                  <CalendarX2 aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle className="text-[1.0625rem] font-semibold md:text-xl">
                  {selectedLabel
                    ? `Todavía no hay eventos de ${selectedLabel}`
                    : "Todavía no hay eventos"}
                </EmptyTitle>
                <EmptyDescription className="max-w-[26rem] text-sm text-muted-foreground md:text-[0.9375rem]">
                  Estamos sumando nuevas fechas. Mientras tanto, mira todo lo que viene.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button
                  type="button"
                  onClick={() => setSelected("all")}
                  className="h-12 rounded-[14px] bg-foreground px-5 font-semibold text-background hover:bg-foreground/90"
                >
                  Ver todos los eventos
                </Button>
              </EmptyContent>
            </Empty>
          )}

          <Link
            href="#"
            className="mt-5 inline-flex h-13 w-full items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-foreground bg-card px-7 font-semibold text-foreground focus-ring md:mx-auto md:mt-10 md:w-auto"
          >
            Ver todos los eventos
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </>
  )
}
