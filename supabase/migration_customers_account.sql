-- Make messaging accurate: center on customer account (users.id), link orders + messages + chat_messages
-- Users table already exists (phone, name, device_id) but empty and not linked. This makes it the source of truth.

-- 1) Add customer_id to orders, messages, chat_messages (if not exists)
alter table public.orders add column if not exists customer_id uuid references public.users(id) on delete set null;
alter table public.messages add column if not exists customer_id uuid references public.users(id) on delete set null;
alter table public.chat_messages add column if not exists customer_id uuid references public.users(id) on delete set null;
-- keep device_id linkage for chat_messages -> users.device_id (add index, not FK to allow text)
create index if not exists idx_orders_customer_id on public.orders(customer_id);
create index if not exists idx_messages_customer_id on public.messages(customer_id);
create index if not exists idx_chat_messages_customer_id on public.chat_messages(customer_id);
create index if not exists idx_users_phone on public.users(phone);
create index if not exists idx_users_device on public.users(device_id);

-- 2) Populate users from distinct customers in orders + chat_messages device
create unique index if not exists idx_users_phone_unique on public.users(phone) where phone <> '' and phone is not null;
-- From orders: distinct phone/name
insert into public.users (phone, name, address, device_id, is_verified)
select distinct phone, customer_name, address, gen_random_uuid()::text, false
from public.orders
where phone is not null and phone <> '' and phone not like '%***%' and phone <> '12345'
  and not exists (select 1 from public.users u where lower(trim(u.phone)) = lower(trim(orders.phone)))
on conflict (phone) do nothing;

-- From chat_messages device_id (single device currently)
insert into public.users (phone, name, address, device_id, is_verified)
select distinct '09' || substring(replace(device_id, '-', '') from 1 for 9), 'Chat Customer ' || left(device_id,8), 'Irosin', device_id, false
from public.chat_messages
where device_id is not null and device_id <> 'global'
  and not exists (select 1 from public.users u where u.device_id = chat_messages.device_id)
on conflict (phone) do nothing;

-- Ensure at least one user per phone in messages if any (currently 0 messages, but for future)

-- 3) Backfill customer_id in orders via phone match
update public.orders o
set customer_id = u.id
from public.users u
where o.customer_id is null
  and o.phone is not null
  and lower(trim(o.phone)) = lower(trim(u.phone));

-- 4) Backfill customer_id in chat_messages via device_id match
update public.chat_messages cm
set customer_id = u.id
from public.users u
where cm.customer_id is null
  and cm.device_id is not null
  and cm.device_id = u.device_id;

-- 5) Migrate existing chat_messages (12 rows) into messages as center (if messages empty)
-- Copy each chat_messages row into messages with proper customer_id, preserving sender as customer_name
insert into public.messages (customer_name, customer_phone, customer_address, order_id, message, reply, is_read, is_replied, is_blocked, is_deleted, customer_id, created_at)
select
  coalesce(u.name, 'Customer ' || left(cm.device_id,8)) as customer_name,
  coalesce(u.phone, '') as customer_phone,
  coalesce(u.address, '') as customer_address,
  null as order_id,
  cm.message as message,
  '' as reply,
  true as is_read,
  false as is_replied,
  false as is_blocked,
  false as is_deleted,
  u.id as customer_id,
  cm.created_at
from public.chat_messages cm
left join public.users u on u.device_id = cm.device_id
where cm.sender = 'user'
  and not exists (
    select 1 from public.messages m
    where m.message = cm.message
      and m.created_at = cm.created_at
  );

-- For station replies, attach as reply to the preceding user message (best-effort: match by time proximity)
-- Instead, insert station messages as separate messages with is_replied true and reply field?
-- For now, skip station messages — staff replies are in messages.reply, not separate rows.

-- 6) Ensure messages also backfill customer_id via phone if missing
update public.messages m
set customer_id = u.id
from public.users u
where m.customer_id is null
  and m.customer_phone is not null
  and lower(trim(m.customer_phone)) = lower(trim(u.phone));

-- 7) Add view for accurate account-based inbox (optional)
create or replace view public.v_messages_by_account as
select
  m.id, m.customer_id, u.phone as account_phone, u.name as account_name,
  m.customer_name, m.customer_phone, m.message, m.reply,
  m.is_read, m.is_replied, m.is_blocked, m.is_deleted,
  m.created_at, m.order_id, o.customer_name as order_customer
from public.messages m
left join public.users u on u.id = m.customer_id
left join public.orders o on o.order_id = m.order_id;

-- 8) Report accuracy
select 'customers accuracy check' as info,
  (select count(*) from public.users) as users,
  (select count(*) from public.orders where customer_id is not null) as orders_linked,
  (select count(*) from public.orders where customer_id is null) as orders_unlinked,
  (select count(*) from public.messages where customer_id is not null) as messages_linked,
  (select count(*) from public.messages) as messages_total,
  (select count(*) from public.chat_messages where customer_id is not null) as chat_linked;
