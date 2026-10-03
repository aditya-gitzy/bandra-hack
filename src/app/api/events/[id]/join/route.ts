import { NextResponse } from "next/server";
import { getEvent, joinQueue } from "@/lib/event";
import { buyerAccountId } from "@/lib/session";
import { auditDecision, consumeBuyerLimit } from "@/lib/abuse";
import { supabaseAuthEnabled } from "@/lib/auth-mode";
import { validateTurnstile } from "@/lib/challenge";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const event = await getEvent(id);
  if (!event) return NextResponse.json({ reasonCode: "EVENT_NOT_FOUND", message: "Event not found." }, { status: 404 });
  const accountId = await buyerAccountId();
  if (!accountId) return NextResponse.json({ reasonCode: "NOT_SIGNED_IN", message: "Choose a demo account first." }, { status: 401 });
  if (supabaseAuthEnabled() && !event.simulation_run_id) {
    let body: unknown;
    try { body = await request.json(); } catch { body = null; }
    const token = body && typeof body === "object" ? (body as { challengeToken?: unknown }).challengeToken : null;
    const challenge = await validateTurnstile(token, request, "queue-join");
    if (!challenge.ok) {
      await auditDecision(id, accountId, "REQUEST_REJECTED", challenge.reasonCode);
      return NextResponse.json(challenge, { status: 403 });
    }
  }
  const limited = await consumeBuyerLimit(id, accountId, "join", request);
  if (limited) return NextResponse.json(limited, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });
  const result = await joinQueue(event.id, accountId);
  if (!result.ok) await auditDecision(id, accountId, "REQUEST_REJECTED", result.reasonCode);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
