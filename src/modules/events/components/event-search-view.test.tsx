import type { ComponentProps } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { EventSearchView } from "@/modules/events/components/event-search-view"
import { eventsService } from "@/modules/events/services/events.service"
import type { EventItem } from "@/modules/events/types/event.types"

// useSearchParams refleja window.location.search y se re-renderiza al llamar a replaceState.
const locationStore = vi.hoisted(() => {
  const listeners = new Set<() => void>()
  const originalReplaceState = window.history.replaceState.bind(window.history)
  window.history.replaceState = (...args: Parameters<History["replaceState"]>) => {
    originalReplaceState(...args)
    listeners.forEach((listener) => listener())
  }
  return {
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSearch: () => window.location.search,
  }
})

vi.mock("next/navigation", async () => {
  const { useSyncExternalStore } = await import("react")
  return {
    useSearchParams: () =>
      new URLSearchParams(useSyncExternalStore(locationStore.subscribe, locationStore.getSearch)),
    useRouter: () => ({ push: vi.fn() }),
  }
})

vi.mock("next/image", () => ({
  default: ({ src, alt }: ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt} />
  ),
}))

let events: EventItem[]

beforeAll(async () => {
  events = await eventsService.getUpcoming()
})

beforeEach(() => {
  window.history.replaceState(null, "", "/events")
})

afterEach(() => {
  cleanup()
})

function renderView(url = "/events") {
  window.history.replaceState(null, "", url)
  render(<EventSearchView events={events} />)
}

function getCount() {
  return screen.getByText(/^\d+ eventos?$/, { selector: "p[aria-live]" })
}

function getRemoveChips() {
  return screen.queryAllByRole("button", { name: /^Quitar filtro / })
}

function getAside() {
  return within(screen.getByRole("complementary", { name: "Filtros" }))
}

