-- Fair Drop only accesses application data through its private server-side
-- DATABASE_URL. Authenticated browsers must not read or modify these tables
-- directly through Supabase's generated Data API.
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_current_event ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_people ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protected_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.idempotency_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.events, public.demo_current_event, public.rate_limit_buckets,
  public.demo_accounts, public.protected_people, public.protected_invitations,
  public.protected_credentials, public.queue_entries, public.reservations,
  public.orders, public.idempotency_records, public.simulation_runs, public.audit_events
FROM anon, authenticated;
