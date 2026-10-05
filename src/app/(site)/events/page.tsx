import type { Metadata } from "next"
import { connection } from "next/server"

import { EventSearchView } from "@/modules/events/components/event-search-view"
import { eventsService } from "@/modules/events/services/events.service"

export const metadata: Metadata = {
  title: "Explora eventos — Ticketera",
  description:
    "Busca y filtra conciertos, deportes, teatro y más por categoría, ciudad, fecha y precio.",
}

export default async function EventsPage() {
  // D2: render por petición para que useSearchParams tenga valor en el SSR.
  await connection()
  const events = await eventsService.getUpcoming()

  return <EventSearchView events={events} />
}
