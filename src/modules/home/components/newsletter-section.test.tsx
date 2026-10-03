import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"

import { NewsletterSection } from "@/modules/home/components/newsletter-section"

const CONFIRMATION = "¡Listo! Te avisaremos de los próximos eventos."

afterEach(() => {
  cleanup()
})

describe("NewsletterSection", () => {
  it("shows the confirmation status after submitting a valid email", async () => {
    const user = userEvent.setup()
    render(<NewsletterSection />)

    await user.type(screen.getByLabelText("Correo electrónico"), "ana@correo.com")
    await user.click(screen.getByRole("button", { name: "Suscribirme" }))

    expect(screen.getByRole("status")).toHaveTextContent(CONFIRMATION)
  })

  it("does not show the confirmation when the email field is empty", async () => {
    const user = userEvent.setup()
    render(<NewsletterSection />)

    await user.click(screen.getByRole("button", { name: "Suscribirme" }))

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(screen.queryByText(CONFIRMATION)).not.toBeInTheDocument()
  })
})
