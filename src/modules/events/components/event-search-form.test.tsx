import { afterEach, describe, expect, it } from "vitest"
import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react"

import { EventSearchForm } from "@/modules/events/components/event-search-form"

afterEach(() => {
  cleanup()
})

describe("EventSearchForm", () => {
  it("gives the search input the accessible name 'Qué quieres ver'", () => {
    render(<EventSearchForm />)

    expect(screen.getByRole("searchbox", { name: "Qué quieres ver" })).toHaveAttribute(
      "placeholder",
      "Artista, evento o ciudad"
    )
  })

  it("prevents the default submit so the page does not navigate", () => {
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
})
