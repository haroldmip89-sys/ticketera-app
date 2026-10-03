"use client"

import { useEffect, useRef, useState } from "react"
import { Heart, Share2 } from "lucide-react"

import { cn } from "@/lib/utils"

const MESSAGE_TIMEOUT_MS = 3000
const SHARE_SUCCESS_MESSAGE = "Enlace copiado"
const SHARE_ERROR_MESSAGE = "No se pudo compartir el enlace"

const TONE_CLASS_NAMES = {
  stage: {
    group: "gap-2.5",
    button:
      "size-13.5 rounded-2xl border-[1.5px] border-white/40 text-white hover:bg-white/10 aria-pressed:bg-white/15",
  },
  default: {
    group: "gap-1",
    button: "size-11 rounded-xl hover:bg-muted aria-pressed:text-primary",
  },
} as const

export type EventActionsProps = { title: string; tone: "stage" | "default"; className?: string }

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

export function EventActions({ title, tone, className }: EventActionsProps) {
  const [isSaved, setIsSaved] = useState(false)
  const [message, setMessage] = useState("")
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timeoutRef.current), [])

  function showMessage(text: string) {
    clearTimeout(timeoutRef.current)
    setMessage(text)
    timeoutRef.current = setTimeout(() => setMessage(""), MESSAGE_TIMEOUT_MS)
  }

  async function handleShare() {
    const url = window.location.href
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title, url })
      } else if (typeof navigator.clipboard?.writeText === "function") {
        await navigator.clipboard.writeText(url)
        showMessage(SHARE_SUCCESS_MESSAGE)
      } else {
        showMessage(SHARE_ERROR_MESSAGE)
      }
    } catch (error) {
      if (!isAbortError(error)) showMessage(SHARE_ERROR_MESSAGE)
    }
  }

  const toneClassNames = TONE_CLASS_NAMES[tone]
  const buttonClassName = cn(
    "inline-flex shrink-0 items-center justify-center transition-colors focus-ring",
    toneClassNames.button
  )

  return (
    <div className={cn("relative", className)}>
      <div className={cn("flex items-center", toneClassNames.group)}>
        <button
          type="button"
          aria-label="Guardar evento"
          aria-pressed={isSaved}
          className={buttonClassName}
          onClick={() => setIsSaved((saved) => !saved)}
        >
          <Heart className={cn("size-5", isSaved && "fill-current")} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Compartir evento"
          className={buttonClassName}
          onClick={handleShare}
        >
          <Share2 className="size-5" aria-hidden="true" />
        </button>
      </div>
      <p
        role="status"
        className={cn(
          "absolute top-full right-0 z-10 mt-1 text-xs whitespace-nowrap",
          message && "rounded-md bg-popover px-2 py-1 text-popover-foreground shadow-sm"
        )}
      >
        {message}
      </p>
    </div>
  )
}
