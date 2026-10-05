import { formatTime } from "@/lib/format"
import type { EventItem } from "@/modules/events/types/event.types"
import { formatVenueLocation } from "@/modules/events/utils/event-venue"

export const DEFAULT_EVENT_DURATION_MINUTES = 180
export const CALENDAR_MIME_TYPE = "text/calendar;charset=utf-8"

const MAX_LINE_OCTETS = 75
const LINE_BREAK = "\r\n"
const FOLD_SEPARATOR = "\r\n "

/** RFC 5545 §3.3.11 (TEXT): escapa "\" → "\\" (primero), ";" → "\;", "," → "\," y cualquier salto de línea
 *  ("\r\n", "\n", "\r") → "\n" literal (barra + n). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\n|\r/g, "\\n")
}

function getUtf8Length(codePoint: number): number {
  if (codePoint <= 0x7f) return 1
  if (codePoint <= 0x7ff) return 2
  if (codePoint <= 0xffff) return 3
  return 4
}

/** RFC 5545 §3.1: si la línea supera 75 octetos UTF-8, la parte en líneas de ≤ 75 octetos unidas por "\r\n ".
 *  El espacio inicial de cada continuación cuenta dentro de sus 75 octetos. Nunca parte un carácter multibyte
 *  (recorre por code point). Una línea de ≤ 75 octetos se devuelve igual. */
export function foldIcsLine(line: string): string {
  const segments: string[] = []
  let current = ""
  let currentOctets = 0

  for (const char of line) {
    const octets = getUtf8Length(char.codePointAt(0) ?? 0)
    if (currentOctets + octets > MAX_LINE_OCTETS) {
      segments.push(current)
      current = ""
      currentOctets = 1 // espacio inicial de la continuación
    }
    current += char
    currentOctets += octets
  }
  segments.push(current)

  return segments.join(FOLD_SEPARATOR)
}

/** UTC "YYYYMMDDTHHMMSSZ". Acepta ISO con offset o Date. Lanza RangeError si la fecha es inválida.
 *  "2026-10-04T16:00:00-05:00" → "20261004T210000Z". */
export function formatIcsDateTime(value: string | Date): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) throw new RangeError(`Fecha inválida: ${String(value)}`)
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

/** VCALENDAR completo. Cada línea pasa por foldIcsLine y termina en "\r\n" (también la última). Sin PII. */
export function buildEventCalendar(input: {
  event: Pick<EventItem, "id" | "title" | "startsAt" | "doorsOpenAt" | "venue">
  orderCode: string
  now: Date
}): string {
  const { event, orderCode, now } = input
  const startsAt = new Date(event.startsAt)
  const endsAt = new Date(startsAt.getTime() + DEFAULT_EVENT_DURATION_MINUTES * 60_000)
  const description = `Pedido N.º ${orderCode}\nApertura de puertas: ${formatTime(event.doorsOpenAt)} (hora local)`

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ticketera//Ticketera//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${orderCode}-${event.id}@ticketera`,
    `DTSTAMP:${formatIcsDateTime(now)}`,
    `DTSTART:${formatIcsDateTime(startsAt)}`,
    `DTEND:${formatIcsDateTime(endsAt)}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `LOCATION:${escapeIcsText(formatVenueLocation(event.venue))}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]

  return lines.map((line) => `${foldIcsLine(line)}${LINE_BREAK}`).join("")
}

/** "ticketera-TK-24817.ics" */
export function getCalendarFileName(orderCode: string): string {
  return `ticketera-${orderCode}.ics`
}
