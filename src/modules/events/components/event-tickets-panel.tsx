import Link from "next/link"
import { ArrowRight, Clock, Lock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { EventItem, TicketType } from "@/modules/events/types/event.types"
import { getEventTicketsHref } from "@/modules/events/utils/event-routes"
import { getZoneToneClassName, getZoneTones } from "@/modules/events/utils/zone-tones"

export type EventTicketsPanelProps = { event: EventItem; ticketTypes: TicketType[] }

const CTA_CLASS_NAME = "h-14 w-full gap-2 rounded-2xl text-base font-semibold focus-ring"

export function EventTicketsPanel({ event, ticketTypes }: EventTicketsPanelProps) {
  const tones = getZoneTones(ticketTypes)

  return (
    <section
      aria-labelledby="tickets-title"
      className="lg:sticky lg:top-[calc(var(--site-header-height)+1rem)] lg:col-start-2 lg:row-span-3 lg:row-start-1 lg:flex lg:flex-col lg:gap-5 lg:rounded-3xl lg:border lg:border-border lg:bg-card lg:p-7 lg:shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)]"
    >
      <h2
        id="tickets-title"
        className="text-xl font-bold tracking-[-0.02em] lg:sr-only lg:text-2xl"
      >
        Entradas
      </h2>

      <p className="hidden flex-col lg:flex">
        <span className="text-[13px] text-muted-foreground">Entradas desde</span>
        <span className="text-[1.875rem] font-bold tracking-[-0.02em] text-price">
          {formatPrice(event.priceFrom)}
        </span>
      </p>

      <ul className="mt-3 border-t border-border lg:mt-0">
        {ticketTypes.map((ticketType) => {
          const isSoldOut = ticketType.availability === "sold-out"
          return (
            <li
              key={ticketType.id}
              className="flex min-h-14 items-center justify-between gap-3 border-b border-border"
            >
              <div className="flex items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className={cn(
                    "size-3 shrink-0 rounded-[4px]",
                    getZoneToneClassName(tones.get(ticketType.id) ?? null)
                  )}
                />
                <span
                  className={cn(
                    "text-[0.9375rem] font-medium",
                    isSoldOut && "text-muted-foreground"
                  )}
                >
                  {ticketType.name}
                </span>
                {ticketType.availability === "last-tickets" && (
                  <Badge className="h-6 gap-1 rounded-full bg-urgent px-2 text-[11px] font-semibold text-urgent-foreground">
                    <Clock aria-hidden="true" />
                    Últimas
                  </Badge>
                )}
              </div>
              {isSoldOut ? (
                <span className="text-sm font-semibold text-muted-foreground">Agotado</span>
              ) : (
                <span className="text-[0.9375rem] font-semibold">
                  {formatPrice(ticketType.price)}
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <div className="hidden flex-col gap-4 lg:flex">
        {event.availability === "sold-out" ? (
          <Button
            disabled
            focusableWhenDisabled
            className={cn(CTA_CLASS_NAME, "bg-muted text-muted-foreground hover:bg-muted")}
          >
            Agotado
          </Button>
        ) : (
          <Link
            href={getEventTicketsHref(event.slug)}
            className={cn(
              CTA_CLASS_NAME,
              "inline-flex items-center justify-center bg-cta text-cta-foreground hover:bg-cta-hover"
            )}
          >
            Elegir entradas
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </Link>
        )}
        <p className="flex items-center justify-center gap-2 text-[13px] text-muted-foreground">
          <Lock className="size-4" aria-hidden="true" />
          Pago seguro · Entrada digital con QR
        </p>
      </div>
    </section>
  )
}
