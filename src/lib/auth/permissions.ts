export type StaffRole = "admin" | "super_admin";
export type OrganizerStatus = "onboarding" | "active" | "suspended";
export type AccessSubject = {
  staffRole: StaffRole | null;
  organizerStatus: OrganizerStatus | null;
};

const ORGANIZER_PERMISSIONS = [
  "events:manage-own",
  "sales:view-own",
  "checkin:own",
  "refunds:own",
] as const;

const ADMIN_PERMISSIONS = [
  "events:moderate",
  "events:feature",
  "organizers:suspend",
  "venues:manage",
  "checkin:any",
  "refunds:any",
  "support:read",
  "users:read",
  "users:edit",
] as const;

const SUPER_ADMIN_PERMISSIONS = [
  "staff:manage",
  "organizers:manage",
  "users:deactivate",
  "users:delete",
  "platform:configure",
] as const;

export const PERMISSIONS = [
  ...ORGANIZER_PERMISSIONS,
  ...ADMIN_PERMISSIONS,
  ...SUPER_ADMIN_PERMISSIONS,
] as const;
export type Permission = (typeof PERMISSIONS)[number];

/** Unión de permisos por rol; un organizador que no está `active` no aporta permisos. */
export function getPermissions(subject: AccessSubject): ReadonlySet<Permission> {
  const result = new Set<Permission>();
  if (subject.organizerStatus === "active") {
    ORGANIZER_PERMISSIONS.forEach((p) => result.add(p));
  }
  if (subject.staffRole === "admin" || subject.staffRole === "super_admin") {
    ADMIN_PERMISSIONS.forEach((p) => result.add(p));
  }
  if (subject.staffRole === "super_admin") {
    SUPER_ADMIN_PERMISSIONS.forEach((p) => result.add(p));
  }
  return result;
}

export function hasPermission(
  subject: AccessSubject,
  permission: Permission,
): boolean {
  return getPermissions(subject).has(permission);
}

export type ManagedUserAction =
  | "grant-admin"
  | "revoke-admin"
  | "create-organizer"
  | "remove-organizer"
  | "suspend-organizer"
  | "reactivate-organizer"
  | "deactivate-user"
  | "reactivate-user"
  | "edit-user"
  | "delete-user";
export type ManagementDenial = "forbidden" | "self" | "protected-target";

type ManagedSubject = AccessSubject & { id: string };

const ACTION_PERMISSION: Record<ManagedUserAction, Permission> = {
  "grant-admin": "staff:manage",
  "revoke-admin": "staff:manage",
  "create-organizer": "organizers:manage",
  "remove-organizer": "organizers:manage",
  "suspend-organizer": "organizers:suspend",
  "reactivate-organizer": "organizers:suspend",
  "deactivate-user": "users:deactivate",
  "reactivate-user": "users:deactivate",
  "edit-user": "users:edit",
  "delete-user": "users:delete",
};

const ACTIONS = Object.keys(ACTION_PERMISSION) as ManagedUserAction[];

/** Orden: self, protected-target (super_admin), forbidden (admin sobre admin o falta el permiso). */
export function canManage(
  actor: ManagedSubject,
  action: ManagedUserAction,
  target: ManagedSubject,
): { ok: true } | { ok: false; reason: ManagementDenial } {
  if (actor.id === target.id) return { ok: false, reason: "self" };
  if (target.staffRole === "super_admin") {
    return { ok: false, reason: "protected-target" };
  }
  if (target.staffRole === "admin" && actor.staffRole !== "super_admin") {
    return { ok: false, reason: "forbidden" };
  }
  if (!hasPermission(actor, ACTION_PERMISSION[action])) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true };
}

/** Acciones que `actor` puede ejecutar sobre `target` (alimenta la UI). */
export function getAllowedActions(
  actor: ManagedSubject,
  target: ManagedSubject,
): ManagedUserAction[] {
  return ACTIONS.filter((action) => canManage(actor, action, target).ok);
}

export type ManagementLock = "self" | "protected" | "super-admin-only";

/** Motivo por el que la fila no admite ninguna acción de gestión (alimenta el candado de la UI). */
export function getManagementLock(
  actor: ManagedSubject,
  target: ManagedSubject,
): ManagementLock | null {
  if (actor.id === target.id) return "self";
  if (target.staffRole === "super_admin") return "protected";
  if (target.staffRole === "admin" && actor.staffRole !== "super_admin") {
    return "super-admin-only";
  }
  return null;
}
