# Supabase — Irosin Water Inventory

Project ref: **ddzlawodgqziuoanudbb**  
Region: **ap-northeast-1 (Tokyo)** — pooler `aws-0-ap-northeast-1.pooler.supabase.com:6543`  
Supabase URL: `https://ddzlawodgqziuoanudbb.supabase.co`

## What was created

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Full Postgres schema: 7 tables, 19+ boolean columns, triggers, indexes, RLS, realtime publication, views. Idempotent — safe to re-run. |
| `supabase/seed.sql` | Idempotent seed: 18 products + 8 inventory + 24 events + 5 hiram + 6 expenses + 8 orders + 12 order_items. |
| `supabase/test-connection.mjs` | Verifies pooler connection + row counts. |
| `supabase/seed.mjs` | Alternative JS seeder via Supabase JS (needs anon key). |
| `.env` / `.env.example` | Vite + Postgres env. **Never commit `.env`.** |
| `src/lib/supabaseClient.js` | Supabase JS client (offline fallback if env missing). |
| `src/lib/db.js` | Typed helpers + mappers for all tables, booleans included. |
| `src/App.jsx` (patched) | Auto-loads from Supabase when `VITE_SUPABASE_*` set, realtime, offline fallback. |

## Tables & Booleans

- **products** — `is_available`, `is_active`, `is_featured`
- **inventory_items** — `is_active`, `is_archived`, `is_low_stock` (trigger)
- **events** — `is_paid`, `is_archived`, `is_recurring`
- **hiram_records** — `is_returned`, `is_overdue` (trigger), `is_active`
- **expenses** — `is_paid`, `is_recurring`, `is_archived`
- **orders** — `is_canceled`, `is_delivered`, `is_paid`, `is_archived`
- **order_items** — `is_refunded`, `is_borrow`

All booleans are `NOT NULL DEFAULT false/true` and are round-tripped via `src/lib/db.js` mappers.

## Connection details you provided

```
host=aws-0-ap-northeast-1.pooler.supabase.com
port=6543          # Supavisor (pgbouncer, transaction mode)
database=postgres
user=postgres.ddzlawodgqziuoanudbb
password=@waterstationRogel89   # URL-encoded as %40waterstationRogel89
DATABASE_URL=postgresql://postgres.ddzlawodgqziuoanudbb:%40waterstationRogel89@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true
VITE_SUPABASE_URL=https://ddzlawodgqziuoanudbb.supabase.co
```

## How to use

### 1) Apply schema (already done for you — verified)
```bash
# via psql
psql "postgresql://postgres.ddzlawodgqziuoanudbb:%40waterstationRogel89@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true" -f supabase/schema.sql

# or via npm script (reads .env DATABASE_URL)
npm run db:push   # not yet wired in this project — run psql command above
```

### 2) Seed data (already seeded — 18/8/24/5/6/8 verified)
```bash
psql "$DATABASE_URL" -f supabase/seed.sql
# or
node supabase/test-connection.mjs   # quick check
```

### 3) Frontend — set anon key
1. Supabase Dashboard → Project `ddzlawodgqziuoanudbb` → Project Settings → API → **anon public key**
2. Copy into `.env`:
   ```
   VITE_SUPABASE_URL=https://ddzlawodgqziuoanudbb.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbG...your real key...
   ```
3. Restart dev: `npm run dev`

Without the key the app stays **offline** (localStorage + mock data). With the key it auto-syncs and enables Realtime.

### 4) Verify
```bash
npm run build          # 390 modules, ~648kB
node supabase/test-connection.mjs
# expect: ✔ Connected, tables exist, counts: products 18, inventory 8, events 24, hiram 5, expenses 6, orders 8
```

## RLS

All tables have RLS enabled with permissive anon policies (`FOR ALL USING (true)`). Suitable for a single-shop device. For production add auth and tighten policies:

```sql
drop policy "Allow all for anon — orders" on public.orders;
create policy "Auth users only" on public.orders for all to authenticated using (true);
```

## Realtime

Publication `supabase_realtime` includes all 7 tables. `src/lib/db.js:subscribeTable()` and `src/App.jsx` subscribe to `events`, `inventory_items`, `orders` for live updates.

## Troubleshooting

- `VITE_SUPABASE_ANON_KEY missing` → app shows offline banner. Fix `.env` and restart.
- `public.products does not exist` → run `supabase/schema.sql`.
- Pooler timeout → use `DIRECT_URL` port 5432 (session mode) or check VPC.
- Password has `@` → always use `%40` in `DATABASE_URL`.
