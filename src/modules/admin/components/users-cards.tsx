import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

import type { AdminUserListItem } from "../types/admin-user.types"
import { formatRegistrationDate } from "../utils/user-presentation"
import { OrganizerStatusBadge, RoleBadge, UserIdentity } from "./user-badges"
import { UserRowActions } from "./user-row-actions"

export type UsersCardsProps = { rows: AdminUserListItem[] }

export function UsersCards({ rows }: UsersCardsProps) {
  if (rows.length === 0) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyTitle>Sin resultados</EmptyTitle>
          <EmptyDescription>Ningún usuario coincide con los filtros.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Link
            href="/admin/users"
            className={cn(buttonVariants({ variant: "outline" }), "min-h-11")}
          >
            Limpiar filtros
          </Link>
        </EmptyContent>
      </Empty>
    )
  }

  return (
    <ul aria-label="Lista de usuarios" className="flex flex-col gap-2.5">
      {rows.map((row) => (
        <li
          key={row.id}
          className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-3.5"
        >
          <UserIdentity row={row} />
          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge row={row} />
            {row.organizer ? (
              <OrganizerStatusBadge status={row.organizer.status} />
            ) : null}
            <span className="ml-auto text-xs text-muted-foreground">
              {formatRegistrationDate(row.createdAt)}
            </span>
          </div>
          <UserRowActions user={row} layout="labeled" />
        </li>
      ))}
    </ul>
  )
}
