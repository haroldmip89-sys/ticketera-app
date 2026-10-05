"use client"

import { useMemo, useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"

import { getCheckoutFieldId, CheckoutFields } from "@/modules/checkout/components/checkout-fields"
import {
  CheckoutPayBar,
  CheckoutSummary,
  CheckoutSummaryCollapsible,
  type PayState,
} from "@/modules/checkout/components/checkout-summary"
import { EventPurchaseSummary } from "@/modules/checkout/components/event-purchase-summary"
import {
  ReservationExpired,
  ReservationTimerNotice,
} from "@/modules/checkout/components/reservation-notice"
import { useReservationCountdown } from "@/modules/checkout/hooks/use-reservation-countdown"
import {
  CHECKOUT_FIELD_ORDER,
  EMPTY_CHECKOUT_FORM,
  getCheckoutFieldErrors,
  type CheckoutFieldName,
  type CheckoutFormValues,
} from "@/modules/checkout/schemas/checkout-form.schema"
import {
  buildConfirmationHref,
  calculateOrderTotals,
  CHECKOUT_SETTINGS,
  createMockOrderCode,
  getSubtotalCents,
} from "@/modules/checkout/utils/checkout-order"
import {
  getSelectionLines,
  getTotalQuantity,
  type TicketSelection,
} from "@/modules/checkout/utils/ticket-selection"
import type { EventItem, TicketType } from "@/modules/events/types/event.types"
import type { SeatSelectionSummary } from "@/modules/seating/types/seating.types"
import { formatSeatPosition } from "@/modules/seating/utils/seat-selection"

export type CheckoutViewProps = {
  event: EventItem
  ticketTypes: TicketType[]
  /** Ya validada y no vacía. */
  selection: TicketSelection
  /** Completa en teatros; null en eventos por zona. */
  seatSummary: SeatSelectionSummary | null
  backHref: string
  backLabel: string
  changeTicketsHref: string
}

const RESERVATION_SECONDS = CHECKOUT_SETTINGS.reservationMinutes * 60
const TERMS_HINT = "Acepta los términos para continuar."
const DATA_HINT = "Completa tus datos para continuar."
const DATA_AND_TERMS_HINT = "Completa tus datos y acepta los términos para continuar."

function getBlockedHint(errors: Partial<Record<CheckoutFieldName, string>>): string {
  const missingTerms = Boolean(errors.acceptTerms)
  const hasDataErrors = Object.keys(errors).some((name) => name !== "acceptTerms")
  if (missingTerms && hasDataErrors) return DATA_AND_TERMS_HINT
  return missingTerms ? TERMS_HINT : DATA_HINT
}

export function CheckoutView({
  event,
  ticketTypes,
  selection,
  seatSummary,
  backHref,
  backLabel,
  changeTicketsHref,
}: CheckoutViewProps) {
  const router = useRouter()
  const [values, setValues] = useState<CheckoutFormValues>(EMPTY_CHECKOUT_FORM)
  const [touched, setTouched] = useState<ReadonlySet<CheckoutFieldName>>(() => new Set())
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [isPending, startTransition] = useTransition()
  const { remainingSeconds, isExpired } = useReservationCountdown(RESERVATION_SECONDS)

  const lines = useMemo(() => getSelectionLines(selection, ticketTypes), [selection, ticketTypes])
  const totalQuantity = useMemo(() => getTotalQuantity(selection), [selection])
  const totals = useMemo(() => calculateOrderTotals(getSubtotalCents(lines)), [lines])
  const seatLabels = useMemo(() => {
    const labels = new Map<string, string[]>()
    for (const zone of seatSummary?.zones ?? []) {
      const zoneLabels = labels.get(zone.ticketTypeId) ?? []
      zoneLabels.push(...zone.seats.map(formatSeatPosition))
      labels.set(zone.ticketTypeId, zoneLabels)
    }
    return labels
  }, [seatSummary])
  const errors = useMemo(() => getCheckoutFieldErrors(values), [values])
  const visibleErrors = useMemo(() => {
    if (submitAttempted) return errors
    return Object.fromEntries(
      Object.entries(errors).filter(([name]) => touched.has(name as CheckoutFieldName))
    ) as Partial<Record<CheckoutFieldName, string>>
  }, [errors, touched, submitAttempted])

  const payState: PayState = isPending
    ? { status: "pending" }
    : Object.keys(errors).length === 0
      ? { status: "ready" }
      : { status: "blocked", hint: getBlockedHint(errors) }

  const isSeatSelection = seatSummary !== null
  const summaryContent = { lines, seatLabels, totals, changeTicketsHref }

  function markTouched(name: CheckoutFieldName) {
    setTouched((current) => (current.has(name) ? current : new Set(current).add(name)))
  }

  function handleValueChange<K extends CheckoutFieldName>(name: K, value: CheckoutFormValues[K]) {
    setValues((current) => ({ ...current, [name]: value }))
    if (name === "acceptTerms") markTouched(name)
  }

  function handleSubmit(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault()
    if (isPending || isExpired) return

    const firstInvalid = CHECKOUT_FIELD_ORDER.find((name) => errors[name])
    if (firstInvalid) {
      setSubmitAttempted(true)
      document.getElementById(getCheckoutFieldId(firstInvalid))?.focus()
      return
    }

    const href = buildConfirmationHref({
      slug: event.slug,
      orderCode: createMockOrderCode(),
      selection,
      ticketTypes,
      seatIds: seatSummary?.zones.flatMap((zone) => zone.seats.map((seat) => seat.seatId)),
    })
    startTransition(() => router.replace(href))
  }

  return (
    <>
      <div className="hidden lg:block">
        <EventPurchaseSummary event={event} backHref={backHref} backLabel={backLabel} />
      </div>
      <h1 className="sr-only lg:hidden">Datos y pago: {event.title}</h1>

      {isExpired ? (
        <ReservationExpired
          reselectHref={backHref}
          reselectLabel={isSeatSelection ? "Elegir asientos de nuevo" : "Elegir entradas de nuevo"}
          reservationMinutes={CHECKOUT_SETTINGS.reservationMinutes}
        />
      ) : (
        <>
          <div className="mx-auto max-w-7xl px-4 pt-4 lg:px-8 lg:pt-0">
            <ReservationTimerNotice remainingSeconds={remainingSeconds} />
          </div>

          <form noValidate onSubmit={handleSubmit}>
            <div className="mx-auto flex max-w-7xl flex-col gap-4 p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_26.25rem] lg:items-start lg:gap-8 lg:px-8 lg:pt-6 lg:pb-20">
              <div className="flex flex-col gap-4">
                <CheckoutSummaryCollapsible
                  {...summaryContent}
                  event={event}
                  totalQuantity={totalQuantity}
                />
                <CheckoutFields
                  values={values}
                  errors={visibleErrors}
                  onValueChange={handleValueChange}
                  onFieldBlur={markTouched}
                />
              </div>
              <CheckoutSummary {...summaryContent} payState={payState} />
            </div>
            <CheckoutPayBar totals={totals} payState={payState} />
          </form>
        </>
      )}
    </>
  )
}
