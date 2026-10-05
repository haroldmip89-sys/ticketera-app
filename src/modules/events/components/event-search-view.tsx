"use client"

import { useId } from "react"
import { useSearchParams } from "next/navigation"
import { ChevronDown, SlidersHorizontal } from "lucide-react"

import { ToggleChip } from "@/components/shared/toggle-chip"
import { EventSearchFilters } from "@/modules/events/components/event-search-filters"
import { EventSearchFiltersSheet } from "@/modules/events/components/event-search-filters-sheet"
import { EventSearchForm } from "@/modules/events/components/event-search-form"
import { EventSearchResults } from "@/modules/events/components/event-search-results"
import type { EventItem } from "@/modules/events/types/event.types"
import { getEventsSearchHref } from "@/modules/events/utils/event-routes"
import {
  clearAllFilters,
  filterEvents,
  getActiveFilters,
  getCategoryOptions,
  getCityOptions,
  getMonthOptions,
  parseEventSearchParams,
  toggleValue,
  type EventSearchFilters as EventSearchFiltersValue,
} from "@/modules/events/utils/event-search"

export type EventSearchViewProps = { events: EventItem[] }

export function EventSearchView({ events }: EventSearchViewProps) {
  const filtersTitleId = useId()
  const filters = parseEventSearchParams(useSearchParams())

  const visibleEvents = filterEvents(events, filters)
  const categoryOptions = getCategoryOptions(events)
  const cityOptions = getCityOptions(events)
  const monthOptions = getMonthOptions(events, filters.month)
  const activeFilters = getActiveFilters(filters, monthOptions)

  // D1/D3: la URL es la fuente de verdad; replaceState no recarga ni apila historial.
  function updateFilters(next: EventSearchFiltersValue) {
    window.history.replaceState(null, "", getEventsSearchHref(next))
  }

  function clearFilters() {
    updateFilters(clearAllFilters(filters))
  }

  return (
    <>
      <div className="border-b border-border bg-background">
        <div className="mx-auto flex max-w-7xl flex-col gap-3.5 px-4 pt-5 pb-[18px] sm:px-6 lg:gap-5 lg:px-8 lg:pt-9 lg:pb-8">
          <h1 className="text-[1.75rem] leading-[1.15] font-bold tracking-[-0.025em] lg:text-4xl lg:leading-[1.1]">
            Explora eventos
          </h1>

          <EventSearchForm
            key={`${filters.query}|${filters.price}|${filters.month ?? ""}`}
            filters={filters}
            className="mt-0 lg:w-full"
          />

          <div className="flex gap-2 lg:hidden">
            <EventSearchFiltersSheet
              filters={filters}
              cityOptions={cityOptions}
              monthOptions={monthOptions}
              resultCount={visibleEvents.length}
              onFiltersChange={updateFilters}
            />
            <button
              type="button"
              onClick={() =>
                updateFilters({ ...filters, sort: filters.sort === "date" ? "price" : "date" })
              }
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border-[1.5px] border-input bg-card px-4 text-sm font-medium text-foreground focus-ring"
            >
              <span className="text-muted-foreground">Orden:</span>{" "}
              <strong className="font-semibold">
                {filters.sort === "date" ? "Fecha" : "Precio"}
              </strong>
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-secondary">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div
            role="group"
            aria-label="Filtrar por categoría"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pt-4 pb-1 sm:-mx-6 sm:px-6 lg:hidden"
          >
            <ToggleChip
              pressed={filters.categories.length === 0}
              onClick={() => updateFilters({ ...filters, categories: [] })}
            >
              Todos
            </ToggleChip>
            {categoryOptions.map((option) => (
              <ToggleChip
                key={option.id}
                pressed={filters.categories.includes(option.id)}
                onClick={() =>
                  updateFilters({
                    ...filters,
                    categories: toggleValue(filters.categories, option.id),
                  })
                }
              >
                {option.label}
              </ToggleChip>
            ))}
          </div>

          <div className="pt-3 pb-10 lg:grid lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start lg:gap-10 lg:pt-8 lg:pb-20">
            <aside
              aria-labelledby={filtersTitleId}
              className="hidden rounded-[22px] border border-border bg-card px-6 pt-2 pb-6 lg:block"
            >
              <div className="flex h-15 items-center justify-between border-b border-border">
                <h2 id={filtersTitleId} className="flex items-center gap-2 text-base font-semibold">
                  <SlidersHorizontal className="size-[18px]" aria-hidden="true" />
                  Filtros
                </h2>
                {activeFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="h-11 px-1 text-sm font-semibold text-primary hover:text-primary/80 focus-ring"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <EventSearchFilters
                filters={filters}
                categoryOptions={categoryOptions}
                cityOptions={cityOptions}
                monthOptions={monthOptions}
                onFiltersChange={updateFilters}
              />
            </aside>

            <EventSearchResults
              events={visibleEvents}
              activeFilters={activeFilters}
              sort={filters.sort}
              onSortChange={(sort) => updateFilters({ ...filters, sort })}
              onFiltersChange={updateFilters}
              onClearFilters={clearFilters}
            />
          </div>
        </div>
      </div>
    </>
  )
}
