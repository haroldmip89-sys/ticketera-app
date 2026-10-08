import { sql } from "drizzle-orm";
import {
  boolean,
  char,
  check,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { createdAt, timestamps } from "./columns";
import { layoutKind, sectionKind } from "./enums";
import { organizerProfiles, users } from "./identity";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt,
  },
  (t) => [index("categories_sort_order_idx").on(t.sortOrder)],
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    addressLine: text("address_line"),
    city: text("city").notNull(),
    state: text("state"),
    postalCode: text("postal_code"),
    country: char("country", { length: 2 }).notNull().default("US"),
    lat: numeric("lat", { precision: 9, scale: 6 }),
    lng: numeric("lng", { precision: 9, scale: 6 }),
    googlePlaceId: text("google_place_id"),
    timezone: text("timezone").notNull(),
    isCurated: boolean("is_curated").notNull().default(false),
    ownerOrganizerId: uuid("owner_organizer_id").references(
      () => organizerProfiles.id,
      { onDelete: "restrict" },
    ),
    createdBy: uuid("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    check(
      "venues_curated_owner_check",
      sql`(${t.isCurated} = true) = (${t.ownerOrganizerId} IS NULL)`,
    ),
    index("venues_city_idx").on(t.city),
  ],
);

export const venueLayouts = pgTable(
  "venue_layouts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: layoutKind("kind").notNull(),
    stage: jsonb("stage"),
    ...timestamps,
  },
  (t) => [
    unique("venue_layouts_id_venue_id_unique").on(t.id, t.venueId),
    index("venue_layouts_venue_id_idx").on(t.venueId),
  ],
);

export const layoutSections = pgTable(
  "layout_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    layoutId: uuid("layout_id")
      .notNull()
      .references(() => venueLayouts.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    kind: sectionKind("kind").notNull(),
    capacity: integer("capacity"),
    mapArea: jsonb("map_area"),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [
    unique("layout_sections_layout_id_code_unique").on(t.layoutId, t.code),
    check(
      "layout_sections_ga_capacity_check",
      sql`${t.kind} <> 'general_admission' OR ${t.capacity} IS NOT NULL`,
    ),
  ],
);

export const seats = pgTable(
  "seats",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => layoutSections.id, { onDelete: "cascade" }),
    rowLabel: text("row_label").notNull(),
    seatNumber: text("seat_number").notNull(),
    x: numeric("x").notNull(),
    y: numeric("y").notNull(),
    isAccessible: boolean("is_accessible").notNull().default(false),
    createdAt,
  },
  (t) => [
    unique("seats_section_id_row_label_seat_number_unique").on(
      t.sectionId,
      t.rowLabel,
      t.seatNumber,
    ),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type VenueLayout = typeof venueLayouts.$inferSelect;
export type NewVenueLayout = typeof venueLayouts.$inferInsert;
export type LayoutSection = typeof layoutSections.$inferSelect;
export type NewLayoutSection = typeof layoutSections.$inferInsert;
export type Seat = typeof seats.$inferSelect;
export type NewSeat = typeof seats.$inferInsert;
