import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { timestamps } from "./columns";
import {
  authProvider,
  invitationStatus,
  invitedRole,
  organizerStatus,
  staffRole,
} from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clerkUserId: text("clerk_user_id").notNull().unique(),
    email: text("email").notNull(),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    authProviders: authProvider("auth_providers")
      .array()
      .notNull()
      .default(sql`'{}'`),
    phone: text("phone"),
    staffRole: staffRole("staff_role"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deactivatedAt: timestamp("deactivated_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [uniqueIndex("users_email_lower_idx").on(sql`lower(${table.email})`)],
);

export const organizerProfiles = pgTable("organizer_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "restrict" }),
  displayName: text("display_name").notNull(),
  slug: text("slug").notNull().unique(),
  logoKey: text("logo_key"),
  stripeAccountId: text("stripe_account_id").unique(),
  chargesEnabled: boolean("charges_enabled").notNull().default(false),
  payoutsEnabled: boolean("payouts_enabled").notNull().default(false),
  status: organizerStatus("status").notNull().default("onboarding"),
  suspendedReason: text("suspended_reason"),
  ...timestamps,
});

export const userInvitations = pgTable(
  "user_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    role: invitedRole("role").notNull(),
    organizerDisplayName: text("organizer_display_name"),
    status: invitationStatus("status").notNull().default("pending"),
    clerkInvitationId: text("clerk_invitation_id").unique(),
    invitedBy: uuid("invited_by").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedUserId: uuid("accepted_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("user_invitations_pending_email_idx")
      .on(sql`lower(${table.email})`)
      .where(sql`${table.status} = 'pending'`),
    check(
      "user_invitations_organizer_name_check",
      sql`${table.role} <> 'organizer' OR ${table.organizerDisplayName} IS NOT NULL`,
    ),
  ],
);

export const platformSettings = pgTable(
  "platform_settings",
  {
    id: smallint("id").primaryKey(),
    serviceFeeBps: integer("service_fee_bps").notNull(),
    serviceFeeFixedCents: integer("service_fee_fixed_cents").notNull(),
    reservationMinutes: integer("reservation_minutes").notNull().default(10),
    maxTicketsPerZone: integer("max_tickets_per_zone").notNull().default(6),
    updatedBy: uuid("updated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (table) => [
    check("platform_settings_singleton_check", sql`${table.id} = 1`),
    check(
      "platform_settings_values_check",
      sql`${table.serviceFeeBps} >= 0 AND ${table.serviceFeeFixedCents} >= 0 AND ${table.reservationMinutes} > 0 AND ${table.maxTicketsPerZone} > 0`,
    ),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OrganizerProfile = typeof organizerProfiles.$inferSelect;
export type NewOrganizerProfile = typeof organizerProfiles.$inferInsert;
export type UserInvitation = typeof userInvitations.$inferSelect;
export type NewUserInvitation = typeof userInvitations.$inferInsert;
export type PlatformSettings = typeof platformSettings.$inferSelect;
export type NewPlatformSettings = typeof platformSettings.$inferInsert;
