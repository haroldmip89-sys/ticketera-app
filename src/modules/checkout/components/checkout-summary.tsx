"use client"

import { useId } from "react"
import Image from "next/image"
import Link from "next/link"
import { ChevronDown, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { formatDateShort, formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { fromCents, type OrderTotals } from "@/modules/checkout/utils/checkout-order"
import type { SelectionLine } from "@/modules/checkout/utils/ticket-selection"
import type { EventItem } from "@/modules/events/types/event.types"

export type PayState =
  | { status: "blocked"; hint: string }
  | { status: "ready" }
  | { status: "pending" }

type SummaryContent = {
  lines: SelectionLine[]
  /** ticketTypeId → ["Fila F, asiento 12", …]; vacío en eventos por zona. */
  seatLabels: ReadonlyMap<string, readonly string[]>
  totals: OrderTotals
  changeTicketsHref: string
}

export type CheckoutSummaryProps = SummaryContent & { payState: PayState }
export type CheckoutSummaryCollapsibleProps = SummaryContent & {
  event: EventItem
  totalQuantity: number
}
export type CheckoutPayBarProps = { totals: OrderTotals; payState: PayState }

function formatCents(cents: number): string {
  return formatPrice(fromCents(cents))
}

function formatTicketCount(quantity: number): string {
  return `${quantity} ${quantity === 1 ? "entrada" : "entradas"}`
}

type SummaryLinesProps = Pick<SummaryContent, "lines" | "seatLabels"> & { className?: string }

function SummaryLines({ lines, seatLabels, className }: SummaryLinesProps) {
  return (
    <ul className={cn("flex flex-col gap-3", className)}>
      {lines.map((line) => {
        const seats = seatLabels.get(line.ticketTypeId) ?? []
        return (
          <li key={line.ticketTypeId} className="flex flex-col gap-1">
            <span className="flex justify-between gap-3">
              <span>
                {line.quantity} × {line.name}
              </span>
              <span className="font-semibold tabular-nums">{formatPrice(line.subtotal)}</span>
            </span>
            {seats.length > 0 && (
              <ul className="flex flex-col gap-0.5 text-[13px] text-muted-foreground">
                {seats.map((label) => (
                  <li key={label}>{label}</li>
                ))}
              </ul>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function SummaryBreakdown({ totals }: { totals: OrderTotals }) {
  return (
    <dl className="flex flex-col gap-2">
      <div className="flex justify-between gap-3">
        <dt>Subtotal</dt>
        <dd className="tabular-nums">{formatCents(totals.subtotalCents)}</dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt>Cargo por servicio</dt>
        <dd className="tabular-nums">{formatCents(totals.serviceFeeCents)}</dd>
      </div>
    </dl>
  )
}

function ChangeTicketsLink({ href, className }: { href: string; className?: string }) {
  return (
    <Link
      href={href}
      className={cn("w-fit rounded-md text-sm font-semibold text-primary focus-ring", className)}
    >
      Cambiar entradas
    </Link>
  )
}

type PayActionProps = {
  totals: OrderTotals
  payState: PayState
  buttonClassName: string
  hintClassName: string
}

function PayAction({ totals, payState, buttonClassName, hintClassName }: PayActionProps) {
  const hintId = useId()
  const isReady = payState.status === "ready"
  const hint = payState.status === "blocked" ? payState.hint : null

  return (
    <>
      <Button
        type="submit"
        aria-disabled={isReady ? undefined : true}
        aria-describedby={hint ? hintId : undefined}
        className={cn(
          buttonClassName,
          "gap-2 font-semibold focus-ring",
          isReady
            ? "bg-cta text-cta-foreground hover:bg-cta-hover"
            : "bg-border text-muted-foreground hover:bg-border"
        )}
      >
        <Lock className="size-[18px]" aria-hidden="true" />
        {payState.status === "pending"
          ? "Procesando pago…"
          : `Pagar ${formatCents(totals.totalCents)}`}
      </Button>
      {hint && (
        <p id={hintId} className={cn("text-center text-muted-foreground", hintClassName)}>
          {hint}
        </p>
      )}
    </>
  )
}

export function CheckoutSummary({
  lines,
  seatLabels,
  totals,
  changeTicketsHref,
  payState,
}: CheckoutSummaryProps) {
  return (
    <aside
      aria-label="Resumen de la compra"
      className="hidden flex-col gap-5 rounded-3xl border border-border bg-card p-7 text-[0.9375rem] shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)] lg:sticky lg:top-6 lg:flex"
    >
      <h2 className="text-xl font-semibold">Tu compra</h2>

      <SummaryLines lines={lines} seatLabels={seatLabels} />

      <ChangeTicketsLink href={changeTicketsHref} />

      <SummaryBreakdown totals={totals} />

      <p className="flex items-baseline justify-between border-t-[1.5px] border-dashed border-input pt-4.5">
        <span className="font-medium">Total</span>
        <span className="text-[1.75rem] font-bold tracking-[-0.02em] tabular-nums">
          {formatCents(totals.totalCents)}
        </span>
      </p>

      <PayAction
        totals={totals}
        payState={payState}
        buttonClassName="h-14 w-full rounded-2xl text-base"
        hintClassName="text-[13px]"
      />
    </aside>
  )
}

export function CheckoutSummaryCollapsible({
  lines,
  seatLabels,
  totals,
  changeTicketsHref,
  event,
  totalQuantity,
}: CheckoutSummaryCollapsibleProps) {
  return (
    <Collapsible className="overflow-hidden rounded-[20px] border border-border bg-card lg:hidden">
      <CollapsibleTrigger className="group flex w-full items-center gap-3 px-4 py-3.5 text-left focus-ring">
        <Image
          src={event.imageUrl}
          alt=""
          width={48}
          height={48}
          sizes="48px"
          className="size-12 shrink-0 rounded-xl object-cover"
        />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[0.9375rem] font-semibold">{event.title}</span>
          <span className="text-[13px] text-muted-foreground">
            {formatTicketCount(totalQuantity)} · {formatCents(totals.totalCents)}
          </span>
        </span>
        <ChevronDown
          className="size-[18px] shrink-0 text-muted-foreground transition-transform group-data-[panel-open]:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 data-[ending-style]:h-0 data-[starting-style]:h-0 motion-reduce:transition-none">
        <div className="flex flex-col gap-2.5 px-4 pb-4 text-sm">
          <p className="border-t border-border pt-3 text-muted-foreground">
            {formatDateShort(event.startsAt)} · {event.venue.name}
          </p>
          <SummaryLines lines={lines} seatLabels={seatLabels} className="gap-2.5" />
          <SummaryBreakdown totals={totals} />
          <p className="flex justify-between gap-3 font-semibold">
            <span>Total</span>
            <span className="tabular-nums">{formatCents(totals.totalCents)}</span>
          </p>
          <ChangeTicketsLink href={changeTicketsHref} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function CheckoutPayBar({ totals, payState }: CheckoutPayBarProps) {
  return (
    <div
      role="region"
      aria-label="Pago"
      data-mobile-action-bar
      className="sticky bottom-0 z-40 flex flex-col gap-0.5 border-t border-border bg-background px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_24px_-18px_rgb(24_24_27/0.35)] lg:hidden"
    >
      <PayAction
        totals={totals}
        payState={payState}
        buttonClassName="h-11 w-full rounded-[14px] text-base"
        hintClassName="text-xs leading-4"
      />
    </div>
  )
}
