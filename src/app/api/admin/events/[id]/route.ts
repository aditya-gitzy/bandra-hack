import { NextResponse } from "next/server";
import { getEvent } from "@/lib/event";
import { queueOverview } from "@/lib/queue-operations";
import { organizerSession } from "@/lib/session";
import { expireEventHolds } from "@/lib/checkout";

export const runtime = "nodejs";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await organizerSession())) return NextResponse.json({ reasonCode: "UNAUTHORIZED" }, { status: 403 });
  const { id } = await context.params;
  await expireEventHolds(id);
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ reasonCode: "EVENT_NOT_FOUND" }, { status: 404 });
  const requestedPage = Number(new URL(request.url).searchParams.get("page") ?? 0);
  if (!Number.isInteger(requestedPage) || requestedPage < 0 || requestedPage > 100_000) return NextResponse.json({ reasonCode: "INVALID_PAGE" }, { status: 400 });
  return NextResponse.json({ event, queue: await queueOverview(id, requestedPage), serverTime: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } });
}
