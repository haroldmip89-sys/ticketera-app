import type { jsPDF } from "jspdf"

import { DECORATIVE_QR_SIZE } from "@/components/shared/decorative-qr"
import type { TicketPdfPage } from "@/modules/checkout/utils/ticket-pdf"

/** Subconjunto de jsPDF que usa el renderer (los fakes de test lo implementan). */
export type TicketPdfDocument = Pick<
  jsPDF,
  | "addPage"
  | "setFont"
  | "setFontSize"
  | "setTextColor"
  | "setFillColor"
  | "setDrawColor"
  | "setLineWidth"
  | "rect"
  | "line"
  | "text"
  | "splitTextToSize"
  | "output"
>
export type CreateTicketPdfDocument = () => TicketPdfDocument

type Rgb = readonly [number, number, number]

// Los tokens CSS no existen en un PDF: misma excepción que el QR de pantalla (fill-white / fill-zinc-900).
const QR_BACKGROUND_COLOR: Rgb = [255, 255, 255]
const QR_MODULE_COLOR: Rgb = [24, 24, 27]
const TEXT_PRIMARY_COLOR: Rgb = [24, 24, 27]
const TEXT_SECONDARY_COLOR: Rgb = [113, 113, 122]
const DIVIDER_COLOR: Rgb = [228, 228, 231]

const FONT = "helvetica"
const PT_TO_MM = 25.4 / 72
const LINE_HEIGHT_FACTOR = 1.2

// A4 vertical, en mm.
const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 20
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const QR_SIDE = 70
const QR_MODULE = QR_SIDE / DECORATIVE_QR_SIZE

const DEMO_NOTE = "Entrada de demostración: el código QR es decorativo y no da acceso al evento."

function lineHeight(fontSize: number): number {
  return fontSize * PT_TO_MM * LINE_HEIGHT_FACTOR
}

function setTextStyle(doc: TicketPdfDocument, fontSize: number, style: "normal" | "bold", color: Rgb) {
  doc.setFont(FONT, style)
  doc.setFontSize(fontSize)
  doc.setTextColor(...color)
}

/** Escribe `text` ajustado a `width` desde la línea base `y` y devuelve la línea base siguiente. */
function writeWrapped(doc: TicketPdfDocument, text: string, y: number, fontSize: number, width = CONTENT_WIDTH) {
  const lines: string[] = doc.splitTextToSize(text, width)
  doc.text(lines, MARGIN, y)
  return y + lines.length * lineHeight(fontSize)
}

function drawQr(doc: TicketPdfDocument, cells: readonly boolean[], x0: number, y0: number) {
  doc.setFillColor(...QR_BACKGROUND_COLOR)
  doc.rect(x0, y0, QR_SIDE, QR_SIDE, "F")

  doc.setFillColor(...QR_MODULE_COLOR)
  cells.forEach((isDark, index) => {
    if (!isDark) return
    const column = index % DECORATIVE_QR_SIZE
    const row = Math.floor(index / DECORATIVE_QR_SIZE)
    doc.rect(x0 + column * QR_MODULE, y0 + row * QR_MODULE, QR_MODULE, QR_MODULE, "F")
  })
}

function drawPage(doc: TicketPdfDocument, page: TicketPdfPage) {
  // 1. Cabecera
  let y = MARGIN + 5
  setTextStyle(doc, 14, "bold", TEXT_PRIMARY_COLOR)
  doc.text("Ticketera", MARGIN, y)
  setTextStyle(doc, 11, "normal", TEXT_SECONDARY_COLOR)
  doc.text(page.positionLabel, PAGE_WIDTH - MARGIN, y, { align: "right" })

  y += 5
  doc.setDrawColor(...DIVIDER_COLOR)
  doc.setLineWidth(0.3)
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y)

  // 2. Título
  y += 15
  setTextStyle(doc, 24, "bold", TEXT_PRIMARY_COLOR)
  y = writeWrapped(doc, page.eventTitle, y, 24)

  // 3. Fecha y apertura
  y += 2
  setTextStyle(doc, 12, "normal", TEXT_PRIMARY_COLOR)
  doc.text(page.dateLabel, MARGIN, y)
  y += lineHeight(12)
  setTextStyle(doc, 12, "normal", TEXT_SECONDARY_COLOR)
  doc.text(page.doorsLabel, MARGIN, y)

  // 4. Lugar
  y += 12
  setTextStyle(doc, 9, "normal", TEXT_SECONDARY_COLOR)
  doc.text("Lugar", MARGIN, y)
  y += lineHeight(12)
  setTextStyle(doc, 12, "normal", TEXT_PRIMARY_COLOR)
  y = writeWrapped(doc, page.venueLabel, y, 12)

  // 5. Zona · Asiento · Precio
  y += 6
  const details: [string, string][] = [["Zona", page.zoneLabel]]
  if (page.seatLabel !== null) details.push(["Asiento", page.seatLabel])
  details.push(["Precio", page.priceLabel])
  const columnWidth = CONTENT_WIDTH / details.length
  details.forEach(([label, value], index) => {
    const x = MARGIN + index * columnWidth
    setTextStyle(doc, 9, "normal", TEXT_SECONDARY_COLOR)
    doc.text(label, x, y)
    setTextStyle(doc, 12, "bold", TEXT_PRIMARY_COLOR)
    doc.text(value, x, y + lineHeight(12))
  })

  // 6. QR
  const qrY = y + lineHeight(12) + 12
  drawQr(doc, page.qrCells, (PAGE_WIDTH - QR_SIDE) / 2, qrY)

  // 7. Pedido
  setTextStyle(doc, 12, "bold", TEXT_PRIMARY_COLOR)
  doc.text(page.orderLabel, PAGE_WIDTH / 2, qrY + QR_SIDE + 10, { align: "center" })

  // 8. Pie
  setTextStyle(doc, 9, "normal", TEXT_SECONDARY_COLOR)
  const noteLines: string[] = doc.splitTextToSize(DEMO_NOTE, CONTENT_WIDTH)
  doc.text(noteLines, PAGE_WIDTH / 2, PAGE_HEIGHT - MARGIN, { align: "center" })
}

/** Dibuja una página por elemento: usa la página inicial para la primera y addPage() para cada una de las
 *  siguientes. Devuelve doc.output("blob"). Lanza RangeError si pages está vacío. */
export function renderTicketPdf(pages: readonly TicketPdfPage[], createDocument: CreateTicketPdfDocument): Blob {
  if (pages.length === 0) throw new RangeError("renderTicketPdf needs at least one page")

  const doc = createDocument()
  pages.forEach((page, index) => {
    if (index > 0) doc.addPage()
    drawPage(doc, page)
  })
  return doc.output("blob")
}

/** Carga jspdf bajo demanda (fuera del bundle inicial) y genera el PDF en A4 vertical. */
export async function generateTicketPdf(pages: readonly TicketPdfPage[]): Promise<Blob> {
  const { jsPDF } = await import("jspdf")
  return renderTicketPdf(pages, () => new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" }))
}
