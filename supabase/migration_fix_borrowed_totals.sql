-- Fix stale borrowed totals: is_borrow, borrowed_count, subtotal/total for UNPAID borrow orders
-- Run once via psql or Supabase SQL Editor. Idempotent.
-- Context: orders tab recomputes display total via CONTAINER_PRICE_BY_BORROW_ID (13:150,14:155,15:160,16:165,17:170,18:180)
-- but 4 legacy orders had is_borrow=false / borrowed_count=0, so stored water price != display container price.

-- 1) Fix is_borrow flag to match product.bottle_situation
update public.order_items oi
set is_borrow = (p.bottle_situation = 'BORROW')
from public.products p
where oi.product_id = p.id
  and oi.is_borrow is distinct from (p.bottle_situation = 'BORROW');

-- 2) Recompute borrowed_count / is_borrowed (trigger also does this, but ensure)
update public.orders o
set borrowed_count = sub.cnt,
    is_borrowed = sub.cnt > 0
from (
  select order_id, coalesce(sum(quantity) filter (where is_borrow), 0)::int as cnt
  from public.order_items
  group by order_id
) sub
where o.order_id = sub.order_id
  and (o.borrowed_count is distinct from sub.cnt or o.is_borrowed is distinct from (sub.cnt > 0));

-- orders with no items -> borrowed 0
update public.orders
set borrowed_count = 0, is_borrowed = false
where order_id not in (select order_id from public.order_items)
  and (borrowed_count != 0 or is_borrowed);

-- 3) Fix subtotal/total for current payment_status using container pricing
-- container map: 13:150,14:155,15:160,16:165,17:170,18:180, else price+125
-- Note: delivery_fee is 0 in this app, keep as is.
with eff as (
  select
    oi.order_id,
    sum(
      case
        when p.bottle_situation = 'BORROW' and o.payment_status = 'UNPAID'
        then coalesce(
          case p.id when 13 then 150 when 14 then 155 when 15 then 160 when 16 then 165 when 17 then 170 when 18 then 180 end,
          p.price + 125
        )
        else p.price
      end * oi.quantity
    ) as exp_sub
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  join public.orders o on o.order_id = oi.order_id
  group by oi.order_id
)
update public.orders o
set subtotal = e.exp_sub,
    total = e.exp_sub + o.delivery_fee
from eff e
where o.order_id = e.order_id
  and (o.subtotal is distinct from e.exp_sub or o.total is distinct from (e.exp_sub + o.delivery_fee));

-- orders with no items -> 0
update public.orders
set subtotal = 0, total = delivery_fee
where order_id not in (select order_id from public.order_items)
  and (subtotal != 0 or total != delivery_fee);

-- Verify: should return 0 rows
-- select order_id, subtotal, total, payment_status, borrowed_count from public.orders where order_id in ('WFR-8021','WFR-8391','WFR-6145','WFR-9608','WFR-9987','WFR-6105');
