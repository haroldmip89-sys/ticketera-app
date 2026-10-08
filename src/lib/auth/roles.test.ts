import { describe, expect, it } from "vitest";
import { isOrganizer, readRoleMetadata } from "./roles";

const SAFE = { staffRole: null, isOrganizer: false };

describe("readRoleMetadata", () => {
  it("reads valid values", () => {
    expect(readRoleMetadata({ staffRole: "admin", isOrganizer: true })).toEqual({
      staffRole: "admin",
      isOrganizer: true,
    });
    expect(readRoleMetadata({ staffRole: "super_admin" })).toEqual({
      staffRole: "super_admin",
      isOrganizer: false,
    });
  });

  it.each([null, undefined, [], "str", 1, true])("safe for %j", (value) => {
    expect(readRoleMetadata(value)).toEqual(SAFE);
  });

  it("rejects non-strict values", () => {
    expect(readRoleMetadata({ isOrganizer: "true" })).toEqual(SAFE);
    expect(readRoleMetadata({ isOrganizer: 1 })).toEqual(SAFE);
    expect(readRoleMetadata({ staffRole: "root" })).toEqual(SAFE);
  });
});

describe("isOrganizer", () => {
  it("is true only for boolean true", () => {
    expect(isOrganizer({ isOrganizer: true })).toBe(true);
    expect(isOrganizer({ isOrganizer: "true" })).toBe(false);
    expect(isOrganizer(null)).toBe(false);
  });
});
