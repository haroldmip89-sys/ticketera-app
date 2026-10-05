import { ArrowLeft } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { formatDateLong, formatDateShort } from "@/lib/format"
import type { EventItem } from "@/modules/events/types/event.types"

export type EventPurchaseSummaryProps = {
  event: EventItem
  backHref: string
  /** Texto del link "volver" (solo visible desde lg). Default: "Volver al evento". */
  backLabel?: string
}

export function EventPurchaseSummary({
  event,
  backHref,
  backLabel = "Volver al evento",
}: EventPurchaseSummaryProps) {
  const venueLabel = `${event.venue.name}, ${event.venue.city}`

  return (
    <div className="border-b border-border bg-card lg:border-b-0 lg:bg-transparent">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:px-8 lg:pt-6 lg:pb-7">
        <Link
          href={backHref}
          className="focus-ring hidden h-8 w-fit items-center gap-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground lg:inline-flex"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {backLabel}
        </Link>

        <div className="flex items-center gap-3 lg:gap-4">
          <Image
            src={event.imageUrl}
            alt=""
            width={64}
            height={64}
            sizes="64px"
            className="size-13 shrink-0 rounded-[14px] object-cover lg:size-16 lg:rounded-2xl"
          />
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-[0.9375rem] font-semibold lg:text-[1.625rem] lg:leading-[1.2] lg:font-bold lg:tracking-[-0.02em]">
              {event.title}
            </h1>
            <p className="text-[13px] text-muted-foreground lg:text-[0.9375rem]">
              <span className="lg:hidden">{`${formatDateShort(event.startsAt)} · ${venueLabel}`}</span>
              <span className="hidden lg:inline">{`${formatDateLong(event.startsAt)} · ${venueLabel}`}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
