import { cleanup, fireEvent, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ListUsersQuery } from "../schemas/admin-user.schema"
import { UsersPagination } from "./users-pagination"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

// Select de Base UI usa un popup; en jsdom se sustituye por un <select> nativo.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    items,
    onValueChange,
  }: {
    value: string
    items: Record<string, string>
    onValueChange: (v: string) => void
  }) => (
    <select
      aria-label="Filas por página"
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {Object.keys(items).map((k) => (
        <option key={k} value={k}>
          {k}
        </option>
      ))}
    </select>
  ),
  SelectTrigger: () => null,
  SelectValue: () => null,
  SelectContent: () => null,
  SelectItem: () => null,
}))

const base: ListUsersQuery = { page: 1, pageSize: 8 }

beforeEach(() => push.mockClear())
afterEach(cleanup)

describe("UsersPagination", () => {
  it("muestra el rango", () => {
    render(<UsersPagination query={{ ...base, page: 2 }} total={20} />)
    expect(screen.getByText("Mostrando 9–16 de 20")).toBeInTheDocument()
  })

  it("muestra 0 resultados sin datos", () => {
    render(<UsersPagination query={base} total={0} />)
    expect(screen.getByText("0 resultados")).toBeInTheDocument()
  })

  it("deshabilita Anterior en la primera página", () => {
    render(<UsersPagination query={base} total={20} />)
    const desktop = screen.getAllByRole("link", { name: /Anterior/ })
    for (const el of desktop) expect(el).toHaveAttribute("aria-disabled", "true")
    expect(screen.getAllByRole("link", { name: /Siguiente/ })[0]).toHaveAttribute(
      "href",
      "/admin/users?page=2",
    )
  })

  it("deshabilita Siguiente en la última página", () => {
    render(<UsersPagination query={{ ...base, page: 3 }} total={20} />)
    for (const el of screen.getAllByRole("link", { name: /Siguiente/ })) {
      expect(el).toHaveAttribute("aria-disabled", "true")
    }
  })

  it("marca la página actual y enlaza las demás", () => {
    render(<UsersPagination query={{ ...base, page: 2 }} total={20} />)
    expect(screen.getByText("2", { selector: "[aria-current]" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(screen.getByRole("link", { name: "Página 3" })).toHaveAttribute(
      "href",
      "/admin/users?page=3",
    )
  })

  it("muestra Página X de Y para móvil", () => {
    render(<UsersPagination query={{ ...base, page: 2 }} total={20} />)
    expect(screen.getByText("Página 2 de 3")).toBeInTheDocument()
  })

  it("cambiar filas reinicia la página", () => {
    render(<UsersPagination query={{ ...base, page: 3, q: "ana" }} total={50} />)
    fireEvent.change(
      within(screen.getByRole("navigation")).getByLabelText("Filas por página"),
      { target: { value: "16" } },
    )
    expect(push).toHaveBeenCalledWith("/admin/users?q=ana&pageSize=16")
  })
})
