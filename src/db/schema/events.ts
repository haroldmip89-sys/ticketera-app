import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, timestamps } from "./columns";
import { categories, layoutSections, venueLayouts, venues } from "./catalog";
import { eventStatus } from "./enums";
import { organizerProfiles, users } from "./identity";

export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizerId: uuid("organizer_id")
      .notNull()
      .references(() => organizerProfiles.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "restrict" }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),
    layoutId: uuid("layout_id"),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    coverKey: text("cover_key"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    doorsOpenAt: timestamp("doors_open_at", { withTimezone: true }),
    minAge: integer("min_age"),
    status: eventStatus("status").notNull().default("draft"),
    isFeatured: boolean("is_featured").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    suspendedReason: text("suspended_reason"),
    ...timestamps,
  },
  (t) => [
    foreignKey({
      columns: [t.layoutId, t.venueId],
      foreignColumns: [venueLayouts.id, venueLayouts.venueId],
      name: "events_layout_venue_fk",
    }).onDelete("restrict"),
    check(
      "events_doors_open_before_start",
      sql`${t.doorsOpenAt} IS NULL OR ${t.doorsOpenAt} < ${t.startsAt}`,
    ),
    index("events_status_starts_at_idx").on(t.status, t.startsAt),
    index("events_category_starts_at_idx").on(t.categoryId, t.startsAt),
    index("events_organizer_id_idx").on(t.organizerId),
    index("events_venue_id_idx").on(t.venueId),
    index("events_featured_starts_at_idx")
      .on(t.startsAt)
      .where(sql`${t.isFeatured} AND ${t.status} = 'published'`),
  ],
);

export const ticketTypes = pgTable(
  "ticket_types",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id").references(() => layoutSections.id, {
      onDelete: "restrict",
    }),
    name: text("name").notNull(),
    priceCents: integer("price_cents").notNull(),
    capacity: integer("capacity").notNull(),
    soldCount: integer("sold_count").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    check("ticket_types_price_cents_check", sql`${t.priceCents} >= 0`),
    check("ticket_types_capacity_check", sql`${t.capacity} >= 0`),
    check("ticket_types_sold_count_check", sql`${t.soldCount} >= 0`),
    check(
      "ticket_types_sold_count_lte_capacity",
      sql`${t.soldCount} <= ${t.capacity}`,
    ),
    uniqueIndex("ticket_types_event_section_uidx")
      .on(t.eventId, t.sectionId)
      .where(sql`${t.sectionId} IS NOT NULL`),
    index("ticket_types_event_id_idx").on(t.eventId),
  ],
);

export const savedEvents = pgTable(
  "saved_events",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    createdAt,
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.eventId] }),
    index("saved_events_event_id_idx").on(t.eventId),
  ],
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type TicketType = typeof ticketTypes.$inferSelect;
export type NewTicketType = typeof ticketTypes.$inferInsert;
export type SavedEvent = typeof savedEvents.$inferSelect;
export type NewSavedEvent = typeof savedEvents.$inferInsert;
