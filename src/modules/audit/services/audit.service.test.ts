import { describe, expect, it, vi } from "vitest";

import { auditLogs } from "@/db/schema";

import { auditService, type DbExecutor } from "./audit.service";

describe("auditService.record", () => {
  it("inserts the exact fields using the given executor", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    await auditService.record({ insert } as unknown as DbExecutor, {
      actorUserId: "u1",
      action: "staff.granted",
      entityType: "user",
      entityId: "u2",
      metadata: { to: "admin" },
    });
    expect(insert).toHaveBeenCalledWith(auditLogs);
    expect(values).toHaveBeenCalledWith({
      actorUserId: "u1",
      action: "staff.granted",
      entityType: "user",
      entityId: "u2",
      metadata: { to: "admin" },
    });
  });

  it("stores null metadata and actor when omitted", async () => {
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn().mockReturnValue({ values });
    await auditService.record({ insert } as unknown as DbExecutor, {
      actorUserId: null,
      action: "user.anonymized",
      entityType: "user",
      entityId: "u2",
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ actorUserId: null, metadata: null }),
    );
  });

  it.each(["user.updated", "user.deleted", "organizer.removed"] as const)(
    "accepts the %s action",
    async (action) => {
      const values = vi.fn().mockResolvedValue(undefined);
      const insert = vi.fn().mockReturnValue({ values });
      await auditService.record({ insert } as unknown as DbExecutor, {
        actorUserId: "u1",
        action,
        entityType: "user",
        entityId: "u2",
      });
      expect(values).toHaveBeenCalledWith(expect.objectContaining({ action }));
    },
  );
});
