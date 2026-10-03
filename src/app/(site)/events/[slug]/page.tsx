import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { EventDetailView } from "@/modules/events/components/event-detail-view"
import { eventsService } from "@/modules/events/services/events.service"

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  const events = await eventsService.getAll()
  return events.map((event) => ({ slug: event.slug }))
}

export async function generateMetadata(props: PageProps<"/events/[slug]">): Promise<Metadata> {
  const { slug } = await props.params
  const event = await eventsService.getBySlug(slug)
  if (!event) notFound()

  return { title: `${event.title} — Ticketera`, description: event.description }
}

export default async function EventPage(props: PageProps<"/events/[slug]">) {
  const { slug } = await props.params
  const event = await eventsService.getBySlug(slug)
  if (!event) notFound()

  return <EventDetailView event={event} />
}
