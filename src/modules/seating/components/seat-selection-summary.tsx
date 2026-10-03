import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { SeatSelectionSummary as SeatSelectionSummaryData } from "@/modules/seating/types/seating.types"

export type SeatSelectionSummaryProps = {
  summary: SeatSelectionSummaryData
  continueHref: string | null
  changeQuantitiesHref: string
  onClear: () => void
}

type ContinueActionProps = { href: string | null; className: string }

function ContinueAction({ href, className }: ContinueActionProps) {
  if (href === null) {
    return (
      <Button
        disabled
        focusableWhenDisabled
        className={cn(className, "bg-border text-muted-foreground hover:bg-border")}
      >
        Continuar
        <ArrowRight className="size-[18px]" aria-hidden="true" />
      </Button>
    )
  }

  return (
    <Link
      href={href}
      className={cn(
        className,
        "inline-flex items-center justify-center bg-cta text-cta-foreground transition-colors hover:bg-cta-hover"
      )}
    >
      Continuar
      <ArrowRight className="size-[18px]" aria-hidden="true" />
    </Link>
  )
}

function formatMissingSeats(missing: number): string {
  return missing === 1 ? "Te falta 1 asiento." : `Te faltan ${missing} asientos.`
}

export function SeatSelectionSummary({
  summary,
  continueHref,
  changeQuantitiesHref,
  onClear,
}: SeatSelectionSummaryProps) {
  const isEmpty = summary.count === 0
  const missing = summary.required - summary.count

  return (
    <>
      <aside
        aria-label="Resumen de la compra"
        className="hidden flex-col gap-4 rounded-3xl border border-border bg-card p-6 shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)] lg:flex"
      >
        <h2 className="text-xl font-semibold">Tu compra</h2>

        <ul className="flex flex-col gap-3">
          {summary.zones.map((zone) => (
            <li key={zone.zoneId} className="flex flex-col gap-1">
              <h3 className="font-semibold">
                {zone.zoneName} · {zone.seats.length} de {zone.quota}
              </h3>
              {zone.seats.length > 0 ? (
                <ul className="flex flex-col gap-0.5 text-sm text-muted-foreground">
                  {zone.seats.map((seat) => (
                    <li key={seat.seatId}>
                      Fila {seat.rowLabel}, asiento {seat.number}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Todavía no elegiste asientos en {zone.zoneName}.
                </p>
              )}
            </li>
          ))}
        </ul>

        <p className="flex items-baseline justify-between border-t-[1.5px] border-dashed border-input pt-4.5">
          <span>Total</span>
          <span className="text-[1.75rem] font-bold tracking-[-0.02em] tabular-nums">
            {formatPrice(summary.total)}
          </span>
        </p>

        <div className="flex items-center gap-3">
          <Button variant="ghost" className="h-14 px-4" disabled={isEmpty} onClick={onClear}>
            Limpiar
          </Button>
          <ContinueAction
            href={continueHref}
            className="h-14 flex-1 gap-2 rounded-2xl text-base font-semibold focus-ring"
          />
        </div>

        {!summary.isComplete && (
          <p className="text-center text-[13px] text-muted-foreground">
            {formatMissingSeats(missing)}
          </p>
        )}

        <Link
          href={changeQuantitiesHref}
          className="self-center text-sm font-semibold text-primary focus-ring"
        >
          Cambiar cantidades
        </Link>
      </aside>

      <div
        role="region"
        aria-label="Resumen de asientos"
        data-mobile-action-bar
        className="sticky bottom-0 z-40 border-t border-border bg-background shadow-[0_-12px_24px_-18px_rgb(24_24_27/0.35)] lg:hidden"
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <span className="flex flex-col">
            <span className="text-sm text-muted-foreground">
              {summary.count} de {summary.required} asientos
            </span>
            <span className="text-lg font-bold tabular-nums">
              Total {formatPrice(summary.total)}
            </span>
          </span>
          <div className="flex items-center gap-2">
            <Button variant="ghost" className="h-11 px-3" disabled={isEmpty} onClick={onClear}>
              Limpiar
            </Button>
            <ContinueAction
              href={continueHref}
              className="h-11 gap-2 rounded-[14px] px-5 text-[0.9375rem] font-semibold focus-ring"
            />
          </div>
        </div>
      </div>
    </>
  )
}
