import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

import type { AdminUserListItem } from "../types/admin-user.types"
import { buildUsersHref } from "../utils/users-href"
import { formatRegistrationDate } from "../utils/user-presentation"
import { OrganizerStatusBadge, RoleBadge, UserIdentity } from "./user-badges"
import { UserRowActions } from "./user-row-actions"

export type UsersTableProps = { rows: AdminUserListItem[] }

export function UsersTable({ rows }: UsersTableProps) {
  if (rows.length === 0) {
    return (
      <div className="hidden md:block">
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyTitle>Sin resultados</EmptyTitle>
            <EmptyDescription>
              No encontramos usuarios con esos criterios.
            </EmptyDescription>
          </EmptyHeader>
          <Link
            href={buildUsersHref({})}
            className={cn(buttonVariants({ variant: "outline" }), "focus-ring")}
          >
            Limpiar filtros
          </Link>
        </Empty>
      </div>
    )
  }

  return (
    <div className="hidden rounded-xl border border-border bg-card md:block">
      <Table className="min-w-3xl">
        <caption className="sr-only">Lista de usuarios de la plataforma</caption>
        <TableHeader>
          <TableRow>
            <TableHead scope="col">Usuario</TableHead>
            <TableHead scope="col">Rol</TableHead>
            <TableHead scope="col">Organizador</TableHead>
            <TableHead scope="col">Registro</TableHead>
            <TableHead scope="col">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell>
                <UserIdentity row={row} />
              </TableCell>
              <TableCell>
                <RoleBadge row={row} />
              </TableCell>
              <TableCell>
                {row.organizer ? (
                  <OrganizerStatusBadge status={row.organizer.status} />
                ) : (
                  <span aria-label="Sin perfil de organizador">—</span>
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap text-muted-foreground">
                {formatRegistrationDate(row.createdAt)}
              </TableCell>
              <TableCell>
                <UserRowActions user={row} layout="icons" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
