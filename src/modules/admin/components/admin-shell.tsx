import type { StaffRole } from "@/lib/auth/permissions"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"

import { getAdminNav } from "../utils/admin-nav"
import { ROLE_LABELS } from "../utils/user-presentation"
import { AdminHeader } from "./admin-header"
import { AdminSidebar } from "./admin-sidebar"

export type AdminShellProps = {
  children: React.ReactNode
  userName: string | null
  email: string
  staffRole: StaffRole | null
  defaultOpen: boolean
}

export function AdminShell({
  children,
  userName,
  email,
  staffRole,
  defaultOpen,
}: AdminShellProps) {
  const sections = getAdminNav(staffRole)
  const roleLabel = staffRole ? ROLE_LABELS[staffRole] : ROLE_LABELS.organizer

  return (
    <TooltipProvider>
      <SidebarProvider
        defaultOpen={defaultOpen}
        style={
          {
            "--sidebar-width": "16.5rem",
            "--sidebar-width-icon": "4.75rem",
          } as React.CSSProperties
        }
      >
        <AdminSidebar
          sections={sections}
          userName={userName}
          email={email}
          roleLabel={roleLabel}
        />
        <div className="flex min-w-0 flex-1 flex-col bg-muted/40 text-foreground">
          <AdminHeader sections={sections} />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
            {children}
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  )
}
