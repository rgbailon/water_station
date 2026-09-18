import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()
const c = new pg.Client({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}})
await c.connect()
// First, update the trigger function in DB directly (since schema.sql change not yet applied to live DB)
await c.query(`
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
  if new.status = 'CANCELED' then
    new.payment_status := 'UNPAID';
    new.is_paid := false;
  end if;
  new.updated_at := now();
  return new;
end $$;
`)

console.log('trigger updated')

// Now correct existing canceled orders to be unpaid
let r = await c.query("update public.orders set payment_status='UNPAID', is_paid=false, updated_at=now() where status='CANCELED' and payment_status != 'UNPAID' returning order_id, payment_status, is_paid")
console.log('corrected', r.rowCount, 'orders:', r.rows.map(x=> x.order_id).join(', '))
r = await c.query("select order_id, payment_status, is_paid from public.orders where status='CANCELED' limit 5")
console.log(r.rows.map(x=> JSON.stringify(x)).join('\n'))
await c.end()
