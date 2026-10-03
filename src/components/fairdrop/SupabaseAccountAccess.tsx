"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

type TurnstileWidget = { render: (container: HTMLElement, options: {
  sitekey: string; action: string; callback: (token: string) => void;
  "expired-callback": () => void; "error-callback": () => void;
}) => string; reset: (widgetId?: string) => void; remove: (widgetId: string) => void };
declare global { interface Window { turnstile?: TurnstileWidget } }

export function SupabaseAccountAccess({ signedInName }: { signedInName: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [scriptReady, setScriptReady] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const captchaContainer = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    setCaptchaToken("");
    if (!siteKey || !scriptReady || !window.turnstile || !captchaContainer.current) return;
    const id = window.turnstile.render(captchaContainer.current, {
      sitekey: siteKey,
      action: `auth-${mode}`,
      callback: setCaptchaToken,
      "expired-callback": () => setCaptchaToken(""),
      "error-callback": () => setCaptchaToken(""),
    });
    widgetId.current = id;
    return () => {
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [mode, scriptReady]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setNotice(""); setError("");
    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get("email") ?? "").trim();
    const password = String(values.get("password") ?? "");
    if (!siteKey || !captchaToken) {
      setError("Complete the bot check before continuing."); setBusy(false); return;
    }
    try {
      const supabase = createClient();
      if (mode === "signup") {
        const { data, error: authError } = await supabase.auth.signUp({
          email, password,
          options: { captchaToken, emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (authError) throw authError;
        if (data.session) {
          setNotice("Account created and signed in. You can now join the draw.");
          router.refresh();
        } else {
          setNotice("Check your email and verify your address before joining the draw.");
        }
      } else {
        const { error: authError } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } });
        if (authError) throw authError;
        setNotice("Signed in. Your queue entry is tied to this account.");
        router.refresh();
      }
      form.reset();
      setCaptchaToken("");
      window.turnstile?.reset(widgetId.current ?? undefined);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to sign in.");
      setCaptchaToken("");
      window.turnstile?.reset(widgetId.current ?? undefined);
    } finally { setBusy(false); }
  }

  async function signOut() {
    setBusy(true); setError(""); setNotice("");
    try {
      const { error: authError } = await createClient().auth.signOut();
      if (authError) throw authError;
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to sign out."); }
    finally { setBusy(false); }
  }

  if (signedInName) return <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 text-blue-950">
    <p className="font-bold">Signed in as {signedInName}</p>
    <p className="mt-2 text-sm">Your entry is tied to your verified Supabase email account. Joining again resumes your existing entry.</p>
    <button type="button" disabled={busy} onClick={() => void signOut()} className="mt-4 text-sm font-bold underline disabled:opacity-50">Sign out</button>
  </div>;

  return <div className="rounded-xl bg-white p-5 text-slate-900 sm:p-7">
    <div className="mb-5 flex gap-2 border-b border-slate-200 pb-4">
      <button type="button" onClick={() => { setMode("signup"); setNotice(""); setError(""); }} aria-pressed={mode === "signup"} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === "signup" ? "bg-blue-600 text-white" : "text-slate-600"}`}>Create account</button>
      <button type="button" onClick={() => { setMode("signin"); setNotice(""); setError(""); }} aria-pressed={mode === "signin"} className={`rounded-lg px-4 py-2 text-sm font-bold ${mode === "signin" ? "bg-blue-600 text-white" : "text-slate-600"}`}>Sign in</button>
    </div>
    {siteKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="afterInteractive" onReady={() => setScriptReady(true)} />}
    <form key={mode} onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-bold">Email<input name="email" type="email" autoComplete="email" required maxLength={254} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal" /></label>
      <label className="block text-sm font-bold">Password<input name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} required minLength={mode === "signup" ? 12 : 1} maxLength={128} className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 font-normal" /></label>
      <div><p className="mb-2 text-sm text-slate-600">Complete the bot check to continue.</p>{siteKey ? <div ref={captchaContainer} /> : <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Set NEXT_PUBLIC_TURNSTILE_SITE_KEY to enable account access.</p>}</div>
      <button type="submit" disabled={busy || !siteKey || !captchaToken} className="w-full rounded-lg bg-blue-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? "Working…" : mode === "signup" ? "Create and verify account" : "Sign in"}</button>
    </form>
    <p className="mt-4 text-xs leading-relaxed text-slate-500">New accounts must verify their email. Email verification limits disposable signups but does not prove one account equals one person.</p>
    {notice && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm font-semibold text-green-900">{notice}</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
  </div>;
}
