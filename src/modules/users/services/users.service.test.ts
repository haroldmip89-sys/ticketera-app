import type { SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queue: [] as unknown[],
  ops: [] as { method: string; args: unknown[] }[],
  record: vi.fn(),
  syncRoleMetadata: vi.fn(),
}));

// Cadena de Drizzle simulada: cada `await` consume el siguiente resultado de la cola.
function chain(): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_target, prop: string) {
        if (prop === "then") {
          const result = mocks.queue.length ? mocks.queue.shift() : [];
          return (resolve: (value: unknown) => void) => resolve(result);
        }
        return (...args: unknown[]) => {
          mocks.ops.push({ method: prop, args });
          return proxy;
        };
      },
    },
  );
  return proxy;
}

vi.mock("@/db/client", () => {
  const start = (method: string) => (...args: unknown[]) => {
    mocks.ops.push({ method, args });
    return chain();
  };
  const db = {
    select: start("select"),
    insert: start("insert"),
    update: start("update"),
    transaction: (cb: (tx: unknown) => unknown) => cb(db),
  };
  return { getDb: () => db };
});
vi.mock("@/modules/audit/services/audit.service", () => ({
  auditService: { record: mocks.record },
}));
vi.mock("./clerk-admin.service", () => ({
  clerkAdminService: { syncRoleMetadata: mocks.syncRoleMetadata },
}));

import { MissingEmailError, usersService } from "./users.service";

const snapshot = {
  clerkUserId: "clerk_1",
  email: "Boss@Example.com",
  emailVerified: true,
  fullName: "Boss",
  avatarUrl: null,
  authProviders: ["google" as const],
};

const sets = () =>
  mocks.ops.filter((op) => op.method === "set").map((op) => op.args[0]);

