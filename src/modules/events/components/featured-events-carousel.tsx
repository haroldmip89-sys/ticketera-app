"use client"

import { useEffect, useReducer, useRef, type FocusEvent, type KeyboardEvent } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Pause,
  Play,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { formatDateLong, formatPrice } from "@/lib/format"
import { withImageWidth } from "@/lib/image-url"
import { cn } from "@/lib/utils"
import { FeaturedEventThumbnails } from "@/modules/events/components/featured-event-thumbnails"
import type { EventItem } from "@/modules/events/types/event.types"
import { getEventHref, getEventTicketsHref } from "@/modules/events/utils/event-routes"
import {
  createFeaturedCarouselState,
  featuredCarouselReducer,
  isFeaturedCarouselRunning,
} from "@/modules/events/utils/featured-carousel"

const HERO_IMAGE_WIDTH = 1600
const CONTROL_CLASS_NAME = "size-11 rounded-full focus-ring"
const PILL_CLASS_NAME =
  "inline-flex h-7 items-center rounded-full px-3 text-xs lg:h-8 lg:px-3.5 lg:text-[13px]"

export type FeaturedEventsCarouselProps = { events: EventItem[] }

function padCount(value: number): string {
  return String(value).padStart(2, "0")
}

function isTextField(target: EventTarget): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest("input, textarea, select") !== null)
  )
}

