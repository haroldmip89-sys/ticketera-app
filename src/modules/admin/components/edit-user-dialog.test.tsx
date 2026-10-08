import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { createRef } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { updateUserAction } from "../actions/admin-users.actions"
import type { AdminUserListItem } from "../types/admin-user.types"
import { EditUserDialog } from "./edit-user-dialog"
import { UsersNotice, UsersNoticeProvider } from "./users-notice"

vi.mock("../actions/admin-users.actions", () => ({
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
    allowedActions: ["edit-user"],
    lock: null,
    ...overrides,
  }
}

const SUPER_ACTIONS = [
  "edit-user",
  "grant-admin",
  "create-organizer",
  "remove-organizer",
] as const

function setup(user: AdminUserListItem) {
  const onOpenChange = vi.fn()
  const triggerRef = createRef<HTMLElement>()
  render(
    <UsersNoticeProvider>
      <button ref={triggerRef as React.RefObject<HTMLButtonElement>}>
        Disparador
      </button>
      <EditUserDialog
        user={user}
        open
        onOpenChange={onOpenChange}
        triggerRef={triggerRef}
      />
      <UsersNotice />
    </UsersNoticeProvider>,
  )
  return { u: userEvent.setup(), onOpenChange }
}

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

describe("EditUserDialog", () => {
  it("muestra el correo deshabilitado con su nota", async () => {
    setup(makeUser())
    expect(await screen.findByLabelText("Correo")).toBeDisabled()
    expect(
      screen.getByText("El correo viene de la cuenta y no se edita."),
    ).toBeInTheDocument()
  })

  it("deshabilita el rol para quien no puede cambiarlo, con su nota", async () => {
    setup(makeUser())
    expect(await screen.findByRole("combobox", { name: "Rol" })).toBeDisabled()
    expect(
      screen.getByText("Solo el super admin cambia roles"),
    ).toBeInTheDocument()
  })

  it("sin cambios muestra el error y no llama a la acción", async () => {
    const { u } = setup(makeUser())
    await u.click(
      await screen.findByRole("button", { name: "Guardar cambios" }),
    )
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "No hay cambios que guardar",
    )
    expect(updateUserAction).not.toHaveBeenCalled()
  })

  it("envía solo lo que cambió y avisa al guardar", async () => {
    vi.mocked(updateUserAction).mockResolvedValue({
      ok: true,
      message: "Cambios guardados.",
    })
    const { u, onOpenChange } = setup(makeUser())
    const name = await screen.findByLabelText("Nombre")
    await u.clear(name)
    await u.type(name, "Ana María")
    await u.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() =>
      expect(updateUserAction).toHaveBeenCalledWith({
        userId: USER_ID,
        fullName: "Ana María",
      }),
    )
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(
      await screen.findByRole("status", { hidden: true }),
    ).toHaveTextContent("Cambios guardados.")
  })

  it("valida el nombre", async () => {
    const { u } = setup(makeUser())
    const name = await screen.findByLabelText("Nombre")
    await u.clear(name)
    await u.type(name, "A")
    await u.click(screen.getByRole("button", { name: "Guardar cambios" }))
    expect(
      await screen.findByText("El nombre debe tener al menos 2 caracteres"),
    ).toBeInTheDocument()
    expect(updateUserAction).not.toHaveBeenCalled()
  })

  it("al cambiar de rol envía el rol elegido", async () => {
    vi.mocked(updateUserAction).mockResolvedValue({ ok: true, message: "Ok" })
    const { u } = setup(makeUser({ allowedActions: [...SUPER_ACTIONS] }))
    await u.click(await screen.findByRole("combobox", { name: "Rol" }))
    await u.click(await screen.findByRole("option", { name: "Administrador" }))
    await u.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() =>
      expect(updateUserAction).toHaveBeenCalledWith({
        userId: USER_ID,
        role: "admin",
      }),
    )
  })

  it("no muestra estado de organizador sin perfil", async () => {
    setup(makeUser())
    await screen.findByLabelText("Nombre")
    expect(screen.queryByText("Estado de organizador")).not.toBeInTheDocument()
  })

  it("al elegir Suspendido pide el motivo y lo envía", async () => {
    vi.mocked(updateUserAction).mockResolvedValue({ ok: true, message: "Ok" })
    const { u } = setup(makeUser({ organizer: { id: "o1", status: "active" } }))
    expect(
      screen.queryByLabelText("Motivo de la suspensión"),
    ).not.toBeInTheDocument()
    await u.click(
      await screen.findByRole("combobox", { name: "Estado de organizador" }),
    )
    await u.click(await screen.findByRole("option", { name: "Suspendido" }))
    await u.click(screen.getByRole("button", { name: "Guardar cambios" }))
    expect(
      await screen.findByText(/Ingresa el motivo de la suspensi/),
    ).toBeInTheDocument()
    expect(updateUserAction).not.toHaveBeenCalled()

    await u.type(screen.getByLabelText("Motivo de la suspensión"), "Fraude")
    await u.click(screen.getByRole("button", { name: "Guardar cambios" }))
    await waitFor(() =>
      expect(updateUserAction).toHaveBeenCalledWith({
        userId: USER_ID,
        organizerStatus: "suspended",
        reason: "Fraude",
      }),
    )
  })

  it("Pendiente solo aparece si es el estado actual y no es elegible", async () => {
    const { u } = setup(
      makeUser({ organizer: { id: "o1", status: "onboarding" } }),
    )
    await u.click(
      await screen.findByRole("combobox", { name: "Estado de organizador" }),
    )
    expect(
      await screen.findByRole("option", { name: "Pendiente" }),
    ).toHaveAttribute("aria-disabled", "true")
  })

  it("muestra el error de la acción en role=alert y mantiene el diálogo", async () => {
    vi.mocked(updateUserAction).mockResolvedValue({
      ok: false,
      code: "conflict",
      message: "Tiene eventos; suspéndelo en su lugar.",
    })
    const { u, onOpenChange } = setup(makeUser())
    const name = await screen.findByLabelText("Nombre")
    await u.clear(name)
    await u.type(name, "Otro Nombre")
    await u.click(screen.getByRole("button", { name: "Guardar cambios" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Tiene eventos; suspéndelo en su lugar.",
    )
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it("Cancelar cierra sin guardar", async () => {
    const { u, onOpenChange } = setup(makeUser())
    await u.click(await screen.findByRole("button", { name: "Cancelar" }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(updateUserAction).not.toHaveBeenCalled()
  })
})
