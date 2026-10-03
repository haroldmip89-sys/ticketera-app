"use client"

import {
  memo,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react"
import { Minus, Plus, RotateCcw } from "lucide-react"
import {
  TransformComponent,
  TransformWrapper,
  useControls,
  useTransformEffect,
  type ReactZoomPanPinchContentRef,
  type ReactZoomPanPinchContextState,
} from "react-zoom-pan-pinch"

import { Button } from "@/components/ui/button"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { formatPrice } from "@/lib/format"
import { cn } from "@/lib/utils"
import { SeatGlyph } from "@/modules/seating/components/seat-glyph"
import type { Seat, SeatStatus, VenueLayout } from "@/modules/seating/types/seating.types"
import {
  getAdjacentSeatId,
  getInitialFocusSeatId,
  getSeatAriaLabel,
  SEAT_NAVIGATION_KEYS,
  type SeatNavigationKey,
} from "@/modules/seating/utils/seat-a11y"

export type SeatMapProps = {
  layout: VenueLayout
  venueName: string
  soldSeatIds: ReadonlySet<string>
  selectedSeatIds: ReadonlySet<string>
  includedZoneIds: ReadonlySet<string>
  zonePrices: ReadonlyMap<string, number>
  onSeatActivate: (seatId: string) => void
  className?: string
}

const MIN_SCALE = 1
const MAX_SCALE = 6
const DRAG_THRESHOLD_PX = 6
const MIN_TAP_TARGET_PX = 24
const TAP_ZOOM_TARGET_PX = 28
const AUTO_PAN_MARGIN_PX = 24
const ANIMATION_TIME_MS = 300

const WRAPPER_STYLE = {
  width: "100%",
  height: "100%",
  overflow: "hidden",
  touchAction: "none",
} as const
const CONTENT_STYLE = { width: "100%", height: "100%" } as const
const DISABLED_OPTION = { disabled: true } as const
const ENABLED_OPTION = { disabled: false } as const
// La librería suma `step * |deltaY|` a la escala: 0.004 da ~1.4× por muesca de 100 (no 2.5×).
const WHEEL_OPTION = { step: 0.004 } as const

function isSeatNavigationKey(key: string): key is SeatNavigationKey {
  return (SEAT_NAVIGATION_KEYS as readonly string[]).includes(key)
}

function getSeatStatus(
  seatId: string,
  soldSeatIds: ReadonlySet<string>,
  selectedSeatIds: ReadonlySet<string>,
): SeatStatus {
  if (soldSeatIds.has(seatId)) return "sold"
  if (selectedSeatIds.has(seatId)) return "selected"
  return "available"
}

function getSeatElement(target: EventTarget): HTMLElement | null {
  return target instanceof Element ? target.closest<HTMLElement>("[data-seat-id]") : null
}

function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(":focus-visible")
  } catch {
    return true
  }
}

type SeatNodeProps = {
  seat: Seat
  domId: string
  r: number
  zoneName: string
  price: number
  status: SeatStatus
  zoneIncluded: boolean
  isTabStop: boolean
}

const SeatNode = memo(function SeatNode({
  seat,
  domId,
  r,
  zoneName,
  price,
  status,
  zoneIncluded,
  isTabStop,
}: SeatNodeProps) {
  const isUnavailable = status === "sold" || !zoneIncluded

  return (
    <g
      id={domId}
      data-seat-id={seat.id}
      role="checkbox"
      aria-checked={status === "selected"}
      aria-disabled={isUnavailable ? true : undefined}
      aria-label={getSeatAriaLabel({
        zoneName,
        rowLabel: seat.rowLabel,
        number: seat.number,
        price,
        accessible: seat.accessible,
        status,
        zoneIncluded,
      })}
      tabIndex={isTabStop ? 0 : -1}
      className={cn(
        "group/seat outline-none",
        isUnavailable ? "cursor-not-allowed" : "cursor-pointer",
        status === "available" && zoneIncluded && "hover:[&>g>:first-child]:fill-primary/35",
      )}
    >
      <SeatGlyph cx={seat.x} cy={seat.y} r={r} status={status} accessible={seat.accessible} />
      <circle
        cx={seat.x}
        cy={seat.y}
        r={r + 3}
        strokeWidth={2}
        className="pointer-events-none fill-none stroke-ring opacity-0 group-focus-visible/seat:opacity-100"
      />
    </g>
  )
})

