import { and, count, eq, gt, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  events,
  orders,
  organizerProfiles,
  tickets,
  userInvitations,
  users,
  type OrganizerProfile,
  type User,
} from "@/db/schema";
import {
  canManage,
  type ManagedUserAction,
  type OrganizerStatus,
  type StaffRole,
} from "@/lib/auth/permissions";
import { auditService } from "@/modules/audit/services/audit.service";

import { planRoleChange, type EditableRole } from "../utils/role-change";

import { anonymizeUser } from "../utils/anonymize-user";
import { uniqueOrganizerSlug, type Tx } from "../utils/organizer-slug";
import { clerkAdminService } from "./clerk-admin.service";

export type RoleServiceError =
  | "forbidden"
  | "self"
  | "protected-target"
  | "not-found"
  | "conflict"
  | "clerk-failed"
  | "blocked"
  | "invalid-change";

export type DeleteBlocker = "pending-orders" | "valid-tickets" | "published-events";

export type RoleServiceResult<T extends object = object> =
  | ({ ok: true; warning?: "clerk-sync-failed" } & T)
  | { ok: false; error: RoleServiceError; blockers?: DeleteBlocker[] };

type Row = { user: User; organizer: OrganizerProfile | null };
type Effect = () => Promise<void>;
type TxOutcome =
  | { error: RoleServiceError; blockers?: DeleteBlocker[] }
  | { effect: Effect | null; outcome?: "applied" | "invited" };

class ClerkInviteError extends Error {}

const NOOP: TxOutcome = { effect: null };

function subjectOf({ user, organizer }: Row) {
  return {
    id: user.id,
    staffRole: user.staffRole as StaffRole | null,
    organizerStatus: (organizer?.status ?? null) as OrganizerStatus | null,
  };
}

async function loadRow(tx: Tx, id: string): Promise<Row | null> {
  const [row] = await tx
    .select({ user: users, organizer: organizerProfiles })
    .from(users)
    .leftJoin(organizerProfiles, eq(organizerProfiles.userId, users.id))
    .where(eq(users.id, id))
    .limit(1);
  return row ?? null;
}

async function loadActor(tx: Tx, id: string): Promise<Row | null> {
  const row = await loadRow(tx, id);
  return row && !row.user.deletedAt && !row.user.deactivatedAt ? row : null;
}

function syncMetadata(
  clerkUserId: string,
  staffRole: StaffRole | null,
  isOrganizer: boolean,
): Effect {
  return () =>
    clerkAdminService.syncRoleMetadata(clerkUserId, { staffRole, isOrganizer });
}

/** Valida con `canManage` y carga actor y target dentro de la transacción. */
async function authorize(
  tx: Tx,
  actorId: string,
  targetId: string,
  action: ManagedUserAction,
): Promise<{ actor: Row; target: Row } | { error: RoleServiceError }> {
  const actor = await loadActor(tx, actorId);
  if (!actor) return { error: "forbidden" };
  const target = await loadRow(tx, targetId);
  if (!target || target.user.deletedAt) return { error: "not-found" };
  const decision = canManage(subjectOf(actor), action, subjectOf(target));
  if (!decision.ok) return { error: decision.reason };
  return { actor, target };
}

async function execute(
  work: (tx: Tx) => Promise<TxOutcome>,
): Promise<RoleServiceResult<{ outcome?: "applied" | "invited" }>> {
  let result: TxOutcome;
  try {
    result = await getDb().transaction(work);
  } catch (error) {
    if (error instanceof ClerkInviteError) {
      console.error("Failed to create Clerk invitation", error.cause);
      return { ok: false, error: "clerk-failed" };
    }
    throw error;
  }
  if ("error" in result) {
    return {
      ok: false,
      error: result.error,
      ...(result.blockers ? { blockers: result.blockers } : {}),
    };
  }
  let warning: "clerk-sync-failed" | undefined;
  if (result.effect) {
    try {
      await result.effect();
    } catch (error) {
      // D7: la DB ya está confirmada y manda; Clerk se reintenta luego.
      console.error("Failed to sync Clerk", error);
      warning = "clerk-sync-failed";
    }
  }
  return {
    ok: true,
    ...(warning ? { warning } : {}),
    ...(result.outcome ? { outcome: result.outcome } : {}),
  };
}

async function applyStaffRole(
  tx: Tx,
  actorId: string,
  target: Row,
  staffRole: "admin" | null,
): Promise<TxOutcome> {
  const from = target.user.staffRole;
  if (from === staffRole) return NOOP;
  await tx.update(users).set({ staffRole }).where(eq(users.id, target.user.id));
  await auditService.record(tx, {
    actorUserId: actorId,
    action: staffRole ? "staff.granted" : "staff.revoked",
    entityType: "user",
    entityId: target.user.id,
    metadata: { from, to: staffRole },
  });
  return {
    effect: syncMetadata(
      target.user.clerkUserId,
      staffRole,
      target.organizer?.status === "active",
    ),
  };
}

