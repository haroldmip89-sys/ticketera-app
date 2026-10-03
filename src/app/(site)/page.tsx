import { EventDiscoverySection } from "@/modules/events/components/event-discovery-section"
import { FeaturedEventsHero } from "@/modules/events/components/featured-events-hero"
import { HomeIntroSection } from "@/modules/home/components/home-intro-section"
import { HowItWorksSection } from "@/modules/home/components/how-it-works-section"
import { NewsletterSection } from "@/modules/home/components/newsletter-section"

export default function Home() {
  return (
    <>
      <HomeIntroSection />
      <FeaturedEventsHero />
      <EventDiscoverySection />
      <HowItWorksSection />
      <NewsletterSection />
    </>
  )
}
