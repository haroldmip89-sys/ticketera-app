import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { TicketType } from "@/modules/events/types/event.types"
import { getZoneToneClassName, type ZoneTone } from "@/modules/events/utils/zone-tones"
import type { ZoneMap as ZoneMapData } from "@/modules/seating/types/seating.types"

export type ZoneMapProps = {
  zoneMap: ZoneMapData
  ticketTypes: TicketType[]
  tones: ReadonlyMap<string, ZoneTone | null>
  selectedTicketTypeId: string | null
  onSelect: (ticketTypeId: string) => void
}

// Alto de cada fila (móvil / lg), valores de la referencia.
const ROW_SIZE_CLASS_NAME =
  "[--zone-row-stage:34px] [--zone-row-sm:56px] [--zone-row-md:76px] [--zone-row-lg:96px] lg:[--zone-row-stage:44px] lg:[--zone-row-sm:72px] lg:[--zone-row-md:104px] lg:[--zone-row-lg:128px]"

function getZoneLabel(ticketType: TicketType, price: string): string {
  if (ticketType.availability === "sold-out") return `${ticketType.name}, agotado`
  if (ticketType.availability === "last-tickets") {
    return `${ticketType.name}, ${price}, últimas entradas`
  }
  return `${ticketType.name}, ${price}`
}

export function ZoneMap({
  zoneMap,
  ticketTypes,
  tones,
  selectedTicketTypeId,
  onSelect,
}: ZoneMapProps) {
  const ticketTypesById = new Map(ticketTypes.map((ticketType) => [ticketType.id, ticketType]))

  return (
    <section
      aria-labelledby="zone-map-title"
      className="flex flex-col gap-3.5 rounded-[22px] border border-border bg-card px-4 pt-4.5 pb-4 lg:gap-4.5 lg:rounded-3xl lg:px-7 lg:pt-6 lg:pb-7"
    >
      <div className="flex items-baseline justify-between">
        <h2 id="zone-map-title" className="text-lg font-semibold lg:text-xl">
          Elige tu zona
        </h2>
        <p className="text-xs text-muted-foreground lg:text-[13px]">
          <span className="lg:hidden">Toca una zona</span>
          <span className="hidden lg:inline">Toca una zona del mapa</span>
        </p>
      </div>

      <div
        role="group"
        aria-label="Mapa de zonas"
        className={cn(
          "grid gap-2 rounded-2xl bg-muted/50 p-3 lg:gap-2.5 lg:rounded-[18px] lg:p-5",
          zoneMap.columns === 3
            ? "grid-cols-[76px_minmax(0,1fr)_76px] lg:grid-cols-[140px_minmax(0,1fr)_140px]"
            : "grid-cols-1",
          ROW_SIZE_CLASS_NAME
        )}
        style={{
          gridTemplateRows: zoneMap.rows.map((row) => `var(--zone-row-${row})`).join(" "),
        }}
      >
        <span
          className="flex items-center justify-center rounded-[10px] bg-foreground text-[10px] font-bold tracking-[0.16em] text-background lg:rounded-xl lg:text-xs"
          style={{ gridColumn: zoneMap.stage.area.column, gridRow: zoneMap.stage.area.row }}
        >
          {zoneMap.stage.label}
        </span>

        {zoneMap.zones.map(({ ticketTypeId, area }) => {
          const ticketType = ticketTypesById.get(ticketTypeId)
          if (!ticketType) return null

          const isSelected = ticketTypeId === selectedTicketTypeId
          const isSoldOut = ticketType.availability === "sold-out"
          const price = formatPrice(ticketType.price)

          return (
            <button
              key={ticketTypeId}
              type="button"
              aria-pressed={isSelected}
              aria-label={getZoneLabel(ticketType, price)}
              onClick={() => onSelect(ticketTypeId)}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-xl border-3 text-center focus-ring lg:rounded-[14px]",
                getZoneToneClassName(tones.get(ticketTypeId) ?? null),
                isSelected ? "border-foreground" : "border-transparent"
              )}
              style={{ gridColumn: area.column, gridRow: area.row }}
            >
              <span className="text-[13px] leading-tight font-semibold lg:text-[0.9375rem]">
                {ticketType.name}
              </span>
              <span className="text-xs lg:text-[13px]">{isSoldOut ? "Agotado" : price}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