async function insertOrganizer(
  tx: Tx,
  actorId: string,
  userId: string,
  displayName: string,
): Promise<string> {
  const slug = await uniqueOrganizerSlug(tx, displayName);
  const [profile] = await tx
    .insert(organizerProfiles)
    .values({
      userId,
      displayName,
      slug,
      status: "active", // TEMPORAL (D5): sin Stripe Connect
      chargesEnabled: false,
    })
    .returning({ id: organizerProfiles.id });
  await auditService.record(tx, {
    actorUserId: actorId,
    action: "organizer.created",
    entityType: "organizer_profile",
    entityId: profile.id,
    metadata: { displayName, slug },
  });
  return profile.id;
}

async function applyOrganizer(
  tx: Tx,
  actorId: string,
  target: Row,
  displayName: string,
): Promise<TxOutcome> {
  if (target.organizer) return NOOP;
  await insertOrganizer(tx, actorId, target.user.id, displayName);
  return {
    effect: syncMetadata(target.user.clerkUserId, target.user.staffRole, true),
  };
}

async function writeOrganizerStatus(
  tx: Tx,
  actorId: string,
  organizer: Pick<OrganizerProfile, "id" | "status">,
  status: "active" | "suspended",
  reason: string | null,
) {
  const suspended = status === "suspended";
  await tx
    .update(organizerProfiles)
    .set({ status, suspendedReason: suspended ? reason : null })
    .where(eq(organizerProfiles.id, organizer.id));
  await auditService.record(tx, {
    actorUserId: actorId,
    action: suspended ? "organizer.suspended" : "organizer.reactivated",
    entityType: "organizer_profile",
    entityId: organizer.id,
    metadata: {
      from: organizer.status,
      to: status,
      reason: suspended ? reason : null,
    },
  });
}

async function findDeleteBlockers(tx: Tx, target: Row): Promise<DeleteBlocker[]> {
  const [pending] = await tx
    .select({ n: count() })
    .from(orders)
    .where(and(eq(orders.userId, target.user.id), eq(orders.status, "pending")));
  const [valid] = await tx
    .select({ n: count() })
    .from(tickets)
    .innerJoin(events, eq(events.id, tickets.eventId))
    .where(
      and(
        eq(tickets.holderUserId, target.user.id),
        eq(tickets.status, "valid"),
        gt(events.startsAt, new Date()),
      ),
    );
  const [published] = target.organizer
    ? await tx
        .select({ n: count() })
        .from(events)
        .where(
          and(
            eq(events.organizerId, target.organizer.id),
            eq(events.status, "published"),
          ),
        )
    : [{ n: 0 }];
  const blockers: DeleteBlocker[] = [];
  if (pending?.n) blockers.push("pending-orders");
  if (valid?.n) blockers.push("valid-tickets");
  if (published?.n) blockers.push("published-events");
  return blockers;
}

