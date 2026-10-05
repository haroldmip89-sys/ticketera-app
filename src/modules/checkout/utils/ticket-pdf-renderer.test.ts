import { describe, expect, it, vi } from "vitest"

import { DECORATIVE_QR_SIZE, getDecorativeQrCells } from "@/components/shared/decorative-qr"
import type { TicketPdfPage } from "@/modules/checkout/utils/ticket-pdf"
import {
  generateTicketPdf,
  renderTicketPdf,
  type TicketPdfDocument,
} from "@/modules/checkout/utils/ticket-pdf-renderer"

const jspdfMock = vi.hoisted(() => {
  const blob = new Blob(["%PDF"], { type: "application/pdf" })
  const constructorArgs: unknown[] = []
  return { blob, constructorArgs }
})

vi.mock("jspdf", () => {
  class FakeJsPdf {
    constructor(options: unknown) {
      jspdfMock.constructorArgs.push(options)
    }
    addPage() {}
    setFont() {}
    setFontSize() {}
    setTextColor() {}
    setFillColor() {}
    setDrawColor() {}
    setLineWidth() {}
    rect() {}
    line() {}
    text() {}
    splitTextToSize(text: string) {
      return [text]
    }
    output() {
      return jspdfMock.blob
    }
  }
  return { jsPDF: FakeJsPdf, default: FakeJsPdf }
})

type Call = { method: string; args: unknown[] }

/** Documento falso: registra cada llamada; splitTextToSize devuelve [text]. */
function createFakeDocument() {
  const calls: Call[] = []
  const blob = new Blob(["fake"], { type: "application/pdf" })
  const record =
    (method: string) =>
    (...args: unknown[]) => {
      calls.push({ method, args })
    }
  const doc = {
    addPage: record("addPage"),
    setFont: record("setFont"),
    setFontSize: record("setFontSize"),
    setTextColor: record("setTextColor"),
    setFillColor: record("setFillColor"),
    setDrawColor: record("setDrawColor"),
    setLineWidth: record("setLineWidth"),
    rect: record("rect"),
    line: record("line"),
    text: record("text"),
    splitTextToSize: (text: string) => {
      calls.push({ method: "splitTextToSize", args: [text] })
      return [text]
    },
    output: (...args: unknown[]) => {
      calls.push({ method: "output", args })
      return blob
    },
  } as unknown as TicketPdfDocument
  return { doc, calls, blob }
}

/** Divide las llamadas por página (addPage separa). */
function splitByPage(calls: readonly Call[]): Call[][] {
  const pages: Call[][] = [[]]
  for (const call of calls) {
    if (call.method === "addPage") pages.push([])
    else if (call.method !== "output") pages[pages.length - 1].push(call)
  }
  return pages
}

function getTexts(calls: readonly Call[]): string[] {
  return calls
    .filter((call) => call.method === "text")
    .flatMap((call) => {
      const value = call.args[0]
      return Array.isArray(value) ? (value as string[]) : [value as string]
    })
}

function getFilledRects(calls: readonly Call[]) {
  return calls
    .filter((call) => call.method === "rect" && call.args[4] === "F")
    .map((call) => {
      const [x, y, w, h] = call.args as number[]
      return { x, y, w, h }
    })
}

function makePage(overrides: Partial<TicketPdfPage> & { qrSeed: number }): TicketPdfPage {
  const { qrSeed, ...rest } = overrides
  return {
    eventTitle: "Clásico del Fútbol: Final de Temporada",
    dateLabel: "domingo 4 de octubre de 2026 · 4:00 p. m.",
    doorsLabel: "Apertura de puertas: 1:30 p. m.",
    venueLabel: "Estadio Nacional, Av. del Deporte 1200, Lima",
    zoneLabel: "Sur",
    seatLabel: null,
    priceLabel: "$30",
    qrCells: getDecorativeQrCells(qrSeed),
    positionLabel: "Entrada 1 de 3",
    orderLabel: "Pedido N.º TK-24817",
    ...rest,
  }
}

