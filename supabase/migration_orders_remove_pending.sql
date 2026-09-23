-- Remove PENDING from the order flow — every order starts CONFIRMED.
-- WITH-gallon: Confirmed → To Pick Up → Preparing → Out for Delivery → Delivered.
-- New/Borrow: Confirmed → Preparing → Out for Delivery → Delivered.
-- Two-step pickup: Confirmed --Pick Up--> To Pick Up --Picked Up--> Preparing.
-- PENDING is kept in the check constraint for old clients, but normalized to CONFIRMED by trigger.

-- 1) trigger: normalize legacy PENDING → CONFIRMED (keep other legacy mappings)
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

-- 2) backfill: old PENDING rows become CONFIRMED (trigger would do it on next write anyway)
update public.orders set status = 'CONFIRMED', updated_at = now() where status = 'PENDING';

-- 3) default for new rows is CONFIRMED
alter table public.orders alter column status set default 'CONFIRMED';