function SeatMapZoomControls({ animationTime }: { animationTime: number }) {
  const { zoomIn, zoomOut, resetTransform } = useControls()
  const [canZoomIn, setCanZoomIn] = useState(true)
  const [canZoomOut, setCanZoomOut] = useState(false)

  useTransformEffect(
    useCallback(({ state }: ReactZoomPanPinchContextState) => {
      setCanZoomIn(state.scale < MAX_SCALE - 0.001)
      setCanZoomOut(state.scale > MIN_SCALE + 0.001)
    }, []),
  )

  const buttonClassName =
    "size-11 bg-card lg:size-9 data-disabled:pointer-events-none data-disabled:opacity-50"

  return (
    <div
      role="group"
      aria-label="Controles de zoom"
      className="absolute top-3 right-3 z-10 flex flex-col gap-2"
    >
      <Button
        variant="outline"
        size="icon"
        aria-label="Acercar"
        disabled={!canZoomIn}
        focusableWhenDisabled
        className={buttonClassName}
        onClick={() => zoomIn(undefined, animationTime)}
      >
        <Plus aria-hidden />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Alejar"
        disabled={!canZoomOut}
        focusableWhenDisabled
        className={buttonClassName}
        onClick={() => zoomOut(undefined, animationTime)}
      >
        <Minus aria-hidden />
      </Button>
      <Button
        variant="outline"
        size="icon"
        aria-label="Restablecer vista"
        className={buttonClassName}
        onClick={() => resetTransform(animationTime)}
      >
        <RotateCcw aria-hidden />
      </Button>
    </div>
  )
}

type PointerStart = { x: number; y: number; pointerType: string }

