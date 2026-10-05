import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react"

import { EventSearchForm } from "@/modules/events/components/event-search-form"
import { DEFAULT_EVENT_SEARCH_FILTERS } from "@/modules/events/utils/event-search"

const push = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}))

beforeEach(() => {
  push.mockClear()
})

afterEach(() => {
  cleanup()
})

function submitForm() {
  fireEvent.submit(screen.getByRole("search", { name: "Buscar eventos" }))
}

describe("EventSearchForm", () => {
  it("gives the search input the accessible name 'Qué quieres ver'", () => {
    render(<EventSearchForm />)

    expect(screen.getByRole("searchbox", { name: "Qué quieres ver" })).toHaveAttribute(
      "placeholder",
      "Artista, evento o ciudad"
    )
  })

  it("prevents the default submit so the browser does not reload the page", () => {
    render(<EventSearchForm />)
    const form = screen.getByRole("search", { name: "Buscar eventos" })

    const submitEvent = createEvent.submit(form)

    fireEvent(form, submitEvent)

    expect(submitEvent.defaultPrevented).toBe(true)
  })

  it("shows 'Cualquier precio' in the price select by default", () => {
    render(<EventSearchForm />)

    expect(screen.getByRole("combobox", { name: /Precio/ })).toHaveTextContent(
      "Cualquier precio"
    )
  })

  it("navigates to /events with the trimmed query on submit", () => {
    render(<EventSearchForm />)

    fireEvent.change(screen.getByRole("searchbox", { name: "Qué quieres ver" }), {
      target: { value: "  rock " },
    })
    submitForm()

    expect(push).toHaveBeenCalledTimes(1)
    expect(push).toHaveBeenCalledWith("/events?q=rock")
  })

  it("navigates to /events without params when the query is empty", () => {
    render(<EventSearchForm />)

    submitForm()

    expect(push).toHaveBeenCalledWith("/events")
  })

  it("starts from the given filters and keeps categories and sort on submit", () => {
    render(
      <EventSearchForm
        filters={{
          ...DEFAULT_EVENT_SEARCH_FILTERS,
          query: "jazz",
          categories: ["theater"],
          sort: "price",
        }}
      />
    )
    const input = screen.getByRole("searchbox", { name: "Qué quieres ver" })

    expect(input).toHaveValue("jazz")

    fireEvent.change(input, { target: { value: "casa" } })
    submitForm()

    expect(push).toHaveBeenCalledWith("/events?q=casa&category=theater&sort=price")
  })
})
