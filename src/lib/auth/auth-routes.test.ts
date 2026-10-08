import { describe, expect, it } from "vitest";
import {
  buildSignInHref,
  getSafeRedirectPath,
  isAuthPath,
  isProtectedPath,
  resolveAfterAuthPath,
} from "./auth-routes";

describe("isProtectedPath", () => {
  it.each([
    "/my-tickets",
    "/my-tickets/abc",
    "/organizer",
    "/organizer/onboarding",
    "/admin",
    "/admin/",
    "/admin/users",
    "/events/x/checkout",
    "/events/x/checkout/",
  ])("protects %s", (path) => {
    expect(isProtectedPath(path)).toBe(true);
  });

  it.each([
    "/",
    "/my-ticketsx",
    "/organizers",
    "/administrator",
    "/api/webhooks/clerk",
    "/events",
    "/events/x",
    "/events/x/tickets",
    "/events/x/seats",
    "/events/x/confirmation",
    "/events/a/b/checkout",
    "/events//checkout",
  ])("does not protect %s", (path) => {
    expect(isProtectedPath(path)).toBe(false);
  });
});

describe("isAuthPath", () => {
  it.each(["/sign-in", "/sign-in/factor", "/sign-up", "/reset-password"])(
    "true for %s",
    (path) => expect(isAuthPath(path)).toBe(true),
  );
  it.each(["/sso-callback", "/sign-inx", "/"])("false for %s", (path) =>
    expect(isAuthPath(path)).toBe(false),
  );
});

describe("getSafeRedirectPath", () => {
  it.each([
    "/",
    "/events",
    "/events/x/checkout?tickets=a:1,b:2&seats=s1",
    "/events#faq",
  ])("returns %s unchanged", (path) => {
    expect(getSafeRedirectPath(path)).toBe(path);
  });

  it("uses the first element of an array", () => {
    expect(getSafeRedirectPath(["/events", "/x"])).toBe("/events");
  });

  it.each([
    undefined,
    null,
    "",
    "events",
    "//evil.com",
    "/\\evil.com",
    "/a\\b",
    "https://evil.com",
    "http:/evil.com",
    "javascript:alert(1)",
    "/\u0000x",
    "/\tx",
    `/${"a".repeat(2048)}`,
    "/sign-in",
    "/sign-in?redirect_url=/x",
    "/sso-callback",
    "/reset-password",
  ])("rejects %j", (value) => {
    expect(getSafeRedirectPath(value)).toBeNull();
  });
});

describe("resolveAfterAuthPath", () => {
  it("returns valid paths and falls back to /", () => {
    expect(resolveAfterAuthPath("/events")).toBe("/events");
    expect(resolveAfterAuthPath("https://evil.com")).toBe("/");
  });
});

describe("buildSignInHref", () => {
  it("returns /sign-in for empty, root or unsafe values", () => {
    expect(buildSignInHref()).toBe("/sign-in");
    expect(buildSignInHref(null)).toBe("/sign-in");
    expect(buildSignInHref("/")).toBe("/sign-in");
    expect(buildSignInHref("https://evil.com")).toBe("/sign-in");
  });

  it("encodes the return path", () => {
    const path = "/events/x/checkout?tickets=a:1,b:2";
    const href = buildSignInHref(path);
    expect(href).toBe(
      "/sign-in?redirect_url=%2Fevents%2Fx%2Fcheckout%3Ftickets%3Da%3A1%2Cb%3A2",
    );
    expect(new URL(href, "http://x").searchParams.get("redirect_url")).toBe(path);
  });
});
