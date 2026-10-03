import type { EventCategory } from "@/modules/events/types/event.types"

export const EVENT_CATEGORIES: readonly EventCategory[] = [
  { id: "concerts", label: "Conciertos" },
  { id: "sports", label: "Deportes" },
  { id: "theater", label: "Teatro" },
  { id: "festivals", label: "Festivales" },
  { id: "family", label: "Familiar" },
  { id: "cinema", label: "Cine" },
  { id: "comedy", label: "Comedia" },
  { id: "arts", label: "Arte y Exposiciones" },
]
