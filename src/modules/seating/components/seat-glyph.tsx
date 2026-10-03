import { Accessibility } from "lucide-react"

import type { SeatStatus } from "@/modules/seating/types/seating.types"

export type SeatGlyphProps = { cx: number; cy: number; r: number; status: SeatStatus; accessible: boolean }

const SHAPE_CLASS_NAMES: Record<SeatStatus, string> = {
  available: "fill-primary/15 stroke-primary",
  selected: "fill-primary stroke-primary",
  sold: "fill-muted-foreground/25 stroke-none",
}

/** Forma = accesibilidad (círculo / cuadrado redondeado); glifo = estado (nada / check / ×). El color solo refuerza. */
export function SeatGlyph({ cx, cy, r, status, accessible }: SeatGlyphProps) {
  const shapeClassName = SHAPE_CLASS_NAMES[status]
  const strokeWidth = r * 0.2
  const glyphStrokeWidth = r * 0.3
  const glyph = r * 0.45

  return (
    <g>
      {accessible ? (
        <rect
          x={cx - r}
          y={cy - r}
          width={2 * r}
          height={2 * r}
          rx={r * 0.35}
          strokeWidth={strokeWidth}
          className={shapeClassName}
        />
      ) : (
        <circle cx={cx} cy={cy} r={r} strokeWidth={strokeWidth} className={shapeClassName} />
      )}
      {status === "available" && accessible && (
        <Accessibility
          x={cx - r * 0.75}
          y={cy - r * 0.75}
          size={r * 1.5}
          strokeWidth={2.5}
          className="text-primary"
          aria-hidden
        />
      )}
      {status === "selected" && (
        <path
          d={`M ${cx - glyph} ${cy} L ${cx - glyph * 0.25} ${cy + glyph * 0.75} L ${cx + glyph} ${cy - glyph * 0.75}`}
          strokeWidth={glyphStrokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="fill-none stroke-primary-foreground"
        />
      )}
      {status === "sold" && (
        <path
          d={`M ${cx - glyph} ${cy - glyph} L ${cx + glyph} ${cy + glyph} M ${cx + glyph} ${cy - glyph} L ${cx - glyph} ${cy + glyph}`}
          strokeWidth={glyphStrokeWidth}
          strokeLinecap="round"
          className="fill-none stroke-muted-foreground"
        />
      )}
    </g>
  )
}
