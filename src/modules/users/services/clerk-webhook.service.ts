import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { webhookEvents } from "@/db/schema";
import { fromWebhookUser } from "../utils/clerk-user-mapper";
import { MissingEmailError, usersService } from "./users.service";

export type ClerkWebhookOutcome = "processed" | "duplicate" | "ignored";

type ClerkWebhookInput = { id: string; type: string; data: unknown };

async function dispatch({ type, data }: ClerkWebhookInput): Promise<ClerkWebhookOutcome> {
  switch (type) {
    case "user.created":
    case "user.updated":
      try {
        await usersService.ensureUserFromClerk(fromWebhookUser(data));
      } catch (error) {
        // D3: sin email no se crea fila; se marca procesado para que Clerk no reintente.
        if (!(error instanceof MissingEmailError)) throw error;
        console.warn(error.message);
        return "ignored";
      }
      return "processed";
    case "user.deleted": {
      const id = (data as { id?: unknown } | null)?.id;
      if (typeof id !== "string" || !id) {
        console.warn("Clerk user.deleted event without a valid user id");
        return "ignored";
      }
      await usersService.anonymizeByClerkId(id);
      return "processed";
    }
    default:
      return "ignored";
  }
}

export async function processClerkWebhook(
  event: ClerkWebhookInput,
): Promise<ClerkWebhookOutcome> {
  const db = getDb();

  await db
    .insert(webhookEvents)
    .values({ id: event.id, provider: "clerk", type: event.type })
    .onConflictDoNothing();

  const [existing] = await db
    .select({ processedAt: webhookEvents.processedAt })
    .from(webhookEvents)
    .where(eq(webhookEvents.id, event.id));
  if (existing?.processedAt) return "duplicate";

  const outcome = await dispatch(event);

  await db
    .update(webhookEvents)
    .set({ processedAt: new Date() })
    .where(eq(webhookEvents.id, event.id));

  return outcome;
}
