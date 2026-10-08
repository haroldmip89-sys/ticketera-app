import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import { getAdminNav } from "../utils/admin-nav"
import { AdminSidebar } from "./admin-sidebar"

const signOut = vi.fn()

vi.mock("@clerk/nextjs", () => ({ useClerk: () => ({ signOut }) }))
vi.mock("next/navigation", () => ({ usePathname: () => "/admin/users" }))

beforeEach(() => {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  signOut.mockClear()
})

function renderSidebar(staffRole: "admin" | "super_admin" | null = "admin") {
  return render(
    <TooltipProvider>
      <SidebarProvider>
        <AdminSidebar
          sections={getAdminNav(staffRole)}
          userName="Ana Pérez"
          email="ana@example.com"
          roleLabel="Administrador"
        />
      </SidebarProvider>
    </TooltipProvider>,
  )
}

const DISABLED = [
  "Dashboard",
  "Organizadores",
  "Resumen",
  "Mis eventos",
  "Crear evento",
  "Check-in",
  "Pagos",
]

describe("AdminSidebar", () => {
  it("renders both sections for staff and the session footer", () => {
    renderSidebar()
    expect(screen.getByText("Administración")).toBeInTheDocument()
    expect(screen.getByText("Organizador")).toBeInTheDocument()
    expect(screen.getByText("Ana Pérez")).toBeInTheDocument()
    expect(screen.getByText("Administrador")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ver sitio" })).toHaveAttribute(
      "href",
      "/",
    )
  })

  it("hides the Administración section without staff role", () => {
    renderSidebar(null)
    expect(screen.queryByText("Dashboard")).not.toBeInTheDocument()
    expect(screen.getByText("Resumen")).toBeInTheDocument()
  })

  it("marks Usuarios as the current page and the only real link", () => {
    renderSidebar()
    const users = screen.getByRole("link", { name: "Usuarios" })
    expect(users).toHaveAttribute("href", "/admin/users")
    expect(users).toHaveAttribute("aria-current", "page")
    const enabled = screen
      .getAllByRole("link")
      .filter((el) => el.getAttribute("aria-disabled") !== "true")
      .map((el) => el.getAttribute("href"))
    expect(enabled).toEqual(["/admin/users", "/admin/users", "/"])
  })

  it("renders disabled items without href", () => {
    renderSidebar()
    for (const label of DISABLED) {
      const item = screen.getByText(label).closest("[aria-disabled]")
      expect(item).toHaveAttribute("aria-disabled", "true")
      expect(item).not.toHaveAttribute("href")
    }
  })

  it("shows the Próximamente tooltip on keyboard focus", async () => {
    const user = userEvent.setup()
    renderSidebar()
    const dashboard = screen.getByText("Dashboard").closest("[aria-disabled]")!
    await user.keyboard("{Tab}")
    while (document.activeElement !== dashboard) {
      await user.keyboard("{Tab}")
    }
    expect(await screen.findByText(/Próximamente/)).toBeInTheDocument()
  })

  it("signs out redirecting to /", async () => {
    const user = userEvent.setup()
    renderSidebar()
    await user.click(screen.getByRole("button", { name: "Cerrar sesión" }))
    expect(signOut).toHaveBeenCalledWith({ redirectUrl: "/" })
  })
})
