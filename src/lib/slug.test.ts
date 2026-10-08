import { describe, expect, it } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("removes accents and lowercases", () => {
    expect(slugify("Música en Vivo Ñandú")).toBe("musica-en-vivo-nandu");
  });
  it("collapses spaces and symbols", () => {
    expect(slugify("  Rock & Roll!!  2026 ")).toBe("rock-roll-2026");
  });
  it("returns an empty string when nothing is left", () => {
    expect(slugify("¡¿?!")).toBe("");
    expect(slugify("")).toBe("");
  });
  it("caps the length without trailing dash", () => {
    const out = slugify(`${"a".repeat(79)} bbb`);
    expect(out.length).toBeLessThanOrEqual(80);
    expect(out.endsWith("-")).toBe(false);
  });
});
