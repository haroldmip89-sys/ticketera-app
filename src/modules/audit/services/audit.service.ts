import type { Database } from "@/db/client";
import { auditLogs } from "@/db/schema";

/** `db` o una transacción: solo se necesita `insert`. */
export type DbExecutor = Pick<Database, "insert">;

export type AuditAction =
  | "staff.bootstrapped"
  | "staff.granted"
  | "staff.revoked"
  | "organizer.created"
  | "organizer.suspended"
  | "organizer.reactivated"
  | "user.invited"
  | "invitation.accepted"
  | "user.deactivated"
  | "user.reactivated"
  | "user.anonymized"
  | "user.updated"
  | "user.deleted"
  | "organizer.removed";

export type AuditEntry = {
  actorUserId: string | null;
  action: AuditAction;
  entityType: "user" | "organizer_profile" | "user_invitation";
  entityId: string;
  metadata?: Record<string, unknown>;
};

export const auditService = {
  async record(executor: DbExecutor, entry: AuditEntry): Promise<void> {
    await executor.insert(auditLogs).values({
      actorUserId: entry.actorUserId,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      metadata: entry.metadata ?? null,
    });
  },
};
