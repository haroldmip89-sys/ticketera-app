import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  formatCountdown,
  getCountdownAnnouncement,
  getRemainingSeconds,
  useReservationCountdown,
} from "@/modules/checkout/hooks/use-reservation-countdown"

describe("getRemainingSeconds", () => {
  it("returns the exact seconds left", () => {
    expect(getRemainingSeconds(10_000, 4_000)).toBe(6)
  })

  it("rounds fractions up", () => {
    expect(getRemainingSeconds(10_000, 9_001)).toBe(1)
    expect(getRemainingSeconds(10_000, 4_500)).toBe(6)
  })

  it("returns 0 when the expiry is in the past", () => {
    expect(getRemainingSeconds(10_000, 10_000)).toBe(0)
    expect(getRemainingSeconds(10_000, 25_000)).toBe(0)
  })
})

describe("formatCountdown", () => {
  it.each([
    [600, "10:00"],
    [588, "09:48"],
    [59, "00:59"],
    [0, "00:00"],
    [-5, "00:00"],
    [3600, "60:00"],
  ])("formats %i as %s", (seconds, expected) => {
    expect(formatCountdown(seconds)).toBe(expected)
  })
})

describe("getCountdownAnnouncement", () => {
  it.each([
    [601, ""],
    [300, "Quedan menos de 5 minutos para completar el pago."],
    [61, "Quedan menos de 5 minutos para completar el pago."],
    [60, "Queda menos de 1 minuto para completar el pago."],
    [1, "Queda menos de 1 minuto para completar el pago."],
    [0, ""],
  ])("announces %i seconds as %j", (seconds, expected) => {
    expect(getCountdownAnnouncement(seconds)).toBe(expected)
  })
})

describe("useReservationCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("starts with the full duration and not expired", () => {
    const { result } = renderHook(() => useReservationCountdown(600))
    expect(result.current).toEqual({ remainingSeconds: 600, isExpired: false })
  })

  it("counts down every second until it expires", () => {
    const { result } = renderHook(() => useReservationCountdown(600))

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current).toEqual({ remainingSeconds: 599, isExpired: false })

    act(() => vi.advanceTimersByTime(599_000))
    expect(result.current).toEqual({ remainingSeconds: 0, isExpired: true })
  })

  it("never goes below 0 and stops the interval when expired", () => {
    const { result } = renderHook(() => useReservationCountdown(2))

    act(() => vi.advanceTimersByTime(10_000))
    expect(result.current).toEqual({ remainingSeconds: 0, isExpired: true })
    expect(vi.getTimerCount()).toBe(0)
  })

  it("restarts when the duration changes", () => {
    const { result, rerender } = renderHook(({ duration }) => useReservationCountdown(duration), {
      initialProps: { duration: 600 },
    })

    act(() => vi.advanceTimersByTime(5000))
    expect(result.current.remainingSeconds).toBe(595)

    rerender({ duration: 120 })
    expect(result.current.remainingSeconds).toBe(120)

    act(() => vi.advanceTimersByTime(1000))
    expect(result.current.remainingSeconds).toBe(119)
  })

  it("leaves no pending timers after unmount", () => {
    const { unmount } = renderHook(() => useReservationCountdown(600))
    expect(vi.getTimerCount()).toBe(1)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
