import type { User } from "@clerk/backend";
import { describe, expect, it } from "vitest";

import { fromBackendUser, fromWebhookUser } from "./clerk-user-mapper";

const webhook = (overrides: Record<string, unknown> = {}) => ({
  id: "user_1",
  first_name: "Ana",
  last_name: "Paz",
  has_image: true,
  image_url: "https://img/a.png",
  password_enabled: true,
  primary_email_address_id: "e2",
  email_addresses: [
    { id: "e1", email_address: "old@x.com", verification: { status: "verified" } },
    { id: "e2", email_address: "ana@x.com", verification: { status: "verified" } },
  ],
  external_accounts: [],
  ...overrides,
});

describe("fromWebhookUser", () => {
  it("maps the primary email, name, avatar and providers", () => {
    expect(fromWebhookUser(webhook())).toEqual({
      clerkUserId: "user_1",
      email: "ana@x.com",
      emailVerified: true,
      fullName: "Ana Paz",
      avatarUrl: "https://img/a.png",
      authProviders: ["password"],
    });
  });

  it("flags unverified emails and missing primary", () => {
    const unverified = fromWebhookUser(
      webhook({
        email_addresses: [
          {
            id: "e2",
            email_address: "ana@x.com",
            verification: { status: "unverified" },
          },
        ],
      }),
    );
    expect(unverified.emailVerified).toBe(false);
    expect(
      fromWebhookUser(webhook({ primary_email_address_id: null })).email,
    ).toBeNull();
  });

  it("handles first name only and empty names", () => {
    expect(fromWebhookUser(webhook({ last_name: null })).fullName).toBe("Ana");
    expect(
      fromWebhookUser(webhook({ first_name: " ", last_name: null })).fullName,
    ).toBeNull();
  });

  it("ignores the avatar without own image", () => {
    expect(fromWebhookUser(webhook({ has_image: false })).avatarUrl).toBeNull();
  });

  it("dedupes google and oauth_google providers", () => {
    const snapshot = fromWebhookUser(
      webhook({
        external_accounts: [{ provider: "google" }, { provider: "oauth_google" }],
      }),
    );
    expect(snapshot.authProviders).toEqual(["password", "google"]);
  });

  it("throws without id", () => {
    expect(() => fromWebhookUser({})).toThrow();
    expect(() => fromWebhookUser(null)).toThrow();
  });
});

describe("fromBackendUser", () => {
  it("maps a Backend API user", () => {
    const user = {
      id: "user_2",
      firstName: "Luis",
      lastName: null,
      hasImage: false,
      imageUrl: "https://img/default",
      passwordEnabled: false,
      primaryEmailAddressId: "e1",
      emailAddresses: [
        { id: "e1", emailAddress: "l@x.com", verification: { status: "verified" } },
      ],
      externalAccounts: [{ provider: "oauth_google" }],
    } as unknown as User;
    expect(fromBackendUser(user)).toEqual({
      clerkUserId: "user_2",
      email: "l@x.com",
      emailVerified: true,
      fullName: "Luis",
      avatarUrl: null,
      authProviders: ["google"],
    });
  });
});
