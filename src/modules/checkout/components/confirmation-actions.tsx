"use client"

import { useRef, useState } from "react"
import { ArrowRight, CalendarPlus, Download, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { downloadBlob } from "@/lib/download"
import { cn } from "@/lib/utils"
import {
  buildEventCalendar,
  CALENDAR_MIME_TYPE,
  getCalendarFileName,
} from "@/modules/checkout/utils/event-calendar"
import type { ConfirmationTicket } from "@/modules/checkout/utils/order-confirmation"
import { buildTicketPdfPages, getTicketPdfFileName } from "@/modules/checkout/utils/ticket-pdf"
import { generateTicketPdf } from "@/modules/checkout/utils/ticket-pdf-renderer"
import type { EventItem } from "@/modules/events/types/event.types"

const MY_TICKETS_MESSAGE =
  "Mis entradas estará disponible pronto. Por ahora, tus entradas están en esta página."
const CALENDAR_SUCCESS_MESSAGE = "Descargamos el evento para tu calendario."
const CALENDAR_ERROR_MESSAGE = "No pudimos crear el archivo del calendario. Inténtalo de nuevo."
const PDF_LOADING_MESSAGE = "Preparando tu PDF…"
const PDF_SUCCESS_MESSAGE = "Descargamos tu PDF."
const PDF_ERROR_MESSAGE = "No pudimos generar tu PDF. Inténtalo de nuevo."

const BUTTON_CLASS_NAME = "h-13.5 gap-2 rounded-2xl focus-ring"
const OUTLINE_BUTTON_CLASS_NAME = cn(
  BUTTON_CLASS_NAME,
  "h-12.5 rounded-[14px] border-[1.5px] border-input bg-card px-3 text-sm font-medium text-foreground hover:bg-muted lg:h-13.5 lg:rounded-2xl lg:px-5.5 lg:text-[0.9375rem] dark:border-input dark:bg-card dark:hover:bg-muted"
)

export type ConfirmationActionsProps = {
  event: EventItem
  orderCode: string
  /** No vacío. */
  tickets: readonly ConfirmationTicket[]
}

export function ConfirmationActions({ event, orderCode, tickets }: ConfirmationActionsProps) {
  const [message, setMessage] = useState("")
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const isGeneratingPdfRef = useRef(false)

  function handleAddToCalendar() {
    try {
      const calendar = buildEventCalendar({ event, orderCode, now: new Date() })
      downloadBlob(new Blob([calendar], { type: CALENDAR_MIME_TYPE }), getCalendarFileName(orderCode))
      setMessage(CALENDAR_SUCCESS_MESSAGE)
    } catch {
      setMessage(CALENDAR_ERROR_MESSAGE)
    }
  }

  async function handleDownloadPdf() {
    if (isGeneratingPdfRef.current) return
    isGeneratingPdfRef.current = true
    setIsGeneratingPdf(true)
    setMessage(PDF_LOADING_MESSAGE)
    try {
      const blob = await generateTicketPdf(buildTicketPdfPages({ event, orderCode, tickets }))
      downloadBlob(blob, getTicketPdfFileName(orderCode))
      setMessage(PDF_SUCCESS_MESSAGE)
    } catch {
      setMessage(PDF_ERROR_MESSAGE)
    } finally {
      isGeneratingPdfRef.current = false
      setIsGeneratingPdf(false)
    }
  }

  return (
    <div className="flex w-full flex-col gap-2.5">
      <div className="flex flex-col gap-2.5 lg:flex-row lg:justify-center lg:gap-3">
        <Button
          type="button"
          onClick={() => setMessage(MY_TICKETS_MESSAGE)}
          className={cn(
            BUTTON_CLASS_NAME,
            "w-full px-6.5 text-base font-semibold hover:bg-primary/90 lg:w-auto"
          )}
        >
          Ver mis entradas
          <ArrowRight className="size-4.5" aria-hidden="true" />
        </Button>
        <div className="grid grid-cols-2 gap-2.5 lg:flex lg:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleAddToCalendar}
            className={OUTLINE_BUTTON_CLASS_NAME}
          >
            <CalendarPlus className="size-4.5" aria-hidden="true" />
            <span className="lg:hidden">Calendario</span>
            <span className="hidden lg:inline">Agregar al calendario</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf}
            focusableWhenDisabled
            aria-busy={isGeneratingPdf || undefined}
            className={OUTLINE_BUTTON_CLASS_NAME}
          >
            {isGeneratingPdf ? (
              <Loader2 className="size-4.5 animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : (
              <Download className="size-4.5" aria-hidden="true" />
            )}
            Descargar PDF
          </Button>
        </div>
      </div>
      <p role="status" aria-live="polite" className="text-center text-sm text-muted-foreground">
        {message}
      </p>
    </div>
  )
}
