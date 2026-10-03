export const FEATURED_AUTOPLAY_MS = 6000

export type FeaturedCarouselState = {
  slideCount: number
  activeIndex: number
  /** Se incrementa en cada navegación o reanudación: reinicia la barra de progreso. */
  cycle: number
  /** Pausa explícita (botón) o arranque con reduced motion. */
  isUserPaused: boolean
  /** El usuario ya usó play/pausa: reduced motion no lo pisa. */
  hasUserToggled: boolean
  isHovered: boolean
  hasFocusWithin: boolean
  isInViewport: boolean
}

export type FeaturedCarouselAction =
  | { type: "next" }
  | { type: "prev" }
  | { type: "go"; index: number }
  | { type: "advance" }
  | { type: "toggle-play" }
  | { type: "set-hovered"; value: boolean }
  | { type: "set-focus-within"; value: boolean }
  | { type: "set-in-viewport"; value: boolean }
  | { type: "reduced-motion-detected" }

export function createFeaturedCarouselState(slideCount: number): FeaturedCarouselState {
  return {
    slideCount,
    activeIndex: 0,
    cycle: 0,
    isUserPaused: false,
    hasUserToggled: false,
    isHovered: false,
    hasFocusWithin: false,
    isInViewport: true,
  }
}

/** slideCount > 1 && !isUserPaused && !isHovered && !hasFocusWithin && isInViewport */
export function isFeaturedCarouselRunning(state: FeaturedCarouselState): boolean {
  return (
    state.slideCount > 1 &&
    !state.isUserPaused &&
    !state.isHovered &&
    !state.hasFocusWithin &&
    state.isInViewport
  )
}

function goTo(state: FeaturedCarouselState, index: number): FeaturedCarouselState {
  if (state.slideCount <= 1) return state
  const count = state.slideCount
  return {
    ...state,
    activeIndex: ((index % count) + count) % count,
    cycle: state.cycle + 1,
  }
}

export function featuredCarouselReducer(
  state: FeaturedCarouselState,
  action: FeaturedCarouselAction
): FeaturedCarouselState {
  switch (action.type) {
    case "next":
      return goTo(state, state.activeIndex + 1)
    case "prev":
      return goTo(state, state.activeIndex - 1)
    case "go":
      return goTo(state, action.index)
    case "advance":
      return isFeaturedCarouselRunning(state) ? goTo(state, state.activeIndex + 1) : state
    case "toggle-play":
      return {
        ...state,
        isUserPaused: !state.isUserPaused,
        hasUserToggled: true,
        cycle: state.isUserPaused ? state.cycle + 1 : state.cycle,
      }
    case "set-hovered":
      return { ...state, isHovered: action.value }
    case "set-focus-within":
      return { ...state, hasFocusWithin: action.value }
    case "set-in-viewport":
      return { ...state, isInViewport: action.value }
    case "reduced-motion-detected":
      return state.hasUserToggled ? state : { ...state, isUserPaused: true }
  }
}
