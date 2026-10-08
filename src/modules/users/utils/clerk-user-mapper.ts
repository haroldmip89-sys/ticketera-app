import type { User } from "@clerk/backend";

import type { ClerkUserSnapshot } from "../types/user.types";

type RawEmail = { id: string; address: string; verified: boolean };

type NormalizedUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  hasImage: boolean;
  imageUrl: string | null;
  passwordEnabled: boolean;
  primaryEmailAddressId: string | null;
  emails: RawEmail[];
  providers: string[];
};

function toSnapshot(user: NormalizedUser): ClerkUserSnapshot {
  const primary =
    user.emails.find((email) => email.id === user.primaryEmailAddressId) ??
    null;
  const fullName =
    [user.firstName, user.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ") || null;
  const authProviders: ClerkUserSnapshot["authProviders"] = [];
  if (user.passwordEnabled) authProviders.push("password");
  if (
    user.providers.some(
      (provider) => provider === "google" || provider === "oauth_google",
    )
  ) {
    authProviders.push("google");
  }
  return {
    clerkUserId: user.id,
    email: primary?.address ?? null,
    emailVerified: primary?.verified ?? false,
    fullName,
    avatarUrl: user.hasImage ? user.imageUrl : null,
    authProviders,
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** Payload `UserJSON` (snake_case) del webhook. */
export function fromWebhookUser(data: unknown): ClerkUserSnapshot {
  const raw = (data ?? {}) as Record<string, unknown>;
  const id = asString(raw.id);
  if (!id) throw new Error("Clerk user payload has no id");
  const emails = Array.isArray(raw.email_addresses) ? raw.email_addresses : [];
  const accounts = Array.isArray(raw.external_accounts)
    ? raw.external_accounts
    : [];
  return toSnapshot({
    id,
    firstName: asString(raw.first_name),
    lastName: asString(raw.last_name),
    hasImage: raw.has_image === true,
    imageUrl: asString(raw.image_url),
    passwordEnabled: raw.password_enabled === true,
    primaryEmailAddressId: asString(raw.primary_email_address_id),
    emails: emails.flatMap((item) => {
      const email = item as Record<string, unknown>;
      const id = asString(email.id);
      const address = asString(email.email_address);
      if (!id || !address) return [];
      const verification = email.verification as { status?: unknown } | null;
      return [{ id, address, verified: verification?.status === "verified" }];
    }),
    providers: accounts.flatMap((item) => {
      const provider = asString((item as Record<string, unknown>).provider);
      return provider ? [provider] : [];
    }),
  });
}

/** `User` de la Backend API (`currentUser()`, `clerkClient`). */
export function fromBackendUser(user: User): ClerkUserSnapshot {
  return toSnapshot({
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    hasImage: user.hasImage,
    imageUrl: user.imageUrl,
    passwordEnabled: user.passwordEnabled,
    primaryEmailAddressId: user.primaryEmailAddressId,
    emails: user.emailAddresses.map((email) => ({
      id: email.id,
      address: email.emailAddress,
      verified: email.verification?.status === "verified",
    })),
    providers: user.externalAccounts.map((account) => account.provider),
  });
}
