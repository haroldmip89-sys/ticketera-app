import Image from "next/image"

import { DecorativeQr } from "@/components/shared/decorative-qr"
import { formatDateLong, formatPrice } from "@/lib/format"
import type { ConfirmationTicket } from "@/modules/checkout/utils/order-confirmation"
import type { EventItem } from "@/modules/events/types/event.types"

export type ConfirmationTicketCardProps = { event: EventItem; ticket: ConfirmationTicket }

const NOTCH_CLASS_NAME = "absolute size-6 rounded-full border border-border bg-secondary"

/** Entrada con forma de ticket: horizontal desde lg (talón a la derecha), apilada en móvil. */
export function ConfirmationTicketCard({ event, ticket }: ConfirmationTicketCardProps) {
  const positionLabel = `Entrada ${ticket.position} de ${ticket.total}`
  const accessibleName = `${positionLabel}: ${ticket.ticketTypeName}${
    ticket.seatLabel ? `, ${ticket.seatLabel}` : ""
  }`
  const details = [
    { label: "Zona", value: ticket.ticketTypeName },
    ...(ticket.seatLabel ? [{ label: "Asiento", value: ticket.seatLabel }] : []),
    { label: "Precio", value: formatPrice(ticket.unitPrice) },
  ]

  return (
    <article
      aria-label={accessibleName}
      className="flex flex-col overflow-hidden rounded-3xl border border-border bg-card lg:min-h-58 lg:flex-row"
    >
      <div className="relative h-32.5 w-full shrink-0 lg:h-auto lg:w-50">
        <Image
          src={event.imageUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 200px, 100vw"
          className="object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-5 py-4.5 lg:gap-2 lg:px-7 lg:py-6.5">
        <p className="text-[11px] font-semibold tracking-[0.06em] text-primary uppercase lg:text-xs">
          {event.category.label}
        </p>
        <p className="text-xl leading-[1.2] font-bold tracking-[-0.02em] lg:text-2xl">{event.title}</p>
        <p className="text-sm text-muted-foreground lg:text-[0.9375rem]">
          {`${formatDateLong(event.startsAt)} · ${event.venue.name}, ${event.venue.city}`}
        </p>
        <dl className="mt-2 grid grid-cols-3 gap-2 lg:mt-auto lg:flex lg:gap-7">
          {details.map(({ label, value }) => (
            <div key={label} className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-[11px] text-muted-foreground lg:text-xs">{label}</dt>
              <dd className="text-sm font-semibold tabular-nums lg:text-base">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="relative flex flex-col items-center gap-2.5 border-t-[1.5px] border-dashed border-input p-5.5 lg:w-55 lg:shrink-0 lg:justify-center lg:border-t-0 lg:border-l-[1.5px] lg:p-0">
        <span aria-hidden="true" className={`${NOTCH_CLASS_NAME} -top-3 -left-3`} />
        <span
          aria-hidden="true"
          className={`${NOTCH_CLASS_NAME} -top-3 -right-3 lg:top-auto lg:right-auto lg:-bottom-3 lg:-left-3`}
        />
        <DecorativeQr seed={ticket.qrSeed} className="size-42 lg:size-[7.875rem]" />
        <p className="text-[13px] text-muted-foreground">{positionLabel}</p>
      </div>
    </article>
  )
}
