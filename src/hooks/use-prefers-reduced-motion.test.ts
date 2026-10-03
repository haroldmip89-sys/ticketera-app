import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches
  const listeners = new Set<() => void>()
  const mediaQuery = {
    get matches() {
      return matches
    },
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.add(listener)
    }),
    removeEventListener: vi.fn((_type: string, listener: () => void) => {
      listeners.delete(listener)
    }),
  }
  vi.stubGlobal("matchMedia", vi.fn(() => mediaQuery))

  return {
    mediaQuery,
    listeners,
    emitChange(nextMatches: boolean) {
      matches = nextMatches
      listeners.forEach((listener) => listener())
    },
  }
}

describe("usePrefersReducedMotion", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([false, true])("returns matches (%s)", (matches) => {
    mockMatchMedia(matches)
    const { result } = renderHook(() => usePrefersReducedMotion())
    expect(result.current).toBe(matches)
  })

  it("updates when the media query emits change", () => {
    const media = mockMatchMedia(false)
    const { result } = renderHook(() => usePrefersReducedMotion())

    act(() => media.emitChange(true))
    expect(result.current).toBe(true)

    act(() => media.emitChange(false))
    expect(result.current).toBe(false)
  })

  it("removes the change listener on unmount", () => {
    const media = mockMatchMedia(false)
    const { unmount } = renderHook(() => usePrefersReducedMotion())
    expect(media.listeners.size).toBe(1)

    unmount()

    expect(media.mediaQuery.removeEventListener).toHaveBeenCalledWith(
      "change",
      expect.any(Function)
    )
    expect(media.listeners.size).toBe(0)
  })
})
