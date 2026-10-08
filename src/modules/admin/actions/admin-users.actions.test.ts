import { beforeEach, describe, expect, it, vi } from "vitest"

const { checkPermission, revalidatePath, roles } = vi.hoisted(() => ({
  checkPermission: vi.fn(),
  revalidatePath: vi.fn(),
  roles: {
    setStaffRole: vi.fn(),
    createOrganizer: vi.fn(),
    setOrganizerStatus: vi.fn(),
    setUserActive: vi.fn(),
    inviteUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}))

vi.mock("@/lib/auth/guards", () => ({ checkPermission }))
vi.mock("next/cache", () => ({ revalidatePath }))
vi.mock("@/modules/users/services/user-roles.service", () => ({
  userRolesService: roles,
}))

import {
  createOrganizerAction,
  deleteUserAction,
  inviteUserAction,
  setOrganizerStatusAction,
  setStaffRoleAction,
  setUserActiveAction,
  updateUserAction,
} from "./admin-users.actions"

const UID = "11111111-1111-4111-8111-111111111111"
const ACTOR = "22222222-2222-4222-8222-222222222222"

const cases = [
  {
    name: "setStaffRoleAction",
    action: setStaffRoleAction,
    permission: "staff:manage",
    service: roles.setStaffRole,
    valid: { userId: UID, staffRole: "admin" },
    invalid: { userId: "x", staffRole: "admin" },
    args: { actorId: ACTOR, targetId: UID, staffRole: "admin" },
  },
  {
    name: "createOrganizerAction",
    action: createOrganizerAction,
    permission: "organizers:manage",
    service: roles.createOrganizer,
    valid: { userId: UID, displayName: "Mi Productora" },
    invalid: { userId: UID, displayName: "a" },
    args: { actorId: ACTOR, targetId: UID, displayName: "Mi Productora" },
  },
  {
    name: "setOrganizerStatusAction",
    action: setOrganizerStatusAction,
    permission: "organizers:suspend",
    service: roles.setOrganizerStatus,
    valid: { userId: UID, status: "suspended", reason: "Fraude" },
    invalid: { userId: UID, status: "suspended" },
    args: {
      actorId: ACTOR,
      targetId: UID,
      status: "suspended",
      reason: "Fraude",
    },
  },
  {
    name: "setUserActiveAction",
    action: setUserActiveAction,
    permission: "users:deactivate",
    service: roles.setUserActive,
    valid: { userId: UID, active: false },
    invalid: { userId: UID, active: "no" },
    args: { actorId: ACTOR, targetId: UID, active: false },
  },
  {
    name: "updateUserAction",
    action: updateUserAction,
    permission: "users:edit",
    service: roles.updateUser,
    valid: { userId: UID, fullName: "Ana Pérez", role: "organizer" },
    invalid: { userId: UID },
    args: {
      actorId: ACTOR,
      targetId: UID,
      fullName: "Ana Pérez",
      role: "organizer",
      organizerStatus: undefined,
      reason: undefined,
    },
  },
  {
    name: "deleteUserAction",
    action: deleteUserAction,
    permission: "users:delete",
    service: roles.deleteUser,
    valid: { userId: UID },
    invalid: { userId: "x" },
    args: { actorId: ACTOR, targetId: UID },
  },
  {
    name: "inviteUserAction (organizer)",
    action: inviteUserAction,
    permission: "organizers:manage",
    service: roles.inviteUser,
    valid: {
      email: "A@b.com",
      role: "organizer",
      organizerDisplayName: "Productora",
    },
    invalid: { email: "nope", role: "organizer" },
    args: {
      actorId: ACTOR,
      email: "a@b.com",
      role: "organizer",
      organizerDisplayName: "Productora",
    },
  },
]

beforeEach(() => {
  vi.resetAllMocks()
  checkPermission.mockResolvedValue({ ok: true, context: { userId: ACTOR } })
})

describe.each(cases)("$name", (c) => {
  it("exige el permiso correcto", async () => {
    c.service.mockResolvedValue({ ok: true, outcome: "applied" })
    await c.action(c.valid)
    expect(checkPermission).toHaveBeenCalledWith(c.permission)
  })

  it("devuelve signed-out sin sesión", async () => {
    checkPermission.mockResolvedValue({ ok: false, reason: "signed-out" })
    const r = await c.action(c.valid)
    expect(r).toMatchObject({ ok: false, code: "signed-out" })
    expect(c.service).not.toHaveBeenCalled()
  })

  it("devuelve forbidden sin permiso", async () => {
    checkPermission.mockResolvedValue({ ok: false, reason: "forbidden" })
    const r = await c.action(c.valid)
    expect(r).toMatchObject({ ok: false, code: "forbidden" })
    expect(c.service).not.toHaveBeenCalled()
  })

  it("devuelve invalid con fieldErrors", async () => {
    const r = await c.action(c.invalid)
    expect(r).toMatchObject({ ok: false, code: "invalid" })
    expect(r.ok === false && r.fieldErrors).toBeTruthy()
    expect(c.service).not.toHaveBeenCalled()
  })

  it("éxito: llama al service y revalida", async () => {
    c.service.mockResolvedValue({ ok: true, outcome: "applied" })
    const r = await c.action(c.valid)
    expect(r.ok).toBe(true)
    expect(c.service).toHaveBeenCalledWith(c.args)
    expect(revalidatePath).toHaveBeenCalledWith("/admin/users")
  })

  it("propaga el warning de sincronización", async () => {
    c.service.mockResolvedValue({
      ok: true,
      outcome: "applied",
      warning: "clerk-sync-failed",
    })
    const r = await c.action(c.valid)
    expect(r).toMatchObject({ ok: true, warning: expect.any(String) })
  })

  it.each([
    ["forbidden", "forbidden"],
    ["self", "self"],
    ["protected-target", "protected-target"],
    ["not-found", "not-found"],
    ["conflict", "conflict"],
    ["clerk-failed", "failed"],
    ["blocked", "blocked"],
    ["invalid-change", "invalid"],
  ])("mapea el error %s a %s", async (error, code) => {
    c.service.mockResolvedValue({ ok: false, error })
    const r = await c.action(c.valid)
    expect(r).toMatchObject({ ok: false, code, message: expect.any(String) })
    expect(revalidatePath).not.toHaveBeenCalled()
  })

  it("una excepción del service devuelve failed", async () => {
    c.service.mockRejectedValue(new Error("boom"))
    const r = await c.action(c.valid)
    expect(r).toMatchObject({ ok: false, code: "failed" })
  })
})

describe("inviteUserAction", () => {
  it("exige staff:manage para invitar administradores", async () => {
    roles.inviteUser.mockResolvedValue({ ok: true, outcome: "invited" })
    const r = await inviteUserAction({ email: "a@b.com", role: "admin" })
    expect(checkPermission).toHaveBeenCalledWith("staff:manage")
    expect(roles.inviteUser).toHaveBeenCalledWith({
      actorId: ACTOR,
      email: "a@b.com",
      role: "admin",
      organizerDisplayName: undefined,
    })
    expect(r).toMatchObject({ ok: true, message: "Invitación enviada." })
  })
})

describe("mensajes específicos", () => {
  it("deleteUserAction lista los bloqueos", async () => {
    roles.deleteUser.mockResolvedValue({
      ok: false,
      error: "blocked",
      blockers: ["pending-orders", "published-events"],
    })
    const r = await deleteUserAction({ userId: UID })
    expect(r).toMatchObject({
      ok: false,
      code: "blocked",
      message:
        "No se puede eliminar: tiene compras pendientes / eventos publicados.",
    })
  })

  it("updateUserAction explica el conflicto por eventos", async () => {
    roles.updateUser.mockResolvedValue({ ok: false, error: "conflict" })
    const r = await updateUserAction({ userId: UID, role: "customer" })
    expect(r).toMatchObject({
      ok: false,
      code: "conflict",
      message: "Tiene eventos; suspéndelo en su lugar.",
    })
  })

  it("mensajes de éxito", async () => {
    roles.updateUser.mockResolvedValue({ ok: true })
    roles.deleteUser.mockResolvedValue({ ok: true })
    expect(await updateUserAction({ userId: UID, fullName: "Ana" })).toMatchObject({
      message: "Cambios guardados.",
    })
    expect(await deleteUserAction({ userId: UID })).toMatchObject({
      message: "Usuario eliminado.",
    })
  })
})
