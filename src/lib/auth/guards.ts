import { auth, currentUser } from "@clerk/nextjs/server";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { usersService } from "@/modules/users/services/users.service";
import { fromBackendUser } from "@/modules/users/utils/clerk-user-mapper";

import { buildSignInHref, ORGANIZER_ONBOARDING_PATH } from "./auth-routes";
import {
  hasPermission,
  type OrganizerStatus,
  type Permission,
  type StaffRole,
} from "./permissions";

export type GuardOptions = { returnTo?: string };

export type AccessContext = {
  userId: string;
  clerkUserId: string;
  email: string;
  displayName: string | null;
  staffRole: StaffRole | null;
  organizer: { id: string; status: OrganizerStatus } | null;
  permissions: ReadonlySet<Permission>;
};

export type OrganizerAccess = "signed-out" | "customer" | "organizer";

export type OrganizerUser = {
  userId: string;
  organizerId: string;
  displayName: string | null;
  email: string | null;
};

export type PermissionCheck =
  | { ok: true; context: AccessContext }
  | { ok: false; reason: "signed-out" | "forbidden" };

type Resolution =
  | { status: "signed-out" }
  | { status: "denied" }
  | { status: "ok"; context: AccessContext };

async function loadSnapshot() {
  const user = await currentUser();
  return user ? fromBackendUser(user) : null;
}

const resolveAccess = cache(async (): Promise<Resolution> => {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return { status: "signed-out" };
  const context = await usersService.ensureAccessContext(
    clerkUserId,
    loadSnapshot,
  );
  return context ? { status: "ok", context } : { status: "denied" };
});

/** Sin sesión, desactivado o anonimizado → null. Memoizada por request. */
export async function getAccessContext(): Promise<AccessContext | null> {
  const resolution = await resolveAccess();
  return resolution.status === "ok" ? resolution.context : null;
}

/** Sin sesión → sign-in; desactivado → "/". */
export async function requireUser(
  options?: GuardOptions,
): Promise<AccessContext> {
  const resolution = await resolveAccess();
  if (resolution.status === "signed-out") {
    redirect(buildSignInHref(options?.returnTo));
  }
  if (resolution.status === "denied") redirect("/");
  return resolution.context;
}

/** Exige perfil de organizador `active`; si no → onboarding. */
export async function requireOrganizer(
  options?: GuardOptions,
): Promise<OrganizerUser> {
  const context = await requireUser(options);
  if (context.organizer?.status !== "active") {
    redirect(ORGANIZER_ONBOARDING_PATH);
  }
  return {
    userId: context.userId,
    organizerId: context.organizer.id,
    displayName: context.displayName,
    email: context.email,
  };
}

/** super_admin cumple "admin". Sin el rol → 404. */
export async function requireStaff(
  min: StaffRole,
  options?: GuardOptions,
): Promise<AccessContext> {
  const context = await requireUser(options);
  const allowed =
    context.staffRole === "super_admin" || context.staffRole === min;
  if (!allowed) notFound();
  return context;
}

/** Para páginas y layouts: sin el permiso → 404. */
export async function requirePermission(
  permission: Permission,
  options?: GuardOptions,
): Promise<AccessContext> {
  const context = await requireUser(options);
  if (!context.permissions.has(permission)) notFound();
  return context;
}

/** Para Server Actions y Route Handlers: devuelve resultado, nunca navega. */
export async function checkPermission(
  permission: Permission,
): Promise<PermissionCheck> {
  const resolution = await resolveAccess();
  if (resolution.status === "signed-out") {
    return { ok: false, reason: "signed-out" };
  }
  if (
    resolution.status === "denied" ||
    !hasPermission(
      {
        staffRole: resolution.context.staffRole,
        organizerStatus: resolution.context.organizer?.status ?? null,
      },
      permission,
    )
  ) {
    return { ok: false, reason: "forbidden" };
  }
  return { ok: true, context: resolution.context };
}

export async function getOrganizerAccess(): Promise<OrganizerAccess> {
  const resolution = await resolveAccess();
  if (resolution.status === "signed-out") return "signed-out";
  if (
    resolution.status === "ok" &&
    resolution.context.organizer?.status === "active"
  ) {
    return "organizer";
  }
  return "customer";
}
