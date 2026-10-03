import { describe, expect, it } from "vitest"

import {
  createFeaturedCarouselState,
  featuredCarouselReducer,
  isFeaturedCarouselRunning,
  type FeaturedCarouselAction,
  type FeaturedCarouselState,
} from "@/modules/events/utils/featured-carousel"

function stateWith(overrides: Partial<FeaturedCarouselState> = {}): FeaturedCarouselState {
  return { ...createFeaturedCarouselState(5), ...overrides }
}

describe("createFeaturedCarouselState", () => {
  it("starts on the first slide, running and visible", () => {
    expect(createFeaturedCarouselState(5)).toEqual({
      slideCount: 5,
      activeIndex: 0,
      cycle: 0,
      isUserPaused: false,
      hasUserToggled: false,
      isHovered: false,
      hasFocusWithin: false,
      isInViewport: true,
    })
    expect(isFeaturedCarouselRunning(createFeaturedCarouselState(5))).toBe(true)
  })
})

describe("featuredCarouselReducer — navigation", () => {
  it("next wraps from the last slide to the first and increments cycle", () => {
    const next = featuredCarouselReducer(stateWith({ activeIndex: 4, cycle: 2 }), { type: "next" })
    expect(next.activeIndex).toBe(0)
    expect(next.cycle).toBe(3)
  })

  it("prev wraps from the first slide to the last and increments cycle", () => {
    const next = featuredCarouselReducer(stateWith({ activeIndex: 0 }), { type: "prev" })
    expect(next.activeIndex).toBe(4)
    expect(next.cycle).toBe(1)
  })

  it.each([
    [2, 2],
    [7, 2],
    [-1, 4],
  ])("go %i normalizes to %i and increments cycle", (index, expected) => {
    const next = featuredCarouselReducer(stateWith(), { type: "go", index })
    expect(next.activeIndex).toBe(expected)
    expect(next.cycle).toBe(1)
  })

  it("go to the current slide still increments cycle", () => {
    const next = featuredCarouselReducer(stateWith({ activeIndex: 3, cycle: 4 }), {
      type: "go",
      index: 3,
    })
    expect(next.activeIndex).toBe(3)
    expect(next.cycle).toBe(5)
  })
})

describe("featuredCarouselReducer — advance", () => {
  it("advances like next while running", () => {
    const next = featuredCarouselReducer(stateWith({ activeIndex: 4 }), { type: "advance" })
    expect(next.activeIndex).toBe(0)
    expect(next.cycle).toBe(1)
  })

  it.each<[string, Partial<FeaturedCarouselState>]>([
    ["hovered", { isHovered: true }],
    ["focus within", { hasFocusWithin: true }],
    ["out of viewport", { isInViewport: false }],
    ["paused by the user", { isUserPaused: true }],
  ])("returns the same state when %s", (_label, overrides) => {
    const state = stateWith(overrides)
    expect(isFeaturedCarouselRunning(state)).toBe(false)
    expect(featuredCarouselReducer(state, { type: "advance" })).toBe(state)
  })
})

describe("featuredCarouselReducer — play/pause", () => {
  it("toggle-play pauses without touching cycle and marks the user toggle", () => {
    const paused = featuredCarouselReducer(stateWith({ cycle: 2 }), { type: "toggle-play" })
    expect(paused.isUserPaused).toBe(true)
    expect(paused.hasUserToggled).toBe(true)
    expect(paused.cycle).toBe(2)
  })

  it("toggle-play resumes and increments cycle", () => {
    const resumed = featuredCarouselReducer(stateWith({ isUserPaused: true, cycle: 2 }), {
      type: "toggle-play",
    })
    expect(resumed.isUserPaused).toBe(false)
    expect(resumed.hasUserToggled).toBe(true)
    expect(resumed.cycle).toBe(3)
  })

  it("reduced-motion-detected pauses when the user has not toggled", () => {
    const next = featuredCarouselReducer(stateWith(), { type: "reduced-motion-detected" })
    expect(next.isUserPaused).toBe(true)
  })

  it("reduced-motion-detected does nothing once the user has toggled", () => {
    const state = stateWith({ hasUserToggled: true })
    expect(featuredCarouselReducer(state, { type: "reduced-motion-detected" })).toBe(state)
  })
})

describe("featuredCarouselReducer — temporary pauses", () => {
  it.each<[FeaturedCarouselAction, keyof FeaturedCarouselState]>([
    [{ type: "set-hovered", value: true }, "isHovered"],
    [{ type: "set-focus-within", value: true }, "hasFocusWithin"],
  ])("%o sets %s", (action, field) => {
    expect(featuredCarouselReducer(stateWith(), action)[field]).toBe(true)
  })

  it("set-in-viewport sets isInViewport", () => {
    const next = featuredCarouselReducer(stateWith(), { type: "set-in-viewport", value: false })
    expect(next.isInViewport).toBe(false)
  })
})

describe("featuredCarouselReducer — single slide", () => {
  it.each<FeaturedCarouselAction>([
    { type: "next" },
    { type: "prev" },
    { type: "go", index: 3 },
    { type: "advance" },
  ])("%o does not change the state", (action) => {
    const state = createFeaturedCarouselState(1)
    expect(isFeaturedCarouselRunning(state)).toBe(false)
    expect(featuredCarouselReducer(state, action)).toBe(state)
  })
})

describe("featuredCarouselReducer — immutability", () => {
  it.each<FeaturedCarouselAction>([
    { type: "next" },
    { type: "prev" },
    { type: "go", index: 2 },
    { type: "advance" },
    { type: "toggle-play" },
    { type: "set-hovered", value: true },
    { type: "set-focus-within", value: true },
    { type: "set-in-viewport", value: false },
    { type: "reduced-motion-detected" },
  ])("%o does not mutate the input", (action) => {
    const state = Object.freeze(stateWith({ activeIndex: 1 }))
    const snapshot = { ...state }
    featuredCarouselReducer(state, action)
    expect(state).toEqual(snapshot)
  })
})
