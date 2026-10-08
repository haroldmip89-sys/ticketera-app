import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  processedAt: null as Date | null,
  set: vi.fn(),
  ensureUserFromClerk: vi.fn(),
  anonymizeByClerkId: vi.fn(),
}));

vi.mock("@/db/client", () => ({
  getDb: () => ({
    insert: () => ({ values: () => ({ onConflictDoNothing: async () => undefined }) }),
    select: () => ({
      from: () => ({ where: async () => [{ processedAt: state.processedAt }] }),
    }),
    update: () => ({
      set: (v: unknown) => {
        state.set(v);
        return { where: async () => undefined };
      },
    }),
  }),
}));
vi.mock("./users.service", () => ({
  usersService: {
    ensureUserFromClerk: state.ensureUserFromClerk,
    anonymizeByClerkId: state.anonymizeByClerkId,
  },
  MissingEmailError: class MissingEmailError extends Error {},
}));
vi.mock("../utils/clerk-user-mapper", () => ({
  fromWebhookUser: (d: { id: string }) => ({ clerkUserId: d.id }),
}));

import { processClerkWebhook } from "./clerk-webhook.service";
import { MissingEmailError } from "./users.service";

beforeEach(() => {
  vi.clearAllMocks();
  state.processedAt = null;
  state.ensureUserFromClerk.mockResolvedValue({ userId: "u", created: true });
});

describe("processClerkWebhook", () => {
  it("processes user.created and marks processed_at", async () => {
    const out = await processClerkWebhook({ id: "m1", type: "user.created", data: { id: "user_1" } });
    expect(out).toBe("processed");
    expect(state.ensureUserFromClerk).toHaveBeenCalledWith({ clerkUserId: "user_1" });
    expect(state.set).toHaveBeenCalledWith({ processedAt: expect.any(Date) });
  });

  it("processes user.updated the same way", async () => {
    await processClerkWebhook({ id: "m2", type: "user.updated", data: { id: "user_1" } });
    expect(state.ensureUserFromClerk).toHaveBeenCalledOnce();
  });

  it("returns duplicate without side effects when already processed", async () => {
    state.processedAt = new Date();
    const out = await processClerkWebhook({ id: "m1", type: "user.created", data: { id: "user_1" } });
    expect(out).toBe("duplicate");
    expect(state.ensureUserFromClerk).not.toHaveBeenCalled();
    expect(state.set).not.toHaveBeenCalled();
  });

  it("reprocesses when the event exists with null processed_at", async () => {
    state.processedAt = null;
    const out = await processClerkWebhook({ id: "m1", type: "user.created", data: { id: "user_1" } });
    expect(out).toBe("processed");
  });

  it("anonymizes on user.deleted", async () => {
    await processClerkWebhook({ id: "m3", type: "user.deleted", data: { id: "user_9" } });
    expect(state.anonymizeByClerkId).toHaveBeenCalledWith("user_9");
  });

  it("ignores other types but marks them processed", async () => {
    const out = await processClerkWebhook({ id: "m4", type: "session.created", data: {} });
    expect(out).toBe("ignored");
    expect(state.set).toHaveBeenCalled();
  });

  it("propagates errors without marking processed_at", async () => {
    state.ensureUserFromClerk.mockRejectedValue(new Error("boom"));
    await expect(
      processClerkWebhook({ id: "m5", type: "user.created", data: { id: "user_1" } }),
    ).rejects.toThrow("boom");
    expect(state.set).not.toHaveBeenCalled();
  });

  it("ignores user events without email and marks them processed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    state.ensureUserFromClerk.mockRejectedValue(new MissingEmailError("user_1"));
    const out = await processClerkWebhook({ id: "m6", type: "user.created", data: { id: "user_1" } });
    expect(out).toBe("ignored");
    expect(warn).toHaveBeenCalled();
    expect(state.set).toHaveBeenCalledWith({ processedAt: expect.any(Date) });
    warn.mockRestore();
  });

  it("ignores user.deleted without a valid id but marks it processed", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const out = await processClerkWebhook({ id: "m7", type: "user.deleted", data: {} });
    expect(out).toBe("ignored");
    expect(state.anonymizeByClerkId).not.toHaveBeenCalled();
    expect(state.set).toHaveBeenCalled();
    warn.mockRestore();
  });
});
