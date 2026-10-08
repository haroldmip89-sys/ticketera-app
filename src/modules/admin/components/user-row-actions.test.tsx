import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  deleteUserAction,
  setOrganizerStatusAction,
  setUserActiveAction,
} from "../actions/admin-users.actions"
import type { AdminUserListItem } from "../types/admin-user.types"
import { UserRowActions } from "./user-row-actions"
import { UsersNotice, UsersNoticeProvider } from "./users-notice"

vi.mock("../actions/admin-users.actions", () => ({
  deleteUserAction: vi.fn(),
  setOrganizerStatusAction: vi.fn(),
  setUserActiveAction: vi.fn(),
  updateUserAction: vi.fn(),
}))

const USER_ID = "11111111-1111-4111-8111-111111111111"

function makeUser(
  overrides: Partial<AdminUserListItem> = {},
): AdminUserListItem {
  return {
    id: USER_ID,
    email: "ana@example.com",
    fullName: "Ana Pérez",
    avatarUrl: null,
    staffRole: null,
    organizer: null,
    authProviders: [],
    deactivatedAt: null,
    createdAt: new Date("2026-01-01"),
    isSelf: false,
    allowedActions: [],
    lock: null,
    ...overrides,
  }
}

function setup(user: AdminUserListItem, layout: "icons" | "labeled" = "icons") {
  render(
    <UsersNoticeProvider>
      <UserRowActions user={user} layout={layout} />
      <UsersNotice />
    </UsersNoticeProvider>,
  )
  return userEvent.setup()
}

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe("UserRowActions", () => {
  it("no renderiza nada sin acciones aplicables", () => {
    const { container } = render(
      <UsersNoticeProvider>
        <UserRowActions user={makeUser()} layout="icons" />
      </UsersNoticeProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it.each([
    ["self", "Tu cuenta"],
    ["protected", "Cuenta protegida"],
    ["super-admin-only", "Solo el super admin"],
  ] as const)(
    "muestra candado y motivo para lock %s sin botones",
    (lock, text) => {
      setup(makeUser({ lock, allowedActions: ["edit-user", "delete-user"] }))
      expect(screen.getByText(text)).toBeInTheDocument()
      expect(screen.queryByRole("button")).not.toBeInTheDocument()
    },
  )

  it("muestra solo los botones permitidos y aplicables", () => {
    setup(
      makeUser({
        organizer: { id: "o1", status: "active" },
        allowedActions: [
          "edit-user",
          "suspend-organizer",
          "reactivate-organizer",
        ],
      }),
    )
    expect(
      screen.getByRole("button", { name: "Editar a Ana Pérez" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Suspender a Ana Pérez" }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Aprobar a Ana Pérez" }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Eliminar a Ana Pérez" }),
    ).not.toBeInTheDocument()
  })

  it("ofrece Aprobar a un organizador pendiente y pide confirmación", async () => {
    vi.mocked(setOrganizerStatusAction).mockResolvedValue({
      ok: true,
      message: "Organizador reactivado.",
    })
    const u = setup(
      makeUser({
        organizer: { id: "o1", status: "onboarding" },
        allowedActions: ["reactivate-organizer"],
      }),
    )
    await u.click(screen.getByRole("button", { name: "Aprobar a Ana Pérez" }))
    expect(setOrganizerStatusAction).not.toHaveBeenCalled()
    await u.click(await screen.findByRole("button", { name: "Aprobar" }))
    await waitFor(() =>
      expect(setOrganizerStatusAction).toHaveBeenCalledWith({
        userId: USER_ID,
        status: "active",
      }),
    )
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Organizador reactivado.",
    )
  })

  it("suspender exige motivo", async () => {
    vi.mocked(setOrganizerStatusAction).mockResolvedValue({
      ok: true,
      message: "Organizador suspendido.",
    })
    const u = setup(
      makeUser({
        organizer: { id: "o1", status: "active" },
        allowedActions: ["suspend-organizer"],
      }),
    )
    await u.click(screen.getByRole("button", { name: "Suspender a Ana Pérez" }))
    await u.click(await screen.findByRole("button", { name: "Suspender" }))
    expect(setOrganizerStatusAction).not.toHaveBeenCalled()
    expect(
      await screen.findByText("Ingresa el motivo de la suspensión"),
    ).toBeInTheDocument()

    await u.type(screen.getByLabelText("Motivo de la suspensión"), "Fraude")
    await u.click(screen.getByRole("button", { name: "Suspender" }))
    await waitFor(() =>
      expect(setOrganizerStatusAction).toHaveBeenCalledWith({
        userId: USER_ID,
        status: "suspended",
        reason: "Fraude",
      }),
    )
  })

  it("desactivar pide confirmación y no permite doble envío", async () => {
    let resolve: (value: { ok: true; message: string }) => void = () => {}
    vi.mocked(setUserActiveAction).mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const u = setup(makeUser({ allowedActions: ["deactivate-user"] }))
    await u.click(
      screen.getByRole("button", { name: "Desactivar a Ana Pérez" }),
    )
    expect(setUserActiveAction).not.toHaveBeenCalled()
    await u.click(await screen.findByRole("button", { name: "Desactivar" }))
    const busy = await screen.findByRole("button", { name: "Procesando…" })
    expect(busy).toHaveAttribute("aria-busy", "true")
    expect(busy).toBeDisabled()
    await u.click(busy)
    expect(setUserActiveAction).toHaveBeenCalledTimes(1)
    expect(setUserActiveAction).toHaveBeenCalledWith({
      userId: USER_ID,
      active: false,
    })
    resolve({ ok: true, message: "Usuario desactivado." })
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Usuario desactivado.",
    )
  })

  it("eliminar abre un alertdialog y avisa al completar", async () => {
    vi.mocked(deleteUserAction).mockResolvedValue({
      ok: true,
      message: "Usuario eliminado.",
    })
    const u = setup(makeUser({ allowedActions: ["delete-user"] }))
    await u.click(screen.getByRole("button", { name: "Eliminar a Ana Pérez" }))
    const dialog = await screen.findByRole("alertdialog")
    expect(dialog).toHaveTextContent("¿Eliminar a Ana Pérez?")
    expect(dialog).toHaveTextContent(
      "Perderá el acceso a Ticketera. Esta acción no se puede deshacer.",
    )
    await u.click(screen.getByRole("button", { name: "Eliminar" }))
    await waitFor(() =>
      expect(deleteUserAction).toHaveBeenCalledWith({ userId: USER_ID }),
    )
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Ana Pérez fue eliminado.",
    )
  })

  it("cancelar eliminar no ejecuta la acción", async () => {
    const u = setup(makeUser({ allowedActions: ["delete-user"] }))
    await u.click(screen.getByRole("button", { name: "Eliminar a Ana Pérez" }))
    await u.click(await screen.findByRole("button", { name: "Cancelar" }))
    expect(deleteUserAction).not.toHaveBeenCalled()
  })

  it("eliminar con bloqueos muestra los motivos en role=alert y mantiene el diálogo", async () => {
    vi.mocked(deleteUserAction).mockResolvedValue({
      ok: false,
      code: "blocked",
      message:
        "No se puede eliminar: tiene compras pendientes / eventos publicados.",
    })
    const u = setup(makeUser({ allowedActions: ["delete-user"] }))
    await u.click(screen.getByRole("button", { name: "Eliminar a Ana Pérez" }))
    await u.click(await screen.findByRole("button", { name: "Eliminar" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "compras pendientes / eventos publicados",
    )
    expect(screen.getByRole("alertdialog")).toBeInTheDocument()
  })

  it("el layout labeled muestra el texto Editar", () => {
    setup(makeUser({ allowedActions: ["edit-user", "delete-user"] }), "labeled")
    expect(
      screen.getByRole("button", { name: "Editar a Ana Pérez" }),
    ).toHaveTextContent("Editar")
    expect(
      screen.getByRole("button", { name: "Eliminar a Ana Pérez" }),
    ).toBeInTheDocument()
  })

  it("Editar abre el diálogo de edición", async () => {
    const u = setup(makeUser({ allowedActions: ["edit-user"] }))
    await u.click(screen.getByRole("button", { name: "Editar a Ana Pérez" }))
    expect(
      await screen.findByRole("dialog", { name: "Editar usuario" }),
    ).toBeInTheDocument()
  })
})
