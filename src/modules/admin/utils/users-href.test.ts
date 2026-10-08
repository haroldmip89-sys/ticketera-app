import { describe, expect, it } from "vitest"

import { buildUsersHref, getPageWindow } from "./users-href"

describe("buildUsersHref", () => {
  it("omite defaults y vacíos", () => {
    expect(buildUsersHref({})).toBe("/admin/users")
    expect(buildUsersHref({ q: "", page: 1, pageSize: 8 })).toBe("/admin/users")
  })

  it("incluye filtros, página y tamaño no por defecto", () => {
    expect(
      buildUsersHref({
        q: "ana",
        role: "admin",
        status: "suspended",
        page: 3,
        pageSize: 16,
      }),
    ).toBe("/admin/users?q=ana&role=admin&status=suspended&page=3&pageSize=16")
  })

  it("codifica q", () => {
    expect(buildUsersHref({ q: "a b&c@x.com" })).toBe(
      "/admin/users?q=a+b%26c%40x.com",
    )
  })
})

describe("getPageWindow", () => {
  it("ventana al inicio", () => {
    expect(getPageWindow(1, 10)).toEqual([1, 2, 3, 4, 5])
    expect(getPageWindow(2, 10)).toEqual([1, 2, 3, 4, 5])
  })

  it("ventana en el medio", () => {
    expect(getPageWindow(5, 10)).toEqual([3, 4, 5, 6, 7])
  })

  it("ventana al final", () => {
    expect(getPageWindow(10, 10)).toEqual([6, 7, 8, 9, 10])
  })

  it("pocas páginas", () => {
    expect(getPageWindow(1, 3)).toEqual([1, 2, 3])
    expect(getPageWindow(1, 1)).toEqual([1])
  })
})