describe("EventSearchView", () => {
  it("shows all events sorted by date with no chips when the URL has no params", () => {
    renderView()

    expect(getCount()).toHaveTextContent("10 eventos")
    expect(screen.getAllByRole("article")).toHaveLength(10)
    expect(screen.getByRole("button", { name: "Fecha" })).toHaveAttribute("aria-pressed", "true")
    expect(getRemoveChips()).toHaveLength(0)
  })

  it("reads the initial filters from the URL", () => {
    renderView("/events?category=theater")

    expect(getCount()).toHaveTextContent("1 evento")
    expect(screen.getByRole("checkbox", { name: "Teatro (1 evento)" })).toBeChecked()
    expect(screen.getByRole("button", { name: "Quitar filtro Teatro" })).toBeInTheDocument()
  })

  it("writes a checked category to the URL and removes it with its chip", async () => {
    const user = userEvent.setup()
    renderView()

    await user.click(screen.getByRole("checkbox", { name: "Conciertos (4 eventos)" }))

    expect(getCount()).toHaveTextContent("4 eventos")
    expect(window.location.search).toBe("?category=concerts")

    await user.click(screen.getByRole("button", { name: "Quitar filtro Conciertos" }))

    expect(getCount()).toHaveTextContent("10 eventos")
    expect(window.location.search).toBe("")
  })

  it("combines city and month filters", async () => {
    const user = userEvent.setup()
    renderView()
    const aside = getAside()

    await user.click(aside.getByRole("checkbox", { name: "Arequipa (2 eventos)" }))
    await user.click(aside.getByRole("radio", { name: "Noviembre" }))

    expect(getCount()).toHaveTextContent("1 evento")
    expect(screen.getAllByRole("article")).toHaveLength(1)
    expect(screen.getByRole("link", { name: /Jazz al Atardecer/ })).toBeInTheDocument()
    expect(window.location.search).toBe("?city=Arequipa&month=2026-11")
  })

  it("shows the empty state and clears every filter", async () => {
    const user = userEvent.setup()
    renderView()

    await user.click(screen.getByRole("checkbox", { name: "Cine (0 eventos)" }))

    expect(getCount()).toHaveTextContent("0 eventos")
    expect(screen.queryAllByRole("article")).toHaveLength(0)
    expect(screen.getByText("No encontramos eventos con esos filtros")).toBeInTheDocument()
    expect(
      screen.getByText("Prueba quitando algún filtro o buscando otra ciudad.")
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Limpiar filtros" }))

    expect(screen.getAllByRole("article")).toHaveLength(10)
    expect(window.location.search).toBe("")
  })

  it("sorts by lowest price", async () => {
    const user = userEvent.setup()
    renderView()

    await user.click(screen.getByRole("button", { name: "Precio más bajo" }))

    expect(screen.getByRole("button", { name: "Precio más bajo" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
    expect(screen.getByRole("button", { name: "Fecha" })).toHaveAttribute("aria-pressed", "false")
    expect(screen.getAllByRole("article")[0]).toHaveTextContent("Bienal de Arte Urbano")
    expect(window.location.search).toContain("sort=price")
    expect(screen.getByRole("button", { name: "Orden: Precio" })).toBeInTheDocument()
  })

  it("toggles the sort with the mobile 'Orden' button", async () => {
    const user = userEvent.setup()
    renderView()

    await user.click(screen.getByRole("button", { name: "Orden: Fecha" }))
    expect(window.location.search).toBe("?sort=price")

    await user.click(screen.getByRole("button", { name: "Orden: Precio" }))
    expect(window.location.search).toBe("")
    expect(screen.getByRole("button", { name: "Orden: Fecha" })).toBeInTheDocument()
  })

  it("ignores invalid params", () => {
    renderView("/events?category=foo&city=&month=2026-13&price=bar&sort=x")

    expect(getCount()).toHaveTextContent("10 eventos")
    expect(screen.getAllByRole("article")[0]).toHaveTextContent("Noche de Rock Sinfónico")
    expect(getRemoveChips()).toHaveLength(0)
  })

  it("filters by the text query from the URL", () => {
    renderView("/events?q=sinfonico")

    expect(getCount()).toHaveTextContent("1 evento")
    expect(screen.getByRole("button", { name: "Quitar filtro “sinfonico”" })).toBeInTheDocument()
    expect(screen.getByRole("searchbox", { name: "Qué quieres ver" })).toHaveValue("sinfonico")
  })

  describe("mobile filters panel", () => {
    it("applies filters live, closes with 'Ver N eventos' and returns focus to the trigger", async () => {
      const user = userEvent.setup()
      renderView()

      const trigger = screen.getByRole("button", { name: "Filtros" })
      await user.click(trigger)

      const dialog = within(await screen.findByRole("dialog", { name: "Filtros" }))
      expect(dialog.queryByRole("group", { name: "Categoría" })).not.toBeInTheDocument()
      expect(dialog.getByRole("group", { name: "Ciudad" })).toBeInTheDocument()

      await user.click(dialog.getByRole("checkbox", { name: "Arequipa (2 eventos)" }))
      await user.click(dialog.getByRole("button", { name: "Ver 2 eventos" }))

      await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument())
      const updatedTrigger = screen.getByRole("button", { name: "Filtros (1 activo)" })
      await waitFor(() => expect(updatedTrigger).toHaveFocus())
    })

    it("'Limpiar' keeps the selected categories", async () => {
      const user = userEvent.setup()
      renderView()
      const chips = within(screen.getByRole("group", { name: "Filtrar por categoría" }))

      await user.click(chips.getByRole("button", { name: "Teatro" }))
      await user.click(screen.getByRole("button", { name: "Filtros" }))

      const dialog = within(await screen.findByRole("dialog", { name: "Filtros" }))
      await user.click(dialog.getByRole("checkbox", { name: "Arequipa (2 eventos)" }))
      expect(window.location.search).toBe("?category=theater&city=Arequipa")

      await user.click(dialog.getByRole("button", { name: "Limpiar" }))

      expect(window.location.search).toBe("?category=theater")
    })
  })

  it("selects several categories with the mobile chips and resets them with 'Todos'", async () => {
    const user = userEvent.setup()
    renderView()
    const chips = within(screen.getByRole("group", { name: "Filtrar por categoría" }))

    await user.click(chips.getByRole("button", { name: "Teatro" }))
    await user.click(chips.getByRole("button", { name: "Comedia" }))

    expect(getCount()).toHaveTextContent("2 eventos")
    expect(chips.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "false")

    await user.click(chips.getByRole("button", { name: "Todos" }))

    expect(getCount()).toHaveTextContent("10 eventos")
    expect(chips.getByRole("button", { name: "Todos" })).toHaveAttribute("aria-pressed", "true")
  })
})
