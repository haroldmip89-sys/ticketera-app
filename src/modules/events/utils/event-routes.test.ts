import { describe, expect, it } from "vitest"

import {
  getEventCheckoutHref,
  getEventHref,
  getEventSeatsHref,
  getEventTicketsHref,
  getVenueDirectionsUrl,
} from "@/modules/events/utils/event-routes"

describe("getEventHref", () => {
  it("builds the detail path", () => {
    expect(getEventHref("x")).toBe("/events/x")
  })
})

describe("getEventTicketsHref", () => {
  it("builds the tickets path", () => {
    expect(getEventTicketsHref("x")).toBe("/events/x/tickets")
  })
})

describe("getEventSeatsHref", () => {
  it("builds the seats path", () => {
    expect(getEventSeatsHref("x")).toBe("/events/x/seats")
  })
})

describe("getEventCheckoutHref", () => {
  it("builds the checkout path", () => {
    expect(getEventCheckoutHref("x")).toBe("/events/x/checkout")
  })
})

describe("getVenueDirectionsUrl", () => {
  const venue = {
    id: "teatro-municipal",
    name: "Teatro Municipal",
    city: "Lima",
    address: "Jr. Las Artes 377, Cercado de Lima",
  }

  it("points to a Google Maps search", () => {
    expect(getVenueDirectionsUrl(venue)).toMatch(
      /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/
    )
  })

  it("encodes commas and spaces in the query", () => {
    const url = getVenueDirectionsUrl(venue)
    expect(url).not.toMatch(/[ ,]/)
    expect(new URL(url).searchParams.get("query")).toBe(
      "Teatro Municipal, Jr. Las Artes 377, Cercado de Lima, Lima"
    )
  })

  it("encodes accented characters", () => {
    const url = getVenueDirectionsUrl({ ...venue, name: "Galería Británica" })
    expect(url).toContain("Galer%C3%ADa%20Brit%C3%A1nica")
    expect(new URL(url).searchParams.get("query")).toBe(
      "Galería Británica, Jr. Las Artes 377, Cercado de Lima, Lima"
    )
  })
})
