import { createHash, randomUUID } from "node:crypto";
import { getDb } from "./db";

type Kind = "join" | "reserve" | "confirm" | "status";
const WINDOW_SECONDS = 60;
const limits: Record<Kind, { account: number; ip: number }> = {
  join: { account: 12, ip: 120 },
  reserve: { account: 8, ip: 60 },
  confirm: { account: 12, ip: 90 },
  status: { account: 90, ip: 600 },
};

function digest(value: string) { return createHash("sha256").update(value).digest("hex"); }

function trustedClientAddress(request: Request) {
  if (process.env.TRUST_CLOUDFLARE_HEADERS === "true") return request.headers.get("cf-connecting-ip")?.trim() || null;
  if (process.env.TRUST_PLATFORM_REAL_IP === "true") return request.headers.get("x-real-ip")?.trim() || null;
  return null;
}

async function consume(key: string, limit: number, windowStart: string) {
  const db = await getDb();
  const row = (await db.query<{ hits: number }>(
    `INSERT INTO rate_limit_buckets (bucket_key,window_start,hits) VALUES ($1,$2,1)
     ON CONFLICT (bucket_key) DO UPDATE SET
       hits=CASE WHEN rate_limit_buckets.window_start=$2 THEN rate_limit_buckets.hits+1 ELSE 1 END,
       window_start=$2 RETURNING hits`,
    [key, windowStart],
  )).rows[0];
  return row.hits <= limit;
}

export async function consumeBuyerLimit(eventId: string, accountId: string, kind: Kind, request: Request) {
  const now = Date.now();
  const boundary = Math.floor(now / (WINDOW_SECONDS * 1000)) * WINDOW_SECONDS * 1000;
  const windowStart = new Date(boundary).toISOString();
  const retryAfter = Math.max(1, Math.ceil((boundary + WINDOW_SECONDS * 1000 - now) / 1000));
  const accountAllowed = await consume(`account:${eventId}:${kind}:${accountId}`, limits[kind].account, windowStart);
  // Trust only an explicitly configured edge header; raw X-Forwarded-For is client-spoofable.
  const proxyAddress = trustedClientAddress(request);
  const ipAllowed = accountAllowed && proxyAddress
    ? await consume(`ip:${eventId}:${kind}:${digest(proxyAddress)}`, limits[kind].ip, windowStart)
    : true;
  if (accountAllowed && ipAllowed) return null;
  await auditDecision(eventId, accountId, "REQUEST_THROTTLED", "RATE_LIMITED", { operation: kind, signal: !accountAllowed ? "account" : "ip" });
  return { reasonCode: "RATE_LIMITED", message: `Too many ${kind} requests. Retry after ${retryAfter} seconds.`, retryAfter };
}

export async function consumeClaimLimit(eventId: string, request: Request) {
  const now = Date.now();
  const boundary = Math.floor(now / (WINDOW_SECONDS * 1000)) * WINDOW_SECONDS * 1000;
  const address = trustedClientAddress(request);
  const allowed = address ? await consume(`claim:${eventId}:${digest(address)}`, 20, new Date(boundary).toISOString()) : true;
  if (allowed) return null;
  const retryAfter = Math.max(1, Math.ceil((boundary + WINDOW_SECONDS * 1000 - now) / 1000));
  await auditDecision(eventId, null, "REQUEST_THROTTLED", "RATE_LIMITED", { operation: "claim" });
  return { reasonCode: "RATE_LIMITED", message: `Too many attempts. Retry after ${retryAfter} seconds.`, retryAfter };
}

export async function auditDecision(eventId: string, accountId: string | null, type: string, reasonCode: string, metadata: Record<string, unknown> = {}) {
  const db = await getDb();
  await db.query(
    "INSERT INTO audit_events (id,event_id,account_id,type,reason_code,metadata) VALUES ($1,$2,$3,$4,$5,$6::jsonb)",
    [randomUUID(), eventId, accountId, type, reasonCode, JSON.stringify(metadata)],
  );
}
