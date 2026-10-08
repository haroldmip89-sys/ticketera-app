import { eq } from "drizzle-orm";

import { users } from "@/db/schema";
import { auditService } from "@/modules/audit/services/audit.service";

import type { Tx } from "./organizer-slug";

/**
 * Anonimiza la fila (sin PII, sin rol) y audita: `user.deleted` si lo hace un
 * actor, `user.anonymized` si viene del webhook (`actorUserId` null).
 */
export async function anonymizeUser(
  tx: Tx,
  user: { id: string },
  actorUserId: string | null,
): Promise<void> {
  const now = new Date();
  await tx
    .update(users)
    .set({
      email: `deleted+${user.id}@deleted.invalid`,
      fullName: null,
      avatarUrl: null,
      phone: null,
      authProviders: [],
      staffRole: null,
      deletedAt: now,
      deactivatedAt: now,
    })
    .where(eq(users.id, user.id));
  await auditService.record(tx, {
    actorUserId,
    action: actorUserId ? "user.deleted" : "user.anonymized",
    entityType: "user",
    entityId: user.id,
  });
}