beforeEach(() => {
  mocks.queue.length = 0;
  mocks.ops.length = 0;
  vi.clearAllMocks();
  vi.stubEnv("SUPER_ADMIN_EMAIL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("ensureUserFromClerk", () => {
  it("creates the user and reports created", async () => {
    mocks.queue.push([], [{ id: "u1", staffRole: null }], []);
    const result = await usersService.ensureUserFromClerk(snapshot);
    expect(result).toEqual({ userId: "u1", created: true });
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.syncRoleMetadata).not.toHaveBeenCalled();
  });

  it("updates an existing user", async () => {
    mocks.queue.push([{ id: "u1" }], [{ id: "u1", staffRole: null }], []);
    const result = await usersService.ensureUserFromClerk(snapshot);
    expect(result.created).toBe(false);
  });

  it("does not rewrite an already anonymized user", async () => {
    mocks.queue.push([{ id: "u1", staffRole: null, deletedAt: new Date() }]);
    const result = await usersService.ensureUserFromClerk(snapshot);
    expect(result).toEqual({ userId: "u1", created: false });
    expect(mocks.ops.some((op) => op.method === "insert")).toBe(false);
  });

  it("throws MissingEmailError without email", async () => {
    await expect(
      usersService.ensureUserFromClerk({ ...snapshot, email: null }),
    ).rejects.toBeInstanceOf(MissingEmailError);
  });

  it("bootstraps the super admin with verified email and syncs metadata", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAIL", "boss@example.com");
    mocks.queue.push([{ id: "u1" }], [{ id: "u1", staffRole: null }], [], []);
    await usersService.ensureUserFromClerk(snapshot);
    expect(sets()).toContainEqual({ staffRole: "super_admin" });
    expect(mocks.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: "staff.bootstrapped",
        actorUserId: null,
      }),
    );
    expect(mocks.syncRoleMetadata).toHaveBeenCalledWith("clerk_1", {
      staffRole: "super_admin",
      isOrganizer: false,
    });
  });

  it("does not bootstrap an unverified email", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAIL", "boss@example.com");
    mocks.queue.push([{ id: "u1" }], [{ id: "u1", staffRole: null }]);
    await usersService.ensureUserFromClerk({
      ...snapshot,
      emailVerified: false,
    });
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("does not bootstrap without the variable or for another email", async () => {
    mocks.queue.push([{ id: "u1" }], [{ id: "u1", staffRole: null }], []);
    await usersService.ensureUserFromClerk(snapshot);
    vi.stubEnv("SUPER_ADMIN_EMAIL", "other@example.com");
    mocks.queue.push([{ id: "u1" }], [{ id: "u1", staffRole: null }], []);
    await usersService.ensureUserFromClerk(snapshot);
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("is idempotent and never downgrades an existing super admin", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAIL", "boss@example.com");
    mocks.queue.push(
      [{ id: "u1" }],
      [{ id: "u1", staffRole: "super_admin" }],
      [],
    );
    await usersService.ensureUserFromClerk(snapshot);
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.syncRoleMetadata).not.toHaveBeenCalled();
    vi.stubEnv("SUPER_ADMIN_EMAIL", "");
    mocks.queue.push(
      [{ id: "u1" }],
      [{ id: "u1", staffRole: "super_admin" }],
      [],
    );
    await usersService.ensureUserFromClerk(snapshot);
    expect(sets().some((s) => "staffRole" in (s as object))).toBe(false);
  });

  it("applies a pending admin invitation and marks it accepted", async () => {
    mocks.queue.push(
      [{ id: "u1" }],
      [{ id: "u1", staffRole: null }],
      [
        {
          id: "i1",
          role: "admin",
          invitedBy: "boss",
          organizerDisplayName: null,
        },
      ],
    );
    await usersService.ensureUserFromClerk(snapshot);
    expect(sets()).toContainEqual({ staffRole: "admin" });
    expect(sets()).toContainEqual(
      expect.objectContaining({ status: "accepted", acceptedUserId: "u1" }),
    );
    const actions = mocks.record.mock.calls.map((c) => c[1].action);
    expect(actions).toEqual(["staff.granted", "invitation.accepted"]);
    expect(mocks.record.mock.calls[0][1].actorUserId).toBe("boss");
    expect(mocks.syncRoleMetadata).toHaveBeenCalledWith("clerk_1", {
      staffRole: "admin",
      isOrganizer: false,
    });
  });

  it("applies a pending organizer invitation with a unique slug", async () => {
    mocks.queue.push(
      [{ id: "u1" }],
      [{ id: "u1", staffRole: null }],
      [
        {
          id: "i1",
          role: "organizer",
          invitedBy: "boss",
          organizerDisplayName: "Rock Fest",
        },
      ],
      [{ slug: "rock-fest" }],
      [{ id: "o1" }],
    );
    await usersService.ensureUserFromClerk(snapshot);
    const insertValues = mocks.ops
      .filter((op) => op.method === "values")
      .map((op) => op.args[0]);
    expect(insertValues).toContainEqual(
      expect.objectContaining({
        userId: "u1",
        slug: "rock-fest-2",
        status: "active",
      }),
    );
    const actions = mocks.record.mock.calls.map((c) => c[1].action);
    expect(actions).toEqual(["organizer.created", "invitation.accepted"]);
    expect(mocks.syncRoleMetadata).toHaveBeenCalledWith("clerk_1", {
      staffRole: null,
      isOrganizer: true,
    });
  });

  it("does not fail when the Clerk metadata copy fails", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAIL", "boss@example.com");
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.syncRoleMetadata.mockRejectedValueOnce(new Error("clerk down"));
    mocks.queue.push([{ id: "u1" }], [{ id: "u1", staffRole: null }]);
    await expect(
      usersService.ensureUserFromClerk(snapshot),
    ).resolves.toBeDefined();
    spy.mockRestore();
  });
});

describe("anonymizeByClerkId", () => {
  it("anonymizes and audits", async () => {
    mocks.queue.push([{ id: "u1", deletedAt: null }]);
    await usersService.anonymizeByClerkId("clerk_1");
    expect(sets()).toContainEqual(
      expect.objectContaining({
        email: "deleted+u1@deleted.invalid",
        fullName: null,
        avatarUrl: null,
        phone: null,
        authProviders: [],
        staffRole: null,
        deletedAt: expect.any(Date),
        deactivatedAt: expect.any(Date),
      }),
    );
    expect(mocks.record).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ action: "user.anonymized", entityId: "u1" }),
    );
  });

  it("does nothing for unknown or already anonymized users", async () => {
    mocks.queue.push([]);
    await usersService.anonymizeByClerkId("x");
    mocks.queue.push([{ id: "u1", deletedAt: new Date() }]);
    await usersService.anonymizeByClerkId("clerk_1");
    expect(mocks.record).not.toHaveBeenCalled();
    expect(sets()).toHaveLength(0);
  });
});

const userRow = (overrides = {}) => ({
  id: "u1",
  clerkUserId: "clerk_1",
  email: "a@x.com",
  fullName: "A",
  staffRole: null,
  deletedAt: null,
  deactivatedAt: null,
  ...overrides,
});

