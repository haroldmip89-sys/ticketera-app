import type { ComponentProps } from "react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { FeaturedEventsCarousel } from "@/modules/events/components/featured-events-carousel"
import { eventsService } from "@/modules/events/services/events.service"
import type { EventItem } from "@/modules/events/types/event.types"

// jsdom no define AnimationEvent y React DOM, al cargarse, escucharía `webkitAnimationEnd`
// en vez de `animationend`. Se define antes de importar React DOM.
vi.hoisted(() => {
  if (!("AnimationEvent" in window)) {
    Object.defineProperty(window, "AnimationEvent", { value: Event, configurable: true })
  }
})

vi.mock("next/image", () => ({
  default: ({ src, alt }: ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt} />
  ),
}))

let events: EventItem[]

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      matches,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  )
}

beforeAll(async () => {
  events = await eventsService.getFeatured()
})

beforeEach(() => {
  mockReducedMotion(false)
  vi.stubGlobal("IntersectionObserver", undefined)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function renderCarousel() {
  render(<FeaturedEventsCarousel events={events} />)
  return { section: screen.getByRole("region", { name: "Eventos destacados" }) }
}

function getTitle() {
  return screen.getByRole("heading", { level: 2 })
}

function getPanel() {
  const panel = getTitle().closest("[aria-live]")
  if (!panel) throw new Error("No se encontró el panel con aria-live")
  return panel
}

function getActiveProgressBar() {
  const bar = screen
    .getAllByRole("button", { name: /^Ver / })
    .find((button) => button.getAttribute("aria-current") === "true")
    ?.querySelector("span > span")
  if (!bar) throw new Error("No se encontró la barra de progreso activa")
  return bar
}

describe("FeaturedEventsCarousel", () => {
  it("renders the first featured event with autoplay announcements off", () => {
    renderCarousel()

    expect(getTitle()).toHaveTextContent("Noche de Rock Sinfónico")
    expect(screen.getByText("Destacado 1 de 5")).toHaveClass("sr-only")
    expect(screen.getByRole("button", { name: "Ver Noche de Rock Sinfónico" })).toHaveAttribute(
      "aria-current",
      "true"
    )
    expect(getPanel()).toHaveAttribute("aria-live", "off")
  })

  it("navigates with the next and previous controls, wrapping around", async () => {
    const user = userEvent.setup()
    renderCarousel()

    await user.click(screen.getByRole("button", { name: "Evento siguiente" }))
    expect(getTitle()).toHaveTextContent("Clásico del Fútbol: Final de Temporada")

    await user.click(screen.getByRole("button", { name: "Evento anterior" }))
    await user.click(screen.getByRole("button", { name: "Evento anterior" }))
    expect(getTitle()).toHaveTextContent("Pop en Vivo: Gira 2026")
  })

  it("shows the selected thumbnail's event and marks it as current", async () => {
    const user = userEvent.setup()
    renderCarousel()
    const thumbnail = screen.getByRole("button", { name: "Ver La Casa de Bernarda Alba" })

    await user.click(thumbnail)

    expect(getTitle()).toHaveTextContent("La Casa de Bernarda Alba")
    expect(thumbnail).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("button", { name: "Ver Noche de Rock Sinfónico" })).not.toHaveAttribute(
      "aria-current"
    )
  })

  it("advances when the active progress bar ends, but not while hovered", () => {
    const { section } = renderCarousel()

    fireEvent.animationEnd(getActiveProgressBar())
    expect(getTitle()).toHaveTextContent("Clásico del Fútbol: Final de Temporada")

    fireEvent.mouseEnter(section)
    fireEvent.animationEnd(getActiveProgressBar())
    expect(getTitle()).toHaveTextContent("Clásico del Fútbol: Final de Temporada")
  })

  it("pauses on 'Pausar carrusel' and switches the panel to polite announcements", async () => {
    const user = userEvent.setup()
    renderCarousel()

    await user.click(screen.getByRole("button", { name: "Pausar carrusel" }))

    expect(screen.getByRole("button", { name: "Reproducir carrusel" })).toBeInTheDocument()
    expect(getPanel()).toHaveAttribute("aria-live", "polite")
  })

  it("starts paused when the user prefers reduced motion", () => {
    mockReducedMotion(true)
    renderCarousel()

    expect(screen.getByRole("button", { name: "Reproducir carrusel" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Pausar carrusel" })).not.toBeInTheDocument()
  })

  it("advances with ArrowRight while focus is on a carousel control", async () => {
    const user = userEvent.setup()
    renderCarousel()

    screen.getByRole("button", { name: "Evento siguiente" }).focus()
    await user.keyboard("{ArrowRight}")

    expect(getTitle()).toHaveTextContent("Clásico del Fútbol: Final de Temporada")
  })
})
