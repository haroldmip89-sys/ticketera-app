import type { ComponentProps } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { act, cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { getCheckoutFieldId } from "@/modules/checkout/components/checkout-fields"
import { CheckoutView } from "@/modules/checkout/components/checkout-view"
import { ORDER_CODE_PATTERN } from "@/modules/checkout/utils/checkout-order"
import {
  buildPurchaseStepHref,
  type TicketSelection,
} from "@/modules/checkout/utils/ticket-selection"
import { eventsService } from "@/modules/events/services/events.service"
import { getEventSeatsHref, getEventTicketsHref } from "@/modules/events/utils/event-routes"
import { seatingService } from "@/modules/seating/services/seating.service"
import { parseCompleteSeatSelection } from "@/modules/seating/utils/seat-selection"

const replace = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}))

vi.mock("next/image", () => ({
  default: ({ src, alt }: ComponentProps<"img">) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={typeof src === "string" ? src : undefined} alt={alt} />
  ),
}))

beforeEach(() => {
  // setTimeout queda real: el asyncWrapper de RTL lo usa y con él falso userEvent nunca resuelve.
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "Date"] })
  replace.mockClear()
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

async function getEvent(eventId: string) {
  const event = (await eventsService.getAll()).find((item) => item.id === eventId)
  if (!event) throw new Error(`No existe el evento ${eventId}`)
  return { event, ticketTypes: await eventsService.getTicketTypes(eventId) }
}

async function renderZoneView() {
  const { event, ticketTypes } = await getEvent("evt-002")
  const selection: TicketSelection = { "evt-002-sur": 2 }
  const ticketsHref = buildPurchaseStepHref(getEventTicketsHref(event.slug), selection, ticketTypes)

  render(
    <CheckoutView
      event={event}
      ticketTypes={ticketTypes}
      selection={selection}
      seatSummary={null}
      backHref={ticketsHref}
      backLabel="Volver a Entradas"
      changeTicketsHref={ticketsHref}
    />
  )
  return {
    event,
    backHref: ticketsHref,
    user: userEvent.setup({ advanceTimers: vi.advanceTimersByTime }),
  }
}

function getPayButtons() {
  return screen.getAllByRole("button", { name: /^Pagar / })
}

// getByLabelText compara con el textContent del <label>, que incluye el "*" aria-hidden.
function getField(label: string) {
  return screen.getByRole("textbox", { name: label }) as HTMLInputElement
}

const REQUIRED_FIELD_LABELS = [
  "Nombre completo",
  "Correo electrónico",
  "Número de tarjeta",
  "Vencimiento",
  "CVC",
  "Nombre en la tarjeta",
]

function getRequiredMark(element: Element) {
  return element.querySelector('span[aria-hidden="true"]')
}

type User = ReturnType<typeof userEvent.setup>

async function fillBuyer(user: User) {
  await user.type(getField("Nombre completo"), "Ana Pérez")
  await user.type(getField("Correo electrónico"), "ana@example.com")
}

async function fillCard(user: User) {
  await user.type(getField("Número de tarjeta"), "4242 4242 4242 4242")
  await user.type(getField("Vencimiento"), "12/39")
  await user.type(getField("CVC"), "123")
  await user.type(getField("Nombre en la tarjeta"), "Ana Perez")
}

function getTermsCheckbox() {
  return screen.getByRole("checkbox", { name: /Acepto los Términos y condiciones/ })
}

function expectHint(hint: string) {
  for (const button of getPayButtons()) {
    expect(button.getAttribute("aria-disabled")).toBe("true")
    const hintId = button.getAttribute("aria-describedby")
    expect(hintId).toBeTruthy()
    expect(document.getElementById(hintId as string)?.textContent).toBe(hint)
  }
}

