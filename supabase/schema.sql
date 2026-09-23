-- =============================================================================
-- Tubig Irosin - Water Refilling Inventory  •  Supabase (Postgres) Schema
-- Host: aws-0-ap-northeast-1.pooler.supabase.com:6543  (Supavisor/pgbouncer)
-- DB:   postgres  •  User: postgres.ddzlawodgqziuoanudbb
-- Project ref: ddzlawodgqziuoanudbb  •  URL: https://ddzlawodgqziuoanudbb.supabase.co
-- =============================================================================
-- How to apply:
--  1. Open Supabase Dashboard → SQL Editor → New Query → paste this file → Run
--  2. Or  `psql "postgresql://postgres.ddzlawodgqziuoanudbb:<pwd>@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true" -f supabase/schema.sql`
--  3. Rerunnable: all objects use IF NOT EXISTS / CREATE OR REPLACE
-- =============================================================================

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. PRODUCTS  (18 water-refill SKUs: Purified / Mineral / Alkaline × containers)
-- ---------------------------------------------------------------------------
create table if not exists public.products (
  id                integer primary key,
  name              text        not null,        -- e.g. Purified Refill, New Gallon + Mineral
  size              text        not null default '18.9 L (5 Gal)',
  container         text        not null check (container in ('Round','Slim')),
  description       text        not null default '',
  price             numeric(10,2) not null check (price >= 0),
  water_type        text        not null check (water_type in ('PURIFIED','MINERAL','ALKALINE')),
  water_type_label  text        not null,
  bottle_situation  text        not null check (bottle_situation in ('WITH_GALLON','NEEDS_GALLON','BORROW')),
  bottle_label      text        not null,
  accent_hex        text        not null default '#1565C0',
  accent_argb       bigint,
  image_url         text,
  -- booleans
  is_available      boolean     not null default true,   -- only PURIFIED is orderable today
  is_active         boolean     not null default true,
  is_featured       boolean     not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_products_water_type on public.products(water_type);
create index if not exists idx_products_bottle on public.products(bottle_situation);

-- ---------------------------------------------------------------------------
-- 2. INVENTORY_ITEMS  (stock of gallons, bottles, caps, filters, stickers)
-- ---------------------------------------------------------------------------
create table if not exists public.inventory_items (
  id            integer primary key,
  name          text        not null,
  sku           text        unique not null,
  price         numeric(10,2) not null default 0 check (price >= 0),
  stock_filled  integer     not null default 0 check (stock_filled >= 0),
  stock_empty   integer     not null default 0 check (stock_empty >= 0),
  threshold     integer     not null default 5  check (threshold >= 0),
  icon          text        not null default '💧',
  unit          text        not null default 'pcs',  -- gals | cases | pcs | sets
  -- booleans
  is_active     boolean     not null default true,
  is_archived   boolean     not null default false,
  is_low_stock  boolean     not null default false,  -- maintained by trigger
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_inventory_sku on public.inventory_items(sku);

-- trigger to keep is_low_stock in sync
create or replace function public.trg_inventory_low_stock()
returns trigger language plpgsql as $$
begin
  new.is_low_stock := new.stock_filled <= new.threshold;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists inventory_low_stock on public.inventory_items;
create trigger inventory_low_stock before insert or update on public.inventory_items
  for each row execute function public.trg_inventory_low_stock();

-- ---------------------------------------------------------------------------
-- 3. EVENTS  (calendar: sale / delivery / expense / hiram / maintenance)
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id          text        primary key,  -- e.g. e1 or e<epoch>
  date        date        not null,
  type        text        not null check (type in ('sale','delivery','expense','hiram','maintenance')),
  title       text        not null,
  customer    text        not null default '',
  barangay    text,
  amount      numeric(10,2) not null default 0,
  icon        text        not null default '📅',
  note        text        not null default '',
  -- booleans
  is_paid     boolean     not null default false,
  is_archived boolean     not null default false,
  is_recurring boolean    not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_events_date on public.events(date);
create index if not exists idx_events_type on public.events(type);
create index if not exists idx_events_barbarangay on public.events(barangay);

-- ---------------------------------------------------------------------------
-- 4. HIRAM_RECORDS  (borrowed gallons ledger)
-- ---------------------------------------------------------------------------
create table if not exists public.hiram_records (
  id            serial      primary key,
  customer_name text        not null,
  phone         text        not null default '',
  barangay      text        not null default '',
  borrowed      integer     not null default 0 check (borrowed >= 0),
  returned      integer     not null default 0 check (returned >= 0),
  due_date      date        not null,
  status        text        not null default 'active' check (status in ('active','partial','overdue','returned')),
  -- booleans (required)
  is_returned   boolean     not null default false,
  is_overdue    boolean     not null default false,
  is_active     boolean     not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint chk_returned_le_borrowed check (returned <= borrowed)
);
create index if not exists idx_hiram_due on public.hiram_records(due_date);
create index if not exists idx_hiram_status on public.hiram_records(status);

-- trigger keeps is_returned / is_overdue derived
create or replace function public.trg_hiram_flags()
returns trigger language plpgsql as $$
begin
  new.is_returned := new.returned >= new.borrowed and new.borrowed > 0;
  new.is_overdue  := (not new.is_returned) and new.due_date < current_date;
  if new.is_returned then new.status := 'returned';
  elsif new.is_overdue and new.status = 'active' then new.status := 'overdue';
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists hiram_flags on public.hiram_records;
create trigger hiram_flags before insert or update on public.hiram_records
  for each row execute function public.trg_hiram_flags();

-- ---------------------------------------------------------------------------
-- 5. EXPENSES  (operational costs)
-- ---------------------------------------------------------------------------
create table if not exists public.expenses (
  id            serial      primary key,
  date          date        not null,
  category      text        not null,   -- Fuel, Electricity, Water, Caps/Seals, Maintenance
  description   text        not null default '',
  amount        numeric(10,2) not null default 0 check (amount >= 0),
  -- booleans
  is_paid       boolean     not null default true,
  is_recurring  boolean     not null default false,
  is_archived   boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_expenses_date on public.expenses(date);
create index if not exists idx_expenses_category on public.expenses(category);

-- ---------------------------------------------------------------------------
-- 6. ORDERS  (customer orders: WFR-####)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  order_id      text        primary key,  -- WFR-1234
  created_at    timestamptz not null default now(),
  customer_id   uuid references public.users(id) on delete set null,
  customer_name text        not null,
  phone         text        not null default '',
  address       text        not null default '',
  subtotal      numeric(10,2) not null default 0,
  delivery_fee  numeric(10,2) not null default 0,
  total         numeric(10,2) not null default 0,
  payment_method text       not null default 'Cash on Delivery' check (payment_method in ('Cash on Delivery','GCash','Maya')),
  schedule      text        not null default 'Today' check (schedule in ('Today','Tomorrow')),
  notes         text        not null default '',
  status        text        not null default 'CONFIRMED' check (status in ('PENDING','CONFIRMED','TO_PICK_UP','GALLON_TO_GET','PREPARING','OUT_FOR_DELIVERY','DELIVERED','CANCELED')),
  -- audit: borrowed gallons in this order (sum of order_items where is_borrow=true)
  borrowed_count integer    not null default 0 check (borrowed_count >= 0),
  is_borrowed   boolean     not null default false,
  -- payment audit: PAID / UNPAID (supabase column, syncs with is_paid)
  payment_status text       not null default 'UNPAID' check (payment_status in ('PAID','UNPAID')),
  -- booleans (kept for compatibility + filtering; synced with status via trigger)
  is_canceled   boolean     not null default false,
  is_delivered  boolean     not null default false,
  is_paid       boolean     not null default false,
  is_archived   boolean     not null default false,
  updated_at    timestamptz not null default now()
);
create index if not exists idx_orders_created on public.orders(created_at desc);
create index if not exists idx_orders_customer on public.orders(customer_name);
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_borrowed on public.orders(is_borrowed) where is_borrowed = true;
create index if not exists idx_orders_payment_status on public.orders(payment_status) where payment_status = 'UNPAID';

-- trigger to keep status ↔ booleans in sync (status is source of truth, but legacy boolean writes also flip status)
-- also keeps is_borrowed in sync with borrowed_count and payment_status ↔ is_paid for audit (handles OLD vs NEW correctly)
create or replace function public.trg_orders_status_sync()
returns trigger language plpgsql as $$
begin
  -- normalize legacy ids to current flow (pending → CONFIRMED, pickup queue → TO_PICK_UP, collected → PREPARING)
  if new.status = 'PENDING' then
    new.status := 'CONFIRMED';
  elsif new.status = 'GALLON_TO_GET' then
    new.status := 'TO_PICK_UP';
  elsif new.status = 'GALLON_RECEIVED' then
    new.status := 'PREPARING';
  end if;
  -- canceled orders are always unpaid (audit rule)
  if new.status = 'CANCELED' or new.is_canceled then
    new.status := 'CANCELED';
    new.is_canceled := true;
    new.is_delivered := false;
    new.payment_status := 'UNPAID';
    new.is_paid := false;
  elsif new.is_delivered and new.status != 'CANCELED' then
    if new.status in ('CONFIRMED','TO_PICK_UP','GALLON_TO_GET','PREPARING','OUT_FOR_DELIVERY') then
      new.status := 'DELIVERED';
    end if;
    new.is_canceled := false;
  else
    if new.status = 'CANCELED' then
      new.is_canceled := true;
      new.is_delivered := false;
      new.payment_status := 'UNPAID';
      new.is_paid := false;
    elsif new.status = 'DELIVERED' then
      new.is_delivered := true;
      new.is_canceled := false;
    else
      new.is_delivered := false;
      new.is_canceled := false;
    end if;
  end if;
  new.is_borrowed := coalesce(new.borrowed_count,0) > 0;
  -- payment: handle both payment_status and is_paid changes, with OLD comparison (but canceled always unpaid)
  if new.status = 'CANCELED' then
    new.payment_status := 'UNPAID';
    new.is_paid := false;
  elsif TG_OP = 'INSERT' then
    new.is_paid := (new.payment_status = 'PAID');
  else
    if new.payment_status is distinct from old.payment_status then
      new.is_paid := (new.payment_status = 'PAID');
    elsif new.is_paid is distinct from old.is_paid then
      new.payment_status := case when new.is_paid then 'PAID' else 'UNPAID' end;
    else
      new.is_paid := (new.payment_status = 'PAID');
    end if;
  end if;
  -- final guard: canceled must be unpaid
  if new.status = 'CANCELED' then
    new.payment_status := 'UNPAID';
    new.is_paid := false;
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists orders_status_sync on public.orders;
create trigger orders_status_sync before insert or update on public.orders
  for each row execute function public.trg_orders_status_sync();

-- keep borrowed_count accurate when order_items change (audit trail)
create or replace function public.trg_order_items_borrowed()
returns trigger language plpgsql as $$
declare oid text;
begin
  oid := coalesce(new.order_id, old.order_id);
  update public.orders
  set borrowed_count = (
    select coalesce(sum(quantity),0) from public.order_items where order_id = oid and is_borrow = true
  )
  where order_id = oid;
  -- also update is_borrowed via status trigger on next update; direct set here for immediacy
  update public.orders set is_borrowed = borrowed_count > 0 where order_id = oid;
  return coalesce(new, old);
end $$;
drop trigger if exists order_items_borrowed_sync on public.order_items;
create trigger order_items_borrowed_sync after insert or update or delete on public.order_items
  for each row execute function public.trg_order_items_borrowed();

-- ---------------------------------------------------------------------------
-- 7. ORDER_ITEMS  (line items per order)
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id            serial      primary key,
  order_id      text        not null references public.orders(order_id) on delete cascade,
  product_id    integer     not null references public.products(id) on delete restrict,
  quantity      integer     not null check (quantity > 0 and quantity <= 100),
  unit_price    numeric(10,2) not null check (unit_price >= 0),
  line_total    numeric(10,2) generated always as (quantity * unit_price) stored,
  -- booleans
  is_refunded   boolean     not null default false,
  is_borrow     boolean     not null default false,  -- true when bottle_situation = BORROW
  created_at    timestamptz not null default now()
);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);

-- ---------------------------------------------------------------------------
-- Updated_at trigger helper (generic)
-- ---------------------------------------------------------------------------
create or replace function public.trg_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists touch_orders on public.orders;
create trigger touch_orders before update on public.orders for each row execute function public.trg_touch_updated_at();
drop trigger if exists touch_events on public.events;
create trigger touch_events before update on public.events for each row execute function public.trg_touch_updated_at();
drop trigger if exists touch_expenses on public.expenses;
create trigger touch_expenses before update on public.expenses for each row execute function public.trg_touch_updated_at();

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY  — open for anon (shop device, no auth yet).
-- For production, replace with authenticated policies.
-- ---------------------------------------------------------------------------
alter table public.products        enable row level security;
alter table public.inventory_items enable row level security;
alter table public.events          enable row level security;
alter table public.hiram_records   enable row level security;
alter table public.expenses        enable row level security;
alter table public.orders          enable row level security;
alter table public.order_items     enable row level security;

-- Recreate policies idempotently
do $$ begin
  -- products
  drop policy if exists "Allow all for anon — products" on public.products;
  create policy "Allow all for anon — products" on public.products for all using (true) with check (true);
  -- inventory
  drop policy if exists "Allow all for anon — inventory" on public.inventory_items;
  create policy "Allow all for anon — inventory" on public.inventory_items for all using (true) with check (true);
  -- events
  drop policy if exists "Allow all for anon — events" on public.events;
  create policy "Allow all for anon — events" on public.events for all using (true) with check (true);
  -- hiram
  drop policy if exists "Allow all for anon — hiram" on public.hiram_records;
  create policy "Allow all for anon — hiram" on public.hiram_records for all using (true) with check (true);
  -- expenses
  drop policy if exists "Allow all for anon — expenses" on public.expenses;
  create policy "Allow all for anon — expenses" on public.expenses for all using (true) with check (true);
  -- orders
  drop policy if exists "Allow all for anon — orders" on public.orders;
  create policy "Allow all for anon — orders" on public.orders for all using (true) with check (true);
  -- order_items
  drop policy if exists "Allow all for anon — order_items" on public.order_items;
  create policy "Allow all for anon — order_items" on public.order_items for all using (true) with check (true);
end $$;

-- ---------------------------------------------------------------------------
-- VIEWS  (convenience — app can also query directly)
-- ---------------------------------------------------------------------------
drop view if exists public.v_orders_with_status;
create view public.v_orders_with_status as
select
  o.order_id,
  o.created_at,
  o.customer_name,
  o.phone,
  o.address,
  o.subtotal,
  o.delivery_fee,
  o.total,
  o.payment_method,
  o.schedule,
  o.notes,
  o.status,
  o.borrowed_count,
  o.is_borrowed,
  o.payment_status,
  o.is_canceled,
  o.is_delivered,
  o.is_paid,
  o.is_archived,
  o.status as computed_status
from public.orders o;

create or replace view public.v_inventory_health as
select
  id, name, sku, stock_filled, stock_empty, threshold, is_low_stock, is_active,
  (stock_filled + stock_empty) as total_units
from public.inventory_items;

-- ---------------------------------------------------------------------------
-- 8. MESSAGES — customer inbox (reply / block / delete, DB-driven)
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.users(id) on delete set null,
  customer_name text not null,
  customer_phone text not null default '',
  customer_address text not null default '',
  order_id text references public.orders(order_id) on delete set null,
  message text not null,
  reply text not null default '',
  is_read boolean not null default false,
  is_replied boolean not null default false,
  is_blocked boolean not null default false,
  is_deleted boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  replied_at timestamptz,
  blocked_at timestamptz
);
create index if not exists idx_messages_created on public.messages(created_at desc);
create index if not exists idx_messages_customer_id on public.messages(customer_id);
create index if not exists idx_messages_customer_phone on public.messages(customer_phone);
create index if not exists idx_messages_is_blocked on public.messages(is_blocked) where is_blocked = true;
create index if not exists idx_messages_is_read on public.messages(is_read) where is_read = false;
create index if not exists idx_messages_is_deleted on public.messages(is_deleted) where is_deleted = false;
create index if not exists idx_messages_order on public.messages(order_id);
create or replace function public.trg_messages_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  if new.reply is not null and length(trim(new.reply)) > 0 then
    new.is_replied := true;
    if new.replied_at is null then new.replied_at := now(); end if;
  else
    new.is_replied := false;
  end if;
  if new.is_blocked and new.blocked_at is null then new.blocked_at := now(); end if;
  if not new.is_blocked then new.blocked_at := null; end if;
  return new;
end $$;
drop trigger if exists messages_touch on public.messages;
create trigger messages_touch before insert or update on public.messages
  for each row execute function public.trg_messages_touch();
alter table public.messages enable row level security;
do $$ begin
  drop policy if exists "Allow all for anon — messages" on public.messages;
  create policy "Allow all for anon — messages" on public.messages for all using (true) with check (true);
end $$;

-- ---------------------------------------------------------------------------
-- REALTIME publication (Supabase Realtime)
-- ---------------------------------------------------------------------------
-- Adds tables to supabase_realtime publication if not already present
do $$
begin
  -- Ensure publication exists (Supabase creates supabase_realtime by default)
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  -- Add tables — ignore if already member
  begin alter publication supabase_realtime add table public.products;        exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.inventory_items; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.events;          exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.hiram_records;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.expenses;        exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.orders;          exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.order_items;     exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.messages;        exception when duplicate_object then null; end;
end $$;
