import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Calendar, Clock, MapPin } from "lucide-react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Button } from "@/components/ui/button"
import { formatDateLong, formatPrice, formatTime } from "@/lib/format"
import { withImageWidth } from "@/lib/image-url"
import { EventActions } from "@/modules/events/components/event-actions"
import type { EventItem } from "@/modules/events/types/event.types"
import { getEventTicketsHref } from "@/modules/events/utils/event-routes"

const HERO_IMAGE_WIDTH = 1600
const EVENTS_HREF = "/#eventos"
const CTA_CLASS_NAME = "h-13.5 flex-1 rounded-2xl text-base font-semibold focus-ring"

export type EventDetailHeroProps = { event: EventItem }

export function EventDetailHero({ event }: EventDetailHeroProps) {
  const isSoldOut = event.availability === "sold-out"

  return (
    <>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-2 sm:px-4 lg:hidden">
        <Link
          href={EVENTS_HREF}
          aria-label="Volver a eventos"
          className="inline-flex size-11 items-center justify-center rounded-xl focus-ring"
        >
          <ArrowLeft className="size-[22px]" aria-hidden="true" />
        </Link>
        <EventActions title={event.title} tone="default" />
      </div>

      <div className="mx-auto hidden max-w-7xl px-8 pt-6 pb-5 lg:block">
        <Breadcrumb aria-label="Ruta">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink className="rounded-sm focus-ring" render={<Link href="/" />}>
                Inicio
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbLink className="rounded-sm focus-ring" render={<Link href={EVENTS_HREF} />}>
                {event.category.label}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator>/</BreadcrumbSeparator>
            <BreadcrumbItem>
              <BreadcrumbPage className="font-medium text-foreground">{event.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col overflow-hidden rounded-[28px] bg-stage text-stage-foreground lg:grid lg:h-115 lg:grid-cols-[33.75rem_minmax(0,1fr)] lg:rounded-[32px]">
          <div className="relative h-55 lg:col-start-2 lg:row-start-1 lg:h-auto">
            <Image
              src={withImageWidth(event.imageUrl, HERO_IMAGE_WIDTH)}
              alt={event.imageAlt}
              fill
              sizes="(min-width: 1280px) 740px, (min-width: 1024px) 55vw, 100vw"
              loading="eager"
              fetchPriority="high"
              className="object-cover"
            />
          </div>

          <div className="flex flex-col p-5.5 lg:col-start-1 lg:row-start-1 lg:px-12 lg:py-11">
            <span className="inline-flex h-7 w-fit items-center rounded-full border border-white/28 px-3.5 text-[13px] font-medium lg:h-8">
              {event.category.label}
            </span>

            <h1 className="mt-4 text-[1.75rem] leading-[1.15] font-bold tracking-[-0.025em] text-balance lg:mt-6 lg:text-[2.875rem] lg:leading-[1.08]">
              {event.title}
            </h1>

            <ul className="mt-4 flex flex-col gap-2 text-sm text-stage-muted lg:mt-5 lg:gap-2.5 lg:text-base">
              <li className="flex items-center gap-2">
                <Calendar className="size-[18px] shrink-0" aria-hidden="true" />
                <time dateTime={event.startsAt}>{formatDateLong(event.startsAt)}</time>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="size-[18px] shrink-0" aria-hidden="true" />
                <span>{formatTime(event.startsAt)}</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="size-[18px] shrink-0" aria-hidden="true" />
                <span>
                  {event.venue.name}, {event.venue.city}
                </span>
              </li>
            </ul>

            <div className="hidden flex-1 lg:block" />

            <div className="hidden items-center gap-2.5 lg:flex">
              {isSoldOut ? (
                <Button
                  disabled
                  focusableWhenDisabled
                  className={`${CTA_CLASS_NAME} bg-muted text-muted-foreground hover:bg-muted`}
                >
                  Agotado
                </Button>
              ) : (
                <Link
                  href={getEventTicketsHref(event.slug)}
                  className={`${CTA_CLASS_NAME} inline-flex items-center justify-center bg-cta text-cta-foreground transition-colors hover:bg-cta-hover`}
                >
                  Comprar entradas · desde {formatPrice(event.priceFrom)}
                </Link>
              )}
              <EventActions title={event.title} tone="stage" />
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
