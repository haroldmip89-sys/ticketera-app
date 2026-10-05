import { getZonedDateParts } from "@/lib/date-time"

const SHORT_WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"] as const
const SHORT_MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const
const LONG_WEEKDAYS = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
] as const
const LONG_MONTHS = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const

/** "$45", "$45.50", "$1,200", "$0". Entero → sin decimales; no entero → 2 decimales; miles con ",". */
export function formatPrice(amount: number): string {
  const decimals = Number.isInteger(amount) ? 0 : 2
  const [integer, fraction] = amount.toFixed(decimals).split(".")
  const grouped = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
  return `$${grouped}${fraction ? `.${fraction}` : ""}`
}

/** "sáb 3 oct" en APP_TIME_ZONE (referencia: "lun 5 oct"). */
export function formatDateShort(value: string | Date): string {
  const { weekday, day, month } = getZonedDateParts(value)
  return `${SHORT_WEEKDAYS[weekday]} ${day} ${SHORT_MONTHS[month - 1]}`
}

/** Badge de fecha: { month: "OCT", day: "03" } en APP_TIME_ZONE. */
export function formatDateBadge(value: string | Date): { month: string; day: string } {
  const { day, month } = getZonedDateParts(value)
  return {
    month: SHORT_MONTHS[month - 1].toUpperCase(),
    day: String(day).padStart(2, "0"),
  }
}

/** "sábado 3 de octubre" en APP_TIME_ZONE (referencia: "lunes 5 de octubre"), sin año. */
export function formatDateLong(value: string | Date): string {
  const { weekday, day, month } = getZonedDateParts(value)
  return `${LONG_WEEKDAYS[weekday]} ${day} de ${LONG_MONTHS[month - 1]}`
}

/** "domingo 4 de octubre de 2026" en APP_TIME_ZONE: formatDateLong + " de {año}" (solo el PDF). */
export function formatDateLongWithYear(value: string | Date): string {
  const { year } = getZonedDateParts(value)
  return `${formatDateLong(value)} de ${year}`
}

/** "8:00 p. m." en APP_TIME_ZONE (12 h; 00:00 → "12:00 a. m."; 12:00 → "12:00 p. m."). */
export function formatTime(value: string | Date): string {
  const { hour, minute } = getZonedDateParts(value)
  const period = hour < 12 ? "a. m." : "p. m."
  return `${hour % 12 || 12}:${String(minute).padStart(2, "0")} ${period}`
}
