import { FeaturedEventsCarousel } from "@/modules/events/components/featured-events-carousel"
import { eventsService } from "@/modules/events/services/events.service"

export async function FeaturedEventsHero() {
  const events = await eventsService.getFeatured()
  if (events.length === 0) return null
  return <FeaturedEventsCarousel events={events} />
}
