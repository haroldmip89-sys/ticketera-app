import { EventDiscovery } from "@/modules/events/components/event-discovery"
import { eventsService } from "@/modules/events/services/events.service"

export async function EventDiscoverySection() {
  const events = await eventsService.getUpcoming()
  return <EventDiscovery events={events} />
}
