-- =============================================================================
-- Customers — pinned coordinates (GPS) support
-- Adds lat/lng to local directory + future Supabase tables so each customer
-- keeps a pinned delivery location openable in Google Maps / OSM.
-- Rerunnable: all statements use IF NOT EXISTS / guarded DO blocks.
-- Apply: Supabase Dashboard → SQL Editor → paste → Run, or via db:push
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CUSTOMERS directory table (future source of truth; app currently merges
--    order-derived rows + localStorage overrides, then syncs here when present)
-- ---------------------------------------------------------------------------
create table if not exists public.customers (
  id            uuid        primary key default gen_random_uuid(),
  name          text        not null,
  phone         text        not null default '',
  barangay      text        not null default '',
  address       text        not null default '',
  notes         text        not null default '',
  -- pinned GPS location (nullable = no pin yet)
  latitude      double precision check (latitude is null or (latitude >= -90 and latitude <= 90)),
  longitude     double precision check (longitude is null or (longitude >= -180 and longitude <= 180)),
  -- booleans
  is_active     boolean     not null default true,
  is_archived   boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_customers_phone on public.customers(phone);
create index if not exists idx_customers_barangay on public.customers(barangay);
create index if not exists idx_customers_coords on public.customers(latitude, longitude) where latitude is not null and longitude is not null;

-- keep updated_at fresh
create or replace function public.trg_customers_touch()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
drop trigger if exists customers_touch on public.customers;
create trigger customers_touch before update on public.customers
  for each row execute function public.trg_customers_touch();

-- ---------------------------------------------------------------------------
-- 2. ORDERS — optional per-order drop-pin (delivery snapshot; customer pin
--    lives on customers / overrides). Nullable so old rows keep working.
-- ---------------------------------------------------------------------------
alter table public.orders
  add column if not exists latitude double precision
    check (latitude is null or (latitude >= -90 and latitude <= 90));
alter table public.orders
  add column if not exists longitude double precision
    check (longitude is null or (longitude >= -180 and longitude <= 180));
create index if not exists idx_orders_coords
  on public.orders(latitude, longitude)
  where latitude is not null and longitude is not null;

-- ---------------------------------------------------------------------------
-- 3. USERS (public.users) — pinned home location, only if the table exists
--    (created by migration_customers_account or an external auth sync).
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'users') then
    begin
      alter table public.users add column if not exists latitude double precision
        check (latitude is null or (latitude >= -90 and latitude <= 90));
    exception when duplicate_column then null; end;
    begin
      alter table public.users add column if not exists longitude double precision
        check (longitude is null or (longitude >= -180 and longitude <= 180));
    exception when duplicate_column then null; end;
    begin
      alter table public.users add column if not exists address text;
    exception when duplicate_column then null; end;
    begin
      create index if not exists idx_users_coords
        on public.users(latitude, longitude)
        where latitude is not null and longitude is not null;
    exception when others then null; end;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4. RLS + realtime (same open-anon pattern as the rest of the shop schema)
-- ---------------------------------------------------------------------------
alter table public.customers enable row level security;
do $$ begin
  drop policy if exists "Allow all for anon — customers" on public.customers;
  create policy "Allow all for anon — customers" on public.customers for all using (true) with check (true);
end $$;

do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  begin alter publication supabase_realtime add table public.customers; exception when duplicate_object then null; end;
end $$;
