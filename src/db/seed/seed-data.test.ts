import { describe, expect, it } from "vitest"

import { buildSeedPlan, DEFAULT_ZONE_CAPACITY } from "./seed-data"

const plan = buildSeedPlan({ dateOffsetDays: 0 })

describe("buildSeedPlan", () => {
  it("cubre categorías, eventos y tipos de entrada del mock", () => {
    expect(plan.categories).toHaveLength(8)
    expect(plan.events).toHaveLength(10)
    expect(plan.ticketTypes).toHaveLength(23)
    expect(plan.events.every((event) => event.status === "published")).toBe(true)
  })

  it("es determinista", () => {
    expect(buildSeedPlan({ dateOffsetDays: 3 })).toEqual(buildSeedPlan({ dateOffsetDays: 3 }))
  })

  it("genera precios en centavos enteros", () => {
    for (const ticketType of plan.ticketTypes) {
      expect(Number.isInteger(ticketType.priceCents)).toBe(true)
    }
    expect(plan.ticketTypes.find((t) => t.eventSlug === "noche-de-rock-sinfonico" && t.name === "Platea")?.priceCents).toBe(8500)
  })

  it("crea recintos no curados y únicos", () => {
    const slugs = plan.venues.map((venue) => venue.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(plan.venues.every((venue) => venue.isCurated === false && venue.country === "PE")).toBe(true)
  })

  it("no repite asientos por (layout, sección, fila, número)", () => {
    const keys = plan.seats.map((s) => `${s.layoutKey}|${s.sectionCode}|${s.rowLabel}|${s.seatNumber}`)
    expect(plan.seats.length).toBeGreaterThan(0)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("sold_count no supera la capacidad", () => {
    for (const ticketType of plan.ticketTypes) {
      expect(ticketType.soldCount).toBeLessThanOrEqual(ticketType.capacity as number)
    }
  })

  it("la capacidad de zonas con asiento es el número de asientos", () => {
    const seated = plan.ticketTypes.filter((t) => t.sectionCode && plan.seats.some((s) => s.layoutKey === t.layoutKey && s.sectionCode === t.sectionCode))
    expect(seated.length).toBeGreaterThan(0)
    for (const ticketType of seated) {
      const count = plan.seats.filter((s) => s.layoutKey === ticketType.layoutKey && s.sectionCode === ticketType.sectionCode).length
      expect(ticketType.capacity).toBe(count)
      expect(ticketType.soldCount).toBe(0)
    }
  })

  it("zonas generales usan capacidad por defecto y reflejan agotado/últimas", () => {
    const soldOut = plan.ticketTypes.find((t) => t.eventSlug === "clasico-del-futbol-final-de-temporada" && t.name === "Occidente")
    expect(soldOut?.capacity).toBe(DEFAULT_ZONE_CAPACITY)
    expect(soldOut?.soldCount).toBe(DEFAULT_ZONE_CAPACITY)
    const noMap = plan.ticketTypes.filter((t) => t.sectionCode === null)
    expect(noMap.length).toBeGreaterThan(0)
  })

  it("eventos sin mapa tienen layout y sección nulos", () => {
    const withLayout = new Set(plan.layouts.map((l) => l.layoutKey))
    const without = plan.events.filter((event) => !withLayout.has(event.slug))
    expect(without.length).toBeGreaterThan(0)
    for (const event of without) {
      expect(event.layoutKey).toBeNull()
      const types = plan.ticketTypes.filter((t) => t.eventSlug === event.slug)
      expect(types.every((t) => t.layoutKey === null && t.sectionCode === null)).toBe(true)
    }
  })

  it("toda sección referenciada existe en su layout", () => {
    for (const t of plan.ticketTypes.filter((x) => x.sectionCode)) {
      expect(plan.sections.some((s) => s.layoutKey === t.layoutKey && s.code === t.sectionCode)).toBe(true)
    }
  })

  it("desplaza las fechas por dateOffsetDays", () => {
    const shifted = buildSeedPlan({ dateOffsetDays: 7 })
    plan.events.forEach((event, index) => {
      const diff = (shifted.events[index].startsAt as Date).getTime() - (event.startsAt as Date).getTime()
      expect(diff).toBe(7 * 24 * 60 * 60 * 1000)
    })
  })
})
