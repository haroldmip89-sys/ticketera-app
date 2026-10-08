import type { StaffRole } from "./permissions";

// Copia no autoritativa; no usar para autorizar. La fuente de verdad es la base de datos.
export const STAFF_ROLE_METADATA_KEY = "staffRole";
export const ORGANIZER_METADATA_KEY = "isOrganizer";

export type RoleMetadata = { staffRole: StaffRole | null; isOrganizer: boolean };

export function readRoleMetadata(publicMetadata: unknown): RoleMetadata {
  if (
    typeof publicMetadata !== "object" ||
    publicMetadata === null ||
    Array.isArray(publicMetadata)
  ) {
    return { staffRole: null, isOrganizer: false };
  }
  const meta = publicMetadata as Record<string, unknown>;
  const staff = meta[STAFF_ROLE_METADATA_KEY];
  return {
    staffRole: staff === "admin" || staff === "super_admin" ? staff : null,
    isOrganizer: meta[ORGANIZER_METADATA_KEY] === true,
  };
}

/** Solo pista de UI (compat. 015). */
export function isOrganizer(publicMetadata: unknown): boolean {
  return readRoleMetadata(publicMetadata).isOrganizer;
}