describe("access context", () => {
  it("builds the context with permissions from the DB", async () => {
    mocks.queue.push([
      {
        user: userRow({ staffRole: "admin" }),
        organizer: { id: "o1", status: "active" },
      },
    ]);
    const context = await usersService.getAccessContextByClerkId("clerk_1");
    expect(context).toMatchObject({
      userId: "u1",
      staffRole: "admin",
      organizer: { id: "o1", status: "active" },
    });
    expect(context?.permissions.has("users:read")).toBe(true);
    expect(context?.permissions.has("events:manage-own")).toBe(true);
  });

  it("returns null for deactivated or anonymized users", async () => {
    mocks.queue.push([
      { user: userRow({ deactivatedAt: new Date() }), organizer: null },
    ]);
    expect(await usersService.getAccessContextByClerkId("clerk_1")).toBeNull();
    mocks.queue.push([
      { user: userRow({ deletedAt: new Date() }), organizer: null },
    ]);
    expect(await usersService.getAccessContextByClerkId("clerk_1")).toBeNull();
  });

  it("ensureAccessContext only loads the snapshot when the row is missing", async () => {
    const load = vi.fn();
    mocks.queue.push([{ user: userRow(), organizer: null }]);
    await usersService.ensureAccessContext("clerk_1", load);
    expect(load).not.toHaveBeenCalled();

    const loadSnapshot = vi.fn().mockResolvedValue(snapshot);
    mocks.queue.push(
      [],
      [],
      [{ id: "u1", staffRole: null }],
      [],
      [{ user: userRow(), organizer: null }],
    );
    const context = await usersService.ensureAccessContext(
      "clerk_1",
      loadSnapshot,
    );
    expect(loadSnapshot).toHaveBeenCalledTimes(1);
    expect(context?.userId).toBe("u1");
  });

  it("ensureAccessContext returns null when there is no row and no snapshot", async () => {
    mocks.queue.push([]);
    expect(
      await usersService.ensureAccessContext("clerk_1", async () => null),
    ).toBeNull();
  });

  it("ensureAccessContext retries bootstrap for the configured super admin email", async () => {
    vi.stubEnv("SUPER_ADMIN_EMAIL", "a@x.com");
    const loadSnapshot = vi
      .fn()
      .mockResolvedValue({ ...snapshot, email: "a@x.com" });
    mocks.queue.push(
      [{ user: userRow(), organizer: null }],
      [{ id: "u1" }],
      [{ id: "u1", staffRole: null }],
      [],
      [],
      [{ user: userRow({ staffRole: "super_admin" }), organizer: null }],
    );
    const context = await usersService.ensureAccessContext(
      "clerk_1",
      loadSnapshot,
    );
    expect(loadSnapshot).toHaveBeenCalled();
    expect(context?.staffRole).toBe("super_admin");
  });
});

describe("listForAdmin", () => {
  it("maps rows, paginates and returns the total", async () => {
    const createdAt = new Date();
    mocks.queue.push(
      [
        {
          user: userRow({ authProviders: ["google"], createdAt }),
          organizer: null,
        },
      ],
      [{ total: 41 }],
    );
    const result = await usersService.listForAdmin({
      q: "a_%",
      page: 3,
      pageSize: 20,
    });
    expect(result.total).toBe(41);
    expect(result.rows[0]).toMatchObject({
      id: "u1",
      organizer: null,
      createdAt,
    });
    expect(mocks.ops.find((op) => op.method === "offset")?.args[0]).toBe(40);
    expect(mocks.ops.find((op) => op.method === "limit")?.args[0]).toBe(20);
  });

  it("applies role, status and search filters and counts with the same join", async () => {
    mocks.queue.push([], [{ total: 0 }]);
    await usersService.listForAdmin({
      q: "ana",
      role: "customer",
      status: "suspended",
      page: 1,
      pageSize: 8,
    });
    const wheres = mocks.ops.filter((op) => op.method === "where");
    expect(wheres).toHaveLength(2);
    expect(wheres[0].args[0]).toBe(wheres[1].args[0]);
    expect(mocks.ops.filter((op) => op.method === "leftJoin")).toHaveLength(2);
  });

  it("builds a different condition per role filter", async () => {
    const seen = new Set<string>();
    for (const role of ["super_admin", "admin", "organizer", "customer"] as const) {
      mocks.ops.length = 0;
      mocks.queue.push([], [{ total: 0 }]);
      await usersService.listForAdmin({ role, page: 1, pageSize: 8 });
      const where = mocks.ops.find((op) => op.method === "where")?.args[0];
      seen.add(new PgDialect().sqlToQuery(where as SQL).sql);
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
