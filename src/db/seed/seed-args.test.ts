import { describe, expect, it } from "vitest";

import { parseSeedArgs, SeedArgsError } from "./seed-args";

const ID = "123e4567-e89b-42d3-a456-426614174000";

describe("parseSeedArgs", () => {
  it("parses --organizer-email", () => {
    expect(parseSeedArgs(["--organizer-email", "a@b.co"], {})).toEqual({
      organizer: { by: "email", email: "a@b.co" },
      dryRun: false,
      dateOffsetDays: 0,
    });
  });

  it("parses --organizer-id", () => {
    expect(parseSeedArgs(["--organizer-id", ID], {}).organizer).toEqual({
      by: "id",
      id: ID,
    });
  });

  it("rejects both organizer flags", () => {
    expect(() =>
      parseSeedArgs(["--organizer-email", "a@b.co", "--organizer-id", ID], {}),
    ).toThrow(/solo uno/);
  });

  it("rejects when no organizer is given", () => {
    expect(() => parseSeedArgs([], {})).toThrow(SeedArgsError);
    expect(() => parseSeedArgs([], {})).toThrow(/Uso:/);
  });

  it("falls back to env and the argument wins", () => {
    expect(
      parseSeedArgs([], { SEED_ORGANIZER_EMAIL: "env@b.co" }).organizer,
    ).toEqual({ by: "email", email: "env@b.co" });
    expect(
      parseSeedArgs([], { SEED_ORGANIZER_ID: ID }).organizer,
    ).toEqual({ by: "id", id: ID });
    expect(
      parseSeedArgs(["--organizer-email", "arg@b.co"], {
        SEED_ORGANIZER_ID: ID,
      }).organizer,
    ).toEqual({ by: "email", email: "arg@b.co" });
  });

  it("parses --dry-run and --date-offset-days", () => {
    const options = parseSeedArgs(
      ["--organizer-email", "a@b.co", "--dry-run", "--date-offset-days", "-30"],
      {},
    );
    expect(options.dryRun).toBe(true);
    expect(options.dateOffsetDays).toBe(-30);
  });

  it("rejects a non-integer offset or a missing value", () => {
    expect(() =>
      parseSeedArgs(["--organizer-email", "a@b.co", "--date-offset-days", "1.5"], {}),
    ).toThrow(/entero/);
    expect(() =>
      parseSeedArgs(["--organizer-email", "a@b.co", "--date-offset-days"], {}),
    ).toThrow(/Falta el valor/);
  });

  it("rejects unknown flags", () => {
    expect(() =>
      parseSeedArgs(["--organizer-email", "a@b.co", "--force"], {}),
    ).toThrow(/desconocido/);
  });

  it("rejects invalid uuid and email", () => {
    expect(() => parseSeedArgs(["--organizer-id", "nope"], {})).toThrow(/uuid/);
    expect(() => parseSeedArgs(["--organizer-email", "nope"], {})).toThrow(
      /no es válido/,
    );
  });
});
