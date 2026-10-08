import type {
  ManagedUserAction,
  ManagementLock,
} from "@/lib/auth/permissions"
import type { AdminUserRow } from "@/modules/users/types/user.types"

export type AdminActionErrorCode =
  | "signed-out"
  | "forbidden"
  | "invalid"
  | "self"
  | "protected-target"
  | "not-found"
  | "conflict"
  | "blocked"
  | "failed"

export type AdminActionResult =
  | { ok: true; message: string; warning?: string }
  | {
      ok: false
      code: AdminActionErrorCode
      message: string
      fieldErrors?: Record<string, string[]>
    }

export type AdminUserListItem = AdminUserRow & {
  isSelf: boolean
  allowedActions: ManagedUserAction[]
  lock: ManagementLock | null
}
