import { Clock } from "lucide-react"

import { QuantityStepper } from "@/components/shared/quantity-stepper"
import { Badge } from "@/components/ui/badge"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  getTicketQuantity,
  MAX_TICKETS_PER_ZONE,
  type TicketSelection,
} from "@/modules/checkout/utils/ticket-selection"
import type { TicketType } from "@/modules/events/types/event.types"
import { getZoneToneClassName, type ZoneTone } from "@/modules/events/utils/zone-tones"

export type TicketZoneListProps = {
  ticketTypes: TicketType[]
  tones: ReadonlyMap<string, ZoneTone | null>
  selection: TicketSelection
  selectedTicketTypeId: string | null
  onQuantityChange: (ticketType: TicketType, quantity: number) => void
}

export function TicketZoneList({
  ticketTypes,
  tones,
  selection,
  selectedTicketTypeId,
  onQuantityChange,
}: TicketZoneListProps) {
  return (
    <section
      aria-labelledby="ticket-list-title"
      className="rounded-[22px] border border-border bg-card px-4 py-2 lg:rounded-3xl lg:px-7"
    >
      <h2 id="ticket-list-title" className="pt-4 pb-2 text-lg font-semibold lg:text-xl">
        Entradas
      </h2>

      <ul>
        {ticketTypes.map((ticketType) => (
          <li
            key={ticketType.id}
            className={cn(
              "-mx-3 flex min-h-19 items-center gap-4 rounded-[14px] border-t border-border px-3",
              ticketType.id === selectedTicketTypeId && "bg-primary/10"
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                "size-3.5 shrink-0 rounded-[4px]",
                getZoneToneClassName(tones.get(ticketType.id) ?? null)
              )}
            />

            <div className="flex flex-1 flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-semibold">{ticketType.name}</span>
                {ticketType.availability === "last-tickets" && (
                  <Badge className="h-6 gap-1 rounded-full bg-urgent px-2 text-[11px] font-semibold text-urgent-foreground">
                    <Clock className="size-3" aria-hidden="true" />
                    Últimas entradas
                  </Badge>
                )}
              </div>
              <span className="text-sm text-muted-foreground">
                {formatPrice(ticketType.price)} c/u
              </span>
            </div>

            {ticketType.availability === "sold-out" ? (
              <span className="inline-flex h-11 items-center rounded-xl bg-muted px-4 text-sm font-semibold text-muted-foreground">
                Agotado
              </span>
            ) : (
              <QuantityStepper
                value={getTicketQuantity(selection, ticketType.id)}
                max={MAX_TICKETS_PER_ZONE}
                onValueChange={(next) => onQuantityChange(ticketType, next)}
                groupLabel={`Cantidad de ${ticketType.name}`}
                decrementLabel={`Quitar una entrada de ${ticketType.name}`}
                incrementLabel={`Agregar una entrada de ${ticketType.name}`}
              />
            )}
          </li>
        ))}
      </ul>

      <p className="border-t border-border pt-3.5 pb-4.5 text-xs text-muted-foreground lg:text-[13px]">
        {`Máximo ${MAX_TICKETS_PER_ZONE} entradas por zona.`}
      </p>
    </section>
  )
}
