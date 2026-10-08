import type {
  ManagedUserAction,
  ManagementLock,
  OrganizerStatus,
} from "@/lib/auth/permissions"
import type { AdminUserRow } from "@/modules/users/types/user.types"
import type { PrimaryRole } from "@/modules/users/utils/role-change"

import type { AdminUserListItem } from "../types/admin-user.types"

export const ROLE_LABELS: Record<PrimaryRole, string> = {
  super_admin: "Super admin",
  admin: "Administrador",
  organizer: "Organizador",
  customer: "Cliente",
}

export const ORGANIZER_STATUS_LABELS: Record<OrganizerStatus, string> = {
  active: "Aprobado",
  onboarding: "Pendiente",
  suspended: "Suspendido",
}

export const LOCK_LABELS: Record<ManagementLock, string> = {
  self: "Tu cuenta",
  protected: "Cuenta protegida",
  "super-admin-only": "Solo el super admin",
}

export function getDisplayName(
  u: Pick<AdminUserRow, "fullName" | "email">,
): string {
  return u.fullName?.trim() || u.email
}

/** Dos letras en mayúsculas: iniciales de las dos primeras palabras o las dos primeras letras. */
export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  const letters =
    words.length > 1 ? `${words[0][0]}${words[1][0]}` : words[0].slice(0, 2)
  return letters.toUpperCase()
}

/** Acciones permitidas que además tienen sentido para el estado actual de la fila. */
export function getApplicableActions(
  row: AdminUserListItem,
): ManagedUserAction[] {
  return row.allowedActions.filter((action) => {
    switch (action) {
      case "grant-admin":
        return row.staffRole === null
      case "revoke-admin":
        return row.staffRole === "admin"
      case "create-organizer":
        return row.organizer === null
      case "remove-organizer":
        return row.organizer !== null
      case "suspend-organizer":
        return row.organizer !== null && row.organizer.status !== "suspended"
      case "reactivate-organizer":
        return row.organizer !== null && row.organizer.status !== "active"
      case "deactivate-user":
        return row.deactivatedAt === null
      case "reactivate-user":
        return row.deactivatedAt !== null
      case "edit-user":
      case "delete-user":
        return true
    }
  })
}

const registrationDateFormat = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "medium",
  timeZone: "UTC",
})

export function formatRegistrationDate(date: Date): string {
  return registrationDateFormat.format(date)
}
