import { like } from "drizzle-orm";

import type { getDb } from "@/db/client";
import { organizerProfiles } from "@/db/schema";
import { slugify } from "@/lib/slug";

export type Tx = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];

export async function uniqueOrganizerSlug(tx: Tx, displayName: string) {
  const base = slugify(displayName) || "organizer";
  const taken = new Set(
    (
      await tx
        .select({ slug: organizerProfiles.slug })
        .from(organizerProfiles)
        .where(like(organizerProfiles.slug, `${base}%`))
    ).map((row) => row.slug),
  );
  if (!taken.has(base)) return base;
  let suffix = 2;
  while (taken.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}
