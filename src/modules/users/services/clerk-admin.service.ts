import { clerkClient } from "@clerk/nextjs/server";

import type { RoleMetadata } from "@/lib/auth/roles";

/** Adaptador fino de la Backend API de Clerk para acciones administrativas. */
export const clerkAdminService = {
  async syncRoleMetadata(clerkUserId: string, role: RoleMetadata) {
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(clerkUserId, {
      publicMetadata: { staffRole: role.staffRole, isOrganizer: role.isOrganizer },
    });
  },

  async banUser(clerkUserId: string) {
    const clerk = await clerkClient();
    await clerk.users.banUser(clerkUserId);
  },

  async unbanUser(clerkUserId: string) {
    const clerk = await clerkClient();
    await clerk.users.unbanUser(clerkUserId);
  },

  /** Primer token = nombre, resto = apellido (inverso del mapper, que junta con espacio). */
  async updateName(clerkUserId: string, fullName: string) {
    const [firstName, ...rest] = fullName.trim().split(/\s+/);
    const clerk = await clerkClient();
    await clerk.users.updateUser(clerkUserId, {
      firstName,
      lastName: rest.join(" "),
    });
  },

  async deleteUser(clerkUserId: string) {
    const clerk = await clerkClient();
    await clerk.users.deleteUser(clerkUserId);
  },

  async inviteByEmail(input: {
    email: string;
    redirectUrl: string;
  }): Promise<{ clerkInvitationId: string }> {
    const clerk = await clerkClient();
    const invitation = await clerk.invitations.createInvitation({
      emailAddress: input.email,
      redirectUrl: input.redirectUrl,
      ignoreExisting: true,
      notify: true,
    });
    return { clerkInvitationId: invitation.id };
  },
};
