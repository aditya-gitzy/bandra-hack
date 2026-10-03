export function supabaseAuthEnabled() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function demoAuthEnabled() {
  if (process.env.ALLOW_DEMO_AUTH === "true") return true;
  return process.env.NODE_ENV !== "production" && !supabaseAuthEnabled();
}
