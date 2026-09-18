-- Migration: borrowed UNPAID orders total = container price (audit)
-- If borrowed and payment_status='UNPAID', total is container price (NEEDS_GALLON price) not water price
-- Container price map: 13->150,14->155,15->160,16->165,17->170,18->180

update public.orders o
set subtotal = sub.new_subtotal,
    total = sub.new_total,
    updated_at = now()
from (
  select
    oi.order_id,
    sum(
      case
        when oi.product_id in (13,14,15,16,17,18) then
          case oi.product_id
            when 13 then 150
            when 14 then 155
            when 15 then 160
            when 16 then 165
            when 17 then 170
            when 18 then 180
            else 150
          end * oi.quantity
        else p.price * oi.quantity
      end
    )::numeric(10,2) as new_subtotal,
    sum(
      case
        when oi.product_id in (13,14,15,16,17,18) then
          case oi.product_id
            when 13 then 150
            when 14 then 155
            when 15 then 160
            when 16 then 165
            when 17 then 170
            when 18 then 180
            else 150
          end * oi.quantity
        else p.price * oi.quantity
      end
    )::numeric(10,2) as new_total
  from public.order_items oi
  join public.products p on p.id = oi.product_id
  group by oi.order_id
) sub
where o.order_id = sub.order_id
  and o.borrowed_count > 0
  and o.payment_status = 'UNPAID'
  and o.is_canceled = false
  and (o.subtotal is distinct from sub.new_subtotal or o.total is distinct from sub.new_total);

-- also ensure is_borrowed and borrowed_count are correct (in case trigger missed)
update public.orders o
set borrowed_count = sub.cnt,
    is_borrowed = sub.cnt > 0
from (
  select order_id, coalesce(sum(case when is_borrow then quantity else 0 end),0)::int as cnt
  from public.order_items group by order_id
) sub
where o.order_id = sub.order_id
  and o.borrowed_count is distinct from sub.cnt;

select 'borrowed container price migration complete' as info,
  (select count(*) from public.orders where borrowed_count>0 and payment_status='UNPAID') as unpaid_borrowed_orders,
  (select json_agg(json_build_object('order_id',order_id,'borrowed',borrowed_count,'payment',payment_status,'subtotal',subtotal,'total',total)) from public.orders where borrowed_count>0 order by order_id) as details;
