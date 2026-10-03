import { Clock, DoorOpen, IdCard, MapPin, QrCode, type LucideIcon } from "lucide-react"

import { formatTime } from "@/lib/format"
import type { EventItem } from "@/modules/events/types/event.types"
import { getVenueDirectionsUrl } from "@/modules/events/utils/event-routes"

export type EventInfoSectionsProps = { event: EventItem }

type InfoItem = { label: string; value: string; icon: LucideIcon }

const headingClassName = "text-xl font-bold tracking-[-0.02em] lg:text-2xl"

/** Fragmento con las 3 secciones: son hijas directas del grid del cuerpo de `EventDetailView`.
 *  "Lugar" va al final en móvil (después del panel de entradas) con `order-last`. */
export function EventInfoSections({ event }: EventInfoSectionsProps) {
  const { venue } = event
  const infoItems: InfoItem[] = [
    { label: "Apertura de puertas", value: formatTime(event.doorsOpenAt), icon: DoorOpen },
    { label: "Inicio del show", value: formatTime(event.startsAt), icon: Clock },
    {
      label: "Edad mínima",
      value: event.minAge ? `Mayores de ${event.minAge} años` : "Todo público",
      icon: IdCard,
    },
    { label: "Ingreso", value: "Entrada digital con QR", icon: QrCode },
  ]

  return (
    <>
      <section aria-labelledby="event-about-title" className="lg:col-start-1">
        <h2 id="event-about-title" className={headingClassName}>
          Acerca del evento
        </h2>
        <p className="mt-3 max-w-prose text-[0.9375rem] leading-[1.65] text-muted-foreground lg:mt-4 lg:text-base">
          {event.description}
        </p>
      </section>

      <section aria-labelledby="event-info-title" className="lg:col-start-1">
        <h2 id="event-info-title" className={headingClassName}>
          Información importante
        </h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 lg:mt-4 lg:gap-4">
          {infoItems.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="relative flex min-w-0 flex-col justify-center rounded-[18px] border border-border p-4 lg:min-h-20 lg:py-4.5 lg:pr-5 lg:pl-[4.875rem]"
            >
              <dt className="text-[13px] text-muted-foreground">
                <span
                  className="mb-3 flex size-11 items-center justify-center rounded-[14px] bg-primary/10 text-primary lg:absolute lg:top-1/2 lg:left-5 lg:mb-0 lg:-translate-y-1/2"
                  aria-hidden="true"
                >
                  <Icon className="size-5" />
                </span>
                {label}
              </dt>
              <dd className="text-base font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-labelledby="event-venue-title" className="order-last lg:order-none lg:col-start-1">
        <h2 id="event-venue-title" className={headingClassName}>
          Lugar
        </h2>
        <div className="mt-3 overflow-hidden rounded-[22px] border border-border lg:mt-4">
          <div
            className="flex h-40 flex-col items-center justify-center gap-2.5 bg-primary/10 text-primary lg:h-60"
            aria-hidden="true"
          >
            <MapPin className="size-7" />
            <span className="text-sm font-semibold">Mapa referencial</span>
          </div>
          <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between lg:px-6 lg:py-5">
            <div className="min-w-0">
              <p className="text-[1.0625rem] font-semibold">{venue.name}</p>
              <p className="text-sm text-muted-foreground">
                {venue.address}, {venue.city}
              </p>
            </div>
            <a
              href={getVenueDirectionsUrl(venue)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 w-fit shrink-0 items-center rounded-xl border-[1.5px] border-foreground px-4 text-sm font-semibold focus-ring"
            >
              Cómo llegar
              <span className="sr-only"> (se abre en una pestaña nueva)</span>
            </a>
          </div>
        </div>
      </section>
    </>
  )
}
