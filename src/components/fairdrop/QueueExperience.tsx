"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, RefreshCw } from "lucide-react";
import type { BuyerState, EventRow } from "@/lib/event";

type Snapshot = { event: EventRow; buyer: BuyerState; serverTime: string };
const steps = ["Entry accepted", "Position assigned", "Admitted", "Held", "Confirmed"];

export function QueueExperience({ eventId, homeHref = "/", authHref = "/#demo-account" }: { eventId: string; homeHref?: string; authHref?: string }) {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [stale, setStale] = useState(false);
  const [updated, setUpdated] = useState<Date | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [rateNotice, setRateNotice] = useState("");
  const reserveKey = useRef<string | null>(null);
  const serverOffset = useRef(0);
  const retryStatusAt = useRef(0);
  const currentBuyerState = useRef<string | null>(null);
  const readState = useCallback(async () => {
    try {
      if (Date.now() < retryStatusAt.current) return;
      const response = await fetch(`/api/events/${eventId}/me`, { cache: "no-store" });
      if (response.status === 429) {
        const guidance = await response.json();
        retryStatusAt.current = Date.now() + Number(response.headers.get("Retry-After") ?? guidance.retryAfter ?? 1) * 1000;
        setRateNotice(guidance.message ?? "Too many status requests. Retrying shortly."); setStale(true);
        return;
      }
      if (!response.ok) throw new Error("Status unavailable");
      const next = await response.json() as Snapshot;
      serverOffset.current = new Date(next.serverTime).getTime() - Date.now();
      currentBuyerState.current = next.buyer.state;
      setSnapshot(next); setStale(false); setRateNotice(""); setUpdated(new Date());
    } catch { setStale(true); }
  }, [eventId]);
  useEffect(() => {
    let pollTimer: number | undefined;
    let stopped = false;
    const schedulePoll = () => {
      if (stopped || document.visibilityState !== "visible") return;
      pollTimer = window.setTimeout(async () => {
        await readState();
        schedulePoll();
      }, (currentBuyerState.current === "QUEUED" ? 60_000 : ["ADMITTED", "RESERVED"].includes(currentBuyerState.current ?? "") ? 10_000 : 30_000) + Math.floor(Math.random() * 10_000));
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        if (pollTimer !== undefined) window.clearTimeout(pollTimer);
        return;
      }
      if (pollTimer !== undefined) window.clearTimeout(pollTimer);
      void readState();
      schedulePoll();
    };
    void readState();
    schedulePoll();
    const clock = window.setInterval(() => setNow(Date.now()), 250);
    document.addEventListener("visibilitychange", onVisible);
    return () => { stopped = true; if (pollTimer !== undefined) window.clearTimeout(pollTimer); window.clearInterval(clock); document.removeEventListener("visibilitychange", onVisible); };
  }, [readState]);

  async function checkout(operation: "reserve" | "confirm") {
    setBusy(true); setNotice("");
    try {
      if (operation === "reserve") reserveKey.current ??= crypto.randomUUID();
      const response = await fetch(operation === "reserve" ? `/api/events/${eventId}/reserve` : `/api/reservations/${snapshot?.buyer.reservation?.id}/confirm`, {
        method: "POST", headers: operation === "reserve" ? { "Content-Type": "application/json", "Idempotency-Key": reserveKey.current! } : {},
        body: operation === "reserve" ? JSON.stringify({ quantity }) : undefined,
      });
      const result = await response.json();
      await readState();
      setNotice(result.ok ? operation === "reserve" ? `${result.reservation?.quantity ?? quantity} ticket(s) held. Confirm before the timer ends.` : `${result.order?.quantity ?? quantity} ticket(s) booked.` : result.message ?? result.reasonCode);
      if (response.ok) reserveKey.current = null;
    } catch { setNotice("Connection lost. Your latest state will appear when the connection returns. Retry uses the same request key."); }
    finally { setBusy(false); }
  }

  const buyer = snapshot?.buyer;
  const remaining = buyer?.reservation ? Math.max(0, Math.ceil((new Date(buyer.reservation.expiresAt).getTime() - now - serverOffset.current) / 1000)) : 0;
  const stage = buyer?.state === "CONFIRMED" ? 5 : buyer?.state === "RESERVED" ? 4 : buyer?.state === "ADMITTED" ? 3 : buyer?.entry?.position ? 2 : buyer?.entry ? 1 : 0;
  return <div className="min-h-screen bg-slate-50">
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white"><div className="mx-auto flex h-[72px] max-w-6xl items-center justify-between gap-4 px-5"><Link href={homeHref} className="display text-2xl italic uppercase text-blue-600">Fair Drop<span className="text-slate-900">.</span></Link><nav className="flex gap-5 text-sm font-semibold"><Link href={homeHref} className="hover:text-blue-600">Event details</Link><Link href={homeHref === "/" ? "/#faq" : homeHref} className="hover:text-blue-600">Help</Link></nav></div></header>
    <main className="mx-auto max-w-6xl px-5 py-10 md:py-16"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-blue-600">Waiting room</p><h1 className="display mt-2 text-5xl sm:text-6xl">My status.</h1></div><div className="flex items-center gap-3 text-sm text-slate-500"><span className="flex items-center gap-2"><RefreshCw className={`h-4 w-4 ${stale ? "text-amber-600" : "text-green-600"}`} />{stale ? "Reconnecting… showing last known state" : updated ? `Updated ${updated.toLocaleTimeString()}` : "Loading status…"}</span><button type="button" onClick={() => void readState()} className="rounded-lg border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:border-blue-500 hover:text-blue-700">Refresh now</button></div></div>
      <div className="mt-9 grid gap-7 lg:grid-cols-[1.6fr_.9fr]"><section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9" aria-live="polite">
        {!snapshot ? <div className="animate-pulse"><div className="h-5 w-28 rounded bg-slate-200" /><div className="mt-5 h-12 w-3/4 rounded bg-slate-200" /><div className="mt-5 h-4 w-full rounded bg-slate-100" /></div> : <>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700">{buyer?.state.replaceAll("_", " ")}</span>
          <h2 className="mt-5 text-3xl font-bold leading-tight">{buyer?.state === "CONFIRMED" ? "Purchase confirmed." : buyer?.state === "RESERVED" ? "Your ticket is held." : buyer?.state === "ADMITTED" ? "You're admitted." : buyer?.state === "EXPIRED" ? "Your window ended." : buyer?.state === "REVIEW_REQUIRED" ? "Eligibility review pending." : buyer?.state === "BLOCKED" ? "Eligibility blocked." : buyer?.entry ? buyer.entry.position ? `You're number ${buyer.entry.position}` : "Your entry is accepted." : buyer?.state === "NOT_SIGNED_IN" ? "Sign in first." : "You haven't joined yet."}</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-slate-600">{buyer?.message}</p>
          {buyer?.peopleAhead !== null && buyer?.peopleAhead !== undefined && <p className="mt-5 inline-flex rounded-lg bg-blue-50 px-4 py-3 text-sm font-bold text-blue-800 tabular">{buyer.peopleAhead} {buyer.peopleAhead === 1 ? "person" : "people"} ahead in the waiting queue</p>}
          {buyer?.state === "ADMITTED" && buyer.entry?.admissionExpiresAt && <div className="mt-5"><p className="rounded-lg bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">Your turn is active until {new Date(buyer.entry.admissionExpiresAt).toLocaleTimeString()}. Buyers ahead of you were served first.</p><label className="mt-4 block text-sm font-bold text-slate-700">Tickets to reserve (max {snapshot?.event.max_tickets_per_account})<select value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} className="mt-2 block rounded-lg border border-slate-300 bg-white px-4 py-3" disabled={busy || !snapshot?.event.available}>{Array.from({ length: Math.max(1, Math.min(snapshot?.event.max_tickets_per_account ?? 1, snapshot?.event.available ?? 1)) }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}</select></label><button disabled={busy || stale || !snapshot?.event.available} onClick={() => void checkout("reserve")} className="mt-4 rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">Reserve {quantity} {quantity === 1 ? "ticket" : "tickets"}</button></div>}
          {buyer?.state === "RESERVED" && buyer.reservation && <div className="mt-5"><p className="rounded-lg bg-blue-50 px-4 py-3 font-semibold text-blue-900 tabular">{buyer.reservation.quantity} ticket(s) held · hold ends in {Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, "0")}</p><p className="mt-3 break-all text-xs text-slate-500">Reservation ID: {buyer.reservation.id}</p><button disabled={busy || stale || remaining === 0} onClick={() => void checkout("confirm")} className="mt-4 rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white disabled:opacity-50">Confirm booking</button></div>}
          {buyer?.order && <div className="mt-5 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-900"><p className="font-bold">{buyer.order.quantity} ticket(s) confirmed</p><p className="mt-1 break-all font-mono">Order ID: {buyer.order.id}</p></div>}
          {(notice || rateNotice) && <p aria-live="polite" className="mt-4 text-sm font-semibold text-blue-700">{rateNotice || notice}</p>}
          {buyer?.entry && <div className="mt-8 grid gap-4 border-t border-slate-200 pt-6 sm:grid-cols-2"><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Entry ID</p><p className="mt-1 break-all font-mono text-sm">{buyer.entry.id}</p></div><div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Accepted at</p><p className="mt-1 text-sm font-semibold tabular">{new Date(buyer.entry.receivedAt).toLocaleString()}</p></div></div>}
          {!buyer?.entry && <Link href={buyer?.state === "NOT_SIGNED_IN" ? authHref : homeHref} className="mt-7 inline-flex bg-blue-600 px-6 py-3 text-sm font-bold text-white">{buyer?.state === "NOT_SIGNED_IN" ? "Sign in" : "Go to event"}</Link>}
        </>}
      </section><aside className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-slate-500">Your journey</p><ol className="mt-6 space-y-5">{steps.map((step, index) => <li key={step} className="flex items-center gap-3 text-sm font-semibold">{index < stage ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Circle className="h-5 w-5 text-slate-300" />}<span className={index < stage ? "text-slate-900" : "text-slate-400"}>{step}</span></li>)}</ol><p className="mt-8 border-t border-slate-200 pt-5 text-sm leading-relaxed text-slate-600">Your first-come position is assigned immediately. The account ticket cap is {snapshot?.event.max_tickets_per_account ?? "—"}.</p></aside></div>
      {buyer?.receipt && <section className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">Fairness receipt</p><h2 className="mt-2 text-2xl font-bold">How your outcome was decided</h2><dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3"><ReceiptItem label="Entry accepted" value={new Date(buyer.receipt.acceptedAt).toLocaleString()} /><ReceiptItem label="Ordering policy" value={buyer.receipt.policyVersion} /><ReceiptItem label="Cutoff" value={buyer.receipt.cutoffAt ? new Date(buyer.receipt.cutoffAt).toLocaleString() : "Entry still open"} /><ReceiptItem label="Final position" value={buyer.receipt.finalPosition ? String(buyer.receipt.finalPosition) : "Not assigned"} /><ReceiptItem label="Admission" value={buyer.receipt.admissionOutcome.replaceAll("_", " ")} /><ReceiptItem label="Purchase" value={buyer.receipt.purchaseOutcome.replaceAll("_", " ")} /></dl><p className="mt-5 text-sm text-slate-600">Reason codes: {buyer.receipt.reasonCodes.length ? buyer.receipt.reasonCodes.join(", ") : "None recorded yet"}. A queue position controls admission order; it does not guarantee a ticket.</p></section>}
      <p className="mt-7 text-sm text-slate-500">Your position and admission state come from the server. Refreshing this page does not change either one.</p>
    </main>
  </div>;
}

function ReceiptItem({ label, value }: { label: string; value: string }) { return <div className="border-t border-slate-100 pt-3"><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-semibold text-slate-900">{value}</dd></div>; }
