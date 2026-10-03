import type { TicketType } from "@/modules/events/types/event.types"

export type ZoneTone = 1 | 2 | 3 | 4

const ZONE_TONE_CLASS_NAMES: Record<ZoneTone, string> = {
  1: "bg-zone-1 text-zone-1-foreground",
  2: "bg-zone-2 text-zone-2-foreground",
  3: "bg-zone-3 text-zone-3-foreground",
  4: "bg-zone-4 text-zone-4-foreground",
}
const SOLD_OUT_CLASS_NAME = "bg-muted text-muted-foreground"

/** Asigna tono a cada tipo no agotado por precio DEScendente (empate: orden recibido): 1, 2, 3, 4, 4, 4…
 *  Agotados → null. Clave: TicketType.id. */
export function getZoneTones(
  ticketTypes: readonly TicketType[]
): ReadonlyMap<string, ZoneTone | null> {
  const tones = new Map<string, ZoneTone | null>(
    ticketTypes.map((ticketType) => [ticketType.id, null])
  )
  ticketTypes
    .filter((ticketType) => ticketType.availability !== "sold-out")
    .sort((a, b) => b.price - a.price)
    .forEach((ticketType, index) => {
      tones.set(ticketType.id, Math.min(index + 1, 4) as ZoneTone)
    })
  return tones
}

/** Clases estáticas completas (para que Tailwind las detecte). null → "bg-muted text-muted-foreground". */
export function getZoneToneClassName(tone: ZoneTone | null): string {
  return tone === null ? SOLD_OUT_CLASS_NAME : ZONE_TONE_CLASS_NAMES[tone]
}
