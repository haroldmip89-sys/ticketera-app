import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  ensureAccessContext: vi.fn(),
  fromBackendUser: vi.fn(),
}));

vi.mock("react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react")>();
  return {
    ...actual,
    // Simula la memoización por request de React cache.
    cache: <T extends () => unknown>(fn: T) => {
      let result: unknown;
      let called = false;
      return (() => {
        if (!called) {
          result = fn();
          called = true;
        }
        return result;
      }) as T;
    },
  };
});
vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
vi.mock("@/modules/users/services/users.service", () => ({
  usersService: { ensureAccessContext: mocks.ensureAccessContext },
}));
vi.mock("@/modules/users/utils/clerk-user-mapper", () => ({
  fromBackendUser: mocks.fromBackendUser,
}));

import { getPermissions, type OrganizerStatus, type StaffRole } from "./permissions";

type Guards = typeof import("./guards");
type Ctx = Awaited<ReturnType<Guards["requireUser"]>>;

function makeContext(
  staffRole: StaffRole | null = null,
  organizerStatus: OrganizerStatus | null = null,
): Ctx {
  return {
    userId: "u1",
    clerkUserId: "clerk_1",
    email: "a@b.com",
    displayName: "Ana",
    staffRole,
    organizer: organizerStatus ? { id: "o1", status: organizerStatus } : null,
    permissions: getPermissions({ staffRole, organizerStatus }),
  };
}

async function load(): Promise<Guards> {
  vi.resetModules();
  return import("./guards");
}

function signedIn(context: Ctx | null) {
  mocks.auth.mockResolvedValue({ userId: "clerk_1" });
  mocks.ensureAccessContext.mockResolvedValue(context);
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: null });
});

describe("requireUser", () => {
  it("redirects to sign-in without session", async () => {
    const g = await load();
    await expect(g.requireUser({ returnTo: "/my-tickets" })).rejects.toThrow(
      "REDIRECT:/sign-in?redirect_url=%2Fmy-tickets",
    );
  });

  it("redirects deactivated users to /", async () => {
    signedIn(null);
    const g = await load();
    await expect(g.requireUser()).rejects.toThrow("REDIRECT:/");
  });

  it("returns the context and passes a snapshot loader (upsert on-demand)", async () => {
    const context = makeContext();
    signedIn(context);
    mocks.currentUser.mockResolvedValue({ id: "clerk_1" });
    mocks.fromBackendUser.mockReturnValue({ clerkUserId: "clerk_1" });
    const g = await load();
    await expect(g.requireUser()).resolves.toBe(context);
    const [clerkId, loader] = mocks.ensureAccessContext.mock.calls[0];
    expect(clerkId).toBe("clerk_1");
    await expect(loader()).resolves.toEqual({ clerkUserId: "clerk_1" });
  });

  it("loader returns null when Clerk has no user", async () => {
    signedIn(makeContext());
    mocks.currentUser.mockResolvedValue(null);
    const g = await load();
    await g.requireUser();
    const loader = mocks.ensureAccessContext.mock.calls[0][1];
    await expect(loader()).resolves.toBeNull();
  });

  it("resolves access once per request", async () => {
    signedIn(makeContext());
    const g = await load();
    await g.requireUser();
    await g.getAccessContext();
    await g.getOrganizerAccess();
    expect(mocks.ensureAccessContext).toHaveBeenCalledTimes(1);
  });
});

describe("getAccessContext", () => {
  it("is null without session and when denied", async () => {
    let g = await load();
    await expect(g.getAccessContext()).resolves.toBeNull();
    signedIn(null);
    g = await load();
    await expect(g.getAccessContext()).resolves.toBeNull();
  });
});

describe("requireOrganizer", () => {
  it("redirects to sign-in without session", async () => {
    const g = await load();
    await expect(g.requireOrganizer()).rejects.toThrow("REDIRECT:/sign-in");
  });

  it.each([null, "onboarding", "suspended"] as const)(
    "redirects to onboarding when organizer is %s",
    async (status) => {
      signedIn(makeContext(null, status));
      const g = await load();
      await expect(g.requireOrganizer()).rejects.toThrow(
        "REDIRECT:/organizer/onboarding",
      );
    },
  );

  it("returns the organizer user when active", async () => {
    signedIn(makeContext(null, "active"));
    const g = await load();
    await expect(g.requireOrganizer()).resolves.toEqual({
      userId: "u1",
      organizerId: "o1",
      displayName: "Ana",
      email: "a@b.com",
    });
  });
});

describe("requireStaff", () => {
  it("redirects to sign-in without session", async () => {
    const g = await load();
    await expect(g.requireStaff("admin")).rejects.toThrow("REDIRECT:/sign-in");
  });

  it("404 for customers and organizers", async () => {
    signedIn(makeContext(null, "active"));
    const g = await load();
    await expect(g.requireStaff("admin")).rejects.toThrow("NOT_FOUND");
  });

  it("allows admin and super admin for admin", async () => {
    for (const role of ["admin", "super_admin"] as const) {
      signedIn(makeContext(role));
      const g = await load();
      await expect(g.requireStaff("admin")).resolves.toMatchObject({
        staffRole: role,
      });
    }
  });

  it("404 for admin when super_admin is required", async () => {
    signedIn(makeContext("admin"));
    const g = await load();
    await expect(g.requireStaff("super_admin")).rejects.toThrow("NOT_FOUND");
  });
});

describe("requirePermission", () => {
  it("redirects deactivated users to /", async () => {
    signedIn(null);
    const g = await load();
    await expect(g.requirePermission("users:read")).rejects.toThrow("REDIRECT:/");
  });

  it("404 for a customer, ok for admin", async () => {
    signedIn(makeContext());
    let g = await load();
    await expect(g.requirePermission("users:read")).rejects.toThrow("NOT_FOUND");
    signedIn(makeContext("admin"));
    g = await load();
    await expect(g.requirePermission("users:read")).resolves.toBeDefined();
  });

  it("organizer onboarding gets no organizer permissions", async () => {
    signedIn(makeContext(null, "onboarding"));
    const g = await load();
    await expect(g.requirePermission("events:manage-own")).rejects.toThrow(
      "NOT_FOUND",
    );
  });
});

describe("checkPermission", () => {
  it("returns signed-out without session", async () => {
    const g = await load();
    await expect(g.checkPermission("users:read")).resolves.toEqual({
      ok: false,
      reason: "signed-out",
    });
  });

  it("returns forbidden for deactivated and unauthorized users without throwing", async () => {
    signedIn(null);
    let g = await load();
    await expect(g.checkPermission("users:read")).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
    signedIn(makeContext());
    g = await load();
    await expect(g.checkPermission("users:read")).resolves.toEqual({
      ok: false,
      reason: "forbidden",
    });
  });

  it("returns the context when allowed", async () => {
    const context = makeContext("super_admin");
    signedIn(context);
    const g = await load();
    await expect(g.checkPermission("staff:manage")).resolves.toEqual({
      ok: true,
      context,
    });
  });
});

describe("getOrganizerAccess", () => {
  it("maps signed-out, customer and organizer", async () => {
    let g = await load();
    await expect(g.getOrganizerAccess()).resolves.toBe("signed-out");
    signedIn(makeContext());
    g = await load();
    await expect(g.getOrganizerAccess()).resolves.toBe("customer");
    signedIn(makeContext(null, "onboarding"));
    g = await load();
    await expect(g.getOrganizerAccess()).resolves.toBe("customer");
    signedIn(makeContext(null, "active"));
    g = await load();
    await expect(g.getOrganizerAccess()).resolves.toBe("organizer");
  });
});
