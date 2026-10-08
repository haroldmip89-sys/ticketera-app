import { describe, expect, it } from "vitest";

import { assertSeedableOrganizer, type FoundOrganizer } from "./seed-organizer";

const ref = { by: "email", email: "org@example.com" } as const;
const found: FoundOrganizer = {
  organizerId: "o1",
  userId: "u1",
  email: "org@example.com",
  displayName: "Org",
  status: "active",
  deactivated: false,
};

describe("assertSeedableOrganizer", () => {
  it("returns the organizer when it is active", () => {
    expect(assertSeedableOrganizer(found, ref)).toEqual({
      organizerId: "o1",
      userId: "u1",
      email: "org@example.com",
      displayName: "Org",
      status: "active",
    });
  });

  it("fails when the user does not exist", () => {
    expect(() => assertSeedableOrganizer(null, ref)).toThrow(
      /No existe un usuario con email org@example.com/,
    );
  });

  it("fails when the user has no organizer profile", () => {
    expect(() =>
      assertSeedableOrganizer(
        { ...found, organizerId: null, displayName: null, status: null },
        ref,
      ),
    ).toThrow(/no es organizador/);
  });

  it("fails when the organizer is not active", () => {
    expect(() =>
      assertSeedableOrganizer({ ...found, status: "onboarding" }, ref),
    ).toThrow(/está onboarding; debe estar active/);
    expect(() =>
      assertSeedableOrganizer({ ...found, status: "suspended" }, ref),
    ).toThrow(/está suspended/);
  });

  it("fails when the user is deactivated or anonymized", () => {
    expect(() =>
      assertSeedableOrganizer({ ...found, deactivated: true }, ref),
    ).toThrow(/desactivado o anonimizado/);
  });
});
