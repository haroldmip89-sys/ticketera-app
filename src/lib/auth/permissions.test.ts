import { describe, expect, it } from "vitest";
import {
  canManage,
  getAllowedActions,
  getManagementLock,
  getPermissions,
  hasPermission,
  PERMISSIONS,
  type AccessSubject,
  type ManagedUserAction,
  type Permission,
} from "./permissions";

const OWN: Permission[] = [
  "events:manage-own",
  "sales:view-own",
  "checkin:own",
  "refunds:own",
];
const ADMIN: Permission[] = [
  "events:moderate",
  "events:feature",
  "organizers:suspend",
  "venues:manage",
  "checkin:any",
  "refunds:any",
  "support:read",
  "users:read",
  "users:edit",
];
const SUPER: Permission[] = [
  "staff:manage",
  "organizers:manage",
  "users:deactivate",
  "users:delete",
  "platform:configure",
];

const customer: AccessSubject = { staffRole: null, organizerStatus: null };
const subject = (
  staffRole: AccessSubject["staffRole"],
  organizerStatus: AccessSubject["organizerStatus"] = null,
): AccessSubject => ({ staffRole, organizerStatus });

describe("getPermissions", () => {
  it("customer has none", () => {
    expect(getPermissions(customer).size).toBe(0);
  });

  it("active organizer has the own permissions", () => {
    expect([...getPermissions(subject(null, "active"))].sort()).toEqual(
      [...OWN].sort(),
    );
  });

  it.each(["onboarding", "suspended"] as const)(
    "%s organizer has none",
    (status) => {
      expect(getPermissions(subject(null, status)).size).toBe(0);
    },
  );

  it("admin has the admin block only", () => {
    const perms = getPermissions(subject("admin"));
    expect([...perms].sort()).toEqual([...ADMIN].sort());
    expect(perms.has("staff:manage")).toBe(false);
  });

  it("super admin is a superset of admin", () => {
    const perms = getPermissions(subject("super_admin"));
    [...ADMIN, ...SUPER].forEach((p) => expect(perms.has(p)).toBe(true));
    OWN.forEach((p) => expect(perms.has(p)).toBe(false));
  });

  it("organizer + admin is the union", () => {
    expect(getPermissions(subject("admin", "active")).size).toBe(
      OWN.length + ADMIN.length,
    );
  });

  it("PERMISSIONS lists every permission once", () => {
    expect(new Set(PERMISSIONS).size).toBe(OWN.length + ADMIN.length + SUPER.length);
  });

  it("hasPermission delegates to the set", () => {
    expect(hasPermission(subject("admin"), "users:read")).toBe(true);
    expect(hasPermission(customer, "users:read")).toBe(false);
  });
});

const actorOf = (s: AccessSubject, id = "actor") => ({ ...s, id });
const targetOf = (s: AccessSubject, id = "target") => ({ ...s, id });

const REQUIRED: Record<ManagedUserAction, "super" | "admin"> = {
  "grant-admin": "super",
  "revoke-admin": "super",
  "create-organizer": "super",
  "remove-organizer": "super",
  "suspend-organizer": "admin",
  "reactivate-organizer": "admin",
  "deactivate-user": "super",
  "reactivate-user": "super",
  "edit-user": "admin",
  "delete-user": "super",
};

describe("canManage", () => {
  describe.each(Object.keys(REQUIRED) as ManagedUserAction[])("%s", (action) => {
    const target = targetOf(customer);

    it("is allowed for super admin", () => {
      expect(canManage(actorOf(subject("super_admin")), action, target)).toEqual({
        ok: true,
      });
    });

    it("admin allowed only when the action needs admin", () => {
      const result = canManage(actorOf(subject("admin")), action, target);
      if (REQUIRED[action] === "admin") expect(result).toEqual({ ok: true });
      else expect(result).toEqual({ ok: false, reason: "forbidden" });
    });

    it("is forbidden for customers and organizers", () => {
      expect(canManage(actorOf(customer), action, target)).toEqual({
        ok: false,
        reason: "forbidden",
      });
      expect(canManage(actorOf(subject(null, "active")), action, target)).toEqual({
        ok: false,
        reason: "forbidden",
      });
    });

    it("denies self", () => {
      expect(
        canManage(actorOf(subject("super_admin"), "x"), action, targetOf(customer, "x")),
      ).toEqual({ ok: false, reason: "self" });
    });

    it("forbids an admin actor over an admin target", () => {
      expect(
        canManage(actorOf(subject("admin")), action, targetOf(subject("admin"))),
      ).toEqual({ ok: false, reason: "forbidden" });
    });

    it("lets a super admin act on an admin target", () => {
      expect(
        canManage(actorOf(subject("super_admin")), action, targetOf(subject("admin"))),
      ).toEqual({ ok: true });
    });

    it("protects super admin targets", () => {
      expect(
        canManage(actorOf(subject("super_admin")), action, targetOf(subject("super_admin"))),
      ).toEqual({ ok: false, reason: "protected-target" });
    });
  });

  it("evaluates self before protected-target before forbidden", () => {
    const sa = subject("super_admin");
    expect(canManage(actorOf(sa, "x"), "grant-admin", targetOf(sa, "x"))).toEqual({
      ok: false,
      reason: "self",
    });
    expect(
      canManage(actorOf(customer), "grant-admin", targetOf(sa)),
    ).toEqual({ ok: false, reason: "protected-target" });
  });
});

describe("getAllowedActions", () => {
  it("super admin over an admin can use every action", () => {
    expect(
      getAllowedActions(actorOf(subject("super_admin")), targetOf(subject("admin"))),
    ).toHaveLength(10);
  });

  it("admin over an organizer can only suspend/reactivate and edit", () => {
    expect(
      getAllowedActions(actorOf(subject("admin")), targetOf(subject(null, "active"))),
    ).toEqual(["suspend-organizer", "reactivate-organizer", "edit-user"]);
  });

  it("admin has no actions over an admin", () => {
    expect(
      getAllowedActions(actorOf(subject("admin")), targetOf(subject("admin"))),
    ).toEqual([]);
  });

  it("admin never gets users:delete", () => {
    expect(hasPermission(subject("admin"), "users:delete")).toBe(false);
    expect(hasPermission(subject("super_admin"), "users:delete")).toBe(true);
  });

  it("nobody can act on a super admin", () => {
    const sa = targetOf(subject("super_admin"));
    expect(getAllowedActions(actorOf(subject("super_admin")), sa)).toEqual([]);
    expect(getAllowedActions(actorOf(subject("admin")), sa)).toEqual([]);
  });
});

describe("getManagementLock", () => {
  it("locks self first", () => {
    expect(
      getManagementLock(actorOf(subject("super_admin"), "x"), targetOf(subject("super_admin"), "x")),
    ).toBe("self");
  });

  it("locks super admin targets as protected", () => {
    expect(
      getManagementLock(actorOf(subject("admin")), targetOf(subject("super_admin"))),
    ).toBe("protected");
  });

  it("locks admin targets for admin actors only", () => {
    expect(
      getManagementLock(actorOf(subject("admin")), targetOf(subject("admin"))),
    ).toBe("super-admin-only");
    expect(
      getManagementLock(actorOf(subject("super_admin")), targetOf(subject("admin"))),
    ).toBeNull();
  });

  it("has no lock for customers and organizers", () => {
    expect(getManagementLock(actorOf(subject("admin")), targetOf(customer))).toBeNull();
    expect(
      getManagementLock(actorOf(subject("admin")), targetOf(subject(null, "active"))),
    ).toBeNull();
  });
});
