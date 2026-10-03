"use client"

import { useSyncExternalStore } from "react"

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)"

function subscribe(onChange: () => void) {
  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  mediaQuery.addEventListener("change", onChange)
  return () => mediaQuery.removeEventListener("change", onChange)
}

function getSnapshot() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches
}

function getServerSnapshot() {
  return false
}

/** true si (prefers-reduced-motion: reduce). useSyncExternalStore sobre matchMedia; snapshot de servidor = false. */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
