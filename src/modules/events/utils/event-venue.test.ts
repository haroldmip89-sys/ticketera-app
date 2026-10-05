import { describe, expect, it } from "vitest"

import { formatVenueLocation } from "@/modules/events/utils/event-venue"

describe("formatVenueLocation", () => {
  it("omits the city when the address already ends with it", () => {
    expect(
      formatVenueLocation({
        name: "Estadio Nacional",
        address: "Av. del Deporte 1200, Lima",
        city: "Lima",
      })
    ).toBe("Estadio Nacional, Av. del Deporte 1200, Lima")
  })

  it("keeps the city when the last segment only contains it", () => {
    expect(
      formatVenueLocation({
        name: "Teatro Municipal",
        address: "Jr. Las Artes 377, Cercado de Lima",
        city: "Lima",
      })
    ).toBe("Teatro Municipal, Jr. Las Artes 377, Cercado de Lima, Lima")
  })

  it("ignores case and trailing commas or spaces, and trims them from the address", () => {
    expect(formatVenueLocation({ name: "Sala", address: "Av. X 10, LIMA , ", city: "Lima" })).toBe(
      "Sala, Av. X 10, LIMA"
    )
  })

  it("ignores accents", () => {
    expect(formatVenueLocation({ name: "Sala", address: "Calle Y 5, Peten", city: "Petén" })).toBe(
      "Sala, Calle Y 5, Peten"
    )
  })

  it("includes a different city", () => {
    expect(
      formatVenueLocation({
        name: "Centro Cultural",
        address: "Calle del Parque 210, Yanahuara",
        city: "Arequipa",
      })
    ).toBe("Centro Cultural, Calle del Parque 210, Yanahuara, Arequipa")
  })

  it("does not omit anything when the city is empty", () => {
    expect(formatVenueLocation({ name: "Sala", address: "Calle Z 1, ", city: "" })).toBe(
      "Sala, Calle Z 1, , "
    )
  })
})
