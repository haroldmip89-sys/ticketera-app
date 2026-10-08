import type { NextRequest } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { processClerkWebhook } from "@/modules/users/services/clerk-webhook.service";

export async function POST(req: NextRequest): Promise<Response> {
  let event;
  try {
    event = await verifyWebhook(req);
  } catch {
    return Response.json({ error: "invalid signature" }, { status: 400 });
  }

  const id = req.headers.get("svix-id");
  if (!id) return Response.json({ error: "missing svix-id" }, { status: 400 });

  try {
    const status = await processClerkWebhook({ id, type: event.type, data: event.data });
    return Response.json({ status });
  } catch (error) {
    console.error("clerk webhook failed", error);
    return Response.json({ error: "processing failed" }, { status: 500 });
  }
}