export function SeatMap({
  layout,
  venueName,
  soldSeatIds,
  selectedSeatIds,
  includedZoneIds,
  zonePrices,
  onSeatActivate,
  className,
}: SeatMapProps) {
  const baseId = useId()
  const descriptionId = `${baseId}-description`
  const getDomId = useCallback((seatId: string) => `${baseId}-seat-${seatId}`, [baseId])

  const transformRef = useRef<ReactZoomPanPinchContentRef>(null)
  const pointerStartRef = useRef<PointerStart | null>(null)
  const pointerFocusRef = useRef(false)

  const prefersReducedMotion = usePrefersReducedMotion()
  const animationTime = prefersReducedMotion ? 0 : ANIMATION_TIME_MS
  const animationOption = prefersReducedMotion ? DISABLED_OPTION : ENABLED_OPTION

  const initialFocusSeatId = useMemo(
    () =>
      getInitialFocusSeatId(
        layout,
        soldSeatIds,
        Object.fromEntries([...includedZoneIds].map((zoneId) => [zoneId, 1])),
      ),
    [layout, soldSeatIds, includedZoneIds],
  )
  const [lastActiveSeatId, setLastActiveSeatId] = useState<string | null>(null)
  const activeSeatId = lastActiveSeatId ?? initialFocusSeatId

  const focusSeat = useCallback(
    (seatId: string) => {
      setLastActiveSeatId(seatId)
      document.getElementById(getDomId(seatId))?.focus({ preventScroll: true })
    },
    [getDomId],
  )

  const activateSeat = useCallback(
    (seatId: string) => {
      focusSeat(seatId)
      onSeatActivate(seatId)
    },
    [focusSeat, onSeatActivate],
  )

  function handleFocus(event: FocusEvent<SVGSVGElement>) {
    const seatElement = getSeatElement(event.target)
    if (!seatElement) return
    setLastActiveSeatId(seatElement.dataset.seatId ?? null)

    if (pointerFocusRef.current || !isFocusVisible(seatElement)) return

    const transform = transformRef.current
    const wrapper = transform?.instance.wrapperComponent
    if (!transform || !wrapper) return

    // Al entrar con Tab el navegador puede desplazar el wrapper `overflow: hidden`.
    if (wrapper.scrollTop !== 0) wrapper.scrollTop = 0
    if (wrapper.scrollLeft !== 0) wrapper.scrollLeft = 0

    const seatRect = seatElement.getBoundingClientRect()
    if (seatRect.width === 0) return
    const wrapperRect = wrapper.getBoundingClientRect()
    const isFullyVisible =
      seatRect.left >= wrapperRect.left + AUTO_PAN_MARGIN_PX &&
      seatRect.right <= wrapperRect.right - AUTO_PAN_MARGIN_PX &&
      seatRect.top >= wrapperRect.top + AUTO_PAN_MARGIN_PX &&
      seatRect.bottom <= wrapperRect.bottom - AUTO_PAN_MARGIN_PX
    if (isFullyVisible) return

    transform.zoomToElement(seatElement.id, {
      scale: transform.instance.state.scale,
      animationTime,
    })
  }

  function handleKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const seatId = getSeatElement(event.target)?.dataset.seatId ?? activeSeatId
    const { key } = event

    if (isSeatNavigationKey(key)) {
      event.preventDefault()
      const nextSeatId = getAdjacentSeatId(layout, seatId, key)
      if (nextSeatId) focusSeat(nextSeatId)
      return
    }
    if (key === "Enter" || key === " ") {
      event.preventDefault()
      activateSeat(seatId)
      return
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return

    const transform = transformRef.current
    if (key === "+" || key === "=") {
      event.preventDefault()
      transform?.zoomIn(undefined, animationTime)
    } else if (key === "-") {
      event.preventDefault()
      transform?.zoomOut(undefined, animationTime)
    } else if (key === "0") {
      event.preventDefault()
      transform?.resetTransform(animationTime)
    }
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    pointerStartRef.current = { x: event.clientX, y: event.clientY, pointerType: event.pointerType }
  }

  function handleClick(event: MouseEvent<SVGSVGElement>) {
    const start = pointerStartRef.current
    pointerStartRef.current = null

    const seatElement = getSeatElement(event.target)
    const seatId = seatElement?.dataset.seatId
    if (!seatId) return

    // Guardia de arrastre: un pan que termina sobre un asiento no lo elige.
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > DRAG_THRESHOLD_PX)
      return

    const transform = transformRef.current
    if (start?.pointerType === "touch" && transform) {
      const svgRect = event.currentTarget.getBoundingClientRect()
      const pxPerUnit = Math.min(svgRect.width / layout.width, svgRect.height / layout.height)
      const seatSizePx = 2 * layout.seatRadius * pxPerUnit
      if (seatSizePx < MIN_TAP_TARGET_PX) {
        const scale = transform.instance.state.scale
        const targetScale = Math.min(
          MAX_SCALE,
          (scale * TAP_ZOOM_TARGET_PX) / Math.max(seatSizePx, 1),
        )
        transform.zoomToPoint(targetScale, event.clientX, event.clientY, animationTime)
        return
      }
    }

    // El foco que sigue a un clic no hace auto-pan.
    pointerFocusRef.current = true
    activateSeat(seatId)
    pointerFocusRef.current = false
  }

  const { stage, seatRadius: r } = layout

  return (
    <div className={cn("relative h-full w-full", className)}>
      <p id={descriptionId} className="sr-only">
        Usa las flechas para moverte entre asientos y filas, Inicio y Fin para ir al extremo de la
        fila, Enter o Espacio para elegir un asiento, y más o menos para acercar o alejar.
      </p>
      <TransformWrapper
        ref={transformRef}
        initialScale={1}
        minScale={MIN_SCALE}
        maxScale={MAX_SCALE}
        limitToBounds
        doubleClick={DISABLED_OPTION}
        keyboard={DISABLED_OPTION}
        wheel={WHEEL_OPTION}
        zoomAnimation={animationOption}
        velocityAnimation={animationOption}
      >
        <SeatMapZoomControls animationTime={animationTime} />
        <TransformComponent wrapperStyle={WRAPPER_STYLE} contentStyle={CONTENT_STYLE}>
          <svg
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            width="100%"
            height="100%"
            preserveAspectRatio="xMidYMid meet"
            role="group"
            aria-label={`Mapa de asientos, ${venueName}`}
            aria-describedby={descriptionId}
            className="select-none"
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onClick={handleClick}
          >
            <g aria-hidden>
              <rect
                x={stage.x}
                y={stage.y}
                width={stage.width}
                height={stage.height}
                rx={4}
                strokeWidth={1}
                className="fill-muted stroke-border"
              />
              <text
                x={stage.x + stage.width / 2}
                y={stage.y + stage.height / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9}
                letterSpacing={2}
                className="fill-muted-foreground font-semibold"
              >
                {stage.label.toUpperCase()}
              </text>
            </g>

            {layout.zones.map((zone) => {
              const price = zonePrices.get(zone.id) ?? 0
              const zoneIncluded = includedZoneIds.has(zone.id)
              const zoneLabel = `${zone.name}, ${formatPrice(price)}`

              return (
                <g
                  key={zone.id}
                  role="group"
                  aria-label={
                    zoneIncluded ? zoneLabel : `${zoneLabel}, no incluida en tu selección`
                  }
                  className={cn(!zoneIncluded && "opacity-40")}
                >
                  <g aria-hidden className="fill-muted-foreground">
                    <text
                      x={zone.labelPosition.x}
                      y={zone.labelPosition.y}
                      textAnchor="middle"
                      dominantBaseline="central"
                      fontSize={9}
                      letterSpacing={1.5}
                      className="font-semibold"
                    >
                      {zone.name.toUpperCase()}
                    </text>
                    {zone.rows.map((row) => (
                      <g key={row.label} fontSize={7}>
                        <text
                          x={row.labelPositions.start.x}
                          y={row.labelPositions.start.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {row.label}
                        </text>
                        <text
                          x={row.labelPositions.end.x}
                          y={row.labelPositions.end.y}
                          textAnchor="middle"
                          dominantBaseline="central"
                        >
                          {row.label}
                        </text>
                      </g>
                    ))}
                  </g>

                  {zone.rows.map((row) =>
                    row.seats.map((seat) => (
                      <SeatNode
                        key={seat.id}
                        seat={seat}
                        domId={getDomId(seat.id)}
                        r={r}
                        zoneName={zone.name}
                        price={price}
                        status={getSeatStatus(seat.id, soldSeatIds, selectedSeatIds)}
                        zoneIncluded={zoneIncluded}
                        isTabStop={seat.id === activeSeatId}
                      />
                    )),
                  )}
                </g>
              )
            })}
          </svg>
        </TransformComponent>
      </TransformWrapper>
    </div>
  )
}
