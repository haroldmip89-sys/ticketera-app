export const APP_TIME_ZONE = "America/Lima"

export type ZonedDateParts = {
  year: number
  month: number
  day: number
  weekday: number
  hour: number
  minute: number
}

/** month 1–12, weekday 0 = domingo. Acepta ISO string o Date. */
export function getZonedDateParts(
  value: string | Date,
  timeZone: string = APP_TIME_ZONE
): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(value))
  const getPart = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)

  const year = getPart("year")
  const month = getPart("month")
  const day = getPart("day")

  return {
    year,
    month,
    day,
    weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay(),
    hour: getPart("hour"),
    minute: getPart("minute"),
  }
}
