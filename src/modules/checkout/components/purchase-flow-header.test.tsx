import { afterEach, describe, expect, it } from "vitest"
import { cleanup, render, screen } from "@testing-library/react"

import { PurchaseFlowHeader } from "@/modules/checkout/components/purchase-flow-header"

afterEach(cleanup)

// Los conectores del stepper son `span[aria-hidden]` dentro de cada paso; los completados
// llevan `data-completed="true"` (y la clase `bg-primary`), los pendientes no tienen el atributo.
function getConnectors(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>('ol[aria-label="Pasos de la compra"] > li > span[aria-hidden="true"]')
  )
}

describe("PurchaseFlowHeader", () => {
  it("paso 2 con volver: paso actual, link de volver, primer conector completado y Compra segura", () => {
    const { container } = render(
      <PurchaseFlowHeader
        currentStep={2}
        backHref="/events/demo/tickets"
        backLabel="Volver a Entradas"
        mobileTitle="Datos y pago"
      />
    )

    const current = screen.getByText("Datos y pago", { selector: "li span span" }).closest("li")
    expect(current).toHaveAttribute("aria-current", "step")
    expect(screen.getByRole("link", { name: "Volver a Entradas" })).toHaveAttribute(
      "href",
      "/events/demo/tickets"
    )

    const connectors = getConnectors(container)
    expect(connectors).toHaveLength(2)
    expect(connectors[0]).toHaveAttribute("data-completed", "true")
    expect(connectors[0]).toHaveClass("bg-primary")
    expect(connectors[1]).not.toHaveAttribute("data-completed")
    expect(connectors[1]).toHaveClass("bg-input")

    expect(screen.getAllByText("Compra segura").length).toBeGreaterThan(0)
  })

  it("paso 1: ningún conector completado", () => {
    const { container } = render(
      <PurchaseFlowHeader
        currentStep={1}
        backHref="/events/demo"
        backLabel="Volver al evento"
        mobileTitle="Entradas"
      />
    )

    for (const connector of getConnectors(container)) {
      expect(connector).not.toHaveAttribute("data-completed")
    }
  })

  it("paso 3 sin volver: logo al inicio, Paso 3 de 3, ambos conectores completados y sin Compra segura", () => {
    const { container } = render(<PurchaseFlowHeader currentStep={3} />)

    expect(screen.queryByRole("link", { name: /^Volver/ })).not.toBeInTheDocument()

    const homeLinks = screen.getAllByRole("link", { name: "Ticketera, ir al inicio" })
    expect(homeLinks.length).toBeGreaterThan(0)
    for (const link of homeLinks) {
      expect(link).toHaveAttribute("href", "/")
    }

    expect(screen.getByText("Paso 3 de 3")).toBeInTheDocument()
    expect(screen.getByText("Confirmación").closest("li")).toHaveAttribute("aria-current", "step")
    expect(screen.queryByText("Compra segura")).not.toBeInTheDocument()

    const connectors = getConnectors(container)
    expect(connectors).toHaveLength(2)
    for (const connector of connectors) {
      expect(connector).toHaveAttribute("data-completed", "true")
    }
  })
})
