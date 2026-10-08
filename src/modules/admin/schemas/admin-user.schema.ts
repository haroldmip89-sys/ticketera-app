import { z } from "zod"

import {
  ORGANIZER_STATUS_FILTERS,
  USER_ROLE_FILTERS,
} from "@/modules/users/types/user.types"

const userId = z.string().uuid("Identificador de usuario inválido")

const displayName = z
  .string()
  .trim()
  .min(2, "El nombre debe tener al menos 2 caracteres")
  .max(80, "El nombre no puede superar los 80 caracteres")

export const inviteUserSchema = z
  .object({
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Ingresa el correo")
      .pipe(z.email("Ingresa un correo válido")),
    role: z.enum(["admin", "organizer"], { error: "Elige un rol" }),
    organizerDisplayName: z.string().trim().optional(),
  })
  .transform((value, ctx) => {
    if (value.role === "admin") {
      return { email: value.email, role: value.role }
    }
    const parsed = displayName.safeParse(value.organizerDisplayName ?? "")
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        ctx.addIssue({
          code: "custom",
          path: ["organizerDisplayName"],
          message:
            (value.organizerDisplayName ?? "") === ""
              ? "Ingresa el nombre del organizador"
              : issue.message,
        })
      }
      return z.NEVER
    }
    return {
      email: value.email,
      role: value.role,
      organizerDisplayName: parsed.data,
    }
  })

export const setStaffRoleSchema = z.object({
  userId,
  staffRole: z.enum(["admin"]).nullable(),
})

export const createOrganizerSchema = z.object({ userId, displayName })

export const setOrganizerStatusSchema = z
  .object({
    userId,
    status: z.enum(["active", "suspended"]),
    reason: z
      .string()
      .trim()
      .max(280, "El motivo no puede superar los 280 caracteres")
      .optional(),
  })
  .refine((v) => v.status !== "suspended" || !!v.reason, {
    path: ["reason"],
    message: "Ingresa el motivo de la suspensión",
  })

export const setUserActiveSchema = z.object({ userId, active: z.boolean() })

export const USERS_PAGE_SIZES = [8, 16, 24] as const

export const listUsersQuerySchema = z.object({
  q: z
    .string()
    .transform((s) => s.trim().slice(0, 100))
    .optional()
    .catch(undefined),
  role: z.enum(USER_ROLE_FILTERS).optional().catch(undefined),
  status: z.enum(ORGANIZER_STATUS_FILTERS).optional().catch(undefined),
  page: z.coerce.number().int().min(1).default(1).catch(1),
  pageSize: z.coerce
    .number()
    .refine((n) => (USERS_PAGE_SIZES as readonly number[]).includes(n))
    .default(8)
    .catch(8),
})

export const updateUserSchema = z
  .object({
    userId,
    fullName: displayName.optional(),
    role: z.enum(["customer", "organizer", "admin"]).optional(),
    organizerStatus: z.enum(["active", "suspended"]).optional(),
    reason: z
      .string()
      .trim()
      .max(280, "El motivo no puede superar los 280 caracteres")
      .optional(),
  })
  .refine((v) => v.organizerStatus !== "suspended" || !!v.reason, {
    path: ["reason"],
    message: "Ingresa el motivo de la suspensión",
  })
  .refine(
    (v) =>
      v.fullName !== undefined ||
      v.role !== undefined ||
      v.organizerStatus !== undefined,
    { message: "No hay cambios que guardar" },
  )

export const deleteUserSchema = z.object({ userId })

export type InviteUserInput = z.input<typeof inviteUserSchema>
export type InviteUserData = z.output<typeof inviteUserSchema>
export type ListUsersQuery = z.output<typeof listUsersQuerySchema>
export type UpdateUserInput = z.input<typeof updateUserSchema>
