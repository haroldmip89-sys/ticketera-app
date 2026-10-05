"use client"

import { useRef } from "react"
import { SlidersHorizontal, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { EventSearchFilters } from "@/modules/events/components/event-search-filters"
import {
  clearPanelFilters,
  countPanelFilters,
  formatEventCount,
  type CityOption,
  type EventSearchFilters as EventSearchFiltersValue,
  type MonthOption,
} from "@/modules/events/utils/event-search"

export type EventSearchFiltersSheetProps = {
  filters: EventSearchFiltersValue
  cityOptions: readonly CityOption[]
  monthOptions: readonly MonthOption[]
  resultCount: number
  onFiltersChange: (next: EventSearchFiltersValue) => void
}

export function EventSearchFiltersSheet({
  filters,
  cityOptions,
  monthOptions,
  resultCount,
  onFiltersChange,
}: EventSearchFiltersSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const activeCount = countPanelFilters(filters)

  return (
    <Sheet>
      <SheetTrigger className="focus-ring inline-flex h-11 items-center gap-2 rounded-xl border-[1.5px] border-input bg-card px-4 text-sm font-semibold text-foreground">
        <SlidersHorizontal className="size-[17px]" aria-hidden="true" />
        Filtros
        {activeCount > 0 && (
          <>
            <Badge
              aria-hidden="true"
              className="h-[22px] min-w-[22px] rounded-full bg-primary px-1.5 text-xs text-primary-foreground tabular-nums"
            >
              {activeCount}
            </Badge>
            {" "}
            <span className="sr-only">
              ({activeCount} {activeCount === 1 ? "activo" : "activos"})
            </span>
          </>
        )}
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        initialFocus={closeButtonRef}
        className="gap-0 p-0 motion-reduce:transition-none data-[side=right]:w-full data-[side=right]:border-l-0 data-[side=right]:sm:max-w-none"
      >
        <SheetHeader className="h-16 shrink-0 flex-row items-center justify-between gap-0 border-b border-border py-0 pr-2 pl-4">
          <SheetTitle className="text-lg font-semibold">
            Filtros
          </SheetTitle>
          <SheetClose
            ref={closeButtonRef}
            render={<Button variant="ghost" size="icon" className="size-11 rounded-xl" />}
            aria-label="Cerrar filtros"
          >
            <X className="size-[22px]" aria-hidden="true" />
          </SheetClose>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-1">
          <EventSearchFilters
            filters={filters}
            cityOptions={cityOptions}
            monthOptions={monthOptions}
            size="touch"
            onFiltersChange={onFiltersChange}
          />
        </div>

        <SheetFooter className="mt-0 flex-row gap-2.5 border-t border-border px-4 pt-3 pb-[max(20px,env(safe-area-inset-bottom))]">
          <Button
            type="button"
            variant="outline"
            onClick={() => onFiltersChange(clearPanelFilters(filters))}
            className="h-[52px] rounded-[14px] border-[1.5px] border-input bg-card px-[18px] text-[0.9375rem] font-semibold"
          >
            Limpiar
          </Button>
          <SheetClose
            render={
              <Button className="h-[52px] flex-1 rounded-[14px] bg-foreground text-[0.9375rem] font-semibold text-background hover:bg-foreground/90" />
            }
          >
            Ver {formatEventCount(resultCount)}
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
