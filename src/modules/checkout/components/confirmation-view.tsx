import { CircleCheck, Mail, QrCode, Ticket } from "lucide-react"

import { formatPrice } from "@/lib/format"
import { ConfirmationActions } from "@/modules/checkout/components/confirmation-actions"
import { ConfirmationTicketCard } from "@/modules/checkout/components/confirmation-ticket-card"
import { fromCents, type OrderTotals } from "@/modules/checkout/utils/checkout-order"
import type { ConfirmationTicket } from "@/modules/checkout/utils/order-confirmation"
import type { EventItem } from "@/modules/events/types/event.types"

export type ConfirmationViewProps = {
  event: EventItem
  orderCode: string
  /** No vacío. */
  tickets: ConfirmationTicket[]
  totals: OrderTotals
}

const NEXT_STEPS = [
  {
    icon: Mail,
    title: "Revisa tu correo",
    description: "Ahí llegan tus entradas y el comprobante de pago.",
  },
  {
    icon: QrCode,
    title: "Muestra tu QR",
    description: "Cada entrada tiene su propio QR. Muéstralo desde tu celular en el ingreso.",
  },
  {
    icon: Ticket,
    title: "Todo en Mis entradas",
    description: "Entra con tu cuenta para ver y descargar tus entradas cuando quieras.",
  },
] as const

export function ConfirmationView({ event, orderCode, tickets, totals }: ConfirmationViewProps) {
  const summary = [
    { label: "Entradas", value: String(tickets.length) },
    { label: "Cargo por servicio", value: formatPrice(fromCents(totals.serviceFeeCents)) },
    { label: "Total pagado", value: formatPrice(fromCents(totals.totalCents)) },
  ]

  return (
    <div className="mx-auto flex max-w-[55rem] flex-col items-center gap-6 px-4 pt-7 pb-9 lg:gap-9 lg:pt-14 lg:pb-18">
      <header className="flex flex-col items-center gap-3 text-center lg:gap-3.5">
        <span className="flex size-16 items-center justify-center rounded-full bg-success text-success-foreground lg:size-19">
          <CircleCheck className="size-8.5 lg:size-10" aria-hidden="true" />
        </span>
        <h1 className="text-[1.75rem] leading-[1.15] font-bold tracking-[-0.025em] lg:text-[2.5rem] lg:leading-[1.1]">
          ¡Compra confirmada!
        </h1>
        <p className="max-w-[32.5rem] text-[0.9375rem] leading-[1.55] text-muted-foreground lg:text-[1.0625rem]">
          Enviamos tus entradas a tu correo. También las tienes siempre en Mis entradas.
        </p>
        <p className="inline-flex h-8.5 items-center rounded-full border border-border bg-card px-3.5 text-[13px] text-muted-foreground lg:h-9 lg:px-4 lg:text-sm">
          Pedido N.º
          <strong className="ml-1.5 font-semibold text-foreground tabular-nums">{orderCode}</strong>
        </p>
        <p className="text-[13px] text-muted-foreground">
          Modo demo: no se realizó ningún cargo ni se envió ningún correo.
        </p>
      </header>

      <dl className="grid w-full grid-cols-3 gap-4 rounded-[20px] border border-border bg-card px-5 py-4 lg:px-7">
        {summary.map(({ label, value }) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5">
            <dt className="text-[11px] text-muted-foreground lg:text-xs">{label}</dt>
            <dd className="text-sm font-semibold tabular-nums lg:text-base">{value}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="confirmation-tickets-title" className="w-full">
        <h2 id="confirmation-tickets-title" className="sr-only">
          Tus entradas
        </h2>
        <ol className="flex w-full flex-col gap-4">
          {tickets.map((ticket) => (
            <li key={ticket.key}>
              <ConfirmationTicketCard event={event} ticket={ticket} />
            </li>
          ))}
        </ol>
      </section>

      <ConfirmationActions event={event} orderCode={orderCode} tickets={tickets} />

      <section aria-labelledby="confirmation-next-steps-title" className="flex w-full flex-col gap-3">
        <h2 id="confirmation-next-steps-title" className="text-lg font-semibold lg:sr-only">
          Qué sigue
        </h2>
        <ol className="flex w-full flex-col gap-2.5 lg:mt-3 lg:grid lg:grid-cols-3 lg:gap-4">
          {NEXT_STEPS.map(({ icon: Icon, title, description }) => (
            <li
              key={title}
              className="flex flex-row items-center gap-3.5 rounded-[18px] border border-border bg-card px-4 py-3.5 lg:flex-col lg:items-start lg:gap-2.5 lg:rounded-[20px] lg:p-5"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary lg:size-11 lg:rounded-[14px]">
                <Icon className="size-[1.1875rem] lg:size-5" aria-hidden="true" />
              </span>
              <div className="flex min-w-0 flex-col gap-0.5 lg:gap-2.5">
                <p className="text-[0.9375rem] font-semibold lg:text-base">{title}</p>
                <p className="text-[13px] leading-[1.45] text-muted-foreground lg:text-sm lg:leading-[1.5]">
                  {description}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
