import { and, count, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";

import { getDb } from "@/db/client";
import {
  organizerProfiles,
  userInvitations,
  users,
  type OrganizerProfile,
  type User,
} from "@/db/schema";
import type { AccessContext } from "@/lib/auth/guards";
import { getPermissions } from "@/lib/auth/permissions";
import { auditService } from "@/modules/audit/services/audit.service";

import type {
  AdminUserRow,
  ClerkUserSnapshot,
  ORGANIZER_STATUS_FILTERS,
  USER_ROLE_FILTERS,
} from "../types/user.types";
import { anonymizeUser } from "../utils/anonymize-user";
import { uniqueOrganizerSlug, type Tx } from "../utils/organizer-slug";
import { clerkAdminService } from "./clerk-admin.service";

export class MissingEmailError extends Error {
  constructor(clerkUserId: string) {
    super(`Clerk user ${clerkUserId} has no email address`);
    this.name = "MissingEmailError";
  }
}

type AccessRow = { user: User; organizer: OrganizerProfile | null };

async function findAccessRow(clerkUserId: string): Promise<AccessRow | null> {
  const [row] = await getDb()
    .select({ user: users, organizer: organizerProfiles })
    .from(users)
    .leftJoin(organizerProfiles, eq(organizerProfiles.userId, users.id))
    .where(eq(users.clerkUserId, clerkUserId))
    .limit(1);
  return row ?? null;
}

function toAccessContext({ user, organizer }: AccessRow): AccessContext | null {
  if (user.deletedAt || user.deactivatedAt) return null;
  const organizerRef = organizer
    ? { id: organizer.id, status: organizer.status }
    : null;
  return {
    userId: user.id,
    clerkUserId: user.clerkUserId,
    email: user.email,
    displayName: user.fullName,
    staffRole: user.staffRole,
    organizer: organizerRef,
    permissions: getPermissions({
      staffRole: user.staffRole,
      organizerStatus: organizerRef?.status ?? null,
    }),
  };
}

function isSuperAdminEmail(email: string): boolean {
  const configured = process.env.SUPER_ADMIN_EMAIL?.trim();
  return !!configured && configured.toLowerCase() === email.toLowerCase();
}

type SyncResult = {
  userId: string;
  created: boolean;
  staffRole: User["staffRole"];
  isOrganizer: boolean;
  roleChanged: boolean;
};

async function applyPendingInvitation(
  tx: Tx,
  user: { id: string; staffRole: User["staffRole"] },
  email: string,
) {
  const [invitation] = await tx
    .select()
    .from(userInvitations)
    .where(
      and(
        sql`lower(${userInvitations.email}) = ${email.toLowerCase()}`,
        eq(userInvitations.status, "pending"),
      ),
    )
    .limit(1);
  if (!invitation) return null;

  let staffRole = user.staffRole;
  let isOrganizer = false;
  if (invitation.role === "admin") {
    if (staffRole !== "super_admin") {
      staffRole = "admin";
      await tx.update(users).set({ staffRole }).where(eq(users.id, user.id));
      await auditService.record(tx, {
        actorUserId: invitation.invitedBy,
        action: "staff.granted",
        entityType: "user",
        entityId: user.id,
        metadata: { to: "admin", via: "invitation" },
      });
    }
  } else {
    const displayName = invitation.organizerDisplayName ?? email;
    const slug = await uniqueOrganizerSlug(tx, displayName);
    const [profile] = await tx
      .insert(organizerProfiles)
      .values({
        userId: user.id,
        displayName,
        slug,
        status: "active", // TEMPORAL (D5): sin Stripe Connect
      })
      .onConflictDoNothing({ target: organizerProfiles.userId })
      .returning({ id: organizerProfiles.id });
    isOrganizer = true;
    if (profile) {
      await auditService.record(tx, {
        actorUserId: invitation.invitedBy,
        action: "organizer.created",
        entityType: "organizer_profile",
        entityId: profile.id,
        metadata: { displayName, via: "invitation" },
      });
    }
  }

  await tx
    .update(userInvitations)
    .set({ status: "accepted", acceptedUserId: user.id, acceptedAt: new Date() })
    .where(eq(userInvitations.id, invitation.id));
  await auditService.record(tx, {
    actorUserId: invitation.invitedBy,
    action: "invitation.accepted",
    entityType: "user_invitation",
    entityId: invitation.id,
    metadata: { email, role: invitation.role },
  });
  return { staffRole, isOrganizer };
}

async function syncUser(
  snapshot: ClerkUserSnapshot,
  email: string,
): Promise<SyncResult> {
  return getDb().transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: users.id, staffRole: users.staffRole, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.clerkUserId, snapshot.clerkUserId))
      .limit(1);

    // Un user.updated tardio no debe reescribir datos de una cuenta ya anonimizada.
    if (existing?.deletedAt) {
      return {
        userId: existing.id,
        created: false,
        staffRole: existing.staffRole,
        isOrganizer: false,
        roleChanged: false,
      };
    }

    const values = {
      email,
      fullName: snapshot.fullName,
      avatarUrl: snapshot.avatarUrl,
      authProviders: snapshot.authProviders,
    };
    const [row] = await tx
      .insert(users)
      .values({ clerkUserId: snapshot.clerkUserId, ...values })
      .onConflictDoUpdate({ target: users.clerkUserId, set: values })
      .returning({ id: users.id, staffRole: users.staffRole });

    let staffRole = row.staffRole;
    let roleChanged = false;

    if (
      snapshot.emailVerified &&
      isSuperAdminEmail(email) &&
      staffRole !== "super_admin"
    ) {
      await tx
        .update(users)
        .set({ staffRole: "super_admin" })
        .where(eq(users.id, row.id));
      await auditService.record(tx, {
        actorUserId: null,
        action: "staff.bootstrapped",
        entityType: "user",
        entityId: row.id,
        metadata: { from: staffRole, to: "super_admin" },
      });
      staffRole = "super_admin";
      roleChanged = true;
    }

    let isOrganizer = false;
    if (snapshot.emailVerified) {
      const applied = await applyPendingInvitation(
        tx,
        { id: row.id, staffRole },
        email,
      );
      if (applied) {
        roleChanged = true;
        staffRole = applied.staffRole;
        isOrganizer = applied.isOrganizer;
      }
    }

    return {
      userId: row.id,
      created: !existing,
      staffRole,
      isOrganizer,
      roleChanged,
    };
  });
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