const PAGES: TicketPdfPage[] = [
  makePage({ qrSeed: 2481701, positionLabel: "Entrada 1 de 3" }),
  makePage({ qrSeed: 2481702, positionLabel: "Entrada 2 de 3" }),
  makePage({ qrSeed: 2481703, positionLabel: "Entrada 3 de 3", zoneLabel: "Oriente", priceLabel: "$70" }),
]

describe("renderTicketPdf", () => {
  it("draws one page per element and returns the blob output", () => {
    const { doc, calls, blob } = createFakeDocument()

    const result = renderTicketPdf(PAGES, () => doc)

    expect(calls.filter((call) => call.method === "addPage")).toHaveLength(2)
    const outputs = calls.filter((call) => call.method === "output")
    expect(outputs).toHaveLength(1)
    expect(outputs[0].args).toEqual(["blob"])
    expect(result).toBe(blob)
  })

  it("writes every label on each page and omits the seat in zone events", () => {
    const { doc, calls } = createFakeDocument()

    renderTicketPdf(PAGES, () => doc)

    const pages = splitByPage(calls)
    expect(pages).toHaveLength(3)
    pages.forEach((pageCalls, index) => {
      const page = PAGES[index]
      const texts = getTexts(pageCalls)
      for (const label of [
        "Ticketera",
        page.eventTitle,
        page.dateLabel,
        page.doorsLabel,
        "Lugar",
        page.venueLabel,
        "Zona",
        page.zoneLabel,
        "Precio",
        page.priceLabel,
        page.positionLabel,
        page.orderLabel,
      ]) {
        expect(texts).toContain(label)
      }
      expect(texts).not.toContain("Asiento")
      expect(texts.some((text) => text.includes("decorativo"))).toBe(true)
    })
  })

  it("writes the seat only when the page has one", () => {
    const { doc, calls } = createFakeDocument()
    const theaterPage = makePage({ qrSeed: 1000101, zoneLabel: "Platea", seatLabel: "Fila B, asiento 2" })

    renderTicketPdf([theaterPage], () => doc)

    const texts = getTexts(calls)
    expect(texts).toContain("Asiento")
    expect(texts).toContain("Fila B, asiento 2")
  })

  it("draws the QR grid with one filled module per dark cell", () => {
    const { doc, calls } = createFakeDocument()

    renderTicketPdf(PAGES, () => doc)

    splitByPage(calls).forEach((pageCalls, index) => {
      const cells = PAGES[index].qrCells
      const rects = getFilledRects(pageCalls)
      const background = rects.find((rect) => rect.w === rect.h && rect.w >= 50)
      if (!background) throw new Error("missing QR background")

      const moduleSize = background.w / DECORATIVE_QR_SIZE
      const modules = rects.filter((rect) => rect.w === moduleSize && rect.h === moduleSize)
      expect(modules).toHaveLength(cells.filter(Boolean).length)

      // (columna 20, fila 0): borde de la marca superior derecha; (3, 17): centro de la inferior izquierda.
      for (const [column, row] of [
        [20, 0],
        [3, 17],
      ]) {
        expect(cells[row * DECORATIVE_QR_SIZE + column]).toBe(true)
        expect(modules).toContainEqual({
          x: background.x + column * moduleSize,
          y: background.y + row * moduleSize,
          w: moduleSize,
          h: moduleSize,
        })
      }
    })
  })

  it("paints the QR background white before the modules", () => {
    const { doc, calls } = createFakeDocument()

    renderTicketPdf([PAGES[0]], () => doc)

    const fills = calls.filter((call) => call.method === "setFillColor").map((call) => call.args)
    expect(fills).toEqual([
      [255, 255, 255],
      [24, 24, 27],
    ])
  })

  it("throws a RangeError without pages", () => {
    const { doc } = createFakeDocument()
    expect(() => renderTicketPdf([], () => doc)).toThrow(RangeError)
  })
})

describe("generateTicketPdf", () => {
  it("builds an A4 portrait jsPDF document and returns its blob", async () => {
    const result = await generateTicketPdf(PAGES)

    expect(jspdfMock.constructorArgs).toEqual([{ unit: "mm", format: "a4", orientation: "portrait" }])
    expect(result).toBe(jspdfMock.blob)
  })
})
