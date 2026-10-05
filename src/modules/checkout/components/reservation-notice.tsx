"use client"

import { useEffect, useRef } from "react"
import Link from "next/link"
import { Clock, TimerOff } from "lucide-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty"
import {
  formatCountdown,
  getCountdownAnnouncement,
} from "@/modules/checkout/hooks/use-reservation-countdown"

export type ReservationTimerNoticeProps = { remainingSeconds: number }

export function ReservationTimerNotice({ remainingSeconds }: ReservationTimerNoticeProps) {
  return (
    <div>
      {/* role="timer" tiene aria-live="off" implícito: no se anuncia cada segundo. */}
      <p
        role="timer"
        className="flex items-start gap-2.5 rounded-2xl border border-urgent-foreground/20 bg-urgent/60 px-4 py-3.5 text-sm/[1.45] text-urgent-foreground lg:h-14 lg:items-center lg:gap-3 lg:px-5 lg:py-0 lg:text-[0.9375rem]"
      >
        <Clock aria-hidden="true" className="mt-px size-[18px] shrink-0 lg:mt-0 lg:size-5" />
        <span>
          Reservamos tus entradas por{" "}
          <strong className="tabular-nums">{formatCountdown(remainingSeconds)}</strong>. Completa
          el pago antes de que se liberen.
        </span>
      </p>
      <span role="status" aria-live="polite" className="sr-only">
        {getCountdownAnnouncement(remainingSeconds)}
      </span>
    </div>
  )
}

export type ReservationExpiredProps = {
  reselectHref: string
  reselectLabel: string
  reservationMinutes: number
}

export function ReservationExpired({
  reselectHref,
  reselectLabel,
  reservationMinutes,
}: ReservationExpiredProps) {
  const titleRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    titleRef.current?.focus()
  }, [])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
      <Empty className="rounded-3xl border border-border bg-card px-5 py-12 lg:py-16">
        <EmptyHeader className="max-w-[26rem]">
          <EmptyMedia className="size-14 rounded-2xl bg-urgent text-urgent-foreground">
            <TimerOff aria-hidden="true" />
          </EmptyMedia>
          <h2
            ref={titleRef}
            tabIndex={-1}
            className="text-xl font-semibold tracking-tight outline-none lg:text-2xl"
          >
            Tu reserva venció
          </h2>
          <EmptyDescription className="text-sm text-muted-foreground lg:text-[0.9375rem]">
            Pasaron {reservationMinutes} minutos y liberamos tus entradas para otras personas.
            Vuelve a elegirlas para completar la compra.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href={reselectHref}
            className="inline-flex h-12 items-center justify-center rounded-[14px] bg-cta px-5 font-semibold text-cta-foreground focus-ring hover:bg-cta-hover"
          >
            {reselectLabel}
          </Link>
        </EmptyContent>
      </Empty>
    </div>
  )
}
