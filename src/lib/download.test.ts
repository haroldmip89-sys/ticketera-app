import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { downloadBlob } from "@/lib/download"

const OBJECT_URL = "blob:http://localhost/abc-123"

describe("downloadBlob", () => {
  const createObjectURL = vi.fn(() => OBJECT_URL)
  const revokeObjectURL = vi.fn()
  let clicked: HTMLAnchorElement[]

  beforeEach(() => {
    vi.useFakeTimers()
    clicked = []
    createObjectURL.mockClear()
    revokeObjectURL.mockClear()
    // jsdom no implementa createObjectURL / revokeObjectURL.
    Object.assign(URL, { createObjectURL, revokeObjectURL })
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
      this: HTMLAnchorElement
    ) {
      clicked.push(this)
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    Reflect.deleteProperty(URL, "createObjectURL")
    Reflect.deleteProperty(URL, "revokeObjectURL")
  })

  it("creates the object URL from the given blob", () => {
    const blob = new Blob(["hola"], { type: "text/plain" })
    downloadBlob(blob, "file.txt")
    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(createObjectURL).toHaveBeenCalledWith(blob)
  })

  it("clicks an anchor with the object URL and the filename", () => {
    downloadBlob(new Blob(["x"]), "ticketera-TK-24817.ics")
    expect(clicked).toHaveLength(1)
    expect(clicked[0].href).toBe(OBJECT_URL)
    expect(clicked[0].download).toBe("ticketera-TK-24817.ics")
  })

  it("removes the anchor from the body after clicking", () => {
    downloadBlob(new Blob(["x"]), "file.txt")
    expect(clicked[0].isConnected).toBe(false)
    expect(document.body.querySelector("a")).toBeNull()
  })

  it("revokes the same URL only after the timers run", () => {
    downloadBlob(new Blob(["x"]), "file.txt")
    expect(revokeObjectURL).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeObjectURL).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith(OBJECT_URL)
  })
})
