import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { AdminUserListItem } from "../types/admin-user.types"
import { OrganizerStatusBadge, RoleBadge, UserIdentity } from "./user-badges"

afterEach(cleanup)

function item(overrides: Partial<AdminUserListItem> = {}): AdminUserListItem {
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

describe("RoleBadge", () => {
  it.each([
    [{ staffRole: "super_admin", organizer: null }, "Super admin"],
    [{ staffRole: "admin", organizer: { id: "o", status: "active" } }, "Administrador"],
    [{ staffRole: null, organizer: { id: "o", status: "active" } }, "Organizador"],
    [{ staffRole: null, organizer: null }, "Cliente"],
  ] as const)("%j -> %s", (row, label) => {
    render(<RoleBadge row={row} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})

describe("OrganizerStatusBadge", () => {
  it.each([
    ["active", "Aprobado"],
    ["onboarding", "Pendiente"],
    ["suspended", "Suspendido"],
  ] as const)("%s shows %s as text", (status, label) => {
    render(<OrganizerStatusBadge status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})

describe("UserIdentity", () => {
  it("shows initials, name and email", () => {
    render(<UserIdentity row={item()} />)
    expect(screen.getByText("AP")).toBeInTheDocument()
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument()
    expect(screen.getByText("ana@example.com")).toBeInTheDocument()
  })

  it("falls back to the email without repeating it", () => {
    render(<UserIdentity row={item({ fullName: null })} />)
    expect(screen.getAllByText("ana@example.com")).toHaveLength(1)
  })

  it("marks the own row and deactivated users with text", () => {
    render(
      <UserIdentity row={item({ isSelf: true, deactivatedAt: new Date() })} />,
    )
    expect(screen.getByText("Tú")).toBeInTheDocument()
    expect(screen.getByText("Desactivado")).toBeInTheDocument()
  })
})
