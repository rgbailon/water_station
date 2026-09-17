# Tubig Irosin — Water Refilling Inventory

Vite + React + Supabase (Postgres). Manages gallons, bottles, orders, hiram (borrowed gallons), expenses, calendar events, and analytics for Irosin, Sorsogon.

## Supabase Connection (already configured)

- **Project ref:** `ddzlawodgqziuoanudbb`
- **URL:** `https://ddzlawodgqziuoanudbb.supabase.co`
- **Pooler (Supavisor):** `aws-0-ap-northeast-1.pooler.supabase.com:6543` (transaction mode, pgbouncer)
- **Database:** `postgres` / user `postgres.ddzlawodgqziuoanudbb` / password `@waterstationRogel89`
- **DATABASE_URL:** `postgresql://postgres.ddzlawodgqziuoanudbb:%40waterstationRogel89@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true`

Schema + seed have been applied and verified (18 products, 8 inventory, 24 events, 5 hiram, 6 expenses, 8 orders, 12 items). See `supabase/README.md` for full docs.

## Quick start

```bash
npm install
# set Supabase anon key (required for frontend live sync)
# Supabase Dashboard → Project Settings → API → anon public → copy into .env
# .env already contains VITE_SUPABASE_URL; just add VITE_SUPABASE_ANON_KEY
npm run dev        # http://localhost:5173
npm run build      # production build
```

Without `VITE_SUPABASE_ANON_KEY` the app runs **offline** (localStorage + mock data) and shows an offline banner. With the key it syncs to Supabase and enables realtime.

## Database scripts

```bash
node supabase/test-connection.mjs      # verify pooler + counts
# re-apply schema / seed (idempotent)
psql "postgresql://postgres.ddzlawodgqziuoanudbb:%40waterstationRogel89@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true" -f supabase/schema.sql
psql "$DATABASE_URL" -f supabase/seed.sql
```

Files:

- `supabase/schema.sql` — 7 tables, 19+ booleans, triggers, indexes, RLS, realtime, views
- `supabase/seed.sql` — all sample data with explicit boolean values
- `.env` / `.env.example` — Vite + `DATABASE_URL` + `PG*` vars
- `src/lib/supabaseClient.js` — client with offline fallback
- `src/lib/db.js` — mappers & CRUD for every table (booleans fully covered)

## Tables & booleans

| Table | Booleans |
|-------|----------|
| products | `is_available`, `is_active`, `is_featured` |
| inventory_items | `is_active`, `is_archived`, `is_low_stock` |
| events | `is_paid`, `is_archived`, `is_recurring` |
| hiram_records | `is_returned`, `is_overdue`, `is_active` |
| expenses | `is_paid`, `is_recurring`, `is_archived` |
| orders | `is_canceled`, `is_delivered`, `is_paid`, `is_archived` |
| order_items | `is_refunded`, `is_borrow` |

UI exposes these as toggles/badges (EventModal checkboxes, Inventory low/archived pills, Expenses Paid/Recurring, Hiram Returned/Overdue, Orders cancel/delivered).

## Env

```
VITE_SUPABASE_URL=https://ddzlawodgqziuoanudbb.supabase.co
VITE_SUPABASE_ANON_KEY=REPLACE_WITH_YOUR_SUPABASE_ANON_KEY  # ← set this!
DATABASE_URL=postgresql://postgres.ddzlawodgqziuoanudbb:%40waterstationRogel89@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
```

`.env` is gitignored. Copy `.env.example` → `.env` on new machines.

## Build

- `npm run build` — Vite (390 modules, ~648kB)
- `oxlint` — `npm run lint`
