import {
  Drama,
  Film,
  MicVocal,
  Music,
  Palette,
  PartyPopper,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { EVENT_CATEGORIES } from "@/modules/events/data/event-categories"
import type { EventCategoryId } from "@/modules/events/types/event.types"
import type { EventCategoryFilter } from "@/modules/events/utils/event-filters"

const CATEGORY_TILE_STYLES: Record<
  EventCategoryId,
  { icon: LucideIcon; tileClassName: string; iconClassName: string }
> = {
  concerts: {
    icon: Music,
    tileClassName: "bg-(--cat-concerts-bg)",
    iconClassName: "text-(--cat-concerts-fg)",
  },
  sports: {
    icon: Trophy,
    tileClassName: "bg-(--cat-sports-bg)",
    iconClassName: "text-(--cat-sports-fg)",
  },
  theater: {
    icon: Drama,
    tileClassName: "bg-(--cat-theater-bg)",
    iconClassName: "text-(--cat-theater-fg)",
  },
  festivals: {
    icon: PartyPopper,
    tileClassName: "bg-(--cat-festivals-bg)",
    iconClassName: "text-(--cat-festivals-fg)",
  },
  family: {
    icon: Users,
    tileClassName: "bg-(--cat-family-bg)",
    iconClassName: "text-(--cat-family-fg)",
  },
  cinema: {
    icon: Film,
    tileClassName: "bg-(--cat-cinema-bg)",
    iconClassName: "text-(--cat-cinema-fg)",
  },
  comedy: {
    icon: MicVocal,
    tileClassName: "bg-(--cat-comedy-bg)",
    iconClassName: "text-(--cat-comedy-fg)",
  },
  arts: {
    icon: Palette,
    tileClassName: "bg-(--cat-arts-bg)",
    iconClassName: "text-(--cat-arts-fg)",
  },
}

export type EventCategoryTilesProps = {
  selected: EventCategoryFilter
  onSelect: (categoryId: EventCategoryId) => void
}

export function EventCategoryTiles({ selected, onSelect }: EventCategoryTilesProps) {
  return (
    <div className="-mx-4 -my-1.5 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 py-1.5 md:mx-0 md:my-0 md:grid md:snap-none md:grid-cols-4 md:gap-4 md:overflow-visible md:px-0 md:py-0 xl:grid-cols-8">
      {EVENT_CATEGORIES.map((category) => {
        const { icon: Icon, tileClassName, iconClassName } = CATEGORY_TILE_STYLES[category.id]

        return (
          <button
            key={category.id}
            type="button"
            aria-pressed={selected === category.id}
            onClick={() => onSelect(category.id)}
            className={cn(
              "flex h-33 w-34 shrink-0 snap-start flex-col items-start justify-between rounded-[22px] border-2 border-transparent p-4 text-left focus-ring aria-pressed:border-primary md:h-42 md:w-auto md:rounded-3xl md:p-5",
              "hover:shadow-[0_14px_28px_-18px_rgb(24_24_27/0.4)] motion-safe:transition-[translate,box-shadow] motion-safe:duration-250 motion-safe:hover:-translate-y-[3px]",
              tileClassName
            )}
          >
            <span
              className={cn(
                "flex size-12 items-center justify-center rounded-2xl bg-card md:size-14 md:rounded-[18px]",
                iconClassName
              )}
            >
              <Icon className="size-[26px]" aria-hidden="true" />
            </span>
            <span className="text-sm leading-tight font-semibold text-foreground md:text-base">
              {category.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
