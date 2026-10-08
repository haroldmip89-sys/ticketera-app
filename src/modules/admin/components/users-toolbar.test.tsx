import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { ListUsersQuery } from "../schemas/admin-user.schema"
import { UsersToolbar } from "./users-toolbar"

const push = vi.fn()
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

// Select de Base UI usa un popup; en jsdom se sustituye por un <select> nativo.
vi.mock("@/components/ui/select", () => ({
  Select: ({
    value,
    items,
    onValueChange,
    children,
  }: {
    value: string
    items: Record<string, string>
    onValueChange: (v: string) => void
    children: React.ReactNode
  }) => (
    <select
      aria-label={Object.values(items)[0]}
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
    >
      {Object.entries(items).map(([k, t]) => (
        <option key={k} value={k}>
          {t}
        </option>
      ))}
      {children && null}
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

describe("UsersToolbar", () => {
  it("envía q reiniciando la página y conservando filtros", async () => {
    const user = userEvent.setup()
    render(<UsersToolbar query={{ ...base, role: "admin", page: 3 }} />)
    await user.type(screen.getByLabelText("Buscar", { selector: "input" }), "ana")
    await user.click(screen.getByRole("button", { name: "Buscar" }))
    expect(push).toHaveBeenCalledWith("/admin/users?q=ana&role=admin")
  })

  it("cambiar un select navega con página 1", () => {
    render(<UsersToolbar query={{ ...base, pageSize: 16, page: 4 }} />)
    fireEvent.change(screen.getByLabelText("Todos los roles"), {
      target: { value: "customer" },
    })
    expect(push).toHaveBeenCalledWith(
      "/admin/users?role=customer&pageSize=16",
    )
  })

  it("elegir Todos quita el filtro", () => {
    render(<UsersToolbar query={{ ...base, status: "suspended" }} />)
    fireEvent.change(screen.getByLabelText("Todos"), {
      target: { value: "all" },
    })
    expect(push).toHaveBeenCalledWith("/admin/users")
  })

  it("Limpiar solo aparece con filtros y vuelve a /admin/users", async () => {
    const { rerender } = render(<UsersToolbar query={base} />)
    expect(
      screen.queryByRole("button", { name: "Limpiar" }),
    ).not.toBeInTheDocument()
    rerender(<UsersToolbar query={{ ...base, q: "ana" }} />)
    await userEvent.click(screen.getByRole("button", { name: "Limpiar" }))
    expect(push).toHaveBeenCalledWith("/admin/users")
  })
})
