"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Script from "next/script";
import type { FormEvent } from "react";
import type { BuyerState, EventRow } from "@/lib/event";
import { getBuyerAction } from "@/lib/buyer-action";

const authConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function BuyerCTA({ event, buyer, light = false, queueHref = "/queue", authHref = "#demo-account" }: { event: EventRow; buyer: BuyerState; light?: boolean; queueHref?: string; authHref?: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const action = getBuyerAction(event, buyer);
  const cls = `inline-flex min-h-12 items-center justify-center px-6 py-3 text-sm font-bold uppercase tracking-[.12em] transition-colors ${light ? "bg-white text-blue-700 hover:bg-blue-50" : "bg-blue-600 text-white hover:bg-blue-700"}`;

  async function join(eventForm: FormEvent<HTMLFormElement>) {
    eventForm.preventDefault();
    setPending(true); setError("");
    try {
      const challengeToken = new FormData(eventForm.currentTarget).get("cf-turnstile-response");
      const response = await fetch(`/api/events/${event.id}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authConfigured ? { challengeToken } : {}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? data.reasonCode ?? "Unable to join");
      router.push(queueHref);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to join");
    } finally { setPending(false); }
  }

  return <span className="inline-flex flex-col items-start gap-2">
    {action.href ? <Link href={action.href === "/queue" ? queueHref : action.href === "#demo-account" ? authHref : action.href} className={cls}>{buyer.state === "NOT_SIGNED_IN" && event.access_mode === "PROTECTED" ? "Claim invitation or sign in" : action.label} <span aria-hidden className="ml-3">↗</span></Link>
      : <form onSubmit={(formEvent) => void join(formEvent)}>
        {authConfigured && turnstileSiteKey && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" /><div className="mb-3"><div className="cf-turnstile" data-sitekey={turnstileSiteKey} data-action="queue-join" /></div></>}
        {authConfigured && !turnstileSiteKey && <span className="mb-2 block max-w-xs text-xs text-red-100">Bot protection needs NEXT_PUBLIC_TURNSTILE_SITE_KEY.</span>}
        <button type="submit" disabled={pending || action.disabled || (authConfigured && !turnstileSiteKey)} className={`${cls} disabled:opacity-60`}>{pending ? "Joining…" : action.label} <span aria-hidden className="ml-3">↗</span></button>
      </form>}
    {error && <span role="alert" className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">{error}</span>}
  </span>;
}
