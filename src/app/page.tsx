import { ArrowRight, Clock3, ShieldCheck, Ticket, UsersRound } from "lucide-react";
import { BuyerCTA } from "@/components/fairdrop/BuyerCTA";
import { DemoAccountPicker } from "@/components/fairdrop/DemoAccountPicker";
import { SupabaseAccountAccess } from "@/components/fairdrop/SupabaseAccountAccess";
import { LandingHeader } from "@/components/fairdrop/LandingHeader";
import { getSeedEventId } from "@/lib/db";
import { getBuyerState, getDemoAccounts, getEvent } from "@/lib/event";
import { buyerAccountId } from "@/lib/session";
import { demoAuthEnabled, supabaseAuthEnabled } from "@/lib/auth-mode";

export const dynamic = "force-dynamic";

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
}

export default async function Home() {
  const eventId = await getSeedEventId();
  const event = await getEvent(eventId);
  if (!event) throw new Error("Demo event is missing");
  const [buyer, accounts] = await Promise.all([
    getBuyerState(event.id, await buyerAccountId()),
    demoAuthEnabled() ? getDemoAccounts() : Promise.resolve([]),
  ]);
  const usesSupabaseAuth = supabaseAuthEnabled();

  return <>
    <LandingHeader event={event} buyer={buyer} />
    <main>
      <section id="event" className="bg-blue-600 text-white">
        <div className="hero-photo relative flex min-h-[370px] items-start justify-end px-6 py-8 sm:min-h-[480px] lg:min-h-[550px] lg:px-12">
          <div className="rounded-full border border-white/30 bg-slate-950/35 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] backdrop-blur">Live prototype sale · 500 seats</div>
        </div>
        <div className="mx-auto max-w-7xl px-5 pb-16 pt-2 md:px-8 lg:pb-24">
          <div className="display text-[clamp(4.5rem,13vw,12rem)] leading-[.82] uppercase italic">Fair</div>
          <div className="display text-right text-[clamp(4.5rem,13vw,12rem)] leading-[.82] uppercase italic">Drop.</div>
          <div className="mt-12 grid gap-10 border-t border-white/30 pt-9 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl">
              <p className="text-sm font-bold uppercase tracking-[.2em] text-blue-100">One first-come line place per account</p>
              <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">500 seats. A waiting room built for everyone.</h1>
              <p className="mt-4 max-w-xl text-lg leading-relaxed text-blue-50">Join the live first-come line. Your server-recorded place is assigned immediately, and buyers ahead of you are served first.</p>
              <div className="mt-7"><BuyerCTA event={event} buyer={buyer} light /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[410px]">
              <div className="border border-white/30 bg-blue-700/50 p-5"><span className="text-xs font-bold uppercase tracking-[.15em] text-blue-100">Entry closes</span><p className="mt-2 text-lg font-bold tabular">{formatTime(event.entry_closes_at)}</p><p className="mt-1 text-xs text-blue-100">India Standard Time</p></div>
              <div className="border border-white/30 bg-blue-700/50 p-5"><span className="text-xs font-bold uppercase tracking-[.15em] text-blue-100">Current status</span><p className="mt-2 text-lg font-bold">{event.status === "ENTRY_OPEN" ? "Entry open" : event.status.replaceAll("_", " ").toLowerCase()}</p><p className="mt-1 text-xs text-blue-100">From the event server</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 md:px-8 lg:grid-cols-[1.1fr_.9fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[.2em] text-blue-600">The event</p>
          <h2 className="display mt-4 max-w-lg text-5xl leading-[1.02] sm:text-6xl">First come. First served.</h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">Your place is stored as soon as you join. Buyers are served in that order, and each account can reserve up to {event.max_tickets_per_account} tickets. No real payment is taken in this demo.</p>
          <div className="mt-8 flex flex-wrap gap-3 text-sm font-semibold"><span className="rounded-full border border-slate-200 bg-white px-4 py-2">FCFS server timestamp</span><span className="rounded-full border border-slate-200 bg-white px-4 py-2">Up to {event.max_tickets_per_account} per account</span><span className="rounded-full border border-slate-200 bg-white px-4 py-2">No real payment</span></div>
        </div>
        <div className="lift self-start overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between bg-slate-900 px-7 py-5 text-white"><span className="text-xs font-bold uppercase tracking-[.18em]">Ticket summary</span><Ticket className="h-5 w-5" /></div>
          <div className="p-7"><p className="text-sm font-semibold text-slate-500">Fair Drop demo ticket</p><p className="display mt-2 text-5xl">{event.total_inventory} seats</p><div className="my-7 h-px bg-slate-200" /><dl className="space-y-4 text-sm"><div className="flex justify-between"><dt className="text-slate-500">Total inventory</dt><dd className="font-bold tabular">{event.total_inventory}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Available now</dt><dd className="font-bold tabular">{event.available}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Per-account limit</dt><dd className="font-bold tabular">{event.max_tickets_per_account}</dd></div><div className="flex justify-between"><dt className="text-slate-500">Checkout hold</dt><dd className="font-bold tabular">{Math.round(event.reservation_ttl_seconds / 60)} minutes</dd></div></dl><p className="mt-7 rounded-lg bg-blue-50 p-4 text-sm leading-relaxed text-blue-900">The database gives the earliest accepted line entries the first booking opportunities. Each account can reserve at most {event.max_tickets_per_account} tickets.</p></div>
        </div>
      </section>

      <section id="how-it-works" className="bg-white py-20"><div className="mx-auto max-w-7xl px-5 md:px-8"><p className="text-sm font-bold uppercase tracking-[.2em] text-blue-600">How it works</p><h2 className="display mt-4 text-5xl sm:text-6xl">A fairer way to get in.</h2><div className="mt-12 grid gap-5 md:grid-cols-3">
        {[
          { n: "01", icon: <Clock3 />, title: "Join while tickets are live", text: "The server records your place immediately. Refreshing or retrying cannot create another entry." },
          { n: "02", icon: <UsersRound />, title: "First come, first served", text: "The database serializes arrivals. Buyers with earlier recorded positions are admitted before later arrivals." },
          { n: "03", icon: <ShieldCheck />, title: "Book up to the account limit", text: `Reserve up to ${event.max_tickets_per_account} seats when it is your turn. A short hold gives you time to confirm.` },
        ].map((step) => <article key={step.n} className="rounded-2xl border border-slate-200 bg-slate-50 p-7"><div className="flex items-center justify-between text-blue-600"><span className="display text-4xl">{step.n}</span>{step.icon}</div><h3 className="mt-8 text-xl font-bold">{step.title}</h3><p className="mt-3 leading-relaxed text-slate-600">{step.text}</p></article>)}
      </div></div></section>

      <section id="demo-account" className="mx-auto max-w-7xl px-5 py-20 md:px-8"><div className="grid gap-9 rounded-2xl bg-slate-900 p-7 text-white sm:p-10 lg:grid-cols-[.8fr_1.2fr] lg:p-14"><div><p className="text-sm font-bold uppercase tracking-[.2em] text-blue-300">{usesSupabaseAuth ? "Verified account access" : "Try the prototype"}</p><h2 className="display mt-4 text-4xl sm:text-5xl">{usesSupabaseAuth ? "One verified account. One line place." : "Choose a demo buyer."}</h2><p className="mt-5 leading-relaxed text-slate-300">{usesSupabaseAuth ? "Sign in with a verified email and pass the bot check. Your queue place is unique to your Supabase account." : "These local demo accounts show duplicate-entry protection. They do not verify that an account belongs to one person."}</p></div><div className="self-center">{usesSupabaseAuth ? <SupabaseAccountAccess signedInName={buyer.account?.displayName ?? null} /> : demoAuthEnabled() ? <div className="rounded-xl bg-white p-5 text-slate-900 sm:p-7"><p className="mb-4 text-sm font-bold">{buyer.account ? `Signed in as ${buyer.account.displayName}` : "Select a buyer to continue"}</p><DemoAccountPicker accounts={accounts} currentId={buyer.account?.id ?? null} /></div> : <p className="rounded-xl bg-amber-50 p-5 text-sm font-semibold text-amber-950">Set up Supabase Auth and the bot challenge before accepting production accounts. Demo account login is disabled in production.</p>}</div></div></section>

      <section id="faq" className="bg-white py-20"><div className="mx-auto max-w-5xl px-5 md:px-8"><p className="text-sm font-bold uppercase tracking-[.2em] text-blue-600">Answers first</p><h2 className="display mt-4 text-5xl">Queue FAQ.</h2><div className="mt-10 divide-y divide-slate-200 border-y border-slate-200">{[
        ["Can I refresh or come back later?", "Yes. Your account's queue entry is stored on the server. The status page loads it again whenever you return."],
        ["Will repeated joins improve my chances?", "No. The same account receives one eligible queue entry. A retry returns that existing entry."],
        ["When is my position assigned?", "Immediately when the server accepts your entry. Every buyer after you gets a later place."],
        ["How many tickets can I buy?", `Up to ${event.max_tickets_per_account} tickets per account. The database checks this cap when it creates a hold.`],
        ["Does joining guarantee tickets?", "No. A place sets your booking order. Tickets are held only when inventory is available and you reserve within your turn."],
      ].map(([question, answer]) => <details key={question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold">{question}<ArrowRight className="h-5 w-5 shrink-0 text-blue-600 transition-transform group-open:rotate-90" /></summary><p className="max-w-3xl pt-3 leading-relaxed text-slate-600">{answer}</p></details>)}</div></div></section>
      <section className="bg-blue-600 px-5 py-20 text-center text-white"><p className="text-sm font-bold uppercase tracking-[.2em] text-blue-100">Ready when you are</p><h2 className="display mx-auto mt-4 max-w-3xl text-5xl sm:text-6xl">One entry is all you need.</h2><div className="mt-8 flex justify-center"><BuyerCTA event={event} buyer={buyer} light /></div></section>
    </main>
    <footer className="bg-slate-950 px-5 py-8 text-sm text-slate-300"><div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3"><span className="font-bold text-white">FAIR DROP.</span><span>Hackathon prototype · simulated checkout · no real tickets</span></div></footer>
  </>;
}
