import { Ticket } from "lucide-react"

import { cn } from "@/lib/utils"

export type BrandLogoProps = {
  size?: "md" | "sm"
  className?: string
}

export function BrandLogo({ size = "md", className }: BrandLogoProps) {
  const isMedium = size === "md"

  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center bg-primary text-primary-foreground",
          isMedium ? "size-[2.375rem] rounded-[11px]" : "size-8 rounded-[10px]"
        )}
      >
        <Ticket className={isMedium ? "size-5" : "size-[18px]"} aria-hidden="true" />
      </span>
      <span
        className={cn(
          "font-bold tracking-[-0.02em]",
          isMedium ? "text-[1.3125rem]" : "text-lg"
        )}
      >
        Ticketera
      </span>
    </span>
  )
}
