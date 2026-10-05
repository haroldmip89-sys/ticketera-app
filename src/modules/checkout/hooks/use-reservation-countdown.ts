"use client"

import { useEffect, useState } from "react"

const FIVE_MINUTES_SECONDS = 300
const ONE_MINUTE_SECONDS = 60

/** Math.max(0, Math.ceil((expiresAtMs − nowMs) / 1000)). */
export function getRemainingSeconds(expiresAtMs: number, nowMs: number): number {
  return Math.max(0, Math.ceil((expiresAtMs - nowMs) / 1000))
}

/** "MM:SS" con ceros a la izquierda; negativos → "00:00"; los minutos no se limitan (3600 → "60:00"). */
export function formatCountdown(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds))
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

/** > 300 → ""; 61–300 → aviso de 5 min; 1–60 → aviso de 1 min; 0 → "". */
export function getCountdownAnnouncement(remainingSeconds: number): string {
  if (remainingSeconds <= 0 || remainingSeconds > FIVE_MINUTES_SECONDS) return ""
  if (remainingSeconds > ONE_MINUTE_SECONDS) {
    return "Quedan menos de 5 minutos para completar el pago."
  }
  return "Queda menos de 1 minuto para completar el pago."
}

/** Primer render (SSR incluido): remainingSeconds = durationSeconds. Al montar fija expiresAt = Date.now() + duración
 *  y, cada 1000 ms, recalcula con getRemainingSeconds(expiresAt, Date.now()). En 0 detiene el intervalo.
 *  Si cambia durationSeconds, reinicia. Nunca devuelve negativos. */
export function useReservationCountdown(durationSeconds: number): {
  remainingSeconds: number
  isExpired: boolean
} {
  const [countdown, setCountdown] = useState({ durationSeconds, remainingSeconds: durationSeconds })

  useEffect(() => {
    if (durationSeconds <= 0) return

    const expiresAt = Date.now() + durationSeconds * 1000
    const intervalId = window.setInterval(() => {
      const remainingSeconds = getRemainingSeconds(expiresAt, Date.now())
      setCountdown({ durationSeconds, remainingSeconds })
      if (remainingSeconds === 0) window.clearInterval(intervalId)
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [durationSeconds])

  // Hasta el primer tick tras un cambio de duración, el estado guardado es de la duración anterior.
  const remainingSeconds = Math.max(
    0,
    countdown.durationSeconds === durationSeconds ? countdown.remainingSeconds : durationSeconds
  )

  return { remainingSeconds, isExpired: remainingSeconds === 0 }
}
