import { describe, expect, it } from "vitest"

import { APP_TIME_ZONE, getZonedDateParts } from "@/lib/date-time"

describe("getZonedDateParts", () => {
  it("uses America/Lima as the app time zone", () => {
    expect(APP_TIME_ZONE).toBe("America/Lima")
  })

  it("returns the local parts of an ISO string with offset", () => {
    expect(getZonedDateParts("2026-10-03T20:00:00-05:00")).toEqual({
      year: 2026,
      month: 10,
      day: 3,
      weekday: 6,
      hour: 20,
      minute: 0,
    })
  })

  it("converts a UTC instant to the app time zone, crossing the day", () => {
    expect(getZonedDateParts("2026-11-01T03:00:00Z")).toEqual({
      year: 2026,
      month: 10,
      day: 31,
      weekday: 6,
      hour: 22,
      minute: 0,
    })
  })

  it("returns hour 0 at local midnight", () => {
    const parts = getZonedDateParts("2026-10-04T00:00:00-05:00")
    expect(parts).toMatchObject({ day: 4, hour: 0, minute: 0, weekday: 0 })
  })

  it("gives the same result for a Date and its ISO string", () => {
    const iso = "2026-10-22T19:30:00-05:00"
    expect(getZonedDateParts(new Date(iso))).toEqual(getZonedDateParts(iso))
  })

  it("accepts another time zone", () => {
    expect(getZonedDateParts("2026-10-03T20:00:00-05:00", "UTC")).toMatchObject({
      day: 4,
      hour: 1,
    })
  })
})
