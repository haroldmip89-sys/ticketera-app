import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render } from "@testing-library/react"

import {
  DECORATIVE_QR_SIZE,
  DecorativeQr,
  getDecorativeQrCells,
} from "@/components/shared/decorative-qr"

afterEach(cleanup)

function cellAt(cells: boolean[], row: number, column: number): boolean {
  return cells[row * DECORATIVE_QR_SIZE + column]
}

describe("getDecorativeQrCells", () => {
  const cells = getDecorativeQrCells(2481701)

  it("returns 21 × 21 cells", () => {
    expect(cells).toHaveLength(441)
  })

  it("is deterministic per seed and differs between seeds", () => {
    expect(getDecorativeQrCells(2481701)).toEqual(cells)
    expect(getDecorativeQrCells(2481702)).not.toEqual(cells)
  })

  it("draws the top-left position mark and its separator", () => {
    for (const [row, column] of [[0, 0], [0, 6], [6, 0], [2, 2], [4, 4]]) {
      expect(cellAt(cells, row, column)).toBe(true)
    }
    for (const [row, column] of [[1, 1], [1, 5]]) {
      expect(cellAt(cells, row, column)).toBe(false)
    }
    for (let index = 0; index <= 7; index++) {
      expect(cellAt(cells, 7, index)).toBe(false)
      expect(cellAt(cells, index, 7)).toBe(false)
    }
  })

  it("draws the top-right and bottom-left position marks with their separators", () => {
    expect(cellAt(cells, 0, 14)).toBe(true)
    expect(cellAt(cells, 0, 13)).toBe(false)
    expect(cellAt(cells, 7, 20)).toBe(false)

    expect(cellAt(cells, 14, 0)).toBe(true)
    expect(cellAt(cells, 13, 0)).toBe(false)
    expect(cellAt(cells, 20, 7)).toBe(false)
  })
})

describe("DecorativeQr", () => {
  it("renders a hidden svg with one rect per dark module plus the background", () => {
    const seed = 2481701
    const { container } = render(<DecorativeQr seed={seed} className="size-32" />)

    const svg = container.querySelector("svg")
    expect(svg).toHaveAttribute("aria-hidden", "true")
    expect(svg).toHaveAttribute("viewBox", "0 0 21 21")
    expect(svg).toHaveClass("size-32")

    const darkCount = getDecorativeQrCells(seed).filter(Boolean).length
    expect(container.querySelectorAll("rect")).toHaveLength(darkCount + 1)
  })
})
