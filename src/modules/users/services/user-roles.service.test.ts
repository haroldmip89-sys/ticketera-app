import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  queue: [] as unknown[],
  ops: [] as { method: string; args: unknown[] }[],
  record: vi.fn(),
  syncRoleMetadata: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  inviteByEmail: vi.fn(),
  updateName: vi.fn(),
  deleteClerkUser: vi.fn(),
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
    delete: start("delete"),
    transaction: (cb: (tx: unknown) => unknown) => cb(db),
  };
  return { getDb: () => db };
});
vi.mock("@/modules/audit/services/audit.service", () => ({
  auditService: { record: mocks.record },
}));
vi.mock("./clerk-admin.service", () => ({
  clerkAdminService: {
    syncRoleMetadata: mocks.syncRoleMetadata,
    banUser: mocks.banUser,
    unbanUser: mocks.unbanUser,
    inviteByEmail: mocks.inviteByEmail,
    updateName: mocks.updateName,
    deleteUser: mocks.deleteClerkUser,
  },
}));

import { userRolesService } from "./user-roles.service";

type Overrides = {
  staffRole?: "admin" | "super_admin" | null;
  deactivatedAt?: Date | null;
  deletedAt?: Date | null;
  fullName?: string | null;
  organizer?: { id: string; status: "active" | "suspended" } | null;
};

function row(id: string, o: Overrides = {}) {
  return {
    user: {
      id,
      clerkUserId: `clerk_${id}`,
      email: `${id}@example.com`,
      fullName: o.fullName === undefined ? "Old Name" : o.fullName,
      staffRole: o.staffRole ?? null,
      deactivatedAt: o.deactivatedAt ?? null,
      deletedAt: o.deletedAt ?? null,
    },
    organizer: o.organizer ?? null,
  };
}

const superAdmin = () => [row("sa", { staffRole: "super_admin" })];
const admin = () => [row("ad", { staffRole: "admin" })];
const target = (o?: Overrides) => [row("t1", o)];

const sets = () =>
  mocks.ops.filter((op) => op.method === "set").map((op) => op.args[0]);
const actions = () => mocks.record.mock.calls.map(([, entry]) => entry.action);

beforeEach(() => {
  mocks.queue.length = 0;
  mocks.ops.length = 0;
  vi.resetAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.test");
});

