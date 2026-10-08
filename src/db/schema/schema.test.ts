import { getTableName, is } from "drizzle-orm";
import { getTableConfig, isPgEnum, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as enums from "./enums";
import * as schema from "./index";

const tables = (Object.values(schema) as unknown[]).filter(
  (v): v is PgTable => is(v, PgTable),
);
const byName = (name: string) => {
  const table = tables.find((t) => getTableName(t) === name);
  if (!table) throw new Error(`table ${name} not found`);
  return getTableConfig(table);
};
const colNames = (cols: { name: string }[]) => cols.map((c) => c.name);

describe("schema", () => {
  it("exports the 23 tables and no extra", () => {
    expect(tables.map(getTableName).sort()).toEqual(
      [
        "users", "organizer_profiles", "platform_settings", "user_invitations",
        "categories", "venues", "venue_layouts", "layout_sections", "seats",
        "events", "ticket_types", "saved_events",
        "reservations", "reservation_items", "orders", "order_items",
        "refunds", "tickets", "ticket_transfers", "seat_allocations",
        "webhook_events", "audit_logs", "newsletter_subscribers",
      ].sort(),
    );
  });

  it("defines enums with the exact values", () => {
    const actual = (Object.values(enums) as unknown[])
      .filter(isPgEnum)
      .map((e) => [e.enumName, [...e.enumValues]]);
    expect(Object.fromEntries(actual)).toEqual({
      staff_role: ["admin", "super_admin"],
      organizer_status: ["onboarding", "active", "suspended"],
      layout_kind: ["zones", "seated"],
      section_kind: ["general_admission", "seated"],
      event_status: ["draft", "published", "cancelled", "suspended"],
      seat_allocation_status: ["held", "sold"],
      reservation_status: ["active", "converted", "expired", "cancelled"],
      order_status: ["pending", "paid", "failed", "refunded"],
      refund_status: ["pending", "succeeded", "failed"],
      ticket_status: ["valid", "used", "void"],
      transfer_status: ["pending", "accepted", "cancelled"],
      webhook_provider: ["stripe", "clerk"],
      auth_provider: ["password", "google"],
      invitation_status: ["pending", "accepted", "revoked"],
      invited_role: ["admin", "organizer"],
    });
    expect(actual).toHaveLength(15);
  });

  it("makes (event_id, seat_id) unique on seat_allocations", () => {
    const { indexes } = byName("seat_allocations");
    const idx = indexes.find(
      (i) =>
        i.config.unique &&
        JSON.stringify(
          i.config.columns.map((c) => (c as { name: string }).name),
        ) === JSON.stringify(["event_id", "seat_id"]),
    );
    expect(idx).toBeDefined();
  });

  it("has a partial unique index on active reservations", () => {
    const { indexes } = byName("reservations");
    const idx = indexes.find(
      (i) =>
        i.config.unique &&
        i.config.where !== undefined &&
        JSON.stringify(
          i.config.columns.map((c) => (c as { name: string }).name),
        ) === JSON.stringify(["user_id", "event_id"]),
    );
    expect(idx).toBeDefined();
  });

  it("keeps the Clerk id only in users", () => {
    const users = byName("users");
    expect(
      users.indexes.some(
        (i) =>
          i.config.unique &&
          i.config.columns.some(
            (c) => (c as { name: string }).name === "clerk_user_id",
          ),
      ) ||
        users.uniqueConstraints.some((u) =>
          colNames(u.columns).includes("clerk_user_id"),
        ) ||
        users.columns.some((c) => c.name === "clerk_user_id" && c.isUnique),
    ).toBe(true);
    const others = tables.filter((t) => getTableName(t) !== "users");
    for (const t of others) {
      expect(colNames(getTableConfig(t).columns)).not.toContain(
        "clerk_user_id",
      );
    }
  });

  it("declares onDelete on every foreign key", () => {
    for (const t of tables) {
      for (const fk of getTableConfig(t).foreignKeys) {
        expect(
          fk.onDelete,
          `${getTableName(t)} FK without onDelete`,
        ).toBeDefined();
      }
    }
  });

  it("indexes tickets by holder_user_id and event_id", () => {
    const { indexes } = byName("tickets");
    const indexed = indexes.flatMap((i) =>
      i.config.columns.map((c) => (c as { name: string }).name),
    );
    expect(indexed).toContain("holder_user_id");
    expect(indexed).toContain("event_id");
  });

  it("adds users.deactivated_at and user_invitations", () => {
    expect(colNames(byName("users").columns)).toContain("deactivated_at");
    const inv = byName("user_invitations");
    expect(colNames(inv.columns)).toEqual(
      expect.arrayContaining([
        "email", "role", "organizer_display_name", "status",
        "clerk_invitation_id", "invited_by", "accepted_user_id", "accepted_at",
      ]),
    );
    expect(
      inv.indexes.some((i) => i.config.unique && i.config.where !== undefined),
    ).toBe(true);
    expect(inv.checks.map((c) => c.name)).toContain(
      "user_invitations_organizer_name_check",
    );
  });
});
