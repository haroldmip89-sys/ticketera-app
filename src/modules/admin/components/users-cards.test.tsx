import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AdminUserListItem } from "../types/admin-user.types"
import { UsersCards } from "./users-cards"

vi.mock("./user-row-actions", () => ({
  UserRowActions: ({
    user,
    layout,
  }: {
    user: AdminUserListItem
    layout: string
  }) => <div data-testid={`actions-${layout}`}>{user.email}</div>,
}))

afterEach(cleanup)

function row(overrides: Partial<AdminUserListItem> = {}): AdminUserListItem {
  return {
    id: "u1",
    email: "ana@example.com",
    fullName: "Ana Pérez",
    avatarUrl: null,
    staffRole: null,
    organizer: null,
    authProviders: [],
    deactivatedAt: null,
    createdAt: new Date("2026-01-15T00:00:00Z"),
    isSelf: false,
    allowedActions: [],
    lock: null,
    ...overrides,
  }
}

describe("UsersCards", () => {
  it("shows Sin resultados with a Limpiar filtros link when empty", () => {
    render(<UsersCards rows={[]} />)
    expect(screen.getByText("Sin resultados")).toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Limpiar filtros" }),
    ).toHaveAttribute("href", "/admin/users")
  })

  it("renders one card per user with identity, role, date and labeled actions", () => {
    render(<UsersCards rows={[row(), row({ id: "u2", email: "b@x.com", fullName: null })]} />)
    const items = screen.getAllByRole("listitem")
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText("Ana Pérez")).toBeInTheDocument()
    expect(within(items[0]).getByText("Cliente")).toBeInTheDocument()
    expect(within(items[0]).getByText(/2026/)).toBeInTheDocument()
    expect(within(items[0]).getByTestId("actions-labeled")).toBeInTheDocument()
  })

  it("shows the organizer status with text only when there is a profile", () => {
    render(
      <UsersCards
        rows={[
          row({ organizer: { id: "o1", status: "suspended" } }),
          row({ id: "u2", email: "b@x.com" }),
        ]}
      />,
    )
    const items = screen.getAllByRole("listitem")
    expect(within(items[0]).getByText("Suspendido")).toBeInTheDocument()
    expect(within(items[1]).queryByText("Suspendido")).not.toBeInTheDocument()
  })

  it("marks the own row and deactivated users", () => {
    render(<UsersCards rows={[row({ isSelf: true, deactivatedAt: new Date() })]} />)
    expect(screen.getByText("Tú")).toBeInTheDocument()
    expect(screen.getByText("Desactivado")).toBeInTheDocument()
  })
})
