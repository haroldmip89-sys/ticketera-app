import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { EventActions } from "@/modules/events/components/event-actions"

const TITLE = "Noche de Rock Sinfónico"

// user-event's setup() installs its own clipboard stub, so overrides go after it.
function setNavigatorProperty(name: "share" | "clipboard", value: unknown) {
  Object.defineProperty(navigator, name, { value, configurable: true, writable: true })
}

function renderActions() {
  const user = userEvent.setup()
  render(<EventActions title={TITLE} tone="default" />)
  return user
}

afterEach(() => {
  cleanup()
  setNavigatorProperty("share", undefined)
  setNavigatorProperty("clipboard", undefined)
})

describe("EventActions", () => {
  it("toggles aria-pressed on 'Guardar evento'", async () => {
    const user = renderActions()
    const saveButton = screen.getByRole("button", { name: "Guardar evento" })

    expect(saveButton).toHaveAttribute("aria-pressed", "false")
    await user.click(saveButton)
    expect(saveButton).toHaveAttribute("aria-pressed", "true")
    await user.click(saveButton)
    expect(saveButton).toHaveAttribute("aria-pressed", "false")
  })

  it("uses the Web Share API with the title and current URL when available", async () => {
    const user = renderActions()
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)
    setNavigatorProperty("share", share)
    setNavigatorProperty("clipboard", { writeText })

    await user.click(screen.getByRole("button", { name: "Compartir evento" }))

    expect(share).toHaveBeenCalledWith({ title: TITLE, url: window.location.href })
    expect(writeText).not.toHaveBeenCalled()
  })

  it("copies the URL and shows 'Enlace copiado' when Web Share is unavailable", async () => {
    const user = renderActions()
    const writeText = vi.fn().mockResolvedValue(undefined)
    setNavigatorProperty("share", undefined)
    setNavigatorProperty("clipboard", { writeText })

    await user.click(screen.getByRole("button", { name: "Compartir evento" }))

    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(await screen.findByRole("status")).toHaveTextContent("Enlace copiado")
  })

  it("shows an error message when neither share nor clipboard is available", async () => {
    const user = renderActions()
    setNavigatorProperty("share", undefined)
    setNavigatorProperty("clipboard", undefined)

    await user.click(screen.getByRole("button", { name: "Compartir evento" }))

    expect(await screen.findByRole("status")).toHaveTextContent("No se pudo compartir el enlace")
  })
})
