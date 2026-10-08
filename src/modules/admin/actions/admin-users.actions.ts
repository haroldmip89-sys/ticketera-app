"use server"

import { revalidatePath } from "next/cache"
import type { ZodType } from "zod"

import { checkPermission } from "@/lib/auth/guards"
import type { Permission } from "@/lib/auth/permissions"
import {
  userRolesService,
  type RoleServiceError,
  type RoleServiceResult,
} from "@/modules/users/services/user-roles.service"

import {
  createOrganizerSchema,
  deleteUserSchema,
  inviteUserSchema,
  setOrganizerStatusSchema,
  setStaffRoleSchema,
  setUserActiveSchema,
  updateUserSchema,
} from "../schemas/admin-user.schema"
import type { AdminActionResult } from "../types/admin-user.types"

type FailedResult = Extract<AdminActionResult, { ok: false }>

const USERS_PATH = "/admin/users"

type ActionError = RoleServiceError | "blocked" | "invalid-change"
type ErrorEntry = { code: FailedResult["code"]; message: string }

const BLOCKER_LABELS: Record<string, string> = {
  "pending-orders": "compras pendientes",
  "valid-tickets": "entradas vigentes",
  "published-events": "eventos publicados",
}

const ERROR_MESSAGES: Record<
  ActionError,
  { code: FailedResult["code"]; message: string }
> = {
  forbidden: {
    code: "forbidden",
    message: "No tienes permiso para realizar esta acción.",
  },
  self: {
    code: "self",
    message: "No puedes realizar esta acción sobre tu propia cuenta.",
  },
  "protected-target": {
    code: "protected-target",
    message: "Esta cuenta está protegida y no se puede modificar.",
  },
  "not-found": { code: "not-found", message: "No se encontró el usuario." },
  conflict: {
    code: "conflict",
    message: "Ya existe una invitación pendiente para este correo.",
  },
  "clerk-failed": {
    code: "failed",
    message: "No se pudo completar la acción. Inténtalo de nuevo.",
  },
  blocked: { code: "blocked", message: "No se puede eliminar." },
  "invalid-change": {
    code: "invalid",
    message: "Revisa los datos ingresados.",
  },
}

function blockedMessage(blockers: unknown): string {
  const labels = (Array.isArray(blockers) ? blockers : [])
    .map((b) => BLOCKER_LABELS[String(b)])
    .filter(Boolean)
  return labels.length
    ? `No se puede eliminar: tiene ${labels.join(" / ")}.`
    : ERROR_MESSAGES.blocked.message
}

const PERMISSION_MESSAGES = {
  "signed-out": "Inicia sesión para continuar.",
  forbidden: "No tienes permiso para realizar esta acción.",
} as const

const SYNC_WARNING =
  "El cambio se guardó, pero la sincronización con el proveedor de acceso falló."

async function run<T, R extends Record<string, unknown>>(
  permission: Permission,
  schema: ZodType<T>,
  input: unknown,
  call: (actorId: string, data: T) => Promise<RoleServiceResult<R>>,
  successMessage: (data: T, result: R) => string,
  overrides: Partial<Record<ActionError, ErrorEntry>> = {},
): Promise<AdminActionResult> {
  const check = await checkPermission(permission)
  if (!check.ok) {
    return {
      ok: false,
      code: check.reason,
      message: PERMISSION_MESSAGES[check.reason],
    }
  }

  const parsed = schema.safeParse(input)
  if (!parsed.success) {
    return {
      ok: false,
      code: "invalid",
      message: "Revisa los datos ingresados.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    }
  }

  let result: RoleServiceResult<R>
  try {
    result = await call(check.context.userId, parsed.data)
  } catch {
    return {
      ok: false,
      code: "failed",
      message: "No se pudo completar la acción. Inténtalo de nuevo.",
    }
  }
  if (!result.ok) {
    const error = result.error as ActionError
    if (error === "blocked" && !overrides.blocked) {
      return {
        ok: false,
        code: "blocked",
        message: blockedMessage((result as { blockers?: unknown }).blockers),
      }
    }
    return { ok: false, ...(overrides[error] ?? ERROR_MESSAGES[error]) }
  }

  revalidatePath(USERS_PATH)
  return {
    ok: true,
    message: successMessage(parsed.data, result as unknown as R),
    ...(result.warning ? { warning: SYNC_WARNING } : {}),
  }
}

export async function inviteUserAction(
  input: unknown,
): Promise<AdminActionResult> {
  const requestedRole =
    typeof input === "object" && input !== null && "role" in input
      ? (input as { role: unknown }).role
      : undefined
  const permission: Permission =
    requestedRole === "admin" ? "staff:manage" : "organizers:manage"

  return run(
    permission,
    inviteUserSchema,
    input,
    (actorId, data) =>
      userRolesService.inviteUser({
        actorId,
        email: data.email,
        role: data.role,
        organizerDisplayName:
          "organizerDisplayName" in data ? data.organizerDisplayName : undefined,
      }),
    (_data, result) =>
      result.outcome === "invited"
        ? "Invitación enviada."
        : "Rol aplicado al usuario existente.",
  )
}

export async function setStaffRoleAction(
  input: unknown,
): Promise<AdminActionResult> {
  return run(
    "staff:manage",
    setStaffRoleSchema,
    input,
    (actorId, data) =>
      userRolesService.setStaffRole({
        actorId,
        targetId: data.userId,
        staffRole: data.staffRole,
      }),
    (data) =>
      data.staffRole
        ? "Administrador asignado."
        : "Rol de administrador revocado.",
  )
}

export async function createOrganizerAction(
  input: unknown,
): Promise<AdminActionResult> {
  return run(
    "organizers:manage",
    createOrganizerSchema,
    input,
    (actorId, data) =>
      userRolesService.createOrganizer({
        actorId,
        targetId: data.userId,
        displayName: data.displayName,
      }),
    () => "Organizador creado.",
  )
}

export async function setOrganizerStatusAction(
  input: unknown,
): Promise<AdminActionResult> {
  return run(
    "organizers:suspend",
    setOrganizerStatusSchema,
    input,
    (actorId, data) =>
      userRolesService.setOrganizerStatus({
        actorId,
        targetId: data.userId,
        status: data.status,
        reason: data.reason,
      }),
    (data) =>
      data.status === "suspended"
        ? "Organizador suspendido."
        : "Organizador reactivado.",
  )
}

export async function setUserActiveAction(
  input: unknown,
): Promise<AdminActionResult> {
  return run(
    "users:deactivate",
    setUserActiveSchema,
    input,
    (actorId, data) =>
      userRolesService.setUserActive({
        actorId,
        targetId: data.userId,
        active: data.active,
      }),
    (data) => (data.active ? "Usuario reactivado." : "Usuario desactivado."),
  )
}

export async function updateUserAction(
  input: unknown,
): Promise<AdminActionResult> {
  return run(
    "users:edit",
    updateUserSchema,
    input,
    (actorId, data) =>
      userRolesService.updateUser({
        actorId,
        targetId: data.userId,
        fullName: data.fullName,
        role: data.role,
        organizerStatus: data.organizerStatus,
        reason: data.reason,
      }),
    () => "Cambios guardados.",
    {
      conflict: {
        code: "conflict",
        message: "Tiene eventos; suspéndelo en su lugar.",
      },
    },
  )
}

export async function deleteUserAction(
  input: unknown,
): Promise<AdminActionResult> {
  return run(
    "users:delete",
    deleteUserSchema,
    input,
    (actorId, data) =>
      userRolesService.deleteUser({ actorId, targetId: data.userId }),
    () => "Usuario eliminado.",
  )
}
