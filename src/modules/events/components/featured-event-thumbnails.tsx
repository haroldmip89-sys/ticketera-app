import Image from "next/image"

import { formatDateShort } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { EventItem } from "@/modules/events/types/event.types"

export type FeaturedEventThumbnailsProps = {
  events: EventItem[]
  activeIndex: number
  progress: "running" | "paused" | "complete"
  progressKey: string
  onSelect: (index: number) => void
  onProgressEnd: () => void
}

const PROGRESS_CLASS_NAME: Record<FeaturedEventThumbnailsProps["progress"], string> = {
  running: "animate-featured-progress [animation-play-state:running]",
  paused: "animate-featured-progress [animation-play-state:paused]",
  complete: "w-full",
}

export function FeaturedEventThumbnails({
  events,
  activeIndex,
  progress,
  progressKey,
  onSelect,
  onProgressEnd,
}: FeaturedEventThumbnailsProps) {
  return (
    <div className="mt-4 -mx-4 flex gap-3 overflow-x-auto snap-x snap-mandatory px-4 pb-1 lg:mx-0 lg:mt-5.5 lg:grid lg:grid-cols-5 lg:gap-4 lg:overflow-visible lg:px-0 lg:pb-0">
      {events.map((event, index) => {
        const isActive = index === activeIndex

        return (
          <button
            key={event.id}
            type="button"
            aria-label={`Ver ${event.title}`}
            aria-current={isActive ? "true" : undefined}
            onClick={() => onSelect(index)}
            className="flex w-55 shrink-0 snap-start flex-col gap-3 rounded-xl text-left focus-ring lg:w-auto lg:gap-3.5"
          >
            <span className="block h-[3px] w-full overflow-hidden rounded-full bg-border">
              {isActive && (
                <span
                  key={progressKey}
                  onAnimationEnd={onProgressEnd}
                  className={cn("block h-full bg-primary", PROGRESS_CLASS_NAME[progress])}
                />
              )}
            </span>
            <span className="flex items-center gap-2.5 lg:gap-3">
              <Image
                src={event.imageUrl}
                alt=""
                width={56}
                height={56}
                sizes="56px"
                className={cn(
                  "size-12 shrink-0 rounded-xl object-cover lg:size-14 lg:rounded-[14px]",
                  isActive ? "opacity-100" : "opacity-70"
                )}
              />
              <span className="flex min-w-0 flex-col">
                <span
                  className={cn(
                    "truncate text-[13px] font-semibold lg:text-sm",
                    isActive ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {event.title}
                </span>
                <span className="text-xs text-muted-foreground lg:text-[13px]">
                  {`${formatDateShort(event.startsAt)} · ${event.venue.city}`}
                </span>
              </span>
            </span>
          </button>
        )
      })}
    </div>
  )
}
