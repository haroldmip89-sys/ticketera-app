import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { SelectionLine } from "@/modules/checkout/utils/ticket-selection"

export type OrderSummaryProps = {
  lines: SelectionLine[]
  totalQuantity: number
  totalPrice: number
  continueHref: string | null
  note?: string
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

function formatTicketCount(quantity: number): string {
  return `${quantity} ${quantity === 1 ? "entrada" : "entradas"}`
}

export function OrderSummary({
  lines,
  totalQuantity,
  totalPrice,
  continueHref,
  note,
}: OrderSummaryProps) {
  return (
    <>
      <aside
        aria-label="Resumen de la compra"
        className="hidden flex-col gap-5 rounded-3xl border border-border bg-card p-7 shadow-[0_20px_40px_-28px_rgb(24_24_27/0.35)] lg:sticky lg:top-6 lg:flex"
      >
        <h2 className="text-xl font-semibold">Tu compra</h2>

        {lines.length > 0 ? (
          <ul className="flex flex-col gap-3">
            {lines.map((line) => (
              <li
                key={line.ticketTypeId}
                className="flex justify-between gap-3 text-[0.9375rem]"
              >
                <span>
                  {line.quantity} × {line.name}
                </span>
                <span className="font-semibold tabular-nums">{formatPrice(line.subtotal)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border-[1.5px] border-dashed border-input p-5 text-center text-sm leading-normal text-muted-foreground">
            Todavía no elegiste entradas. Toca una zona o usa los botones +.
          </p>
        )}

        <p className="flex items-baseline justify-between border-t-[1.5px] border-dashed border-input pt-4.5">
          <span>
            Total{" "}
            <span className="text-muted-foreground">({formatTicketCount(totalQuantity)})</span>
          </span>
          <span className="text-[1.75rem] font-bold tracking-[-0.02em] tabular-nums">
            {formatPrice(totalPrice)}
          </span>
        </p>

        <ContinueAction
          href={continueHref}
          className="h-14 w-full gap-2 rounded-2xl text-base font-semibold focus-ring"
        />

        {note && <p className="text-center text-[13px] text-muted-foreground">{note}</p>}
      </aside>

      <div
        role="region"
        aria-label="Total de la compra"
        data-mobile-action-bar
        className="sticky bottom-0 z-40 border-t border-border bg-background shadow-[0_-12px_24px_-18px_rgb(24_24_27/0.35)] lg:hidden"
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <span aria-live="polite" className="flex flex-col">
            <span className="text-xs text-muted-foreground">
              Total · {formatTicketCount(totalQuantity)}
            </span>
            <span className="text-[1.375rem] font-bold tracking-[-0.02em] tabular-nums">
              {formatPrice(totalPrice)}
            </span>
          </span>
          <ContinueAction
            href={continueHref}
            className="h-13 gap-2 rounded-[15px] px-6 text-[0.9375rem] font-semibold focus-ring"
          />
        </div>
      </div>
    </>
  )
}
