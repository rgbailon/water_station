-- Enforce borrowed order accuracy at DB level (money involved)
-- Fixes: is_borrow always matches products.bottle_situation, and orders totals always reflect container pricing

-- 1) Ensure order_items.is_borrow is derived from products (cannot be spoofed by client)
create or replace function public.trg_order_items_enforce_borrow()
returns trigger language plpgsql as $$
begin
  select (bottle_situation = 'BORROW') into new.is_borrow
  from public.products where id = new.product_id;
  if new.is_borrow is null then new.is_borrow := false; end if;
  return new;
end $$;
drop trigger if exists order_items_enforce_borrow on public.order_items;
create trigger order_items_enforce_borrow before insert or update on public.order_items
  for each row execute function public.trg_order_items_enforce_borrow();

-- 2) Recompute orders totals + borrowed_count whenever items change
-- Uses container pricing: BORROW + UNPAID => container price (13:150,14:155,15:160,16:165,17:170,18:180 else price+125)
create or replace function public.trg_order_items_recompute_order()
returns trigger language plpgsql as $$
declare oid text;
declare ps text;
declare exp_sub numeric;
begin
  oid := coalesce(new.order_id, old.order_id);
  select payment_status into ps from public.orders where order_id = oid;
  if ps is null then return coalesce(new, old); end if;

  -- borrowed_count
  update public.orders o
  set borrowed_count = sub.cnt,
      is_borrowed = sub.cnt > 0
  from (select coalesce(sum(quantity) filter (where is_borrow),0)::int as cnt from public.order_items where order_id=oid) sub
  where o.order_id = oid;

  -- totals: recompute subtotal/total from items * effective price
  select coalesce(sum(
    case
      when p.bottle_situation='BORROW' and ps='UNPAID'
      then coalesce(case p.id when 13 then 150 when 14 then 155 when 15 then 160 when 16 then 165 when 17 then 170 when 18 then 180 end, p.price+125)
      else p.price
    end * oi.quantity
  ),0) into exp_sub
  from public.order_items oi
  join public.products p on p.id=oi.product_id
  where oi.order_id=oid;

  update public.orders
  set subtotal = exp_sub,
      total = exp_sub + delivery_fee
  where order_id = oid;

  return coalesce(new, old);
end $$;
drop trigger if exists order_items_recompute_order on public.order_items;
create trigger order_items_recompute_order after insert or update or delete on public.order_items
  for each row execute function public.trg_order_items_recompute_order();

-- 3) When orders.payment_status changes, recompute totals (e.g., PAID -> UNPAID switches to container)
create or replace function public.trg_orders_recompute_on_payment()
returns trigger language plpgsql as $$
declare exp_sub numeric;
begin
  if TG_OP='UPDATE' and new.payment_status is not distinct from old.payment_status then
    return new;
  end if;
  -- only recompute if there are items
  select coalesce(sum(
    case
      when p.bottle_situation='BORROW' and new.payment_status='UNPAID'
      then coalesce(case p.id when 13 then 150 when 14 then 155 when 15 then 160 when 16 then 165 when 17 then 170 when 18 then 180 end, p.price+125)
      else p.price
    end * oi.quantity
  ),0) into exp_sub
  from public.order_items oi
  join public.products p on p.id=oi.product_id
  where oi.order_id=new.order_id;

  -- if no items, keep existing (don't zero out)
  if exp_sub is not null and exists (select 1 from public.order_items where order_id=new.order_id) then
    new.subtotal := exp_sub;
    new.total := exp_sub + coalesce(new.delivery_fee,0);
  end if;
  return new;
end $$;
drop trigger if exists orders_recompute_on_payment on public.orders;
create trigger orders_recompute_on_payment before update on public.orders
  for each row execute function public.trg_orders_recompute_on_payment();

-- 4) Backfill existing bad rows (the 3 new mismatches)
-- This will be handled by the triggers on next item update, but force now:
update public.order_items set quantity=quantity where order_id in ('WFR-1589','WFR-3098','WFR-1332');
-- If orders still have no items trigger, force payment_status touch to recompute
update public.orders set payment_status=payment_status where order_id in ('WFR-1589','WFR-3098','WFR-1332');
