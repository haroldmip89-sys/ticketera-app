import { describe, expect, it } from "vitest";

import { getPrimaryRole, planRoleChange } from "./role-change";

describe("getPrimaryRole", () => {
  it("applies precedence super_admin > admin > organizer > customer", () => {
    expect(getPrimaryRole({ staffRole: "super_admin", hasOrganizer: true })).toBe("super_admin");
    expect(getPrimaryRole({ staffRole: "admin", hasOrganizer: true })).toBe("admin");
    expect(getPrimaryRole({ staffRole: null, hasOrganizer: true })).toBe("organizer");
    expect(getPrimaryRole({ staffRole: null, hasOrganizer: false })).toBe("customer");
  });
});

describe("planRoleChange", () => {
  const customer = { staffRole: null, hasOrganizer: false } as const;
  const organizer = { staffRole: null, hasOrganizer: true } as const;
  const admin = { staffRole: "admin", hasOrganizer: false } as const;
  const adminOrg = { staffRole: "admin", hasOrganizer: true } as const;

  it.each([
    ["customer", customer, "customer", []],
    ["customer", customer, "organizer", ["create-organizer"]],
    ["customer", customer, "admin", ["grant-admin"]],
    ["organizer", organizer, "customer", ["remove-organizer"]],
    ["organizer", organizer, "organizer", []],
    ["organizer", organizer, "admin", ["grant-admin"]],
    ["admin", admin, "customer", ["revoke-admin"]],
    ["admin", admin, "organizer", ["revoke-admin", "create-organizer"]],
    ["admin", admin, "admin", []],
    ["admin+organizer", adminOrg, "organizer", ["revoke-admin"]],
    ["admin+organizer", adminOrg, "customer", ["revoke-admin", "remove-organizer"]],
    ["admin+organizer", adminOrg, "admin", []],
  ] as const)("%s -> %s", (_label, current, desired, expected) => {
    expect(planRoleChange(current, desired)).toEqual(expected);
  });
});
