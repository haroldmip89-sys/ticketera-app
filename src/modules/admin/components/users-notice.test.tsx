import { act, cleanup, render, renderHook, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

import {
  UsersNotice,
  UsersNoticeProvider,
  useUsersNotice,
} from "./users-notice"

afterEach(cleanup)

function Trigger() {
  const { show } = useUsersNotice()
  return <button onClick={() => show("Cambios guardados.")}>mostrar</button>
}

describe("UsersNotice", () => {
  it("shows the message in a status region and closes it", async () => {
    const user = userEvent.setup()
    render(
      <UsersNoticeProvider>
        <Trigger />
        <UsersNotice />
      </UsersNoticeProvider>,
    )
    expect(screen.queryByText("Cambios guardados.")).toBeNull()
    await user.click(screen.getByRole("button", { name: "mostrar" }))
    expect(screen.getByRole("status")).toHaveTextContent("Cambios guardados.")
    await user.click(screen.getByRole("button", { name: "Cerrar aviso" }))
    expect(screen.queryByText("Cambios guardados.")).toBeNull()
  })

  it("throws outside the provider", () => {
    expect(() => renderHook(() => useUsersNotice())).toThrow(
      /UsersNoticeProvider/,
    )
  })

  it("replaces the previous message", () => {
    const { result } = renderHook(() => useUsersNotice(), {
      wrapper: ({ children }) => (
        <UsersNoticeProvider>
          {children}
          <UsersNotice />
        </UsersNoticeProvider>
      ),
    })
    act(() => result.current.show("Uno"))
    act(() => result.current.show("Dos"))
    expect(screen.getByRole("status")).toHaveTextContent("Dos")
    expect(screen.queryByText("Uno")).toBeNull()
  })
})
