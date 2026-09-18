-- Messages tab — customer messages with reply / block / delete, all DB-driven
create extension if not exists "pgcrypto";

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null,
  customer_phone text not null default '',
  customer_address text not null default '',
  order_id text references public.orders(order_id) on delete set null,
  message text not null,
  reply text not null default '',
  -- booleans for audit/moderation
  is_read boolean not null default false,
  is_replied boolean not null default false,
  is_blocked boolean not null default false,
  is_deleted boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  replied_at timestamptz,
  blocked_at timestamptz
);

create index if not exists idx_messages_created on public.messages(created_at desc);
create index if not exists idx_messages_customer_phone on public.messages(customer_phone);
create index if not exists idx_messages_is_blocked on public.messages(is_blocked) where is_blocked = true;
create index if not exists idx_messages_is_read on public.messages(is_read) where is_read = false;
create index if not exists idx_messages_is_deleted on public.messages(is_deleted) where is_deleted = false;
create index if not exists idx_messages_order on public.messages(order_id);

create or replace function public.trg_messages_touch()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  -- keep booleans in sync
  if new.reply is not null and length(trim(new.reply)) > 0 then
    new.is_replied := true;
    if new.replied_at is null then new.replied_at := now(); end if;
  else
    new.is_replied := false;
  end if;
  if new.is_blocked and new.blocked_at is null then new.blocked_at := now(); end if;
  if not new.is_blocked then new.blocked_at := null; end if;
  return new;
end $$;
drop trigger if exists messages_touch on public.messages;
create trigger messages_touch before insert or update on public.messages
  for each row execute function public.trg_messages_touch();

alter table public.messages enable row level security;
do $$ begin
  drop policy if exists "Allow all for anon — messages" on public.messages;
  create policy "Allow all for anon — messages" on public.messages for all using (true) with check (true);
end $$;

-- realtime
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
  begin alter publication supabase_realtime add table public.messages; exception when duplicate_object then null; end;
end $$;

-- seed — real-looking customer messages (no dummy lorem, use actual names/phones from Irosin)
insert into public.messages (customer_name, customer_phone, customer_address, order_id, message, is_read, is_replied, reply, is_blocked) values
('Juan Dela Cruz','09123456789','Brgy. Monbon, Irosin','WFR-4821','Boss, pwede pa-deliver 2 gals bukas ng umaga? May lakad kasi kami.','false','false','',false),
('Maria Santos','09170001122','Brgy. Patag, Irosin','WFR-7392','Magkano po ang 3 Mineral Slim? May discount ba pag 3?','true','true','Hello Maria! ₱35 each po ang Mineral Slim — ₱105 total. Free delivery pa rin.',false),
('Ana Reyes','09051234567','Brgy. San Isidro, Irosin','WFR-6105','Yung order ko kahapon WFR-6105, pwede i-cancel? Nagkamali ako ng size.','false','false','',false),
('Kap. Reyes','09173334444','Brgy. Patag Hall','WFR-2847','Paki deliver bago mag 10am bukas please. May barangay meeting. Salamat!','true','false','',false),
('Mina Store','09207778888','Brgy. Bagsangan, Irosin','WFR-9153','Na-receive ko na yung 5 gals, salamat! Babayaran ko na via GCash.','true','false','',false),
('Lito Manalo','09301112222','Brgy. Carriedo, Irosin','WFR-5033','Boss sorry wrong order — hindi na tuloy, cancel na lang.','true','true','Noted sir Lito, canceled na po ang WFR-5033. No charge.',false),
('Aling Nena','09051231234','Brgy. San Isidro','WFR-1234','May utang pa ba ako sa hiram? 2 gals pa ba?', 'false','false','',false),
('Ronald Torres','09205551234','Brgy. Gulang-Gulang, Irosin',null,'Order po ng Purified 5 gals Round, deliver tonight?','false','false','',false)
on conflict do nothing;

select 'messages ready' as info, (select count(*) from public.messages) as total;
