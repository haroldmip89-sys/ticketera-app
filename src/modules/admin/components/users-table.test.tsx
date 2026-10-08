import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AdminUserListItem } from "../types/admin-user.types"
import { UsersTable } from "./users-table"

vi.mock("./user-row-actions", () => ({
  UserRowActions: ({ user }: { user: AdminUserListItem }) => (
    <div data-testid={`actions-${user.id}`} />
  ),
}))

function row(overrides: Partial<AdminUserListItem> = {}): AdminUserListItem {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    email: "ana@example.com",
    fullName: "Ana Pérez",
    avatarUrl: null,
    staffRole: null,
    organizer: null,
    authProviders: ["password"],
    deactivatedAt: null,
    createdAt: new Date("2026-01-15T00:00:00Z"),
    allowedActions: [],
    isSelf: false,
    lock: null,
    ...overrides,
  }
}

afterEach(cleanup)

describe("UsersTable", () => {
  it("muestra Sin resultados con enlace Limpiar filtros", () => {
    render(<UsersTable rows={[]} />)
    expect(screen.getByText("Sin resultados")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Limpiar filtros" }),
    ).toHaveAttribute("href", "/admin/users")
  })

  it("tiene caption y encabezados con scope", () => {
    render(<UsersTable rows={[row()]} />)
    expect(
      screen.getByRole("table", { name: /lista de usuarios/i }),
    ).toBeInTheDocument()
    for (const name of [
      "Usuario",
      "Rol",
      "Organizador",
      "Registro",
      "Acciones",
    ]) {
      expect(screen.getByRole("columnheader", { name })).toHaveAttribute(
        "scope",
        "col",
      )
    }
  })

  it("muestra rol y estado de organizador con texto", () => {
    render(
      <UsersTable
        rows={[
          row({ id: "a", email: "a@x.com", fullName: "Cliente Uno" }),
          row({
            id: "b",
            email: "b@x.com",
            fullName: "Admin Dos",
            staffRole: "admin",
            organizer: { id: "o0", status: "active" },
          }),
          row({
            id: "c",
            email: "c@x.com",
            fullName: "Org Tres",
            organizer: { id: "o1", status: "suspended" },
          }),
          row({
            id: "d",
            email: "d@x.com",
            fullName: "Org Cuatro",
            organizer: { id: "o2", status: "onboarding" },
          }),
        ]}
      />,
    )
    expect(screen.getByText("Cliente")).toBeInTheDocument()
    expect(screen.getByText("Administrador")).toBeInTheDocument()
    expect(screen.getAllByText("Organizador")).toHaveLength(3)
    expect(screen.getByText("Aprobado")).toBeInTheDocument()
    expect(screen.getByText("Suspendido")).toBeInTheDocument()
    expect(screen.getByText("Pendiente")).toBeInTheDocument()
  })

  it("marca la fila propia y los desactivados", () => {
    render(
      <UsersTable
        rows={[
          row({ isSelf: true }),
          row({
            id: "b",
            email: "b@x.com",
            deactivatedAt: new Date("2026-02-01T00:00:00Z"),
          }),
        ]}
      />,
    )
    expect(screen.getByText("Tú")).toBeInTheDocument()
    expect(screen.getByText("Desactivado")).toBeInTheDocument()
  })

  it("muestra la fecha de registro y las acciones por fila", () => {
    render(<UsersTable rows={[row()]} />)
    const tableRow = screen.getByText("ana@example.com").closest("tr")!
    expect(within(tableRow).getByText(/2026/)).toBeInTheDocument()
    expect(
      within(tableRow).getByTestId(
        "actions-11111111-1111-4111-8111-111111111111",
      ),
    ).toBeInTheDocument()
  })
})
