import { beforeAll, describe, expect, it } from "vitest"

import { eventsService } from "@/modules/events/services/events.service"
import type { EventItem } from "@/modules/events/types/event.types"
import {
  filterUpcomingEvents,
  UPCOMING_EVENTS_LIMIT,
  type EventCategoryFilter,
} from "@/modules/events/utils/event-filters"

const ids = (events: EventItem[]) => events.map((event) => event.id)

let upcoming: EventItem[]

beforeAll(async () => {
  upcoming = await eventsService.getUpcoming()
})

describe("filterUpcomingEvents", () => {
  it.each<[EventCategoryFilter, string[]]>([
    [
      "all",
      ["evt-001", "evt-002", "evt-003", "evt-004", "evt-005", "evt-006", "evt-007", "evt-008"],
    ],
    ["concerts", ["evt-001", "evt-006", "evt-007", "evt-008"]],
    ["sports", ["evt-002"]],
    ["theater", ["evt-004"]],
    ["festivals", ["evt-003"]],
    ["family", ["evt-009"]],
    ["cinema", []],
    ["comedy", ["evt-005"]],
    ["arts", ["evt-010"]],
  ])("filters %s", (filter, expected) => {
    expect(ids(filterUpcomingEvents(upcoming, filter))).toEqual(expected)
  })

  it("cuts the result to UPCOMING_EVENTS_LIMIT", () => {
    const template = upcoming[0]
    const many = Array.from({ length: 12 }, (_, i) => ({ ...template, id: `test-${i}` }))
    const result = filterUpcomingEvents(many, template.category.id)
    expect(UPCOMING_EVENTS_LIMIT).toBe(8)
    expect(ids(result)).toEqual(ids(many.slice(0, 8)))
  })

  it("does not mutate the input and keeps its order", () => {
    const reversed = [...upcoming].reverse()
    const snapshot = ids(reversed)
    const result = filterUpcomingEvents(reversed, "concerts")
    expect(ids(reversed)).toEqual(snapshot)
    expect(ids(result)).toEqual(["evt-008", "evt-007", "evt-006", "evt-001"])
    expect(result).not.toBe(reversed)
  })
})