export const userRolesService = {
  setStaffRole(i: {
    actorId: string;
    targetId: string;
    staffRole: "admin" | null;
  }): Promise<RoleServiceResult> {
    return execute(async (tx) => {
      const auth = await authorize(
        tx,
        i.actorId,
        i.targetId,
        i.staffRole ? "grant-admin" : "revoke-admin",
      );
      if ("error" in auth) return auth;
      return applyStaffRole(tx, i.actorId, auth.target, i.staffRole);
    });
  },

  createOrganizer(i: {
    actorId: string;
    targetId: string;
    displayName: string;
  }): Promise<RoleServiceResult> {
    return execute(async (tx) => {
      const auth = await authorize(tx, i.actorId, i.targetId, "create-organizer");
      if ("error" in auth) return auth;
      return applyOrganizer(tx, i.actorId, auth.target, i.displayName);
    });
  },

  setOrganizerStatus(i: {
    actorId: string;
    targetId: string;
    status: "active" | "suspended";
    reason?: string;
  }): Promise<RoleServiceResult> {
    return execute(async (tx) => {
      const auth = await authorize(
        tx,
        i.actorId,
        i.targetId,
        i.status === "suspended" ? "suspend-organizer" : "reactivate-organizer",
      );
      if ("error" in auth) return auth;
      const { organizer, user } = auth.target;
      if (!organizer) return { error: "not-found" };
      if (organizer.status === i.status) return NOOP;
      await writeOrganizerStatus(
        tx,
        i.actorId,
        organizer,
        i.status,
        i.reason ?? null,
      );
      return {
        effect: syncMetadata(
          user.clerkUserId,
          user.staffRole,
          i.status === "active",
        ),
      };
    });
  },

  updateUser(i: {
    actorId: string;
    targetId: string;
    fullName?: string;
    role?: EditableRole;
    organizerStatus?: "active" | "suspended";
    reason?: string;
  }): Promise<RoleServiceResult> {
    return execute(async (tx) => {
      const actor = await loadActor(tx, i.actorId);
      if (!actor) return { error: "forbidden" };
      const target = await loadRow(tx, i.targetId);
      if (!target || target.user.deletedAt) return { error: "not-found" };
      const actorSubject = subjectOf(actor);
      const targetSubject = subjectOf(target);
      const allowed = (action: ManagedUserAction) =>
        canManage(actorSubject, action, targetSubject);
      const { user } = target;

      const newName = i.fullName?.trim();
      const nameChanged = !!newName && newName !== user.fullName;
      const ops = i.role
        ? planRoleChange(
            { staffRole: user.staffRole, hasOrganizer: !!target.organizer },
            i.role,
          )
        : [];
      const removesOrganizer = ops.includes("remove-organizer");
      const createsOrganizer = ops.includes("create-organizer");
      const hasProfile = removesOrganizer
        ? false
        : createsOrganizer || !!target.organizer;
      const currentStatus = createsOrganizer
        ? "active"
        : (target.organizer?.status ?? null);
      const statusChanged =
        !!i.organizerStatus && i.organizerStatus !== currentStatus;

      // Todas las validaciones antes de escribir: devolver un error no revierte.
      const required: ManagedUserAction[] = [
        ...(nameChanged ? (["edit-user"] as const) : []),
        ...ops,
        ...(i.organizerStatus && statusChanged
          ? [
              i.organizerStatus === "suspended"
                ? ("suspend-organizer" as const)
                : ("reactivate-organizer" as const),
            ]
          : []),
      ];
      for (const action of required) {
        const decision = allowed(action);
        if (!decision.ok) return { error: decision.reason };
      }
      if (i.organizerStatus && !hasProfile) return { error: "invalid-change" };
      if (removesOrganizer && target.organizer) {
        const [owned] = await tx
          .select({ n: count() })
          .from(events)
          .where(eq(events.organizerId, target.organizer.id));
        if (owned?.n) return { error: "conflict" };
      }
      if (required.length === 0) return NOOP;

      let staffRole = user.staffRole as StaffRole | null;
      let organizer: Pick<OrganizerProfile, "id" | "status"> | null =
        target.organizer;

      if (nameChanged) {
        await tx.update(users).set({ fullName: newName }).where(eq(users.id, user.id));
        await auditService.record(tx, {
          actorUserId: i.actorId,
          action: "user.updated",
          entityType: "user",
          entityId: user.id,
          metadata: { from: user.fullName, to: newName },
        });
      }

      for (const op of ops) {
        if (op === "grant-admin" || op === "revoke-admin") {
          staffRole = op === "grant-admin" ? "admin" : null;
          await applyStaffRole(tx, i.actorId, target, staffRole);
        } else if (op === "create-organizer") {
          const displayName = newName || user.fullName || user.email.split("@")[0];
          const id = await insertOrganizer(tx, i.actorId, user.id, displayName);
          organizer = { id, status: "active" };
        } else if (organizer) {
          await tx
            .delete(organizerProfiles)
            .where(eq(organizerProfiles.id, organizer.id));
          await auditService.record(tx, {
            actorUserId: i.actorId,
            action: "organizer.removed",
            entityType: "organizer_profile",
            entityId: organizer.id,
          });
          organizer = null;
        }
      }

      if (statusChanged && organizer && i.organizerStatus) {
        await writeOrganizerStatus(
          tx,
          i.actorId,
          organizer,
          i.organizerStatus,
          i.reason ?? null,
        );
        organizer = { ...organizer, status: i.organizerStatus };
      }

      const effects: Effect[] = [];
      if (nameChanged && newName) {
        effects.push(() => clerkAdminService.updateName(user.clerkUserId, newName));
      }
      if (ops.length > 0 || statusChanged) {
        const isOrganizer = organizer?.status === "active";
        effects.push(syncMetadata(user.clerkUserId, staffRole, isOrganizer));
      }
      return {
        effect: async () => {
          const results = await Promise.allSettled(effects.map((run) => run()));
          const failed = results.find((r) => r.status === "rejected");
          if (failed) throw failed.reason;
        },
      };
    });
  },

  deleteUser(i: { actorId: string; targetId: string }): Promise<RoleServiceResult> {
    return execute(async (tx) => {
      const auth = await authorize(tx, i.actorId, i.targetId, "delete-user");
      if ("error" in auth) return auth;
      const { user, organizer } = auth.target;
      const blockers = await findDeleteBlockers(tx, auth.target);
      if (blockers.length > 0) return { error: "blocked", blockers };

      if (organizer) {
        await tx
          .update(organizerProfiles)
          .set({ status: "suspended", suspendedReason: "Cuenta eliminada" })
          .where(eq(organizerProfiles.id, organizer.id));
      }
      await anonymizeUser(tx, user, i.actorId);
      return { effect: () => clerkAdminService.deleteUser(user.clerkUserId) };
    });
  },

  setUserActive(i: {
    actorId: string;
    targetId: string;
    active: boolean;
  }): Promise<RoleServiceResult> {
    return execute(async (tx) => {
      const auth = await authorize(
        tx,
        i.actorId,
        i.targetId,
        i.active ? "reactivate-user" : "deactivate-user",
      );
      if ("error" in auth) return auth;
      const { user } = auth.target;
      if (!!user.deactivatedAt === !i.active) return NOOP;
      await tx
        .update(users)
        .set({ deactivatedAt: i.active ? null : new Date() })
        .where(eq(users.id, user.id));
      await auditService.record(tx, {
        actorUserId: i.actorId,
        action: i.active ? "user.reactivated" : "user.deactivated",
        entityType: "user",
        entityId: user.id,
      });
      return {
        effect: () =>
          i.active
            ? clerkAdminService.unbanUser(user.clerkUserId)
            : clerkAdminService.banUser(user.clerkUserId),
      };
    });
  },

  inviteUser(i: {
    actorId: string;
    email: string;
    role: "admin" | "organizer";
    organizerDisplayName?: string;
  }): Promise<RoleServiceResult<{ outcome: "applied" | "invited" }>> {
    const email = i.email.trim().toLowerCase();
    const action = i.role === "admin" ? "grant-admin" : "create-organizer";
    return execute(async (tx) => {
      const actor = await loadActor(tx, i.actorId);
      if (!actor) return { error: "forbidden" };

      const [existingId] = await tx
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.email}) = ${email}`)
        .limit(1);
      const existing = existingId ? await loadRow(tx, existingId.id) : null;

      if (existing && !existing.user.deletedAt) {
        if (existing.user.deactivatedAt) return { error: "conflict" };
        const decision = canManage(subjectOf(actor), action, subjectOf(existing));
        if (!decision.ok) return { error: decision.reason };
        const applied =
          i.role === "admin"
            ? await applyStaffRole(tx, i.actorId, existing, "admin")
            : await applyOrganizer(
                tx,
                i.actorId,
                existing,
                i.organizerDisplayName ?? email,
              );
        return "error" in applied ? applied : { ...applied, outcome: "applied" };
      }

      // Sin usuario: solo se evalúa el permiso del actor (no hay target aún).
      const decision = canManage(subjectOf(actor), action, {
        id: "",
        staffRole: null,
        organizerStatus: null,
      });
      if (!decision.ok) return { error: decision.reason };

      const [pending] = await tx
        .select({ id: userInvitations.id })
        .from(userInvitations)
        .where(
          and(
            sql`lower(${userInvitations.email}) = ${email}`,
            eq(userInvitations.status, "pending"),
          ),
        )
        .limit(1);
      if (pending) return { error: "conflict" };

      const [invitation] = await tx
        .insert(userInvitations)
        .values({
          email,
          role: i.role,
          organizerDisplayName:
            i.role === "organizer" ? (i.organizerDisplayName ?? null) : null,
          invitedBy: i.actorId,
        })
        .returning({ id: userInvitations.id });
      await auditService.record(tx, {
        actorUserId: i.actorId,
        action: "user.invited",
        entityType: "user_invitation",
        entityId: invitation.id,
        metadata: { email, role: i.role },
      });

      try {
        const { clerkInvitationId } = await clerkAdminService.inviteByEmail({
          email,
          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`,
        });
        await tx
          .update(userInvitations)
          .set({ clerkInvitationId })
          .where(eq(userInvitations.id, invitation.id));
      } catch (cause) {
        // Lanzar revierte la transacción: no queda invitación huérfana (D6).
        throw new ClerkInviteError("Clerk invitation failed", { cause });
      }
      return { effect: null, outcome: "invited" };
    }) as Promise<RoleServiceResult<{ outcome: "applied" | "invited" }>>;
  },
};
