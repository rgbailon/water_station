-- Migration: remove GALLON_RECEIVED status from the order flow
-- Run AFTER migration_orders_to_pick_up.sql (idempotent, rerunnable).
--
-- New flow — WITH-gallon: Pending → Confirmed → To Pick Up (auto) → Preparing
--            → Out for Delivery → Delivered
-- Legacy mapping: GALLON_TO_GET → TO_PICK_UP, GALLON_RECEIVED → PREPARING
-- (handled in app code + DB trigger below, so old rows keep working)

-- 1) Move any existing Gallon Received rows forward to Preparing
update public.orders set status = 'PREPARING' where status = 'GALLON_RECEIVED';

-- 2) Drop old check constraint(s) by inspection, then add the new one (no GALLON_RECEIVED)
do $$
declare r record;
begin
  for r in (
    select conname from pg_constraint
    where conrelid = 'public.orders'::regclass and contype = 'c'
      and (pg_get_constraintdef(oid) like '%GALLON_RECEIVED%'
        or pg_get_constraintdef(oid) like '%TO_PICK_UP%'
        or pg_get_constraintdef(oid) like '%PREPARING%')
  ) loop
    execute format('alter table public.orders drop constraint %I', r.conname);
  end loop;
end $$;

alter table public.orders drop constraint if exists orders_status_check;

alter table public.orders add constraint orders_status_check
  check (status in ('PENDING','CONFIRMED','TO_PICK_UP','GALLON_TO_GET','PREPARING','OUT_FOR_DELIVERY','DELIVERED','CANCELED'));

create index if not exists idx_orders_status on public.orders(status);

-- 3) Trigger: same sync logic, minus GALLON_RECEIVED (legacy ids normalized forward)
create or replace function public.trg_orders_status_sync()
returns trigger language plpgsql as $$
begin
  -- normalize legacy ids to current flow (pickup queue → TO_PICK_UP, collected → PREPARING)
  if new.status = 'GALLON_TO_GET' then
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
    if new.status in ('PENDING','CONFIRMED','TO_PICK_UP','GALLON_TO_GET','PREPARING','OUT_FOR_DELIVERY') then
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

-- 4) Refresh view
create or replace view public.v_orders_with_status as
select
  o.order_id, o.created_at, o.customer_name, o.phone, o.address,
  o.subtotal, o.delivery_fee, o.total, o.payment_method, o.schedule, o.notes,
  o.status, o.borrowed_count, o.is_borrowed, o.payment_status,
  o.is_canceled, o.is_delivered, o.is_paid, o.is_archived,
  o.status as computed_status
from public.orders o;

-- 5) Fire trigger once so booleans re-sync (no-op update)
update public.orders set status = status where status is not null;

select 'migration complete: GALLON_RECEIVED removed' as info,
  (select count(*) from public.orders) as orders,
  (select json_object_agg(status, cnt) from (select status, count(*) as cnt from public.orders group by status) s) as by_status;