export function FeaturedEventsCarousel({ events }: FeaturedEventsCarouselProps) {
  const [state, dispatch] = useReducer(
    featuredCarouselReducer,
    events.length,
    createFeaturedCarouselState
  )
  const sectionRef = useRef<HTMLElement>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    if (prefersReducedMotion) dispatch({ type: "reduced-motion-detected" })
  }, [prefersReducedMotion])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || typeof IntersectionObserver === "undefined") return
    const observer = new IntersectionObserver(([entry]) => {
      dispatch({ type: "set-in-viewport", value: entry.isIntersecting })
    })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  const isRunning = isFeaturedCarouselRunning(state)
  const hasControls = events.length > 1
  const activeEvent = events[state.activeIndex]
  const progress = state.isUserPaused ? "complete" : isRunning ? "running" : "paused"

  function handleBlur(event: FocusEvent<HTMLElement>) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      dispatch({ type: "set-focus-within", value: false })
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!hasControls || isTextField(event.target)) return
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault()
      dispatch({ type: event.key === "ArrowLeft" ? "prev" : "next" })
    }
  }

  return (
    <section
      ref={sectionRef}
      aria-roledescription="carrusel"
      aria-label="Eventos destacados"
      className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8"
      onMouseEnter={() => dispatch({ type: "set-hovered", value: true })}
      onMouseLeave={() => dispatch({ type: "set-hovered", value: false })}
      onFocus={() => dispatch({ type: "set-focus-within", value: true })}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      <div className="flex flex-col-reverse overflow-hidden rounded-[28px] bg-stage text-stage-foreground lg:grid lg:h-130 lg:grid-cols-[32.5rem_minmax(0,1fr)] lg:rounded-[32px]">
        <div aria-live={isRunning ? "off" : "polite"} className="flex flex-col p-5.5 pb-6 lg:p-12">
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 lg:gap-2">
              <span className={cn(PILL_CLASS_NAME, "bg-cta font-semibold text-cta-foreground")}>
                Destacado
              </span>
              <span className={cn(PILL_CLASS_NAME, "border border-white/28 font-medium")}>
                {activeEvent.category.label}
              </span>
            </div>
            <p className="text-[13px] font-medium text-stage-subtle tabular-nums lg:text-sm">
              <span className="sr-only">
                Destacado {state.activeIndex + 1} de {events.length}
              </span>
              <span aria-hidden="true">
                {padCount(state.activeIndex + 1)} / {padCount(events.length)}
              </span>
            </p>
          </div>

          <h2 className="mt-4.5 text-[1.625rem] leading-[1.15] font-bold tracking-[-0.025em] text-balance lg:mt-7 lg:text-[2.75rem] lg:leading-[1.1]">
            {activeEvent.title}
          </h2>

          <ul className="mt-3.5 flex flex-col gap-2 text-sm text-stage-muted lg:mt-5 lg:gap-2.5 lg:text-base">
            <li className="flex items-center gap-2">
              <Calendar className="size-[18px] shrink-0" aria-hidden="true" />
              <time dateTime={activeEvent.startsAt}>{formatDateLong(activeEvent.startsAt)}</time>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-[18px] shrink-0" aria-hidden="true" />
              <span>
                {activeEvent.venue.name}, {activeEvent.venue.city}
              </span>
            </li>
          </ul>

          <div className="hidden flex-1 lg:block" />

          <div className="mt-5 flex items-center justify-between gap-3 lg:mt-0 lg:block">
            <p className="flex flex-col lg:flex-row lg:items-baseline lg:gap-2">
              <span className="text-xs text-stage-subtle lg:text-sm">Desde</span>
              <span className="text-2xl font-bold lg:text-[1.875rem] lg:tracking-[-0.02em]">
                {formatPrice(activeEvent.priceFrom)}
              </span>
            </p>
            <div className="flex gap-2.5 lg:mt-3.5">
              <Link
                href={getEventTicketsHref(activeEvent.slug)}
                className="inline-flex h-13 items-center justify-center gap-2 rounded-[15px] bg-cta px-5 text-[0.9375rem] font-semibold text-cta-foreground focus-ring hover:bg-cta-hover lg:h-13.5 lg:flex-1 lg:rounded-2xl lg:text-base"
              >
                Comprar entradas
                <span className="sr-only"> para {activeEvent.title}</span>
                <ArrowRight className="size-[18px]" aria-hidden="true" />
              </Link>
              <Link
                href={getEventHref(activeEvent.slug)}
                className="hidden h-13.5 items-center justify-center rounded-2xl border-[1.5px] border-white/40 px-5.5 text-base font-medium focus-ring hover:bg-white/10 lg:inline-flex"
              >
                Ver detalles
                <span className="sr-only"> de {activeEvent.title}</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="relative h-57.5 overflow-hidden bg-stage lg:h-auto">
          {events.map((event, index) => {
            const isActive = index === state.activeIndex
            return (
              <Image
                key={event.id}
                src={withImageWidth(event.imageUrl, HERO_IMAGE_WIDTH)}
                alt={event.imageAlt}
                fill
                sizes="(min-width: 1280px) 760px, (min-width: 1024px) 60vw, 100vw"
                loading={index === 0 ? "eager" : undefined}
                fetchPriority={index === 0 ? "high" : undefined}
                aria-hidden={isActive ? undefined : true}
                className={cn(
                  "absolute inset-0 object-cover transition-opacity duration-700 motion-reduce:transition-none",
                  isActive ? "opacity-100" : "opacity-0"
                )}
              />
            )
          })}

          {activeEvent.availability === "last-tickets" && (
            <Badge className="absolute top-3.5 left-3.5 h-7.5 gap-1.5 rounded-full bg-urgent px-3 text-xs font-semibold text-urgent-foreground lg:top-6 lg:left-6 lg:h-8.5 lg:px-3.5 lg:text-[13px] [&>svg]:size-3.5!">
              <Clock aria-hidden="true" />
              Últimas entradas
            </Badge>
          )}

          {hasControls && (
            <div className="absolute right-3 bottom-3 flex gap-0.5 rounded-full bg-card p-1 text-card-foreground shadow-[0_10px_30px_-10px_rgb(0_0_0/0.4)] lg:right-6 lg:bottom-6 lg:gap-1 lg:p-1.5">
              <Button
                variant="ghost"
                size="icon"
                className={CONTROL_CLASS_NAME}
                aria-label="Evento anterior"
                onClick={() => dispatch({ type: "prev" })}
              >
                <ChevronLeft className="size-5" aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(CONTROL_CLASS_NAME, "bg-muted")}
                aria-label={state.isUserPaused ? "Reproducir carrusel" : "Pausar carrusel"}
                onClick={() => dispatch({ type: "toggle-play" })}
              >
                {state.isUserPaused ? (
                  <Play className="size-4 fill-current" aria-hidden="true" />
                ) : (
                  <Pause className="size-4 fill-current" aria-hidden="true" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={CONTROL_CLASS_NAME}
                aria-label="Evento siguiente"
                onClick={() => dispatch({ type: "next" })}
              >
                <ChevronRight className="size-5" aria-hidden="true" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {hasControls && (
        <FeaturedEventThumbnails
          events={events}
          activeIndex={state.activeIndex}
          progress={progress}
          progressKey={`${state.activeIndex}-${state.cycle}`}
          onSelect={(index) => dispatch({ type: "go", index })}
          onProgressEnd={() => dispatch({ type: "advance" })}
        />
      )}
    </section>
  )
}
