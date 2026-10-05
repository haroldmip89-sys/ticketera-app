import { useId } from "react"
import { Search, X } from "lucide-react"

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
import type { EventItem } from "@/modules/events/types/event.types"
import {
  EVENT_SORT_OPTIONS,
  formatEventCount,
  type ActiveFilter,
  type EventSearchFilters,
  type EventSort,
} from "@/modules/events/utils/event-search"

export type EventSearchResultsProps = {
  /** Ya filtrados y ordenados. */
  events: readonly EventItem[]
  activeFilters: readonly ActiveFilter[]
  sort: EventSort
  onSortChange: (sort: EventSort) => void
  /** Quitar un chip llama a onFiltersChange(chip.filtersWithout). */
  onFiltersChange: (next: EventSearchFilters) => void
  onClearFilters: () => void
}

export function EventSearchResults({
  events,
  activeFilters,
  sort,
  onSortChange,
  onFiltersChange,
  onClearFilters,
}: EventSearchResultsProps) {
  const titleId = useId()
  const sortLabelId = useId()

  return (
    <section aria-labelledby={titleId} className="flex min-w-0 flex-col gap-3 lg:gap-5">
      <h2 id={titleId} className="sr-only">
        Resultados
      </h2>

      <div className="flex min-h-11 items-center justify-between gap-6">
        <div className="flex flex-wrap items-center gap-2">
          <p aria-live="polite" className="mr-2 text-[0.9375rem] font-semibold lg:text-base">
            {formatEventCount(events.length)}
          </p>
          {activeFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              aria-label={`Quitar filtro ${filter.label}`}
              onClick={() => onFiltersChange(filter.filtersWithout)}
              className="hidden h-9 items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 pr-2.5 pl-3.5 text-[0.8125rem] font-medium text-primary focus-ring lg:inline-flex"
            >
              {filter.label}
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ))}
        </div>

        <div className="hidden shrink-0 items-center gap-3 lg:flex">
          <span id={sortLabelId} className="text-sm text-muted-foreground">
            Ordenar por
          </span>
          <div
            role="group"
            aria-labelledby={sortLabelId}
            className="flex gap-1 rounded-[14px] border border-border bg-card p-1"
          >
            {EVENT_SORT_OPTIONS.map((option) => {
              const isActive = sort === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onSortChange(option.value)}
                  className={cn(
                    "h-10 rounded-[10px] px-4 text-sm font-semibold focus-ring",
                    isActive ? "bg-foreground text-background" : "bg-transparent text-foreground"
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {events.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      ) : (
        <Empty className="rounded-[22px] border-[1.5px] border-dashed border-input bg-card px-5 py-12 lg:rounded-3xl lg:px-6 lg:py-18">
          <EmptyHeader className="max-w-[26.25rem]">
            <EmptyMedia className="size-13 rounded-2xl bg-primary/10 text-primary lg:size-14 lg:rounded-[18px]">
              <Search className="size-6 lg:size-[26px]" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle className="text-[1.0625rem] font-semibold lg:text-xl">
              No encontramos eventos con esos filtros
            </EmptyTitle>
            <EmptyDescription className="max-w-[26.25rem] text-sm leading-[1.55] text-muted-foreground lg:text-[0.9375rem]">
              Prueba quitando algún filtro o buscando otra ciudad.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="mt-1.5 lg:mt-2">
            <Button
              type="button"
              onClick={onClearFilters}
              className="h-12 rounded-[14px] bg-foreground px-5 font-semibold text-background hover:bg-foreground/90 lg:px-[22px]"
            >
              Limpiar filtros
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </section>
  )
}
