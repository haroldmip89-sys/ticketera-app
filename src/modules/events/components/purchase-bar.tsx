import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { Button } from "@/components/ui/button"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { EventItem } from "@/modules/events/types/event.types"
import { getEventTicketsHref } from "@/modules/events/utils/event-routes"

export type PurchaseBarProps = { event: EventItem }

const CTA_CLASS_NAME = "h-13 gap-2 rounded-[15px] px-5 text-[0.9375rem] font-semibold focus-ring"

export function PurchaseBar({ event }: PurchaseBarProps) {
  return (
    <div
      role="region"
      aria-label="Compra rápida"
      data-mobile-action-bar
      className="sticky bottom-0 z-40 border-t border-border bg-background shadow-[0_-12px_24px_-18px_rgb(24_24_27/0.35)] lg:hidden"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
        <p className="flex flex-col">
          <span className="text-xs text-muted-foreground">Desde</span>
          <span className="text-[1.375rem] font-bold tracking-[-0.02em] text-price">
            {formatPrice(event.priceFrom)}
          </span>
        </p>
        {event.availability === "sold-out" ? (
          <Button
            disabled
            focusableWhenDisabled
            className={cn(CTA_CLASS_NAME, "bg-muted text-muted-foreground hover:bg-muted")}
          >
            Agotado
          </Button>
        ) : (
          <Link
            href={getEventTicketsHref(event.slug)}
            className={cn(
              CTA_CLASS_NAME,
              "inline-flex items-center justify-center bg-cta text-cta-foreground hover:bg-cta-hover"
            )}
          >
            Comprar entradas
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </Link>
        )}
      </div>
    </div>
  )
}
