-- Migration: make orders status database-driven (remove timers)
-- Run after schema.sql update
-- Adds `status` column if missing, backfills, and ensures trigger sync.

-- 1) Add column if not exists
alter table public.orders add column if not exists status text not null default 'PENDING'
  check (status in ('PENDING','CONFIRMED','GALLON_TO_GET','OUT_FOR_DELIVERY','DELIVERED','CANCELED'));

create index if not exists idx_orders_status on public.orders(status);

-- 2) Create trigger helper if not yet created by new schema.sql (idempotent)
create or replace function public.trg_orders_status_sync()
returns trigger language plpgsql as $$
begin
  if new.is_canceled then
    new.status := 'CANCELED';
    new.is_delivered := false;
  elsif new.is_delivered and new.status != 'CANCELED' then
    if new.status in ('PENDING','CONFIRMED','GALLON_TO_GET','OUT_FOR_DELIVERY') then
      new.status := 'DELIVERED';
    end if;
    new.is_canceled := false;
  else
    if new.status = 'CANCELED' then
      new.is_canceled := true;
      new.is_delivered := false;
    elsif new.status = 'DELIVERED' then
      new.is_delivered := true;
      new.is_canceled := false;
    else
      new.is_delivered := false;
      new.is_canceled := false;
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists orders_status_sync on public.orders;
create trigger orders_status_sync before insert or update on public.orders
  for each row execute function public.trg_orders_status_sync();

-- 3) Backfill existing rows — use trigger-friendly update
-- First, generic: delivered/canceled
update public.orders set status='CANCELED' where is_canceled = true and status != 'CANCELED';
update public.orders set status='DELIVERED' where is_delivered = true and status not in ('CANCELED','DELIVERED');

-- Then restore sample diversity for the 8 known IDs (idempotent)
update public.orders set status='PENDING'          where order_id='WFR-4821' and status != 'CANCELED';
update public.orders set status='CONFIRMED'        where order_id='WFR-7392' and status != 'CANCELED';
update public.orders set status='GALLON_TO_GET'    where order_id='WFR-6105' and status != 'CANCELED';
update public.orders set status='OUT_FOR_DELIVERY' where order_id='WFR-2847' and status != 'CANCELED';
update public.orders set status='DELIVERED'        where order_id='WFR-9153' and status != 'CANCELED';
update public.orders set status='CANCELED'         where order_id='WFR-5033';
update public.orders set status='DELIVERED'        where order_id='WFR-1234' and status != 'CANCELED';
update public.orders set status='DELIVERED'        where order_id='WFR-8761' and status != 'CANCELED';

-- Any remaining NULL/default PENDING rows that were created before column existed remain PENDING
-- Ensure booleans now match status (fire trigger via no-op update)
update public.orders set status=status where status is not null;

-- 4) Refresh view
create or replace view public.v_orders_with_status as
select
  o.order_id, o.created_at, o.customer_name, o.phone, o.address,
  o.subtotal, o.delivery_fee, o.total, o.payment_method, o.schedule, o.notes,
  o.status, o.is_canceled, o.is_delivered, o.is_paid, o.is_archived,
  o.status as computed_status
from public.orders o;

select 'migration complete' as info,
  (select count(*) from public.orders) as orders,
  (select json_object_agg(status, cnt) from (select status, count(*) as cnt from public.orders group by status) s) as by_status;
