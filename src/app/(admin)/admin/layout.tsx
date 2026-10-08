import type { Metadata } from "next"
import { cookies } from "next/headers"

import { requireStaff } from "@/lib/auth/guards"
import { AdminShell } from "@/modules/admin/components/admin-shell"

export const metadata: Metadata = {
  title: "Administración — Ticketera",
  robots: { index: false },
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const ctx = await requireStaff("admin", { returnTo: "/admin/users" })
  const defaultOpen = (await cookies()).get("sidebar_state")?.value !== "false"

  return (
    <AdminShell
      userName={ctx.displayName}
      email={ctx.email}
      staffRole={ctx.staffRole}
      defaultOpen={defaultOpen}
    >
      {children}
    </AdminShell>
  )
}
