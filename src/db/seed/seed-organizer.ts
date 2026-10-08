import { eq, sql } from "drizzle-orm";

import { getDb } from "@/db/client";
import { organizerProfiles, users } from "@/db/schema";

import type { SeedOrganizerRef } from "./seed-args";

export type SeedOrganizer = {
  organizerId: string;
  userId: string;
  email: string;
  displayName: string;
  status: "onboarding" | "active" | "suspended";
};

/** `organizerId`, `displayName` y `status` son nulos cuando el usuario no tiene perfil de organizador. */
export type FoundOrganizer = Omit<
  SeedOrganizer,
  "organizerId" | "displayName" | "status"
> & {
  organizerId: string | null;
  displayName: string | null;
  status: SeedOrganizer["status"] | null;
  deactivated: boolean;
};

export class SeedOrganizerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SeedOrganizerError";
  }
}

function describeRef(ref: SeedOrganizerRef): string {
  return ref.by === "email" ? `email ${ref.email}` : `id ${ref.id}`;
}

export function assertSeedableOrganizer(
  found: FoundOrganizer | null,
  ref: SeedOrganizerRef,
): SeedOrganizer {
  if (!found) {
    throw new SeedOrganizerError(
      `No existe un usuario con ${describeRef(ref)}. Debe haber iniciado sesión (se sincroniza con Clerk) y tener rol de organizador.`,
    );
  }
  const { deactivated, organizerId, displayName, status, ...user } = found;
  if (!organizerId || !displayName || !status) {
    throw new SeedOrganizerError(
      `El usuario ${user.email} no es organizador. Créalo en /admin/users (Convertir en organizador).`,
    );
  }
  if (deactivated) {
    throw new SeedOrganizerError(
      `El usuario ${user.email} está desactivado o anonimizado; usa un organizador activo.`,
    );
  }
  if (status !== "active") {
    throw new SeedOrganizerError(
      `El organizador ${displayName} (${user.email}) está ${status}; debe estar active.`,
    );
  }
  return { ...user, organizerId, displayName, status };
}

export async function findOrganizer(
  ref: SeedOrganizerRef,
): Promise<FoundOrganizer | null> {
  const where =
    ref.by === "email"
      ? sql`lower(${users.email}) = lower(${ref.email})`
      : eq(users.id, ref.id);

  const [row] = await getDb()
    .select({
      userId: users.id,
      email: users.email,
      deactivated: sql<boolean>`(${users.deactivatedAt} IS NOT NULL OR ${users.deletedAt} IS NOT NULL)`,
      organizerId: organizerProfiles.id,
      displayName: organizerProfiles.displayName,
      status: organizerProfiles.status,
    })
    .from(users)
    .leftJoin(organizerProfiles, eq(organizerProfiles.userId, users.id))
    .where(where)
    .limit(1);

  return row ?? null;
}