// Misma semántica que `getPrimaryRole`.
function roleCondition(
  role: (typeof USER_ROLE_FILTERS)[number] | undefined,
): SQL | undefined {
  switch (role) {
    case "super_admin":
    case "admin":
      return eq(users.staffRole, role);
    case "organizer":
      return and(isNull(users.staffRole), isNotNull(organizerProfiles.id));
    case "customer":
      return and(isNull(users.staffRole), isNull(organizerProfiles.id));
    default:
      return undefined;
  }
}

export const usersService = {
  async getAccessContextByClerkId(
    clerkUserId: string,
  ): Promise<AccessContext | null> {
    const row = await findAccessRow(clerkUserId);
    return row ? toAccessContext(row) : null;
  },

  async ensureAccessContext(
    clerkUserId: string,
    loadSnapshot: () => Promise<ClerkUserSnapshot | null>,
  ): Promise<AccessContext | null> {
    let row = await findAccessRow(clerkUserId);
    // Falta la fila, o es la cuenta del super admin aun sin el rol (bootstrap D4).
    const needsSync =
      !row ||
      (row.user.staffRole !== "super_admin" &&
        !row.user.deletedAt &&
        isSuperAdminEmail(row.user.email));
    if (needsSync) {
      const snapshot = await loadSnapshot();
      if (snapshot?.email) {
        await usersService.ensureUserFromClerk(snapshot);
        row = await findAccessRow(clerkUserId);
      }
    }
    return row ? toAccessContext(row) : null;
  },

  async ensureUserFromClerk(
    snapshot: ClerkUserSnapshot,
  ): Promise<{ userId: string; created: boolean }> {
    if (!snapshot.email) throw new MissingEmailError(snapshot.clerkUserId);
    const result = await syncUser(snapshot, snapshot.email);
    if (result.roleChanged) {
      try {
        await clerkAdminService.syncRoleMetadata(snapshot.clerkUserId, {
          staffRole: result.staffRole,
          isOrganizer: result.isOrganizer,
        });
      } catch (error) {
        // D7: la DB manda; si Clerk falla, la copia no autoritativa se reintenta luego.
        console.error("Failed to sync Clerk role metadata", error);
      }
    }
    return { userId: result.userId, created: result.created };
  },

  async anonymizeByClerkId(clerkUserId: string): Promise<void> {
    await getDb().transaction(async (tx) => {
      const [user] = await tx
        .select({ id: users.id, deletedAt: users.deletedAt })
        .from(users)
        .where(eq(users.clerkUserId, clerkUserId))
        .limit(1);
      if (!user || user.deletedAt) return;
      await anonymizeUser(tx, user, null);
    });
  },

  async listForAdmin(query: {
    q?: string;
    role?: (typeof USER_ROLE_FILTERS)[number];
    status?: (typeof ORGANIZER_STATUS_FILTERS)[number];
    page: number;
    pageSize: number;
  }): Promise<{ rows: AdminUserRow[]; total: number }> {
    const term = query.q?.trim();
    const pattern = term ? `%${escapeLike(term)}%` : null;
    const where = and(
      isNull(users.deletedAt),
      pattern
        ? or(ilike(users.email, pattern), ilike(users.fullName, pattern))
        : undefined,
      roleCondition(query.role),
      query.status ? eq(organizerProfiles.status, query.status) : undefined,
    );
    const db = getDb();
    const [rows, [totalRow]] = await Promise.all([
      db
        .select({ user: users, organizer: organizerProfiles })
        .from(users)
        .leftJoin(organizerProfiles, eq(organizerProfiles.userId, users.id))
        .where(where)
        .orderBy(desc(users.createdAt))
        .limit(query.pageSize)
        .offset((query.page - 1) * query.pageSize),
      db
        .select({ total: count() })
        .from(users)
        .leftJoin(organizerProfiles, eq(organizerProfiles.userId, users.id))
        .where(where),
    ]);
    return {
      rows: rows.map(({ user, organizer }) => ({
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        staffRole: user.staffRole,
        organizer: organizer
          ? { id: organizer.id, status: organizer.status }
          : null,
        authProviders: user.authProviders,
        deactivatedAt: user.deactivatedAt,
        createdAt: user.createdAt,
      })),
      total: totalRow?.total ?? 0,
    };
  },
};
