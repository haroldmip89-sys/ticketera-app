import { pgEnum } from "drizzle-orm/pg-core";

export const staffRole = pgEnum("staff_role", ["admin", "super_admin"]);
export const organizerStatus = pgEnum("organizer_status", [
  "onboarding",
  "active",
  "suspended",
]);
export const layoutKind = pgEnum("layout_kind", ["zones", "seated"]);
export const sectionKind = pgEnum("section_kind", [
  "general_admission",
  "seated",
]);
export const eventStatus = pgEnum("event_status", [
  "draft",
  "published",
  "cancelled",
  "suspended",
]);
export const seatAllocationStatus = pgEnum("seat_allocation_status", [
  "held",
  "sold",
]);
export const reservationStatus = pgEnum("reservation_status", [
  "active",
  "converted",
  "expired",
  "cancelled",
]);
export const orderStatus = pgEnum("order_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);
export const refundStatus = pgEnum("refund_status", [
  "pending",
  "succeeded",
  "failed",
]);
export const ticketStatus = pgEnum("ticket_status", ["valid", "used", "void"]);
export const transferStatus = pgEnum("transfer_status", [
  "pending",
  "accepted",
  "cancelled",
]);
export const webhookProvider = pgEnum("webhook_provider", ["stripe", "clerk"]);
export const authProvider = pgEnum("auth_provider", ["password", "google"]);
export const invitationStatus = pgEnum("invitation_status", [
  "pending",
  "accepted",
  "revoked",
]);
export const invitedRole = pgEnum("invited_role", ["admin", "organizer"]);
