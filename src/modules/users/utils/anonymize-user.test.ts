import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  record: vi.fn(),
  set: vi.fn(),
  where: vi.fn(),
}));

vi.mock("@/modules/audit/services/audit.service", () => ({
  auditService: { record: mocks.record },
}));

import { anonymizeUser } from "./anonymize-user";

const tx = {
  update: () => ({
    set: (values: unknown) => {
      mocks.set(values);
      return { where: mocks.where };
    },
  }),
} as never;

beforeEach(() => vi.clearAllMocks());

describe("anonymizeUser", () => {
  it("clears PII and sets deleted_at", async () => {
    await anonymizeUser(tx, { id: "u1" }, null);
    expect(mocks.set).toHaveBeenCalledWith({
      email: "deleted+u1@deleted.invalid",
      fullName: null,
      avatarUrl: null,
      phone: null,
      authProviders: [],
      staffRole: null,
      deletedAt: expect.any(Date),
      deactivatedAt: expect.any(Date),
    });
  });

  it("audits user.deleted with the actor", async () => {
    await anonymizeUser(tx, { id: "u1" }, "boss");
    expect(mocks.record).toHaveBeenCalledWith(tx, {
      actorUserId: "boss",
      action: "user.deleted",
      entityType: "user",
      entityId: "u1",
    });
  });

  it("audits user.anonymized without actor", async () => {
    await anonymizeUser(tx, { id: "u1" }, null);
    expect(mocks.record).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ actorUserId: null, action: "user.anonymized" }),
    );
  });
});
