import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { getZoneToneClassName, type ZoneTone } from "@/modules/events/utils/zone-tones"
import { SeatGlyph } from "@/modules/seating/components/seat-glyph"
import type { SeatStatus } from "@/modules/seating/types/seating.types"

export type SeatMapLegendProps = {
  zones: readonly { id: string; name: string; price: number; quota: number; tone: ZoneTone | null }[]
  className?: string
}

const SEAT_LEGEND_ITEMS: readonly { label: string; status: SeatStatus; accessible: boolean }[] = [
  { label: "Disponible", status: "available", accessible: false },
  { label: "Seleccionado", status: "selected", accessible: false },
  { label: "Vendido", status: "sold", accessible: false },
  { label: "Accesible para silla de ruedas", status: "available", accessible: true },
]

const LIST_CLASS_NAME = "flex flex-wrap gap-x-4 gap-y-2 lg:flex-col"

export function SeatMapLegend({ zones, className }: SeatMapLegendProps) {
  return (
    <section
      aria-labelledby="seat-map-legend-title"
      className={cn(
        "flex flex-col gap-3 rounded-[22px] border border-border bg-card p-4 lg:rounded-3xl lg:p-6",
        className
      )}
    >
      <h2 id="seat-map-legend-title" className="text-base font-semibold">
        Leyenda
      </h2>

      <ul className={LIST_CLASS_NAME}>
        {SEAT_LEGEND_ITEMS.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-sm">
            <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden="true">
              <SeatGlyph cx={12} cy={12} r={9} status={item.status} accessible={item.accessible} />
            </svg>
            {item.label}
          </li>
        ))}
      </ul>

      <ul className={cn(LIST_CLASS_NAME, "border-t border-border pt-3")}>
        {zones.map((zone) => (
          <li key={zone.id} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className={cn("size-3.5 shrink-0 rounded-[4px]", getZoneToneClassName(zone.tone))}
            />
            <span className="font-semibold">{zone.name}</span>
            <span className="tabular-nums">{formatPrice(zone.price)}</span>
            {zone.quota > 0 && <span className="text-muted-foreground">· eliges {zone.quota}</span>}
          </li>
        ))}
      </ul>
    </section>
  )
}
