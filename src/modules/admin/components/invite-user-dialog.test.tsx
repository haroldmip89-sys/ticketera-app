import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { inviteUserAction } from "../actions/admin-users.actions"
import { InviteUserDialog } from "./invite-user-dialog"
import { UsersNotice, UsersNoticeProvider } from "./users-notice"

vi.mock("../actions/admin-users.actions", () => ({
  inviteUserAction: vi.fn(),
}))

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

async function openDialog(
  props = { canInviteAdmin: true, canInviteOrganizer: true },
) {
  const u = userEvent.setup()
  render(
    <UsersNoticeProvider>
      <InviteUserDialog {...props} />
      <UsersNotice />
    </UsersNoticeProvider>,
  )
  await u.click(screen.getByRole("button", { name: "Invitar usuario" }))
  await screen.findByRole("dialog")
  return u
}

describe("InviteUserDialog", () => {
  it("no renderiza nada sin permisos", () => {
    const { container } = render(
      <UsersNoticeProvider>
        <InviteUserDialog canInviteAdmin={false} canInviteOrganizer={false} />
      </UsersNoticeProvider>,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("ofrece ambos roles al super admin", async () => {
    const u = await openDialog()
    await u.click(screen.getByRole("combobox", { name: "Rol" }))
    expect(
      await screen.findByRole("option", { name: "Administrador" }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("option", { name: "Organizador" }),
    ).toBeInTheDocument()
  })

  it("con solo canInviteAdmin ofrece solo Administrador (preseleccionado)", async () => {
    const u = await openDialog({
      canInviteAdmin: true,
      canInviteOrganizer: false,
    })
    expect(screen.getByRole("combobox", { name: "Rol" })).toHaveTextContent(
      "Administrador",
    )
    await u.click(screen.getByRole("combobox", { name: "Rol" }))
    expect(await screen.findAllByRole("option")).toHaveLength(1)
    expect(
      screen.queryByRole("option", { name: "Organizador" }),
    ).not.toBeInTheDocument()
  })

  it("valida y enfoca el primer campo con error", async () => {
    const u = await openDialog()
    await u.click(screen.getByRole("button", { name: "Enviar invitación" }))
    expect(await screen.findByText("Ingresa el correo")).toBeInTheDocument()
    expect(document.getElementById("invite-role-error")).toHaveTextContent(
      "Elige un rol",
    )
    expect(screen.getByLabelText("Correo")).toHaveFocus()
    expect(inviteUserAction).not.toHaveBeenCalled()
  })

  it("el nombre del organizador es obligatorio y solo aparece con ese rol", async () => {
    const u = await openDialog({
      canInviteAdmin: false,
      canInviteOrganizer: true,
    })
    await u.type(screen.getByLabelText("Correo"), "nuevo@example.com")
    expect(screen.getByLabelText("Nombre del organizador")).toBeInTheDocument()
    await u.click(screen.getByRole("button", { name: "Enviar invitación" }))
    expect(
      await screen.findByText("Ingresa el nombre del organizador"),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre del organizador")).toHaveFocus()
    expect(inviteUserAction).not.toHaveBeenCalled()
  })

  it("envía, cierra y muestra el mensaje en éxito", async () => {
    vi.mocked(inviteUserAction).mockResolvedValue({
      ok: true,
      message: "Invitación enviada",
    })
    const u = await openDialog({
      canInviteAdmin: true,
      canInviteOrganizer: false,
    })
    await u.type(screen.getByLabelText("Correo"), " Nuevo@Example.com ")
    await u.click(screen.getByRole("button", { name: "Enviar invitación" }))
    await waitFor(() =>
      expect(inviteUserAction).toHaveBeenCalledWith({
        email: "nuevo@example.com",
        role: "admin",
      }),
    )
    expect(await screen.findByText("Invitación enviada")).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
  })

  it("muestra el error con role=alert y mantiene el diálogo abierto", async () => {
    vi.mocked(inviteUserAction).mockResolvedValue({
      ok: false,
      code: "conflict",
      message: "Ya existe una invitación pendiente para ese correo",
    })
    const u = await openDialog({
      canInviteAdmin: true,
      canInviteOrganizer: false,
    })
    await u.type(screen.getByLabelText("Correo"), "dup@example.com")
    await u.click(screen.getByRole("button", { name: "Enviar invitación" }))
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Ya existe una invitación pendiente",
    )
    expect(screen.getByRole("dialog")).toBeInTheDocument()
  })

  it("no permite doble envío mientras carga", async () => {
    let resolve: (value: { ok: true; message: string }) => void = () => {}
    vi.mocked(inviteUserAction).mockReturnValue(
      new Promise((r) => {
        resolve = r
      }),
    )
    const u = await openDialog({
      canInviteAdmin: true,
      canInviteOrganizer: false,
    })
    await u.type(screen.getByLabelText("Correo"), "a@example.com")
    await u.click(screen.getByRole("button", { name: "Enviar invitación" }))
    const busy = await screen.findByRole("button", { name: "Enviando…" })
    expect(busy).toHaveAttribute("aria-busy", "true")
    expect(busy).toBeDisabled()
    expect(inviteUserAction).toHaveBeenCalledTimes(1)
    resolve({ ok: true, message: "ok" })
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    )
  })
})
