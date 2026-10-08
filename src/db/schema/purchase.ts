import { sql } from "drizzle-orm";
import {
  char,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { seats } from "./catalog";
import { createdAt, timestamps } from "./columns";
import {
  orderStatus,
  refundStatus,
  reservationStatus,
  seatAllocationStatus,
  ticketStatus,
  transferStatus,
} from "./enums";
import { events, ticketTypes } from "./events";
import { users } from "./identity";

export const reservations = pgTable(
  "reservations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    status: reservationStatus("status").notNull().default("active"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("reservations_user_event_active_uq")
      .on(t.userId, t.eventId)
      .where(sql`${t.status} = 'active'`),
    index("reservations_status_expires_at_idx").on(t.status, t.expiresAt),
  ],
);

export const reservationItems = pgTable(
  "reservation_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    ticketTypeId: uuid("ticket_type_id")
      .notNull()
      .references(() => ticketTypes.id, { onDelete: "restrict" }),
    seatId: uuid("seat_id").references(() => seats.id, {
      onDelete: "restrict",
    }),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt,
  },
  (t) => [
    check("reservation_items_quantity_check", sql`${t.quantity} >= 1`),
    check(
      "reservation_items_unit_price_check",
      sql`${t.unitPriceCents} >= 0`,
    ),
    check(
      "reservation_items_seat_quantity_check",
      sql`${t.seatId} IS NULL OR ${t.quantity} = 1`,
    ),
    index("reservation_items_reservation_id_idx").on(t.reservationId),
    index("reservation_items_ticket_type_id_idx").on(t.ticketTypeId),
  ],
);

export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    reservationId: uuid("reservation_id")
      .notNull()
      .unique()
      .references(() => reservations.id, { onDelete: "restrict" }),
    status: orderStatus("status").notNull().default("pending"),
    buyerName: text("buyer_name").notNull(),
    buyerEmail: text("buyer_email").notNull(),
    buyerPhone: text("buyer_phone"),
    subtotalCents: integer("subtotal_cents").notNull(),
    serviceFeeCents: integer("service_fee_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    currency: char("currency", { length: 3 }).notNull().default("usd"),
    stripePaymentIntentId: text("stripe_payment_intent_id").unique(),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    check(
      "orders_total_check",
      sql`${t.totalCents} = ${t.subtotalCents} + ${t.serviceFeeCents}`,
    ),
    check(
      "orders_amounts_check",
      sql`${t.subtotalCents} >= 0 AND ${t.serviceFeeCents} >= 0 AND ${t.totalCents} >= 0`,
    ),
    index("orders_user_id_created_at_idx").on(t.userId, t.createdAt),
    index("orders_event_id_status_idx").on(t.eventId, t.status),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    ticketTypeId: uuid("ticket_type_id")
      .notNull()
      .references(() => ticketTypes.id, { onDelete: "restrict" }),
    seatId: uuid("seat_id").references(() => seats.id, {
      onDelete: "restrict",
    }),
    quantity: integer("quantity").notNull(),
    unitPriceCents: integer("unit_price_cents").notNull(),
    createdAt,
  },
  (t) => [
    check("order_items_quantity_check", sql`${t.quantity} >= 1`),
    check("order_items_unit_price_check", sql`${t.unitPriceCents} >= 0`),
    check(
      "order_items_seat_quantity_check",
      sql`${t.seatId} IS NULL OR ${t.quantity} = 1`,
    ),
    index("order_items_order_id_idx").on(t.orderId),
    index("order_items_ticket_type_id_idx").on(t.ticketTypeId),
  ],
);

export const refunds = pgTable(
  "refunds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    stripeRefundId: text("stripe_refund_id").notNull().unique(),
    amountCents: integer("amount_cents").notNull(),
    reason: text("reason"),
    initiatedBy: uuid("initiated_by").references(() => users.id, {
      onDelete: "set null",
    }),
    status: refundStatus("status").notNull().default("pending"),
    ...timestamps,
  },
  (t) => [
    check("refunds_amount_check", sql`${t.amountCents} > 0`),
    index("refunds_order_id_idx").on(t.orderId),
  ],
);

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }),
    orderItemId: uuid("order_item_id")
      .notNull()
      .references(() => orderItems.id, { onDelete: "restrict" }),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    ticketTypeId: uuid("ticket_type_id")
      .notNull()
      .references(() => ticketTypes.id, { onDelete: "restrict" }),
    seatId: uuid("seat_id").references(() => seats.id, {
      onDelete: "restrict",
    }),
    holderUserId: uuid("holder_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: ticketStatus("status").notNull().default("valid"),
    qrToken: text("qr_token").notNull().unique(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInBy: uuid("checked_in_by").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    index("tickets_holder_user_id_idx").on(t.holderUserId),
    index("tickets_event_id_idx").on(t.eventId),
    index("tickets_order_id_idx").on(t.orderId),
    index("tickets_event_id_status_idx").on(t.eventId, t.status),
  ],
);

export const ticketTransfers = pgTable(
  "ticket_transfers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => tickets.id, { onDelete: "restrict" }),
    fromUserId: uuid("from_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    toEmail: text("to_email").notNull(),
    toUserId: uuid("to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: transferStatus("status").notNull().default("pending"),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    index("ticket_transfers_ticket_id_idx").on(t.ticketId),
    index("ticket_transfers_to_email_status_idx").on(t.toEmail, t.status),
  ],
);

export const seatAllocations = pgTable(
  "seat_allocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    seatId: uuid("seat_id")
      .notNull()
      .references(() => seats.id, { onDelete: "restrict" }),
    status: seatAllocationStatus("status").notNull().default("held"),
    reservationId: uuid("reservation_id")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    ticketId: uuid("ticket_id").references(() => tickets.id, {
      onDelete: "set null",
    }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("seat_allocations_event_seat_uq").on(t.eventId, t.seatId),
    index("seat_allocations_reservation_id_idx").on(t.reservationId),
    index("seat_allocations_ticket_id_idx").on(t.ticketId),
    check(
      "seat_allocations_sold_ticket_check",
      sql`${t.status} <> 'sold' OR ${t.ticketId} IS NOT NULL`,
    ),
  ],
);

export type Reservation = typeof reservations.$inferSelect;
export type NewReservation = typeof reservations.$inferInsert;
export type ReservationItem = typeof reservationItems.$inferSelect;
export type NewReservationItem = typeof reservationItems.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type NewOrderItem = typeof orderItems.$inferInsert;
export type Refund = typeof refunds.$inferSelect;
export type NewRefund = typeof refunds.$inferInsert;
export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type TicketTransfer = typeof ticketTransfers.$inferSelect;
export type NewTicketTransfer = typeof ticketTransfers.$inferInsert;
export type SeatAllocation = typeof seatAllocations.$inferSelect;
export type NewSeatAllocation = typeof seatAllocations.$inferInsert;
