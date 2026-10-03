# Fair Drop

Fair Drop is a live first-come-first-served (FCFS) ticket-sale app for limited inventory. Buyers join a server-recorded line, and the database serves earlier accepted entries first. Each account can book up to the event cap (4 by default). A short reservation hold prevents overselling while the buyer confirms. The UI retains the blue event design from the original project.

The checkout in this hackathon build is simulated. It does not charge a payment method or issue real tickets.

## Run locally

```bash
cd Final
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Local development uses PGlite in `.data/pglite` and seeds a demo event/accounts. Demo sign-in is enabled in development. For organizer controls at `/admin`, set `ADMIN_SECRET` in `.env.local` and enter that value. Never use demo accounts or the demo organizer secret for a public sale.

## Configure Supabase hosting

1. Create a Supabase project. In **Authentication → Providers → Email**, require email confirmation. In **Authentication → URL Configuration**, add your deployed URL and `http://localhost:3000/auth/callback` for local development.
2. In Supabase SQL Editor, run these files in order: `db/schema.sql`, `supabase/migrations/20261004_auth_accounts.sql`, then `supabase/secure-tables.sql`.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `DATABASE_URL`, `SESSION_SECRET`, and `ADMIN_SECRET`. For serverless hosting use the Supabase **Shared Transaction Pooler** connection URL (port `6543`) and `DATABASE_POOL_MAX=1`. Keep database credentials and server secrets out of Git. Production does not apply schema migrations automatically.
4. Create a Cloudflare Turnstile widget. Set its site key as `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and secret as `TURNSTILE_SECRET_KEY`. Configure the same CAPTCHA provider/secret in Supabase Auth CAPTCHA settings and set `TURNSTILE_EXPECTED_HOSTNAME` to the deployed host.
5. Deploy the Next.js app to a Node-compatible host and configure those environment values there. Confirm account signup and email verification, entering the line, reserving multiple seats, hitting the account cap, reservation expiry, and booking confirmation on a test event.
6. Set `CRON_SECRET` and call `POST /api/cron/process-queues` periodically with `Authorization: Bearer <CRON_SECRET>`. This expires abandoned reservations/admission turns, serves the next people in line, and closes the sale at its cutoff. The app also advances the line after a buyer joins or reserves. Without a scheduler, expired turns may wait until a buyer or organizer request advances the line.

## FCFS, account limit, and bot controls

- Joining is one per account and event. The database locks the event row, assigns the next position, and records the acceptance timestamp in the same transaction. Retrying returns the existing place; it does not add a second entry or move the buyer forward.
- The organizer-controlled line admits the lowest position first. Admission capacity defaults to one, so a buyer gets a short turn to reserve up to the cap before the next buyer is served. The inventory hold is transactional; if it expires, that quantity returns to inventory and the line advances.
- The account cap is stored on each event as `max_tickets_per_account` (default `4`). Reservation and order rows store quantity. The server checks previously confirmed and currently held quantities before accepting another booking. The UI selector only offers available amounts; the database independently enforces the cap and inventory.
- Anti-abuse features include verified email (when enabled in Supabase Auth), Turnstile at signup and line entry, per-account throttles, optional trusted-IP throttles, one entry per account, protected invitation/eligibility checks, signed sessions, idempotency keys, and atomic stock updates. These add friction and block repeated-request advantages; they cannot prove that each email/account represents a unique person. High-value sales should require trusted eligibility/invitations and operational monitoring.

## Capacity expectations

The schema and paginated organizer interface are designed to keep 10,000+ line entries, and status polling is jittered and backed off. This is **not a verified 10,000-concurrent-user guarantee**: there is no connected live Supabase project or production load-test result in this copy. A strict FCFS line serializes entry assignment at the event database row; test the expected launch burst on the actual deployment and scale database compute if needed. Supabase Free's monthly active user allowance is not a promise of simultaneous connections or request throughput. Review [current Supabase plan limits](https://supabase.com/pricing), [pooling guidance](https://supabase.com/docs/guides/database/connecting-to-postgres), [Auth CAPTCHA setup](https://supabase.com/docs/guides/auth/auth-captcha), and [free-project pausing](https://supabase.com/docs/guides/platform/free-project-pausing).

## Project map

- **Frontend:** `src/app/` and `src/components/fairdrop/` (event page, verified account access, FCFS line/status, reservation/confirmation, organizer console).
- **Backend/API:** Next.js Route Handlers under `src/app/api/`.
- **Business rules:** `src/lib/` (sessions, abuse controls, FCFS position assignment, ordered admission, quantity caps, checkout).
- **Database:** `db/schema.sql`, `src/lib/db.ts`, and `supabase/` migrations/policies. Local development uses PGlite; hosting uses PostgreSQL.
- **Fairness evidence:** the organizer Fairness Lab simulates ordinary, repeated, and flooding clients; results and inventory-integrity measurements are persisted.

Detailed component map: [PROJECT_GUIDE.md](PROJECT_GUIDE.md).

## Commands

```bash
npm run dev       # local development
npm run lint      # lint
npm run build     # production build
npm start         # serve the production build
```