describe("setStaffRole", () => {
  it("grants admin, audits once and syncs Clerk", async () => {
    mocks.queue.push(superAdmin(), target());
    const result = await userRolesService.setStaffRole({
      actorId: "sa",
      targetId: "t1",
      staffRole: "admin",
    });
    expect(result).toEqual({ ok: true });
    expect(sets()).toEqual([{ staffRole: "admin" }]);
    expect(actions()).toEqual(["staff.granted"]);
    expect(mocks.record.mock.calls[0][1]).toMatchObject({
      actorUserId: "sa",
      entityId: "t1",
      metadata: { from: null, to: "admin" },
    });
    expect(mocks.syncRoleMetadata).toHaveBeenCalledWith("clerk_t1", {
      staffRole: "admin",
      isOrganizer: false,
    });
  });

  it("revokes admin", async () => {
    mocks.queue.push(superAdmin(), target({ staffRole: "admin" }));
    await userRolesService.setStaffRole({
      actorId: "sa",
      targetId: "t1",
      staffRole: null,
    });
    expect(actions()).toEqual(["staff.revoked"]);
  });

  it("is idempotent: no audit, no write, no Clerk call", async () => {
    mocks.queue.push(superAdmin(), target({ staffRole: "admin" }));
    const result = await userRolesService.setStaffRole({
      actorId: "sa",
      targetId: "t1",
      staffRole: "admin",
    });
    expect(result).toEqual({ ok: true });
    expect(mocks.record).not.toHaveBeenCalled();
    expect(sets()).toEqual([]);
    expect(mocks.syncRoleMetadata).not.toHaveBeenCalled();
  });

  it("forbids an admin actor", async () => {
    mocks.queue.push(admin(), target());
    const result = await userRolesService.setStaffRole({
      actorId: "ad",
      targetId: "t1",
      staffRole: "admin",
    });
    expect(result).toEqual({ ok: false, error: "forbidden" });
    expect(sets()).toEqual([]);
  });

  it("forbids a deactivated actor", async () => {
    mocks.queue.push([row("sa", { staffRole: "super_admin", deactivatedAt: new Date() })]);
    const result = await userRolesService.setStaffRole({
      actorId: "sa",
      targetId: "t1",
      staffRole: "admin",
    });
    expect(result).toEqual({ ok: false, error: "forbidden" });
  });

  it("rejects acting on oneself", async () => {
    mocks.queue.push(superAdmin(), superAdmin());
    const result = await userRolesService.setStaffRole({
      actorId: "sa",
      targetId: "sa",
      staffRole: null,
    });
    expect(result).toEqual({ ok: false, error: "self" });
  });

  it("protects super admins", async () => {
    mocks.queue.push(superAdmin(), [row("sa2", { staffRole: "super_admin" })]);
    const result = await userRolesService.setStaffRole({
      actorId: "sa",
      targetId: "sa2",
      staffRole: null,
    });
    expect(result).toEqual({ ok: false, error: "protected-target" });
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("returns not-found for a missing or anonymized target", async () => {
    mocks.queue.push(superAdmin(), []);
    expect(
      await userRolesService.setStaffRole({ actorId: "sa", targetId: "x", staffRole: "admin" }),
    ).toEqual({ ok: false, error: "not-found" });
    mocks.queue.push(superAdmin(), target({ deletedAt: new Date() }));
    expect(
      await userRolesService.setStaffRole({ actorId: "sa", targetId: "t1", staffRole: "admin" }),
    ).toEqual({ ok: false, error: "not-found" });
  });

  it("returns ok with a warning when Clerk fails after commit", async () => {
    mocks.queue.push(superAdmin(), target());
    mocks.syncRoleMetadata.mockRejectedValue(new Error("clerk down"));
    const result = await userRolesService.setStaffRole({
      actorId: "sa",
      targetId: "t1",
      staffRole: "admin",
    });
    expect(result).toEqual({ ok: true, warning: "clerk-sync-failed" });
    expect(mocks.record).toHaveBeenCalledTimes(1);
  });
});

describe("createOrganizer", () => {
  const input = { actorId: "sa", targetId: "t1", displayName: "Rock Producciones" };

  it("creates an active organizer with a slug and audits", async () => {
    mocks.queue.push(superAdmin(), target(), [], [{ id: "o1" }]);
    const result = await userRolesService.createOrganizer(input);
    expect(result).toEqual({ ok: true });
    const inserted = mocks.ops.find((op) => op.method === "values")?.args[0];
    expect(inserted).toMatchObject({
      userId: "t1",
      slug: "rock-producciones",
      status: "active",
      chargesEnabled: false,
    });
    expect(actions()).toEqual(["organizer.created"]);
    expect(mocks.syncRoleMetadata).toHaveBeenCalledWith("clerk_t1", {
      staffRole: null,
      isOrganizer: true,
    });
  });

  it("adds a numeric suffix on slug collision", async () => {
    mocks.queue.push(
      superAdmin(),
      target(),
      [{ slug: "rock-producciones" }, { slug: "rock-producciones-2" }],
      [{ id: "o1" }],
    );
    await userRolesService.createOrganizer(input);
    const inserted = mocks.ops.find((op) => op.method === "values")?.args[0];
    expect(inserted).toMatchObject({ slug: "rock-producciones-3" });
  });

  it("is idempotent when the profile already exists", async () => {
    mocks.queue.push(
      superAdmin(),
      target({ organizer: { id: "o1", status: "active" } }),
    );
    expect(await userRolesService.createOrganizer(input)).toEqual({ ok: true });
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("forbids an admin (Q3)", async () => {
    mocks.queue.push(admin(), target());
    expect(await userRolesService.createOrganizer({ ...input, actorId: "ad" })).toEqual({
      ok: false,
      error: "forbidden",
    });
  });
});

describe("setOrganizerStatus", () => {
  const active = { id: "o1", status: "active" as const };

  it("lets an admin suspend with a reason", async () => {
    mocks.queue.push(admin(), target({ organizer: active }));
    const result = await userRolesService.setOrganizerStatus({
      actorId: "ad",
      targetId: "t1",
      status: "suspended",
      reason: "fraude",
    });
    expect(result).toEqual({ ok: true });
    expect(sets()).toEqual([{ status: "suspended", suspendedReason: "fraude" }]);
    expect(actions()).toEqual(["organizer.suspended"]);
    expect(mocks.syncRoleMetadata).toHaveBeenCalledWith("clerk_t1", {
      staffRole: null,
      isOrganizer: false,
    });
  });

  it("reactivates and clears the reason", async () => {
    mocks.queue.push(
      admin(),
      target({ organizer: { id: "o1", status: "suspended" } }),
    );
    await userRolesService.setOrganizerStatus({
      actorId: "ad",
      targetId: "t1",
      status: "active",
    });
    expect(sets()).toEqual([{ status: "active", suspendedReason: null }]);
    expect(actions()).toEqual(["organizer.reactivated"]);
  });

  it("is idempotent", async () => {
    mocks.queue.push(admin(), target({ organizer: active }));
    await userRolesService.setOrganizerStatus({
      actorId: "ad",
      targetId: "t1",
      status: "active",
    });
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("returns not-found when the target is not an organizer", async () => {
    mocks.queue.push(admin(), target());
    expect(
      await userRolesService.setOrganizerStatus({
        actorId: "ad",
        targetId: "t1",
        status: "suspended",
        reason: "x",
      }),
    ).toEqual({ ok: false, error: "not-found" });
  });

  it("forbids a non-staff actor", async () => {
    mocks.queue.push([row("c1")], target({ organizer: active }));
    expect(
      await userRolesService.setOrganizerStatus({
        actorId: "c1",
        targetId: "t1",
        status: "suspended",
        reason: "x",
      }),
    ).toEqual({ ok: false, error: "forbidden" });
  });
});

describe("setUserActive", () => {
  it("deactivates, audits and bans in Clerk", async () => {
    mocks.queue.push(superAdmin(), target());
    const result = await userRolesService.setUserActive({
      actorId: "sa",
      targetId: "t1",
      active: false,
    });
    expect(result).toEqual({ ok: true });
    expect(sets()[0]).toMatchObject({ deactivatedAt: expect.any(Date) });
    expect(actions()).toEqual(["user.deactivated"]);
    expect(mocks.banUser).toHaveBeenCalledWith("clerk_t1");
  });

  it("reactivates and unbans", async () => {
    mocks.queue.push(superAdmin(), target({ deactivatedAt: new Date() }));
    await userRolesService.setUserActive({
      actorId: "sa",
      targetId: "t1",
      active: true,
    });
    expect(sets()).toEqual([{ deactivatedAt: null }]);
    expect(actions()).toEqual(["user.reactivated"]);
    expect(mocks.unbanUser).toHaveBeenCalledWith("clerk_t1");
  });

  it("is idempotent", async () => {
    mocks.queue.push(superAdmin(), target({ deactivatedAt: new Date() }));
    await userRolesService.setUserActive({ actorId: "sa", targetId: "t1", active: false });
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.banUser).not.toHaveBeenCalled();
  });

  it("keeps the DB change when the ban fails", async () => {
    mocks.queue.push(superAdmin(), target());
    mocks.banUser.mockRejectedValue(new Error("clerk down"));
    expect(
      await userRolesService.setUserActive({ actorId: "sa", targetId: "t1", active: false }),
    ).toEqual({ ok: true, warning: "clerk-sync-failed" });
  });

  it("forbids an admin", async () => {
    mocks.queue.push(admin(), target());
    expect(
      await userRolesService.setUserActive({ actorId: "ad", targetId: "t1", active: false }),
    ).toEqual({ ok: false, error: "forbidden" });
  });
});

describe("inviteUser", () => {
  it("applies admin immediately to an existing user", async () => {
    mocks.queue.push(superAdmin(), [{ id: "t1" }], target());
    const result = await userRolesService.inviteUser({
      actorId: "sa",
      email: "  T1@Example.com ",
      role: "admin",
    });
    expect(result).toEqual({ ok: true, outcome: "applied" });
    expect(actions()).toEqual(["staff.granted"]);
    expect(mocks.inviteByEmail).not.toHaveBeenCalled();
  });

  it("applies organizer immediately to an existing user", async () => {
    mocks.queue.push(superAdmin(), [{ id: "t1" }], target(), [], [{ id: "o1" }]);
    const result = await userRolesService.inviteUser({
      actorId: "sa",
      email: "t1@example.com",
      role: "organizer",
      organizerDisplayName: "Rock",
    });
    expect(result).toEqual({ ok: true, outcome: "applied" });
    expect(actions()).toEqual(["organizer.created"]);
  });

  it("invites a new email: stores the invitation, audits and calls Clerk", async () => {
    mocks.queue.push(superAdmin(), [], [], [{ id: "inv1" }]);
    mocks.inviteByEmail.mockResolvedValue({ clerkInvitationId: "cinv_1" });
    const result = await userRolesService.inviteUser({
      actorId: "sa",
      email: "New@Example.com",
      role: "admin",
    });
    expect(result).toEqual({ ok: true, outcome: "invited" });
    const inserted = mocks.ops.find((op) => op.method === "values")?.args[0];
    expect(inserted).toMatchObject({
      email: "new@example.com",
      role: "admin",
      invitedBy: "sa",
    });
    expect(mocks.inviteByEmail).toHaveBeenCalledWith({
      email: "new@example.com",
      redirectUrl: "https://app.test/sign-up",
    });
    expect(sets()).toEqual([{ clerkInvitationId: "cinv_1" }]);
    expect(actions()).toEqual(["user.invited"]);
  });

  it("returns conflict when an invitation is already pending", async () => {
    mocks.queue.push(superAdmin(), [], [{ id: "inv0" }]);
    const result = await userRolesService.inviteUser({
      actorId: "sa",
      email: "new@example.com",
      role: "admin",
    });
    expect(result).toEqual({ ok: false, error: "conflict" });
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.inviteByEmail).not.toHaveBeenCalled();
  });

  it("returns clerk-failed and aborts the transaction when Clerk fails", async () => {
    mocks.queue.push(superAdmin(), [], [], [{ id: "inv1" }]);
    mocks.inviteByEmail.mockRejectedValue(new Error("clerk down"));
    const result = await userRolesService.inviteUser({
      actorId: "sa",
      email: "new@example.com",
      role: "admin",
    });
    expect(result).toEqual({ ok: false, error: "clerk-failed" });
    expect(sets()).toEqual([]);
  });

  it("forbids an admin inviting admins or organizers", async () => {
    mocks.queue.push(admin(), []);
    expect(
      await userRolesService.inviteUser({ actorId: "ad", email: "n@e.com", role: "admin" }),
    ).toEqual({ ok: false, error: "forbidden" });
    mocks.queue.push(admin(), []);
    expect(
      await userRolesService.inviteUser({
        actorId: "ad",
        email: "n@e.com",
        role: "organizer",
        organizerDisplayName: "X Y",
      }),
    ).toEqual({ ok: false, error: "forbidden" });
    expect(mocks.inviteByEmail).not.toHaveBeenCalled();
  });

  it("rejects inviting yourself or a super admin", async () => {
    mocks.queue.push(superAdmin(), [{ id: "sa" }], superAdmin());
    expect(
      await userRolesService.inviteUser({ actorId: "sa", email: "sa@example.com", role: "admin" }),
    ).toEqual({ ok: false, error: "self" });
    mocks.queue.push(superAdmin(), [{ id: "sa2" }], [row("sa2", { staffRole: "super_admin" })]);
    expect(
      await userRolesService.inviteUser({ actorId: "sa", email: "sa2@example.com", role: "admin" }),
    ).toEqual({ ok: false, error: "protected-target" });
  });

  it("returns conflict for a deactivated existing user", async () => {
    mocks.queue.push(superAdmin(), [{ id: "t1" }], target({ deactivatedAt: new Date() }));
    expect(
      await userRolesService.inviteUser({ actorId: "sa", email: "t1@example.com", role: "admin" }),
    ).toEqual({ ok: false, error: "conflict" });
  });
});

describe("updateUser", () => {
  const base = { actorId: "sa", targetId: "t1" };
  const active = { id: "o1", status: "active" as const };

  it("edits the name: DB, one audit row with from/to, then Clerk", async () => {
    mocks.queue.push(superAdmin(), target());
    const result = await userRolesService.updateUser({ ...base, fullName: "  New Name " });
    expect(result).toEqual({ ok: true });
    expect(sets()).toEqual([{ fullName: "New Name" }]);
    expect(actions()).toEqual(["user.updated"]);
    expect(mocks.record.mock.calls[0][1].metadata).toEqual({
      from: "Old Name",
      to: "New Name",
    });
    expect(mocks.updateName).toHaveBeenCalledWith("clerk_t1", "New Name");
    expect(mocks.syncRoleMetadata).not.toHaveBeenCalled();
  });

  it("lets an admin edit a customer name but not change the role", async () => {
    mocks.queue.push(admin(), target());
    expect(await userRolesService.updateUser({ ...base, actorId: "ad", fullName: "X Y" })).toEqual({
      ok: true,
    });
    mocks.queue.push(admin(), target());
    expect(
      await userRolesService.updateUser({ ...base, actorId: "ad", role: "organizer" }),
    ).toEqual({ ok: false, error: "forbidden" });
  });

  it("denies editing admins (admin actor), super admins and oneself", async () => {
    mocks.queue.push(admin(), target({ staffRole: "admin" }));
    expect(
      await userRolesService.updateUser({ ...base, actorId: "ad", fullName: "X Y" }),
    ).toEqual({ ok: false, error: "forbidden" });
    mocks.queue.push(superAdmin(), [row("sa2", { staffRole: "super_admin" })]);
    expect(
      await userRolesService.updateUser({ ...base, targetId: "sa2", fullName: "X Y" }),
    ).toEqual({ ok: false, error: "protected-target" });
    mocks.queue.push(superAdmin(), superAdmin());
    expect(
      await userRolesService.updateUser({ ...base, targetId: "sa", fullName: "X Y" }),
    ).toEqual({ ok: false, error: "self" });
    expect(mocks.record).not.toHaveBeenCalled();
    expect(sets()).toEqual([]);
  });

  it("returns forbidden for an unknown actor and not-found for a missing target", async () => {
    mocks.queue.push([]);
    expect(await userRolesService.updateUser({ ...base, fullName: "X Y" })).toEqual({
      ok: false,
      error: "forbidden",
    });
    mocks.queue.push(superAdmin(), []);
    expect(await userRolesService.updateUser({ ...base, fullName: "X Y" })).toEqual({
      ok: false,
      error: "not-found",
    });
  });

  it("customer to organizer creates an active profile named after the user", async () => {
    mocks.queue.push(superAdmin(), target(), [], [{ id: "o1" }]);
    const result = await userRolesService.updateUser({ ...base, role: "organizer" });
    expect(result).toEqual({ ok: true });
    const inserted = mocks.ops.find((op) => op.method === "values")?.args[0];
    expect(inserted).toMatchObject({ userId: "t1", displayName: "Old Name", status: "active" });
    expect(actions()).toEqual(["organizer.created"]);
    expect(mocks.syncRoleMetadata).toHaveBeenCalledWith("clerk_t1", {
      staffRole: null,
      isOrganizer: true,
    });
  });

  it("uses the email local part when there is no name", async () => {
    mocks.queue.push(superAdmin(), target({ fullName: null }), [], [{ id: "o1" }]);
    await userRolesService.updateUser({ ...base, role: "organizer" });
    const inserted = mocks.ops.find((op) => op.method === "values")?.args[0];
    expect(inserted).toMatchObject({ displayName: "t1" });
  });

  it("organizer to customer without events deletes the profile", async () => {
    mocks.queue.push(superAdmin(), target({ organizer: active }), [{ n: 0 }]);
    const result = await userRolesService.updateUser({ ...base, role: "customer" });
    expect(result).toEqual({ ok: true });
    expect(mocks.ops.some((op) => op.method === "delete")).toBe(true);
    expect(actions()).toEqual(["organizer.removed"]);
    expect(mocks.syncRoleMetadata).toHaveBeenCalledWith("clerk_t1", {
      staffRole: null,
      isOrganizer: false,
    });
  });

  it("organizer to customer with events conflicts without changes", async () => {
    mocks.queue.push(superAdmin(), target({ organizer: active }), [{ n: 3 }]);
    const result = await userRolesService.updateUser({
      ...base,
      role: "customer",
      fullName: "New Name",
    });
    expect(result).toEqual({ ok: false, error: "conflict" });
    expect(sets()).toEqual([]);
    expect(mocks.record).not.toHaveBeenCalled();
  });

  it("grants admin keeping the organizer profile", async () => {
    mocks.queue.push(superAdmin(), target({ organizer: active }));
    await userRolesService.updateUser({ ...base, role: "admin" });
    expect(sets()).toEqual([{ staffRole: "admin" }]);
    expect(actions()).toEqual(["staff.granted"]);
    expect(mocks.ops.some((op) => op.method === "delete")).toBe(false);
    expect(mocks.syncRoleMetadata).toHaveBeenCalledWith("clerk_t1", {
      staffRole: "admin",
      isOrganizer: true,
    });
  });

  it("admin to organizer revokes admin; admin with profile to customer removes both", async () => {
    mocks.queue.push(superAdmin(), target({ staffRole: "admin" }), [], [], [{ id: "o1" }]);
    await userRolesService.updateUser({ ...base, role: "organizer" });
    expect(actions()).toEqual(["staff.revoked", "organizer.created"]);

    mocks.record.mockClear();
    mocks.queue.push(superAdmin(), target({ staffRole: "admin", organizer: active }), [{ n: 0 }]);
    await userRolesService.updateUser({ ...base, role: "customer" });
    expect(actions()).toEqual(["staff.revoked", "organizer.removed"]);
  });

  it("changes the organizer status; suspension stores the reason", async () => {
    mocks.queue.push(admin(), target({ organizer: active }));
    const result = await userRolesService.updateUser({
      ...base,
      actorId: "ad",
      organizerStatus: "suspended",
      reason: "fraude",
    });
    expect(result).toEqual({ ok: true });
    expect(sets()).toEqual([{ status: "suspended", suspendedReason: "fraude" }]);
    expect(actions()).toEqual(["organizer.suspended"]);
    expect(mocks.syncRoleMetadata).toHaveBeenCalledWith("clerk_t1", {
      staffRole: null,
      isOrganizer: false,
    });
  });

  it("rejects an organizer status without a resulting profile", async () => {
    mocks.queue.push(superAdmin(), target());
    expect(
      await userRolesService.updateUser({ ...base, organizerStatus: "active" }),
    ).toEqual({ ok: false, error: "invalid-change" });
    mocks.queue.push(superAdmin(), target({ organizer: active }), [{ n: 0 }]);
    expect(
      await userRolesService.updateUser({
        ...base,
        role: "customer",
        organizerStatus: "active",
      }),
    ).toEqual({ ok: false, error: "invalid-change" });
  });

  it("writes one audit row per change in a combined edit", async () => {
    mocks.queue.push(superAdmin(), target(), [], [], [{ id: "o1" }]);
    await userRolesService.updateUser({
      ...base,
      fullName: "New Name",
      role: "organizer",
      organizerStatus: "suspended",
      reason: "x",
    });
    expect(actions()).toEqual(["user.updated", "organizer.created", "organizer.suspended"]);
    expect(mocks.syncRoleMetadata).toHaveBeenCalledWith("clerk_t1", {
      staffRole: null,
      isOrganizer: false,
    });
  });

  it("is idempotent when nothing effectively changes", async () => {
    mocks.queue.push(superAdmin(), target({ fullName: "Same", organizer: active }));
    const result = await userRolesService.updateUser({
      ...base,
      fullName: "Same",
      role: "organizer",
      organizerStatus: "active",
    });
    expect(result).toEqual({ ok: true });
    expect(mocks.record).not.toHaveBeenCalled();
    expect(sets()).toEqual([]);
    expect(mocks.updateName).not.toHaveBeenCalled();
    expect(mocks.syncRoleMetadata).not.toHaveBeenCalled();
  });

  it("returns ok with a warning when Clerk fails after commit", async () => {
    mocks.queue.push(superAdmin(), target());
    mocks.updateName.mockRejectedValue(new Error("clerk down"));
    const result = await userRolesService.updateUser({ ...base, fullName: "New Name" });
    expect(result).toEqual({ ok: true, warning: "clerk-sync-failed" });
    expect(mocks.record).toHaveBeenCalledTimes(1);
  });
});

describe("deleteUser", () => {
  const input = { actorId: "sa", targetId: "t1" };
  const clean = () => mocks.queue.push([{ n: 0 }], [{ n: 0 }]);

  it("anonymizes, audits user.deleted with the actor and deletes in Clerk", async () => {
    mocks.queue.push(superAdmin(), target());
    clean();
    const result = await userRolesService.deleteUser(input);
    expect(result).toEqual({ ok: true });
    expect(sets()).toContainEqual(
      expect.objectContaining({ email: "deleted+t1@deleted.invalid", deletedAt: expect.any(Date) }),
    );
    expect(mocks.record).toHaveBeenCalledTimes(1);
    expect(mocks.record.mock.calls[0][1]).toMatchObject({
      actorUserId: "sa",
      action: "user.deleted",
      entityId: "t1",
    });
    expect(mocks.deleteClerkUser).toHaveBeenCalledWith("clerk_t1");
  });

  it("suspends the organizer profile with the reason 'Cuenta eliminada'", async () => {
    mocks.queue.push(superAdmin(), target({ organizer: { id: "o1", status: "active" } }));
    clean();
    mocks.queue.push([{ n: 0 }]);
    await userRolesService.deleteUser(input);
    expect(sets()).toContainEqual({ status: "suspended", suspendedReason: "Cuenta eliminada" });
  });

  it.each([
    ["pending-orders", [[{ n: 2 }], [{ n: 0 }], [{ n: 0 }]]],
    ["valid-tickets", [[{ n: 0 }], [{ n: 1 }], [{ n: 0 }]]],
    ["published-events", [[{ n: 0 }], [{ n: 0 }], [{ n: 4 }]]],
  ] as const)("blocks with %s and changes nothing", async (blocker, results) => {
    mocks.queue.push(superAdmin(), target({ organizer: { id: "o1", status: "active" } }));
    for (const r of results) mocks.queue.push(r);
    const result = await userRolesService.deleteUser(input);
    expect(result).toEqual({ ok: false, error: "blocked", blockers: [blocker] });
    expect(sets()).toEqual([]);
    expect(mocks.record).not.toHaveBeenCalled();
    expect(mocks.deleteClerkUser).not.toHaveBeenCalled();
  });

  it("reports every blocker at once", async () => {
    mocks.queue.push(superAdmin(), target({ organizer: { id: "o1", status: "active" } }));
    mocks.queue.push([{ n: 1 }], [{ n: 1 }], [{ n: 1 }]);
    expect(await userRolesService.deleteUser(input)).toEqual({
      ok: false,
      error: "blocked",
      blockers: ["pending-orders", "valid-tickets", "published-events"],
    });
  });

  it("forbids an admin, oneself and super admins", async () => {
    mocks.queue.push(admin(), target());
    expect(await userRolesService.deleteUser({ ...input, actorId: "ad" })).toEqual({
      ok: false,
      error: "forbidden",
    });
    mocks.queue.push(superAdmin(), superAdmin());
    expect(await userRolesService.deleteUser({ ...input, targetId: "sa" })).toEqual({
      ok: false,
      error: "self",
    });
    mocks.queue.push(superAdmin(), [row("sa2", { staffRole: "super_admin" })]);
    expect(await userRolesService.deleteUser({ ...input, targetId: "sa2" })).toEqual({
      ok: false,
      error: "protected-target",
    });
    expect(mocks.deleteClerkUser).not.toHaveBeenCalled();
  });

  it("returns ok with a warning when Clerk fails after commit", async () => {
    mocks.queue.push(superAdmin(), target());
    clean();
    mocks.deleteClerkUser.mockRejectedValue(new Error("clerk down"));
    expect(await userRolesService.deleteUser(input)).toEqual({
      ok: true,
      warning: "clerk-sync-failed",
    });
    expect(mocks.record).toHaveBeenCalledTimes(1);
  });
});
