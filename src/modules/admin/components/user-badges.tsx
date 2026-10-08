import { Ban, CircleCheck, Clock } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import type { OrganizerStatus } from "@/lib/auth/permissions"
import type { AdminUserRow } from "@/modules/users/types/user.types"
import {
  getPrimaryRole,
  type PrimaryRole,
} from "@/modules/users/utils/role-change"

import type { AdminUserListItem } from "../types/admin-user.types"
import {
  getDisplayName,
  getInitials,
  ORGANIZER_STATUS_LABELS,
  ROLE_LABELS,
} from "../utils/user-presentation"

const ROLE_VARIANTS: Record<
  PrimaryRole,
  { variant: "default" | "secondary" | "outline"; className?: string }
> = {
  super_admin: { variant: "default" },
  admin: {
    variant: "outline",
    className: "border-transparent bg-primary/10 text-primary",
  },
  organizer: { variant: "secondary" },
  customer: { variant: "outline" },
}

export function RoleBadge({
  row,
}: {
  row: Pick<AdminUserRow, "staffRole" | "organizer">
}) {
  const role = getPrimaryRole({
    staffRole: row.staffRole,
    hasOrganizer: row.organizer !== null,
  })
  const { variant, className } = ROLE_VARIANTS[role]
  return (
    <Badge variant={variant} className={className}>
      {ROLE_LABELS[role]}
    </Badge>
  )
}

const STATUS_BADGES = {
  active: { variant: "success", Icon: CircleCheck },
  onboarding: { variant: "outline", Icon: Clock },
  suspended: { variant: "destructive", Icon: Ban },
} as const

export function OrganizerStatusBadge({ status }: { status: OrganizerStatus }) {
  const { variant, Icon } = STATUS_BADGES[status]
  return (
    <Badge variant={variant}>
      <Icon aria-hidden="true" />
      {ORGANIZER_STATUS_LABELS[status]}
    </Badge>
  )
}

export function UserIdentity({ row }: { row: AdminUserListItem }) {
  const name = getDisplayName(row)
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
      >
        {getInitials(name)}
      </span>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{name}</span>
          {row.isSelf ? <Badge variant="secondary">Tú</Badge> : null}
          {row.deactivatedAt ? (
            <Badge variant="destructive">Desactivado</Badge>
          ) : null}
        </div>
        {row.fullName ? (
          <div className="truncate text-xs text-muted-foreground">
            {row.email}
          </div>
        ) : null}
      </div>
    </div>
  )
}
