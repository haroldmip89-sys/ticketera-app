import { redirect } from "next/navigation"

import { requirePermission } from "@/lib/auth/guards"
import { getAllowedActions, getManagementLock } from "@/lib/auth/permissions"
import { InviteUserDialog } from "@/modules/admin/components/invite-user-dialog"
import { UsersCards } from "@/modules/admin/components/users-cards"
import {
  UsersNotice,
  UsersNoticeProvider,
} from "@/modules/admin/components/users-notice"
import { UsersPagination } from "@/modules/admin/components/users-pagination"
import { UsersTable } from "@/modules/admin/components/users-table"
import { UsersToolbar } from "@/modules/admin/components/users-toolbar"
import { listUsersQuerySchema } from "@/modules/admin/schemas/admin-user.schema"
import type { AdminUserListItem } from "@/modules/admin/types/admin-user.types"
import { buildUsersHref } from "@/modules/admin/utils/users-href"
import { usersService } from "@/modules/users/services/users.service"

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const ctx = await requirePermission("users:read", {
    returnTo: "/admin/users",
  })
  const raw = await searchParams
  const query = listUsersQuerySchema.parse({
    q: first(raw.q),
    role: first(raw.role),
    status: first(raw.status),
    page: first(raw.page),
    pageSize: first(raw.pageSize),
  })

  const { rows, total } = await usersService.listForAdmin(query)
  const pageCount = Math.max(1, Math.ceil(total / query.pageSize))
  if (total > 0 && query.page > pageCount) {
    redirect(buildUsersHref({ ...query, page: pageCount }))
  }

  const actor = {
    id: ctx.userId,
    staffRole: ctx.staffRole,
    organizerStatus: ctx.organizer?.status ?? null,
  }
  const items: AdminUserListItem[] = rows.map((row) => {
    const target = {
      id: row.id,
      staffRole: row.staffRole,
      organizerStatus: row.organizer?.status ?? null,
    }
    return {
      ...row,
      isSelf: row.id === ctx.userId,
      allowedActions: getAllowedActions(actor, target),
      lock: getManagementLock(actor, target),
    }
  })
  const hasFilters = Boolean(query.q || query.role || query.status)
  const canInviteAdmin = ctx.permissions.has("staff:manage")
  const canInviteOrganizer = ctx.permissions.has("organizers:manage")

  return (
    <UsersNoticeProvider>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Usuarios y roles
            </h1>
            <p className="text-sm text-muted-foreground">
              {total} {hasFilters ? "resultados" : "usuarios registrados"}
            </p>
          </div>
          {canInviteAdmin || canInviteOrganizer ? (
            <InviteUserDialog
              canInviteAdmin={canInviteAdmin}
              canInviteOrganizer={canInviteOrganizer}
            />
          ) : null}
        </div>
        <UsersNotice />
        <UsersToolbar query={query} />
        <UsersTable rows={items} />
        <UsersCards rows={items} />
        <UsersPagination query={query} total={total} />
      </div>
    </UsersNoticeProvider>
  )
}
