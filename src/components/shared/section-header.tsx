import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { cn } from "@/lib/utils"

export type SectionHeaderProps = {
  titleId: string
  title: string
  description?: string
  action?: { href: string; label: string; className?: string }
  className?: string
}

export function SectionHeader({
  titleId,
  title,
  description,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        <h2
          id={titleId}
          className="text-2xl leading-[1.2] font-bold tracking-[-0.02em] md:text-[2rem]"
        >
          {title}
        </h2>
        {description && (
          <p className="text-sm leading-normal text-muted-foreground md:text-[1.0625rem]">
            {description}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className={cn(
            "inline-flex min-h-11 items-center gap-1.5 rounded-md text-[0.9375rem] font-semibold text-primary hover:underline focus-ring",
            action.className
          )}
        >
          {action.label}
          <ArrowRight className="size-[18px]" aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}
