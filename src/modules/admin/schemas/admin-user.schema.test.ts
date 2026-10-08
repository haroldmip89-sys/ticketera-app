import { describe, expect, it } from "vitest"

import {
  createOrganizerSchema,
  deleteUserSchema,
  inviteUserSchema,
  listUsersQuerySchema,
  setOrganizerStatusSchema,
  setStaffRoleSchema,
  setUserActiveSchema,
  updateUserSchema,
} from "./admin-user.schema"

const uuid = "123e4567-e89b-42d3-a456-426614174000"

describe("inviteUserSchema", () => {
  it("normaliza el correo", () => {
    const r = inviteUserSchema.parse({ email: "  Ana@Example.COM ", role: "admin" })
    expect(r).toEqual({ email: "ana@example.com", role: "admin" })
  })

  it("rechaza un correo inválido", () => {
    expect(inviteUserSchema.safeParse({ email: "nope", role: "admin" }).success).toBe(false)
  })

  it("rechaza organizador sin nombre", () => {
    const r = inviteUserSchema.safeParse({ email: "a@b.co", role: "organizer" })
    expect(r.success).toBe(false)
    if (!r.success) expect(r.error.issues[0].path).toEqual(["organizerDisplayName"])
  })

  it("acepta organizador con nombre recortado", () => {
    const r = inviteUserSchema.parse({
      email: "a@b.co",
      role: "organizer",
      organizerDisplayName: "  Mi Productora ",
    })
    expect(r.organizerDisplayName).toBe("Mi Productora")
  })

  it("ignora el nombre cuando el rol es admin", () => {
    const r = inviteUserSchema.parse({
      email: "a@b.co",
      role: "admin",
      organizerDisplayName: "X",
    })
    expect(r).not.toHaveProperty("organizerDisplayName")
  })
})

describe("setOrganizerStatusSchema", () => {
  it("rechaza suspender sin motivo", () => {
    expect(
      setOrganizerStatusSchema.safeParse({ userId: uuid, status: "suspended" }).success,
    ).toBe(false)
  })

  it("acepta suspender con motivo y reactivar sin él", () => {
    expect(
      setOrganizerStatusSchema.safeParse({ userId: uuid, status: "suspended", reason: "Fraude" })
        .success,
    ).toBe(true)
    expect(setOrganizerStatusSchema.safeParse({ userId: uuid, status: "active" }).success).toBe(true)
  })
})

describe("otros schemas", () => {
  it("rechaza uuid inválido", () => {
    expect(setStaffRoleSchema.safeParse({ userId: "x", staffRole: "admin" }).success).toBe(false)
    expect(setUserActiveSchema.safeParse({ userId: "x", active: true }).success).toBe(false)
    expect(createOrganizerSchema.safeParse({ userId: "x", displayName: "Ok" }).success).toBe(false)
  })

  it("acepta staffRole null", () => {
    expect(setStaffRoleSchema.safeParse({ userId: uuid, staffRole: null }).success).toBe(true)
  })
})

describe("listUsersQuerySchema", () => {
  it.each(["0", "NaN", "abc", "-3", "1.5"])("page %s vuelve a 1", (page) => {
    expect(listUsersQuerySchema.parse({ page }).page).toBe(1)
  })

  it("usa 1 por defecto y respeta páginas válidas", () => {
    expect(listUsersQuerySchema.parse({}).page).toBe(1)
    expect(listUsersQuerySchema.parse({ page: "3" }).page).toBe(3)
  })

  it("recorta q largo y no lanza con entradas raras", () => {
    expect(listUsersQuerySchema.parse({ q: "a".repeat(150) }).q).toHaveLength(100)
    expect(listUsersQuerySchema.parse({ q: ["a", "b"], page: { x: 1 } })).toEqual({
      q: undefined,
      page: 1,
      pageSize: 8,
    })
  })

  it("usa pageSize 8 por defecto y acepta 8/16/24", () => {
    expect(listUsersQuerySchema.parse({}).pageSize).toBe(8)
    expect(listUsersQuerySchema.parse({ pageSize: "16" }).pageSize).toBe(16)
    expect(listUsersQuerySchema.parse({ pageSize: 24 }).pageSize).toBe(24)
  })

  it.each(["10", "x", "", "0", "-8"])("pageSize %j vuelve a 8", (pageSize) => {
    expect(listUsersQuerySchema.parse({ pageSize }).pageSize).toBe(8)
  })

  it("role y status inválidos quedan undefined; válidos se conservan", () => {
    expect(listUsersQuerySchema.parse({ role: "root", status: "x" })).toMatchObject({
      role: undefined,
      status: undefined,
    })
    expect(
      listUsersQuerySchema.parse({ role: "customer", status: "suspended" }),
    ).toMatchObject({ role: "customer", status: "suspended" })
  })

  it("recorta espacios de q", () => {
    expect(listUsersQuerySchema.parse({ q: "  ana  " }).q).toBe("ana")
  })
})

describe("updateUserSchema", () => {
  it("acepta cambios válidos", () => {
    expect(updateUserSchema.safeParse({ userId: uuid, fullName: "  Ana Pérez " }).data).toEqual({
      userId: uuid,
      fullName: "Ana Pérez",
    })
    expect(updateUserSchema.safeParse({ userId: uuid, role: "organizer" }).success).toBe(true)
    expect(
      updateUserSchema.safeParse({ userId: uuid, organizerStatus: "active" }).success,
    ).toBe(true)
  })

  it("rechaza nombre corto o largo", () => {
    expect(updateUserSchema.safeParse({ userId: uuid, fullName: "A" }).success).toBe(false)
    expect(
      updateUserSchema.safeParse({ userId: uuid, fullName: "a".repeat(81) }).success,
    ).toBe(false)
  })

  it("exige motivo al suspender", () => {
    const r = updateUserSchema.safeParse({ userId: uuid, organizerStatus: "suspended" })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toBe("Ingresa el motivo de la suspensión")
    expect(
      updateUserSchema.safeParse({
        userId: uuid,
        organizerStatus: "suspended",
        reason: "Fraude",
      }).success,
    ).toBe(true)
  })

  it("rechaza sin cambios", () => {
    const r = updateUserSchema.safeParse({ userId: uuid })
    expect(r.success).toBe(false)
    expect(r.error?.issues[0]?.message).toBe("No hay cambios que guardar")
  })

  it("rechaza rol, estado y uuid inválidos", () => {
    expect(updateUserSchema.safeParse({ userId: uuid, role: "super_admin" }).success).toBe(false)
    expect(
      updateUserSchema.safeParse({ userId: uuid, organizerStatus: "onboarding" }).success,
    ).toBe(false)
    expect(updateUserSchema.safeParse({ userId: "x", fullName: "Ana" }).success).toBe(false)
  })
})

describe("deleteUserSchema", () => {
  it("valida el uuid", () => {
    expect(deleteUserSchema.safeParse({ userId: uuid }).success).toBe(true)
    expect(deleteUserSchema.safeParse({ userId: "x" }).success).toBe(false)
  })
})
