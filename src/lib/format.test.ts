import { describe, expect, it } from "vitest"

import {
  formatDateBadge,
  formatDateLong,
  formatDateShort,
  formatPrice,
  formatTime,
} from "@/lib/format"

describe("formatPrice", () => {
  it.each([
    [45, "$45"],
    [45.5, "$45.50"],
    [1200, "$1,200"],
    [0, "$0"],
  ])("formats %s as %s", (amount, expected) => {
    expect(formatPrice(amount)).toBe(expected)
  })
})

describe("formatDateShort", () => {
  it.each([
    ["2026-10-03T20:00:00-05:00", "sáb 3 oct"],
    ["2026-10-22T19:30:00-05:00", "jue 22 oct"],
    ["2026-10-04T01:00:00Z", "sáb 3 oct"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatDateShort(value)).toBe(expected)
  })

  it("accepts a Date", () => {
    expect(formatDateShort(new Date("2026-10-03T20:00:00-05:00"))).toBe("sáb 3 oct")
  })
})

describe("formatDateBadge", () => {
  it("returns the uppercase short month and a two-digit day", () => {
    expect(formatDateBadge("2026-10-03T20:00:00-05:00")).toEqual({ month: "OCT", day: "03" })
  })

  it("formats December", () => {
    expect(formatDateBadge("2026-12-05T11:00:00-05:00")).toEqual({ month: "DIC", day: "05" })
  })
})

describe("formatDateLong", () => {
  it.each([
    ["2026-10-03T20:00:00-05:00", "sábado 3 de octubre"],
    ["2026-11-08T20:00:00-05:00", "domingo 8 de noviembre"],
    ["2026-11-01T03:00:00Z", "sábado 31 de octubre"],
  ])("formats %s as %s", (value, expected) => {
    expect(formatDateLong(value)).toBe(expected)
  })

  it("accepts a Date", () => {
    const value = "2026-10-03T20:00:00-05:00"
    expect(formatDateLong(new Date(value))).toBe(formatDateLong(value))
  })
})

describe("formatTime", () => {
  it.each([
    ["2026-10-03T20:00:00-05:00", "8:00 p. m."],
    ["2026-10-22T19:30:00-05:00", "7:30 p. m."],
    ["2026-10-03T12:00:00-05:00", "12:00 p. m."],
    ["2026-10-03T00:00:00-05:00", "12:00 a. m."],
    ["2026-10-04T01:00:00Z", "8:00 p. m."],
  ])("formats %s as %s", (value, expected) => {
    expect(formatTime(value)).toBe(expected)
  })

  it("accepts a Date", () => {
    expect(formatTime(new Date("2026-10-03T18:30:00-05:00"))).toBe("6:30 p. m.")
  })
})
