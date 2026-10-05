import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { downloadBlob } from "@/lib/download"
import { ConfirmationActions } from "@/modules/checkout/components/confirmation-actions"
import {
  buildConfirmationTickets,
  parseConfirmationState,
} from "@/modules/checkout/utils/order-confirmation"
import { generateTicketPdf } from "@/modules/checkout/utils/ticket-pdf-renderer"
import { eventsService } from "@/modules/events/services/events.service"

const jspdfState = vi.hoisted(() => ({ imported: false }))

vi.mock("jspdf", () => {
  jspdfState.imported = true
  return { jsPDF: class {} }
})

vi.mock("@/lib/download", () => ({ downloadBlob: vi.fn() }))

vi.mock("@/modules/checkout/utils/ticket-pdf-renderer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/modules/checkout/utils/ticket-pdf-renderer")>()),
  generateTicketPdf: vi.fn(),
}))

const downloadBlobMock = vi.mocked(downloadBlob)
const generateTicketPdfMock = vi.mocked(generateTicketPdf)

beforeEach(() => {
  downloadBlobMock.mockReset()
  generateTicketPdfMock.mockReset()
})

afterEach(cleanup)

async function renderActions() {
  const event = (await eventsService.getAll()).find((item) => item.id === "evt-002")
  if (!event) throw new Error("No existe evt-002")
  const ticketTypes = await eventsService.getTicketTypes(event.id)
  const state = parseConfirmationState(
    { order: "TK-24817", tickets: "evt-002-sur:2,evt-002-oriente:1" },
    { ticketTypes, seatMap: null }
  )
  if (!state) throw new Error("Estado de confirmación inválido")

  render(
    <ConfirmationActions
      event={event}
      orderCode={state.orderCode}
      tickets={buildConfirmationTickets(state, ticketTypes)}
    />
  )
  return { status: screen.getByRole("status") }
}

function getPdfButton() {
  return screen.getByRole("button", { name: /descargar pdf/i })
}

describe("ConfirmationActions", () => {
  it("no importa jspdf al renderizar y empieza con la región de estado vacía", async () => {
    const { status } = await renderActions()

    expect(status.textContent).toBe("")
    expect(jspdfState.imported).toBe(false)
  })

  it("Agregar al calendario descarga el .ics del pedido", async () => {
    const user = userEvent.setup()
    const { status } = await renderActions()

    await user.click(screen.getByRole("button", { name: /agregar al calendario/i }))

    expect(downloadBlobMock).toHaveBeenCalledTimes(1)
    const [blob, filename] = downloadBlobMock.mock.calls[0]
    expect(filename).toBe("ticketera-TK-24817.ics")
    expect(blob.type).toBe("text/calendar;charset=utf-8")
    const text = await blob.text()
    expect(text.startsWith("BEGIN:VCALENDAR")).toBe(true)
    expect(text).toContain("UID:TK-24817-evt-002@ticketera")
    expect(status.textContent).toBe("Descargamos el evento para tu calendario.")
  })

  it("informa el error si no se puede crear el .ics", async () => {
    const user = userEvent.setup()
    downloadBlobMock.mockImplementation(() => {
      throw new Error("fallo")
    })
    const { status } = await renderActions()

    await user.click(screen.getByRole("button", { name: /agregar al calendario/i }))

    expect(status.textContent).toBe(
      "No pudimos crear el archivo del calendario. Inténtalo de nuevo."
    )
  })

  it("Descargar PDF muestra la carga, ignora el doble clic y descarga el PDF", async () => {
    const user = userEvent.setup()
    const pdf = new Blob(["%PDF"], { type: "application/pdf" })
    let resolvePdf: (blob: Blob) => void = () => {}
    generateTicketPdfMock.mockReturnValue(
      new Promise<Blob>((resolve) => {
        resolvePdf = resolve
      })
    )
    const { status } = await renderActions()

    await user.click(getPdfButton())

    expect(status.textContent).toBe("Preparando tu PDF…")
    expect(getPdfButton().getAttribute("aria-busy")).toBe("true")
    expect(getPdfButton().getAttribute("aria-disabled")).toBe("true")

    await user.click(getPdfButton())
    expect(generateTicketPdfMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock).not.toHaveBeenCalled()

    resolvePdf(pdf)

    await vi.waitFor(() => expect(status.textContent).toBe("Descargamos tu PDF."))
    expect(generateTicketPdfMock.mock.calls[0][0]).toHaveLength(3)
    expect(downloadBlobMock).toHaveBeenCalledTimes(1)
    expect(downloadBlobMock).toHaveBeenCalledWith(pdf, "ticketera-TK-24817.pdf")
    expect(getPdfButton().hasAttribute("aria-busy")).toBe(false)
    expect(getPdfButton().getAttribute("aria-disabled")).not.toBe("true")
  })

  it("informa el error si falla la generación del PDF y rehabilita el botón", async () => {
    const user = userEvent.setup()
    generateTicketPdfMock.mockRejectedValue(new Error("no se pudo cargar jspdf"))
    const { status } = await renderActions()

    await user.click(getPdfButton())

    await vi.waitFor(() =>
      expect(status.textContent).toBe("No pudimos generar tu PDF. Inténtalo de nuevo.")
    )
    expect(downloadBlobMock).not.toHaveBeenCalled()
    expect(getPdfButton().hasAttribute("aria-busy")).toBe(false)
    expect(getPdfButton().getAttribute("aria-disabled")).not.toBe("true")

    await user.click(getPdfButton())
    expect(generateTicketPdfMock).toHaveBeenCalledTimes(2)
  })

  it("Ver mis entradas mantiene su mensaje mock", async () => {
    const user = userEvent.setup()
    const { status } = await renderActions()

    await user.click(screen.getByRole("button", { name: "Ver mis entradas" }))

    expect(status.textContent).toBe(
      "Mis entradas estará disponible pronto. Por ahora, tus entradas están en esta página."
    )
  })
})
