"use client"

import { useId, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getEventsSearchHref } from "@/modules/events/utils/event-routes"
import {
  DEFAULT_EVENT_SEARCH_FILTERS,
  PRICE_RANGES,
  formatMonthValue,
  type EventSearchFilters,
  type PriceRangeValue,
} from "@/modules/events/utils/event-search"

// Formateador local del navegador (D8): la fecha del Calendar es medianoche local.
const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const FIELD_LABEL_CLASS = "text-xs font-semibold text-foreground"

export type EventSearchFormProps = {
  className?: string
  /** Filtros vigentes (en /events). Inicializa query y price; al enviar conserva categories, cities, sort y month (si no se eligió fecha). Default: DEFAULT_EVENT_SEARCH_FILTERS. */
  filters?: EventSearchFilters
}

export function EventSearchForm({
  className,
  filters = DEFAULT_EVENT_SEARCH_FILTERS,
}: EventSearchFormProps) {
  const router = useRouter()
  const priceLabelId = useId()
  const [query, setQuery] = useState(filters.query)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [price, setPrice] = useState<PriceRangeValue>(filters.price)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    router.push(
      getEventsSearchHref({
        ...filters,
        query: query.trim(),
        price,
        // D4: el día elegido (medianoche local) se traduce a su mes local.
        month: date ? formatMonthValue(date.getFullYear(), date.getMonth() + 1) : filters.month,
      })
    )
  }

  return (
    <form
      role="search"
      aria-label="Buscar eventos"
      onSubmit={handleSubmit}
      className={cn(
        "mt-1.5 flex h-14 items-center gap-2.5 rounded-[18px] border border-border bg-card py-1.5 pr-1.5 pl-4 shadow-[0_10px_24px_-16px_rgb(24_24_27/0.25)]",
        "lg:mt-0 lg:h-19 lg:w-[42rem] lg:shrink-0 lg:items-stretch lg:gap-0 lg:rounded-[22px] lg:p-2 lg:shadow-[0_12px_32px_-16px_rgb(24_24_27/0.22)]",
        className
      )}
    >
      <Search
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground lg:hidden"
      />

      <label className="flex min-w-0 flex-1 cursor-text flex-col justify-center rounded-lg has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ring lg:gap-0.5 lg:rounded-2xl lg:px-[18px] lg:py-1.5">
        <span className={cn("sr-only lg:not-sr-only", FIELD_LABEL_CLASS)}>
          Qué quieres ver
        </span>
        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Artista, evento o ciudad"
          className="h-auto rounded-none border-0 bg-transparent p-0 text-[0.9375rem] focus-visible:ring-0 md:text-[0.9375rem] dark:bg-transparent"
        />
      </label>

      <span aria-hidden="true" className="my-3 hidden w-px bg-border lg:block" />

      <div className="hidden w-[9.375rem] lg:flex">
        <Popover>
          <PopoverTrigger className="flex w-full cursor-pointer flex-col items-start justify-center gap-0.5 rounded-2xl px-[18px] py-1.5 text-left hover:bg-muted focus-ring">
            <span className={FIELD_LABEL_CLASS}>Fecha</span>
            <span className="truncate text-[0.9375rem] text-muted-foreground">
              {date ? dateFormatter.format(date) : "Cualquier día"}
            </span>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={date} onSelect={setDate} />
          </PopoverContent>
        </Popover>
      </div>

      <span aria-hidden="true" className="my-3 hidden w-px bg-border lg:block" />

      <div className="hidden w-40 flex-col justify-center gap-0.5 px-[18px] py-1.5 lg:flex">
        <span id={priceLabelId} className={FIELD_LABEL_CLASS}>
          Precio
        </span>
        <Select
          value={price}
          onValueChange={(value) => setPrice(value ?? "any")}
        >
          <SelectTrigger
            aria-labelledby={priceLabelId}
            className="h-auto w-full rounded-md border-0 bg-transparent p-0 text-[0.9375rem] text-muted-foreground focus-visible:ring-0 focus-ring data-[size=default]:h-auto dark:bg-transparent dark:hover:bg-transparent"
          >
            <SelectValue>
              {(value: string) =>
                PRICE_RANGES.find((range) => range.value === value)?.label ??
                "Cualquier precio"
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {PRICE_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="h-11 gap-2 rounded-[13px] bg-cta px-4 text-sm font-semibold text-cta-foreground hover:bg-cta-hover lg:h-auto lg:rounded-2xl lg:px-6 lg:text-[0.9375rem]"
      >
        <Search aria-hidden="true" className="hidden size-[18px] lg:block" />
        Buscar
      </Button>
    </form>
  )
}
