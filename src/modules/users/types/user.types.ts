import type { OrganizerStatus, StaffRole } from "@/lib/auth/permissions";

export type ClerkUserSnapshot = {
  clerkUserId: string;
  email: string | null;
  emailVerified: boolean;
  fullName: string | null;
  avatarUrl: string | null;
  authProviders: ("password" | "google")[];
};

export type AdminUserRow = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  staffRole: StaffRole | null;
  organizer: { id: string; status: OrganizerStatus } | null;
  authProviders: string[];
  deactivatedAt: Date | null;
  createdAt: Date;
};

export const USER_ROLE_FILTERS = [
  "super_admin",
  "admin",
  "organizer",
  "customer",
] as const
export const ORGANIZER_STATUS_FILTERS = [
  "onboarding",
  "active",
  "suspended",
] as const
