import { randomUUID, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db";
import { closeAndOrder, admitNext } from "@/lib/queue-operations";

export const runtime = "nodejs";

function authorized(request: Request, secret: string) {
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const left = Buffer.from(supplied);
  const right = Buffer.from(secret);
  return left.length === right.length && timingSafeEqual(left, right);
}

// Call periodically from a scheduler. Each pass performs at most one admission
// batch per active event; the event row lock keeps concurrent scheduler calls safe.
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "Scheduler is not configured." }, { status: 503 });
  if (!authorized(request, secret)) return Response.json({ error: "Unauthorized." }, { status: 401 });

  const db = await getDb();
  const events = await db.query<{ id: string; status: string; entry_closes_at: string }>(
    "SELECT id,status,entry_closes_at FROM events WHERE status IN ('ENTRY_OPEN','ENTRY_CLOSED','SELLING') ORDER BY entry_closes_at,id LIMIT 100",
  );
  const results = [];
  for (const event of events.rows) {
    if (["ENTRY_OPEN", "SELLING"].includes(event.status) && new Date(event.entry_closes_at).getTime() <= Date.now()) {
      const ordered = await closeAndOrder(event.id);
      if (!ordered.ok) { results.push({ eventId: event.id, stage: "close", ...ordered }); continue; }
    }
    const latest = (await db.query<{ status: string }>("SELECT status FROM events WHERE id=$1", [event.id])).rows[0]?.status;
    if (latest === "SELLING") results.push({ eventId: event.id, stage: "admit", ...(await admitNext(event.id, randomUUID())) });
    else results.push({ eventId: event.id, stage: "idle", state: latest });
  }
  return Response.json({ processed: results.length, results }, { headers: { "Cache-Control": "no-store" } });
}
