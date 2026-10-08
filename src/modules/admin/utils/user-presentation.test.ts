import { describe, expect, it } from "vitest"

import type { AdminUserListItem } from "../types/admin-user.types"
import {
  getApplicableActions,
  getDisplayName,
  getInitials,
  LOCK_LABELS,
  ORGANIZER_STATUS_LABELS,
  ROLE_LABELS,
} from "./user-presentation"

function row(overrides: Partial<AdminUserListItem> = {}): AdminUserListItem {
  return {
    id: "u1",
    email: "ana@example.com",
    fullName: "Ana Pérez",
    avatarUrl: null,
    staffRole: null,
    organizer: null,
    authProviders: ["password"],
    deactivatedAt: null,
    createdAt: new Date("2026-01-15T00:00:00Z"),
    isSelf: false,
    allowedActions: [],
    lock: null,
    ...overrides,
  }
}

const ALL = [
  "grant-admin",
  "revoke-admin",
  "create-organizer",
  "remove-organizer",
  "suspend-organizer",
  "reactivate-organizer",
  "deactivate-user",
  "reactivate-user",
  "edit-user",
  "delete-user",
] as const

describe("labels", () => {
  it("exposes the Spanish labels", () => {
    expect(ROLE_LABELS.admin).toBe("Administrador")
    expect(ROLE_LABELS.customer).toBe("Cliente")
    expect(ORGANIZER_STATUS_LABELS).toEqual({
      active: "Aprobado",
      onboarding: "Pendiente",
      suspended: "Suspendido",
    })
    expect(LOCK_LABELS.self).toBe("Tu cuenta")
    expect(LOCK_LABELS.protected).toBe("Cuenta protegida")
    expect(LOCK_LABELS["super-admin-only"]).toBe("Solo el super admin")
  })
})

describe("getInitials / getDisplayName", () => {
  it("builds two uppercase letters", () => {
    expect(getInitials("Ana Pérez")).toBe("AP")
    expect(getInitials("  maría del carmen ")).toBe("MD")
    expect(getInitials("ana@example.com")).toBe("AN")
    expect(getInitials("   ")).toBe("?")
  })

  it("falls back to the email", () => {
    expect(getDisplayName({ fullName: "Ana", email: "a@x.com" })).toBe("Ana")
    expect(getDisplayName({ fullName: null, email: "a@x.com" })).toBe("a@x.com")
  })
})

describe("getApplicableActions", () => {
  it("onboarding organizer can be approved or suspended", () => {
    const actions = getApplicableActions(
      row({ organizer: { id: "o", status: "onboarding" }, allowedActions: [...ALL] }),
    )
    expect(actions).toContain("reactivate-organizer")
    expect(actions).toContain("suspend-organizer")
    expect(actions).toContain("remove-organizer")
    expect(actions).not.toContain("create-organizer")
  })

  it("suspended organizer only gets reactivate", () => {
    const actions = getApplicableActions(
      row({ organizer: { id: "o", status: "suspended" }, allowedActions: [...ALL] }),
    )
    expect(actions).toContain("reactivate-organizer")
    expect(actions).not.toContain("suspend-organizer")
  })

  it("active organizer only gets suspend", () => {
    const actions = getApplicableActions(
      row({ organizer: { id: "o", status: "active" }, allowedActions: [...ALL] }),
    )
    expect(actions).toContain("suspend-organizer")
    expect(actions).not.toContain("reactivate-organizer")
  })

  it("user without profile can become organizer but has no organizer actions", () => {
    const actions = getApplicableActions(row({ allowedActions: [...ALL] }))
    expect(actions).toContain("create-organizer")
    expect(actions).toContain("grant-admin")
    expect(actions).not.toContain("revoke-admin")
    expect(actions).not.toContain("remove-organizer")
    expect(actions).not.toContain("suspend-organizer")
    expect(actions).not.toContain("reactivate-organizer")
    expect(actions).toEqual(expect.arrayContaining(["edit-user", "delete-user"]))
  })

  it("admin gets revoke-admin instead of grant-admin", () => {
    const actions = getApplicableActions(
      row({ staffRole: "admin", allowedActions: [...ALL] }),
    )
    expect(actions).toContain("revoke-admin")
    expect(actions).not.toContain("grant-admin")
  })

  it("deactivated user gets reactivate-user", () => {
    const actions = getApplicableActions(
      row({ deactivatedAt: new Date(), allowedActions: [...ALL] }),
    )
    expect(actions).toContain("reactivate-user")
    expect(actions).not.toContain("deactivate-user")
  })

  it("never adds actions that were not allowed", () => {
    expect(getApplicableActions(row({ allowedActions: ["edit-user"] }))).toEqual([
      "edit-user",
    ])
  })
})
