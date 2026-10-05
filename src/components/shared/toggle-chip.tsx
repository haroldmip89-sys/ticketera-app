import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

export type ToggleChipProps = Omit<ComponentProps<"button">, "type" | "aria-pressed"> & {
  pressed: boolean
}

export function ToggleChip({ pressed, className, ...props }: ToggleChipProps) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={cn(
        "h-11 shrink-0 rounded-full border-[1.5px] px-4 text-sm whitespace-nowrap focus-ring",
        pressed
          ? "border-foreground bg-foreground font-semibold text-background"
          : "border-input bg-card font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}
