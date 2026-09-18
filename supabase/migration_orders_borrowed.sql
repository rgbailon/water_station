-- Migration: add borrowed audit columns to orders
-- Adds borrowed_count + is_borrowed, backfills from order_items, adds trigger to keep accurate

alter table public.orders add column if not exists borrowed_count integer not null default 0 check (borrowed_count >= 0);
alter table public.orders add column if not exists is_borrowed boolean not null default false;
create index if not exists idx_orders_borrowed on public.orders(is_borrowed) where is_borrowed = true;

-- ensure status trigger also syncs is_borrowed
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
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists orders_status_sync on public.orders;
create trigger orders_status_sync before insert or update on public.orders
  for each row execute function public.trg_orders_status_sync();

-- trigger to keep borrowed_count accurate when order_items change
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
  update public.orders set is_borrowed = borrowed_count > 0 where order_id = oid;
  return coalesce(new, old);
end $$;
drop trigger if exists order_items_borrowed_sync on public.order_items;
create trigger order_items_borrowed_sync after insert or update or delete on public.order_items
  for each row execute function public.trg_order_items_borrowed();

-- backfill existing orders from order_items
update public.orders o
set borrowed_count = sub.cnt,
    is_borrowed = sub.cnt > 0
from (
  select order_id, coalesce(sum(case when is_borrow then quantity else 0 end),0)::int as cnt
  from public.order_items group by order_id
) sub
where o.order_id = sub.order_id;

-- orders with no items remain 0 / false (already default)
update public.orders set is_borrowed = borrowed_count > 0 where is_borrowed != (borrowed_count > 0);

drop view if exists public.v_orders_with_status;
create view public.v_orders_with_status as
select
  o.order_id, o.created_at, o.customer_name, o.phone, o.address,
  o.subtotal, o.delivery_fee, o.total, o.payment_method, o.schedule, o.notes,
  o.status, o.borrowed_count, o.is_borrowed, o.is_canceled, o.is_delivered, o.is_paid, o.is_archived,
  o.status as computed_status
from public.orders o;

select 'borrowed migration complete' as info,
  (select count(*) from public.orders where is_borrowed) as borrowed_orders,
  (select sum(borrowed_count) from public.orders) as total_borrowed_gallons,
  (select json_object_agg(order_id, borrowed_count) from public.orders where borrowed_count>0) as by_order;
