import { Minus, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export type QuantityStepperProps = {
  value: number
  max: number
  /** value - 1 o value + 1. */
  onValueChange: (next: number) => void
  groupLabel: string
  decrementLabel: string
  incrementLabel: string
  className?: string
}

const STEP_BUTTON_CLASS_NAME =
  "size-11 rounded-[11px] focus-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-40 lg:size-10 [&_svg:not([class*='size-'])]:size-[18px]"

/** Mínimo fijo 0. Los botones deshabilitados siguen siendo enfocables (aria-disabled) para no perder el foco. */
export function QuantityStepper({
  value,
  max,
  onValueChange,
  groupLabel,
  decrementLabel,
  incrementLabel,
  className,
}: QuantityStepperProps) {
  return (
    <div
      role="group"
      aria-label={groupLabel}
      className={cn(
        "inline-flex items-center gap-1 rounded-[14px] border border-border p-[3px]",
        className
      )}
    >
      <Button
        type="button"
        aria-label={decrementLabel}
        disabled={value <= 0}
        focusableWhenDisabled
        onClick={() => onValueChange(value - 1)}
        className={cn(STEP_BUTTON_CLASS_NAME, "bg-muted text-foreground hover:bg-muted/80")}
      >
        <Minus aria-hidden="true" />
      </Button>

      <output
        aria-live="polite"
        aria-atomic="true"
        className="w-8 text-center text-base font-semibold tabular-nums"
      >
        {value}
      </output>

      <Button
        type="button"
        aria-label={incrementLabel}
        disabled={value >= max}
        focusableWhenDisabled
        onClick={() => onValueChange(value + 1)}
        className={cn(
          STEP_BUTTON_CLASS_NAME,
          "bg-foreground text-background hover:bg-foreground/90"
        )}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  )
}