describe("CheckoutView", () => {
  it("muestra el resumen con cargo por servicio y los botones Pagar bloqueados", async () => {
    await renderZoneView()

    const summary = screen.getByRole("complementary", { name: "Resumen de la compra" })
    expect(within(summary).getByText("2 × Sur")).toBeDefined()
    expect(within(summary).getAllByText("$60")).toHaveLength(2)
    expect(within(summary).getByText("$7.50")).toBeDefined()
    expect(within(summary).getByText("$67.50")).toBeDefined()

    const buttons = getPayButtons()
    expect(buttons).toHaveLength(2)
    buttons.forEach((button) => expect(button.textContent).toBe("Pagar $67.50"))
    expectHint("Completa tus datos y acepta los términos para continuar.")
  })

  it("pulsar Pagar bloqueado no navega, muestra los errores y enfoca el primer campo inválido", async () => {
    const { user } = await renderZoneView()

    await user.click(getPayButtons()[0])

    expect(replace).not.toHaveBeenCalled()
    expect(screen.getByText("Ingresa tu nombre completo.")).toBeDefined()
    expect(screen.getByText("Ingresa tu correo electrónico.")).toBeDefined()
    expect(screen.getByText("Ingresa el número de tu tarjeta.")).toBeDefined()
    expect(screen.getByText("Ingresa el vencimiento.")).toBeDefined()
    expect(screen.getByText("Ingresa el CVC.")).toBeDefined()
    expect(screen.getByText("Ingresa el nombre que figura en la tarjeta.")).toBeDefined()
    expect(screen.getByText("Acepta los términos para continuar.")).toBeDefined()
    const name = getField("Nombre completo")
    expect(name.getAttribute("aria-invalid")).toBe("true")
    expect(document.activeElement).toBe(name)
  })

  it("marca los campos obligatorios con asterisco decorativo y aria-required", async () => {
    await renderZoneView()

    for (const label of REQUIRED_FIELD_LABELS) {
      const input = getField(label)
      expect(input.getAttribute("aria-required")).toBe("true")
      expect(input.hasAttribute("required")).toBe(false)
      const mark = getRequiredMark(document.querySelector(`label[for="${input.id}"]`) as Element)
      expect(mark?.textContent).toBe("*")
      expect(mark?.classList.contains("text-destructive")).toBe(true)
    }

    const phone = getField("Celular (opcional)")
    expect(phone.hasAttribute("aria-required")).toBe(false)
    expect(phone.hasAttribute("required")).toBe(false)
    expect(getRequiredMark(document.querySelector(`label[for="${phone.id}"]`) as Element)).toBeNull()

    const terms = getTermsCheckbox()
    expect(terms.getAttribute("aria-required")).toBe("true")
    expect(terms.hasAttribute("required")).toBe(false)
    const termsLabel = document.querySelector(`label[for="${getCheckoutFieldId("acceptTerms")}"]`)
    expect(getRequiredMark(termsLabel as Element)?.textContent).toBe("*")
    expect(document.querySelectorAll("input[required]")).toHaveLength(0)

    const note = screen.getByText((_, element) =>
      element?.tagName === "P" && element.textContent === "Los campos marcados con *asterisco son obligatorios."
    )
    expect(getRequiredMark(note)?.textContent).toBe("*")
    expect(note.querySelector(".sr-only")?.textContent).toBe("asterisco")
  })

  it("valida el email al salir del campo y no exige el celular", async () => {
    const { user } = await renderZoneView()

    const email = getField("Correo electrónico")
    await user.type(email, "ana@")
    await user.click(getField("Celular (opcional)"))
    await user.tab()

    const error = screen.getByText("Ingresa un correo válido, por ejemplo tu@email.com.")
    expect(email.getAttribute("aria-invalid")).toBe("true")
    expect(email.getAttribute("aria-describedby")).toContain(error.id)

    const phone = getField("Celular (opcional)")
    expect(phone.getAttribute("aria-invalid")).toBeNull()
  })

  it("con datos válidos y términos navega a la confirmación sin datos personales", async () => {
    const { event, user } = await renderZoneView()

    await fillBuyer(user)
    await fillCard(user)
    expectHint("Acepta los términos para continuar.")

    await user.click(getTermsCheckbox())
    getPayButtons().forEach((button) => {
      expect(button.getAttribute("aria-disabled")).toBeNull()
      expect(button.getAttribute("aria-describedby")).toBeNull()
    })

    await user.click(getPayButtons()[0])

    expect(replace).toHaveBeenCalledTimes(1)
    const href = replace.mock.calls[0][0] as string
    const url = new URL(href, "http://localhost")
    expect(url.pathname).toBe(`/events/${event.slug}/confirmation`)
    expect(url.searchParams.get("order")).toMatch(ORDER_CODE_PATTERN)
    expect(url.searchParams.get("tickets")).toBe("evt-002-sur:2")
    expect(url.searchParams.has("seats")).toBe(false)
    expect([...url.searchParams.keys()]).toEqual(["order", "tickets"])
    for (const value of ["Ana", "example.com", "4242"]) {
      expect(decodeURIComponent(href)).not.toContain(value)
    }
  })

  it("solo ofrece tarjeta y la exige para pagar", async () => {
    const { user } = await renderZoneView()

    expect(screen.queryByRole("radio")).toBeNull()
    expect(screen.queryByRole("radiogroup")).toBeNull()
    expect(screen.queryByText(/Apple Pay/)).toBeNull()
    expect(screen.queryByText(/Google Pay/)).toBeNull()

    await fillBuyer(user)
    await user.click(getTermsCheckbox())

    expectHint("Completa tus datos para continuar.")
  })

  it("cuenta el tiempo de reserva y al vencer reemplaza el formulario", async () => {
    const { backHref } = await renderZoneView()

    const timer = screen.getByRole("timer")
    expect(timer.textContent).toContain("10:00")

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByRole("timer").textContent).toContain("09:59")

    act(() => {
      vi.advanceTimersByTime(600_000)
    })
    const title = screen.getByRole("heading", { name: "Tu reserva venció" })
    expect(document.activeElement).toBe(title)
    expect(document.querySelector("form")).toBeNull()
    expect(screen.queryByRole("timer")).toBeNull()
    expect(
      screen.getByRole("link", { name: "Elegir entradas de nuevo" }).getAttribute("href")
    ).toBe(backHref)
  })

  it("en teatro muestra los asientos y los envía a la confirmación", async () => {
    const { event, ticketTypes } = await getEvent("evt-001")
    const seatMap = await seatingService.getSeatMap("evt-001")
    if (!seatMap) throw new Error("evt-001 sin mapa de asientos")
    const selection: TicketSelection = { "evt-001-platea": 2 }
    const sold = new Set(seatMap.soldSeatIds)
    const platea = seatMap.layout.zones.find((zone) => zone.ticketTypeId === "evt-001-platea")
    const freeSeats = (platea?.rows ?? [])
      .flatMap((row) => row.seats.map((seat) => ({ seat, row })))
      .filter(({ seat }) => !sold.has(seat.id))
      .slice(0, 2)
    const seatSummary = parseCompleteSeatSelection(
      freeSeats.map(({ seat }) => seat.id).join(","),
      seatMap,
      selection,
      ticketTypes
    )
    expect(seatSummary).not.toBeNull()
    const seatsHref = buildPurchaseStepHref(getEventSeatsHref(event.slug), selection, ticketTypes)

    render(
      <CheckoutView
        event={event}
        ticketTypes={ticketTypes}
        selection={selection}
        seatSummary={seatSummary}
        backHref={seatsHref}
        backLabel="Volver a Asientos"
        changeTicketsHref={buildPurchaseStepHref(
          getEventTicketsHref(event.slug),
          selection,
          ticketTypes
        )}
      />
    )
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    const summary = screen.getByRole("complementary", { name: "Resumen de la compra" })
    for (const { seat, row } of freeSeats) {
      expect(within(summary).getByText(`Fila ${row.label}, asiento ${seat.number}`)).toBeDefined()
    }

    await fillBuyer(user)
    await fillCard(user)
    await user.click(getTermsCheckbox())
    await user.click(getPayButtons()[0])

    expect(replace).toHaveBeenCalledTimes(1)
    const url = new URL(replace.mock.calls[0][0] as string, "http://localhost")
    expect(url.pathname).toBe(`/events/${event.slug}/confirmation`)
    expect(url.searchParams.get("seats")).toBe(freeSeats.map(({ seat }) => seat.id).join(","))
  })
})
