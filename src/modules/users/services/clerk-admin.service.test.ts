import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateUserMetadata: vi.fn(),
  banUser: vi.fn(),
  unbanUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  createInvitation: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  clerkClient: async () => ({
    users: {
      updateUserMetadata: mocks.updateUserMetadata,
      banUser: mocks.banUser,
      unbanUser: mocks.unbanUser,
      updateUser: mocks.updateUser,
      deleteUser: mocks.deleteUser,
    },
    invitations: { createInvitation: mocks.createInvitation },
  }),
}));

import { clerkAdminService } from "./clerk-admin.service";

beforeEach(() => vi.clearAllMocks());

describe("clerkAdminService", () => {
  it("copies role metadata with updateUserMetadata", async () => {
    await clerkAdminService.syncRoleMetadata("c1", {
      staffRole: "admin",
      isOrganizer: false,
    });
    expect(mocks.updateUserMetadata).toHaveBeenCalledWith("c1", {
      publicMetadata: { staffRole: "admin", isOrganizer: false },
    });
  });

  it("bans and unbans", async () => {
    await clerkAdminService.banUser("c1");
    await clerkAdminService.unbanUser("c1");
    expect(mocks.banUser).toHaveBeenCalledWith("c1");
    expect(mocks.unbanUser).toHaveBeenCalledWith("c1");
  });

  it("splits the name into first and last name", async () => {
    await clerkAdminService.updateName("c1", "  Ana María  Pérez ");
    expect(mocks.updateUser).toHaveBeenCalledWith("c1", {
      firstName: "Ana",
      lastName: "María Pérez",
    });
    await clerkAdminService.updateName("c1", "Ana");
    expect(mocks.updateUser).toHaveBeenLastCalledWith("c1", {
      firstName: "Ana",
      lastName: "",
    });
  });

  it("deletes the Clerk user", async () => {
    await clerkAdminService.deleteUser("c1");
    expect(mocks.deleteUser).toHaveBeenCalledWith("c1");
  });

  it("invites by email ignoring existing and returns the invitation id", async () => {
    mocks.createInvitation.mockResolvedValue({ id: "inv_1" });
    const result = await clerkAdminService.inviteByEmail({
      email: "a@b.com",
      redirectUrl: "http://x/sign-up",
    });
    expect(mocks.createInvitation).toHaveBeenCalledWith({
      emailAddress: "a@b.com",
      redirectUrl: "http://x/sign-up",
      ignoreExisting: true,
      notify: true,
    });
    expect(result).toEqual({ clerkInvitationId: "inv_1" });
  });
});
