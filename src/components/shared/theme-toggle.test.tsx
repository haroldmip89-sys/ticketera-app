import { afterEach, beforeAll, describe, expect, it } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { ThemeProvider } from "@/components/shared/theme-provider"
import { ThemeToggle } from "@/components/shared/theme-toggle"

beforeAll(() => {
  // jsdom doesn't implement matchMedia; next-themes relies on it to detect
  // the system color scheme preference.
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
})

afterEach(() => {
  cleanup()
})

function renderWithTheme() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  )
}

describe("ThemeToggle", () => {
  it("toggles the dark class on the html element when clicked", async () => {
    const user = userEvent.setup()
    renderWithTheme()

    const button = await screen.findByRole("button", { name: /cambiar a modo/i })
    const wasDark = document.documentElement.classList.contains("dark")

    await user.click(button)

    await waitFor(() => {
      expect(document.documentElement.classList.contains("dark")).toBe(!wasDark)
    })
  })

  it("updates the aria-label to describe the opposite theme after toggling", async () => {
    const user = userEvent.setup()
    renderWithTheme()

    const button = await screen.findByRole("button", { name: /cambiar a modo/i })
    const initialLabel = button.getAttribute("aria-label")

    await user.click(button)

    await waitFor(() => {
      expect(button.getAttribute("aria-label")).not.toBe(initialLabel)
    })
  })
})
