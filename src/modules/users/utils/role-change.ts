import type { StaffRole } from "@/lib/auth/permissions";

export type PrimaryRole = "super_admin" | "admin" | "organizer" | "customer";
export type EditableRole = "customer" | "organizer" | "admin";
export type RoleOp =
  | "grant-admin"
  | "revoke-admin"
  | "create-organizer"
  | "remove-organizer";

type RoleState = { staffRole: StaffRole | null; hasOrganizer: boolean };

export function getPrimaryRole(s: RoleState): PrimaryRole {
  if (s.staffRole === "super_admin") return "super_admin";
  if (s.staffRole === "admin") return "admin";
  return s.hasOrganizer ? "organizer" : "customer";
}

/** Operaciones necesarias para pasar de `current` al rol deseado; `[]` si ya coincide. */
export function planRoleChange(
  current: RoleState,
  desired: EditableRole,
): RoleOp[] {
  const isAdmin = current.staffRole === "admin";
  const ops: RoleOp[] = [];
  switch (desired) {
    case "admin":
      if (!isAdmin) ops.push("grant-admin");
      break;
    case "organizer":
      if (isAdmin) ops.push("revoke-admin");
      if (!current.hasOrganizer) ops.push("create-organizer");
      break;
    case "customer":
      if (isAdmin) ops.push("revoke-admin");
      if (current.hasOrganizer) ops.push("remove-organizer");
      break;
  }
  return ops;
}
