import { describe, expect, it } from "vitest"

import { findNavMatch, getAdminNav } from "./admin-nav"

describe("getAdminNav", () => {
  it("includes the Administración section only for staff", () => {
    expect(getAdminNav("admin").map((s) => s.id)).toEqual(["admin", "organizer"])
    expect(getAdminNav("super_admin").map((s) => s.id)).toEqual([
      "admin",
      "organizer",
    ])
    expect(getAdminNav(null).map((s) => s.id)).toEqual(["organizer"])
  })

  it("lists the expected items per section", () => {
    const [admin, organizer] = getAdminNav("admin")
    expect(admin.items.map((i) => i.label)).toEqual([
      "Dashboard",
      "Usuarios",
      "Organizadores",
    ])
    expect(organizer.items.map((i) => i.label)).toEqual([
      "Resumen",
      "Mis eventos",
      "Crear evento",
      "Check-in",
      "Pagos",
    ])
  })

  it("only /admin/users has an href", () => {
    const withHref = getAdminNav("admin")
      .flatMap((s) => s.items)
      .filter((i) => i.href !== null)
    expect(withHref.map((i) => i.href)).toEqual(["/admin/users"])
  })
})

describe("findNavMatch", () => {
  const sections = getAdminNav("admin")

  it("matches the exact path and nested paths", () => {
    expect(findNavMatch("/admin/users", sections)?.item.label).toBe("Usuarios")
    expect(findNavMatch("/admin/users/123", sections)?.section.label).toBe(
      "Administración",
    )
  })

  it("returns null when nothing matches", () => {
    expect(findNavMatch("/admin", sections)).toBeNull()
    expect(findNavMatch("/admin/usersx", sections)).toBeNull()
  })
})
