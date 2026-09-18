-- Migration: add payment_status audit column to orders (PAID / UNPAID)
alter table public.orders add column if not exists payment_status text not null default 'UNPAID' check (payment_status in ('PAID','UNPAID'));
create index if not exists idx_orders_payment_status on public.orders(payment_status) where payment_status = 'UNPAID';

-- keep payment_status ↔ is_paid in sync (payment_status is source of truth, handles OLD vs NEW)
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
  new.is_borrowed := coalesce(new.borrowed_count,0) > 0;
  if TG_OP = 'INSERT' then
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
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists orders_status_sync on public.orders;
create trigger orders_status_sync before insert or update on public.orders
  for each row execute function public.trg_orders_status_sync();

-- backfill from is_paid
update public.orders set payment_status = 'PAID' where is_paid = true and payment_status != 'PAID';
update public.orders set payment_status = 'UNPAID' where is_paid = false and payment_status != 'UNPAID';
-- ensure is_paid matches payment_status
update public.orders set is_paid = (payment_status = 'PAID') where is_paid != (payment_status = 'PAID');

drop view if exists public.v_orders_with_status;
create view public.v_orders_with_status as
select
  o.order_id, o.created_at, o.customer_name, o.phone, o.address,
  o.subtotal, o.delivery_fee, o.total, o.payment_method, o.schedule, o.notes,
  o.status, o.borrowed_count, o.is_borrowed, o.payment_status, o.is_canceled, o.is_delivered, o.is_paid, o.is_archived,
  o.status as computed_status
from public.orders o;

select 'payment_status migration complete' as info,
  (select count(*) from public.orders where payment_status='PAID') as paid,
  (select count(*) from public.orders where payment_status='UNPAID') as unpaid,
  (select json_object_agg(payment_status, cnt) from (select payment_status, count(*) as cnt from public.orders group by payment_status) s) as by_status;
