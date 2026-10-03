import Image from "next/image"
import Link from "next/link"
import { Calendar, Clock, MapPin } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { formatDateBadge, formatDateShort, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { EventItem } from "@/modules/events/types/event.types"
import { getEventHref } from "@/modules/events/utils/event-routes"

const NOTCH_CLASS_NAME = "absolute size-5 rounded-full border border-border bg-secondary"
const CARD_INTERACTION_CLASS_NAME =
  "transition-[translate,box-shadow] duration-250 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_rgb(24_24_27/0.35)] has-[a:focus-visible]:outline-3 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none"
const STRETCHED_LINK_CLASS_NAME = "after:absolute after:inset-0 focus-visible:outline-none"

export type EventCardProps = { event: EventItem; variant?: "ticket" | "compact"; className?: string }

export function EventCard({ event, variant = "ticket", className }: EventCardProps) {
  if (variant === "compact") return <CompactEventCard event={event} className={className} />

  const dateBadge = formatDateBadge(event.startsAt)
  const dateShort = formatDateShort(event.startsAt)
  const venueLabel = `${event.venue.name} · ${event.venue.city}`
  const isSoldOut = event.availability === "sold-out"

  return (
    <article
      className={cn(
        "group relative flex h-33 flex-row overflow-hidden rounded-[20px] border border-border bg-card text-card-foreground",
        CARD_INTERACTION_CLASS_NAME,
        "sm:h-auto sm:flex-col sm:rounded-[22px]",
        className
      )}
    >
      <div className="relative w-27 shrink-0 bg-border sm:h-46 sm:w-full">
        <Image
          src={event.imageUrl}
          alt={event.imageAlt}
          fill
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute top-2 left-2 flex w-11 flex-col items-center rounded-[11px] bg-card pt-1 pb-1.5 shadow-[0_4px_14px_-6px_rgb(0_0_0/0.35)] sm:top-3 sm:left-3 sm:w-14 sm:rounded-[14px] sm:pt-1.5 sm:pb-[7px]"
        >
          <span className="text-[10px] font-bold tracking-[0.08em] text-primary sm:text-[11px]">
            {dateBadge.month}
          </span>
          <span className="text-[17px] leading-[1.05] font-bold sm:text-[22px]">
            {dateBadge.day}
          </span>
        </div>
      </div>

      {/* Muescas de la perforación vertical (móvil); el link estirado necesita el article como único ancestro posicionado. */}
      <span aria-hidden="true" className={cn(NOTCH_CLASS_NAME, "-top-2.5 left-24.5 sm:hidden")} />
      <span aria-hidden="true" className={cn(NOTCH_CLASS_NAME, "-bottom-2.5 left-24.5 sm:hidden")} />

      <div className="flex min-w-0 flex-1 flex-col gap-1 border-l-[1.5px] border-dashed border-input px-3.5 py-3 sm:gap-0 sm:border-l-0 sm:p-0">

        <div className="flex flex-col gap-1 sm:flex-1 sm:gap-2 sm:px-5 sm:pt-4.5">
          <div className="flex items-center justify-between gap-1.5">
            <p className="truncate text-[11px] font-semibold tracking-[0.06em] text-primary uppercase sm:text-xs">
              {event.category.label}
            </p>
            {event.availability === "last-tickets" && (
              <Badge className="h-[22px] rounded-full bg-urgent px-2 text-[11px] font-semibold text-urgent-foreground sm:absolute sm:top-3 sm:right-3 sm:h-7 sm:gap-1.5 sm:px-3 sm:text-xs sm:[&>svg]:size-3.5!">
                <Clock aria-hidden="true" />
                Últimas entradas
              </Badge>
            )}
            {isSoldOut && (
              <Badge className="h-[22px] rounded-full bg-foreground px-2 text-[11px] font-semibold text-background sm:absolute sm:top-3 sm:right-3 sm:h-7 sm:px-3 sm:text-xs">
                Agotado
              </Badge>
            )}
          </div>

          <h3 className="line-clamp-2 text-[0.9375rem] leading-[1.3] font-semibold sm:min-h-[2.875rem] sm:text-[1.0625rem] sm:leading-[1.35]">
            <Link href={getEventHref(event.slug)} className={STRETCHED_LINK_CLASS_NAME}>
              {event.title}
            </Link>
          </h3>

          <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground sm:text-sm">
            <MapPin className="hidden size-4 shrink-0 sm:block" aria-hidden="true" />
            <span className="truncate">{venueLabel}</span>
          </p>

          <p className="hidden items-center gap-1.5 text-sm text-muted-foreground sm:flex">
            <Calendar className="size-4 shrink-0" aria-hidden="true" />
            <time dateTime={event.startsAt}>{dateShort}</time>
          </p>
          <time dateTime={event.startsAt} className="sr-only sm:hidden">
            {dateShort}
          </time>
        </div>

        <div
          aria-hidden="true"
          className="relative mt-4.5 hidden border-t-[1.5px] border-dashed border-input sm:block"
        >
          <span className={cn(NOTCH_CLASS_NAME, "-top-2.5 -left-2.5")} />
          <span className={cn(NOTCH_CLASS_NAME, "-top-2.5 -right-2.5")} />
        </div>

        <div className="mt-auto flex items-center justify-between gap-3 sm:mt-0 sm:px-5 sm:pt-4 sm:pb-5">
          <p className="flex items-baseline gap-1 sm:flex-col sm:items-start sm:gap-0">
            <span className="text-xs text-muted-foreground">Desde</span>
            <span className="text-base font-bold text-price sm:text-[1.1875rem] sm:tracking-[-0.01em]">
              {formatPrice(event.priceFrom)}
            </span>
          </p>
          {isSoldOut ? (
            <span
              aria-hidden="true"
              className="hidden h-11 items-center rounded-xl bg-muted px-4 text-sm font-semibold text-muted-foreground sm:inline-flex"
            >
              Agotado
            </span>
          ) : (
            <span
              aria-hidden="true"
              className="hidden h-11 items-center rounded-xl border-[1.5px] border-foreground px-4 text-sm font-semibold sm:inline-flex"
            >
              Ver entradas
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function CompactEventCard({ event, className }: Omit<EventCardProps, "variant">) {
  const dateBadge = formatDateBadge(event.startsAt)

  return (
    <article
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-[22px] border border-border bg-card text-card-foreground",
        CARD_INTERACTION_CLASS_NAME,
        className
      )}
    >
      <div className="relative h-42.5 shrink-0 bg-border">
        <Image
          src={event.imageUrl}
          alt={event.imageAlt}
          fill
          sizes="(min-width: 1024px) 25vw, 250px"
          className="object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute top-3 left-3 flex w-14 flex-col items-center rounded-[14px] bg-card pt-1.5 pb-[7px] shadow-[0_4px_14px_-6px_rgb(0_0_0/0.35)]"
        >
          <span className="text-[11px] font-bold tracking-[0.08em] text-primary">
            {dateBadge.month}
          </span>
          <span className="text-[22px] leading-[1.05] font-bold">{dateBadge.day}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-2 px-5 pt-4.5 pb-5">
        <p className="truncate text-xs font-semibold tracking-[0.06em] text-primary uppercase">
          {event.category.label}
        </p>

        <h3 className="line-clamp-2 text-[1.0625rem] leading-[1.35] font-semibold">
          <Link href={getEventHref(event.slug)} className={STRETCHED_LINK_CLASS_NAME}>
            {event.title}
          </Link>
        </h3>

        <p className="truncate text-sm text-muted-foreground">
          {`${event.venue.name} · ${event.venue.city}`}
        </p>
        <time dateTime={event.startsAt} className="sr-only">
          {formatDateShort(event.startsAt)}
        </time>

        <p className="mt-auto flex flex-col">
          <span className="text-xs text-muted-foreground">Desde</span>
          <span className="text-lg font-bold text-price">{formatPrice(event.priceFrom)}</span>
        </p>
      </div>
    </article>
  )
}
