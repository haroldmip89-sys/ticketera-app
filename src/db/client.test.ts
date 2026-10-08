import { afterEach, describe, expect, it, vi } from "vitest";

describe("getDb", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("does not throw on import without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    await expect(import("./client")).resolves.toBeDefined();
  });

  it("throws when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", undefined);
    const { getDb } = await import("./client");
    expect(() => getDb()).toThrow("DATABASE_URL is not set");
  });

  it("throws when DATABASE_URL is empty", async () => {
    vi.stubEnv("DATABASE_URL", "");
    const { getDb } = await import("./client");
    expect(() => getDb()).toThrow("DATABASE_URL is not set");
  });
});
