-- =============================================================================
-- Seed data for Tubig Irosin — run AFTER schema.sql
-- Inserts sample products (18), inventory (8), events (24), hiram (5),
-- expenses (6), orders (8) + order_items.
-- All booleans are populated explicitly.
-- Idempotent: uses ON CONFLICT DO NOTHING / DO UPDATE
-- =============================================================================

-- ---------------- PRODUCTS (18) ----------------
insert into public.products (id, name, size, container, description, price, water_type, water_type_label, bottle_situation, bottle_label, accent_hex, accent_argb, image_url, is_available, is_active, is_featured) values
(1,  'Purified Refill',      '18.9 L (5 Gal)', 'Round', 'Refill for your round 5-gallon jug. RO-filtered, UV-sterilized, and sealed fresh on site.', 25.00, 'PURIFIED','Purified','WITH_GALLON','With Gallon', '#1565C0', 4279901632, 'https://i.ibb.co/rR9LDHXb/round.jpg', true,  true, true),
(2,  'Purified Refill',      '18.9 L (5 Gal)', 'Slim',  'Refill for your slim 5-gallon jug. RO-filtered, UV-sterilized, and sealed fresh on site.', 30.00, 'PURIFIED','Purified','WITH_GALLON','With Gallon', '#4FC3F7', 4283580407, 'https://i.ibb.co/r2KL42XR/514194012-24405278279058403-8323724181837978356-n.jpg', true,  true, false),
(3,  'Mineral Refill',       '18.9 L (5 Gal)', 'Round', 'Mineral-enriched refill for round jugs. Retains natural minerals for balanced taste.', 30.00, 'MINERAL','Mineral','WITH_GALLON','With Gallon', '#00897B', 4278223739, 'https://i.ibb.co/rR9LDHXb/round.jpg', false, true, false),
(4,  'Mineral Refill',       '18.9 L (5 Gal)', 'Slim',  'Mineral-enriched refill for slim jugs. Retains natural minerals for balanced taste.', 35.00, 'MINERAL','Mineral','WITH_GALLON','With Gallon', '#26C6DA', 4280158682, 'https://i.ibb.co/r2KL42XR/514194012-24405278279058403-8323724181837978356-n.jpg', false, true, false),
(5,  'Alkaline Refill',      '18.9 L (5 Gal)', 'Round', 'Alkaline refill (pH 8+) for round jugs. Ionized for smooth, crisp hydration.', 40.00, 'ALKALINE','Alkaline','WITH_GALLON','With Gallon', '#1565C0', 4279901632, 'https://i.ibb.co/rR9LDHXb/round.jpg', false, true, false),
(6,  'Alkaline Refill',      '18.9 L (5 Gal)', 'Slim',  'Alkaline refill (pH 8+) for slim jugs. Ionized for smooth, crisp hydration.', 45.00, 'ALKALINE','Alkaline','WITH_GALLON','With Gallon', '#4FC3F7', 4283580407, 'https://i.ibb.co/r2KL42XR/514194012-24405278279058403-8323724181837978356-n.jpg', false, true, false),
(7,  'New Gallon + Purified','18.9 L (5 Gal)', 'Round', 'Brand-new round gallon + purified refill. Take home a fresh jug sealed and ready.', 150.00,'PURIFIED','Purified','NEEDS_GALLON','New Gallon', '#1565C0', 4279901632, 'https://i.ibb.co/rR9LDHXb/round.jpg', true,  true, false),
(8,  'New Gallon + Purified','18.9 L (5 Gal)', 'Slim',  'Brand-new slim gallon + purified refill. Take home a fresh jug sealed and ready.', 155.00,'PURIFIED','Purified','NEEDS_GALLON','New Gallon', '#4FC3F7', 4283580407, 'https://i.ibb.co/r2KL42XR/514194012-24405278279058403-8323724181837978356-n.jpg', true,  true, false),
(9,  'New Gallon + Mineral', '18.9 L (5 Gal)', 'Round', 'Brand-new round gallon + mineral refill. Fresh jug with mineral-balanced water.', 160.00,'MINERAL','Mineral','NEEDS_GALLON','New Gallon', '#00897B', 4278223739, 'https://i.ibb.co/rR9LDHXb/round.jpg', false, true, false),
(10, 'New Gallon + Mineral', '18.9 L (5 Gal)', 'Slim',  'Brand-new slim gallon + mineral refill. Fresh jug with mineral-balanced water.', 165.00,'MINERAL','Mineral','NEEDS_GALLON','New Gallon', '#26C6DA', 4280158682, 'https://i.ibb.co/r2KL42XR/514194012-24405278279058403-8323724181837978356-n.jpg', false, true, false),
(11, 'New Gallon + Alkaline','18.9 L (5 Gal)', 'Round', 'Brand-new round gallon + alkaline refill. Premium pH 8+ water in a new jug.', 170.00,'ALKALINE','Alkaline','NEEDS_GALLON','New Gallon', '#1565C0', 4279901632, 'https://i.ibb.co/rR9LDHXb/round.jpg', false, true, false),
(12, 'New Gallon + Alkaline','18.9 L (5 Gal)', 'Slim',  'Brand-new slim gallon + alkaline refill. Premium pH 8+ water in a new jug.', 180.00,'ALKALINE','Alkaline','NEEDS_GALLON','New Gallon', '#4FC3F7', 4283580407, 'https://i.ibb.co/r2KL42XR/514194012-24405278279058403-8323724181837978356-n.jpg', false, true, false),
(13, 'Borrow Gallon + Purified','18.9 L (5 Gal)', 'Round','Borrow a round gallon + purified refill. Return jug on next delivery.', 25.00,'PURIFIED','Purified','BORROW','Borrow', '#1565C0', 4279901632, 'https://i.ibb.co/rR9LDHXb/round.jpg', true,  true, false),
(14, 'Borrow Gallon + Purified','18.9 L (5 Gal)', 'Slim', 'Borrow a slim gallon + purified refill. Return jug on next delivery.', 30.00,'PURIFIED','Purified','BORROW','Borrow', '#4FC3F7', 4283580407, 'https://i.ibb.co/r2KL42XR/514194012-24405278279058403-8323724181837978356-n.jpg', true,  true, false),
(15, 'Borrow Gallon + Mineral','18.9 L (5 Gal)', 'Round','Borrow a round gallon + mineral refill. Return jug on next delivery.', 30.00,'MINERAL','Mineral','BORROW','Borrow', '#00897B', 4278223739, 'https://i.ibb.co/rR9LDHXb/round.jpg', false, true, false),
(16, 'Borrow Gallon + Mineral','18.9 L (5 Gal)', 'Slim', 'Borrow a slim gallon + mineral refill. Return jug on next delivery.', 35.00,'MINERAL','Mineral','BORROW','Borrow', '#26C6DA', 4280158682, 'https://i.ibb.co/r2KL42XR/514194012-24405278279058403-8323724181837978356-n.jpg', false, true, false),
(17, 'Borrow Gallon + Alkaline','18.9 L (5 Gal)', 'Round','Borrow a round gallon + alkaline refill. Return jug on next delivery.',40.00,'ALKALINE','Alkaline','BORROW','Borrow', '#1565C0', 4279901632, 'https://i.ibb.co/rR9LDHXb/round.jpg', false, true, false),
(18, 'Borrow Gallon + Alkaline','18.9 L (5 Gal)', 'Slim', 'Borrow a slim gallon + alkaline refill. Return jug on next delivery.',45.00,'ALKALINE','Alkaline','BORROW','Borrow', '#4FC3F7', 4283580407, 'https://i.ibb.co/r2KL42XR/514194012-24405278279058403-8323724181837978356-n.jpg', false, true, false)
on conflict (id) do update set
  name=excluded.name, price=excluded.price, is_available=excluded.is_available, updated_at=now();

-- ---------------- INVENTORY (8) ----------------
insert into public.inventory_items (id, name, sku, price, stock_filled, stock_empty, threshold, icon, unit, is_active, is_archived) values
(1, '5-Gal Round (Refill)', 'GAL-RND-5', 30, 42, 18, 10, '💧', 'gals',  true, false),
(2, '5-Gal Slim (Refill)',  'GAL-SLM-5', 30, 28,  9, 10, '🧴', 'gals',  true, false),
(3, '350ml Bottles (24pcs)','BTL-350',  140, 15,  0,  5, '🥤', 'cases', true, false),
(4, '500ml Bottles (24pcs)','BTL-500',  160,  8,  0,  5, '💦', 'cases', true, false),
(5, '1L Bottles (12pcs)',   'BTL-1L',   180,  6,  0,  4, '🧊', 'cases', true, false),
(6, 'Caps & Seals',         'CAP-SEAL',   0,120,  0, 50, '🔵', 'pcs',   true, false),
(7, 'Filters (Stage 1-3)',  'FLT-SET',    0,  2,  0,  2, '⚙️', 'sets',  true, false),
(8, 'Stickers / Labels',    'LBL',        0,300,  0,100, '🏷️', 'pcs',   true, false)
on conflict (id) do update set name=excluded.name, stock_filled=excluded.stock_filled, updated_at=now();

-- ---------------- EVENTS (24 — September 2026) ----------------
insert into public.events (id, date, type, title, customer, barangay, amount, icon, note, is_paid, is_archived, is_recurring) values
('e1',  '2026-09-02','sale',       'Refill - 12 gals',      'Monbon',          'Monbon',          360,  '💧','Walk-in',                 true, false,false),
('e2',  '2026-09-02','expense',    'Fuel - Delivery',       '',                null,              250,  '⛽','Tricycle',                true, false,false),
('e3',  '2026-09-05','sale',       'Refill - 20 gals',      'San Isidro',      'San Isidro',      600,  '💧','Delivery',                true, false,false),
('e4',  '2026-09-05','hiram',      'Hiram - 5 gals',        'Aling Nena',      'San Isidro',        0,  '🤝','Due Sep 08',              false,false,false),
('e5',  '2026-09-05','delivery',   'Delivery - San Juan',   'San Juan',        'San Juan',        450,  '🛵','15 gals',                 true, false,false),
('e6',  '2026-09-07','sale',       'Bottles - 5 cases',     'Irosin Central',  'San Julian',      800,  '🥤','500ml',                   true, false,false),
('e7',  '2026-09-07','maintenance','Filter Check',          '',                null,                0,  '🔧','Stage 2',                 false,false,true),
('e8',  '2026-09-08','expense',    'Electric Bill',         '',                null,             2850,  '⚡','Aug bill',                true, false,false),
('e9',  '2026-09-08','hiram',      'Return - 3 gals',       'Aling Nena',      'San Isidro',        0,  '✅','Partial',                 false,false,false),
('e10', '2026-09-10','sale',       'Refill - 18 gals',      'Brgy. Patag',     'Patag',           540,  '💧','Walk-in + delivery',      true, false,false),
('e11', '2026-09-10','delivery',   'Delivery - Bagsangan',  'Bagsangan',       'Bagsangan',       600,  '🛵','20 gals',                 true, false,false),
('e12', '2026-09-11','sale',       'Refill - 25 gals',      'Multiple',        'San Julian',      750,  '💧','Peak day',                true, false,false),
('e13', '2026-09-11','delivery',   'Delivery - Gulang-Gulang','Gulang-Gulang','Gulang-Gulang',   390,  '🛵','13 gals',                 true, false,false),
('e14', '2026-09-11','expense',    'Caps & Seals Purchase', '',                null,              850,  '🔵','200 pcs',                 true, false,false),
('e15', '2026-09-11','hiram',      'Hiram - 4 gals',        'Juan Dela Cruz',  'Monbon',            0,  '🤝','Due Sep 14',              false,false,false),
('e16', '2026-09-12','sale',       'Refill - 10 gals',      'Brgy. Carriedo',  'Carriedo',        300,  '💧','',                        true, false,false),
('e17', '2026-09-12','expense',    'Water Source',          '',                null,             1200,  '🚰','NAWASA',                  true, false,false),
('e18', '2026-09-15','delivery',   'Scheduled - Monbon',    'Monbon',          'Monbon',          900,  '🛵','30 gals pre-order',       false,false,false),
('e19', '2026-09-15','maintenance','UV Light Replacement',  '',                null,             1500,  '💡','Every 6 months',          false,false,true),
('e20', '2026-09-18','sale',       'New Container Sale',    'Walk-in',         'San Julian',      450,  '🧴','3 slim containers',       true, false,false),
('e21', '2026-09-20','hiram',      'Hiram Due - 6 gals',    'Kap. Reyes',      'Patag',             0,  '⏰','Overdue follow-up',       false,false,false),
('e22', '2026-09-22','sale',       'Refill - 22 gals',      'Brgy. Liang',     'Liang',           660,  '💧','',                        true, false,false),
('e23', '2026-09-25','expense',    'Fuel + Maintenance',    '',                null,             1100,  '⛽','',                        true, false,false),
('e24', '2026-09-28','delivery',   'Delivery - Tabon-Tabon','Tabon-Tabon',     'Tabon-Tabon',     750,  '🛵','25 gals',                 false,false,false)
on conflict (id) do update set title=excluded.title, amount=excluded.amount, updated_at=now();

-- ---------------- HIRAM_RECORDS (5) ----------------
insert into public.hiram_records (id, customer_name, phone, barangay, borrowed, returned, due_date, status, is_active) values
(1, 'Juan Dela Cruz',      '0912-***-1234', 'Monbon',    4, 0, '2026-09-14', 'active',   true),
(2, 'Aling Nena Sari-Sari','0905-***-6789', 'San Isidro',5, 3, '2026-09-08', 'partial',  true),
(3, 'Kap. Reyes',          '0917-***-4321', 'Patag',     6, 0, '2026-09-20', 'overdue',  true),
(4, 'Mina Store',          '0920-***-9876', 'Bagsangan', 3, 0, '2026-09-13', 'active',   true),
(5, 'Irosin NHS Canteen',  '0930-***-1111', 'San Julian',8, 8, '2026-09-09', 'returned', true)
on conflict (id) do update set customer_name=excluded.customer_name, updated_at=now();
-- Ensure sequences are correct after explicit ids
select setval('public.hiram_records_id_seq', (select max(id) from public.hiram_records), true);

-- ---------------- EXPENSES (6) ----------------
insert into public.expenses (id, date, category, description, amount, is_paid, is_recurring, is_archived) values
(1, '2026-09-02', 'Fuel',       'Tricycle delivery - Monbon loop', 250,  true, false, false),
(2, '2026-09-05', 'Caps/Seals', '200 pcs seals + caps',            650,  true, false, false),
(3, '2026-09-08', 'Electricity','August electric bill',           2850,  true, true,  false),
(4, '2026-09-11', 'Caps/Seals', 'Emergency purchase',              850,  true, false, false),
(5, '2026-09-12', 'Water',      'NAWASA deep well',               1200,  true, true,  false),
(6, '2026-09-15', 'Maintenance','UV light replacement',           1500,  false,false, false)
on conflict (id) do update set amount=excluded.amount, updated_at=now();
select setval('public.expenses_id_seq', (select max(id) from public.expenses), true);

-- ---------------- ORDERS (8) — status is now database-driven (no timers) + borrowed audit ----------------
insert into public.orders (order_id, created_at, customer_name, phone, address, subtotal, delivery_fee, total, payment_method, schedule, notes, status, borrowed_count, is_borrowed, is_canceled, is_delivered, is_paid, is_archived) values
('WFR-1234', '2026-09-11 09:30:00+08', 'Aling Nena Sari-Sari','0905-***-6789','Brgy. San Isidro - near market', 250, 0, 250, 'Cash on Delivery','Today',    'Partial hiram return included', 'DELIVERED',       0, false, false, true,  true,  false),
('WFR-8761', '2026-09-10 14:00:00+08', 'Irosin NHS Canteen',  '0930-***-1111','San Julian, Irosin - Irosin NHS', 180, 0, 180, 'Cash on Delivery','Tomorrow', 'School event — need OR',        'DELIVERED',       4, true,  false, true,  true,  false),
('WFR-4821', now() - interval '2 hours', 'Juan Dela Cruz','0912-345-6789','Brgy. Monbon, Irosin - Purok 3 near chapel', 80, 0, 80, 'Cash on Delivery','Today','Leave at gate — dog is friendly', 'PENDING',         1, true,  false,false,false,false),
('WFR-7392', now() - interval '3 hours', 'Maria Santos',  '0917-000-1122','Brgy. Patag, Irosin',                         105,0,105, 'Cash on Delivery','Today','',                                  'CONFIRMED',       0, false, false,false,false,false),
('WFR-6105', now() - interval '4 hours', 'Ana Reyes',     '0905-123-4567','Brgy. San Isidro, Irosin - San Isidro Elementary',85,0,85,'Cash on Delivery','Today','Leave at door',                   'GALLON_TO_GET',   0, false, false,false,false,false),
('WFR-2847', now() - interval '5 hours', 'Kap. Reyes',    '0917-***-4321','Brgy. Patag - Barangay Hall',               355,0,355, 'Cash on Delivery','Tomorrow','Deliver before 10am — barangay meeting', 'OUT_FOR_DELIVERY',0, false, false,false,false,false),
('WFR-9153', now() - interval '6 hours', 'Mina Store',    '0920-***-9876','Brgy. Bagsangan - National Road',           125,0,125, 'Cash on Delivery','Today','',                                  'DELIVERED',       5, true,  false,true, true, false),
('WFR-5033', now() - interval '1 hour',  'Lito Manalo',   '0930-111-2222','Brgy. Carriedo, Irosin',                     60,0, 60, 'Cash on Delivery','Today','Customer requested cancel — wrong size', 'CANCELED',        0, false, true,false,false,false)
on conflict (order_id) do update set customer_name=excluded.customer_name, total=excluded.total, status=excluded.status, borrowed_count=excluded.borrowed_count, is_borrowed=excluded.is_borrowed, updated_at=now();

-- ---------------- ORDER_ITEMS ----------------
-- WFR-1234: 11 x1 (170) + 5 x2 (80) = 250
insert into public.order_items (order_id, product_id, quantity, unit_price, is_borrow, is_refunded) values
('WFR-1234', 11, 1, 170, false,false),
('WFR-1234',  5, 2,  40, false,false),
('WFR-8761', 18, 4,  45, true, false),
('WFR-4821',  1, 2,  25, false,false),
('WFR-4821', 14, 1,  30, true, false),
('WFR-7392',  4, 3,  35, false,false),
('WFR-6105',  2, 1,  30, false,false),
('WFR-6105',  1, 2,  25, false,false),
('WFR-2847',  8, 2, 155, false,false),
('WFR-2847',  6, 1,  45, false,false),
('WFR-9153', 13, 5,  25, true, false),
('WFR-5033',  3, 2,  30, false,false)
on conflict do nothing;

-- status already sets delivered/canceled via trigger; no extra update needed

select 'Seed complete' as status,
  (select count(*) from public.products) as products,
  (select count(*) from public.inventory_items) as inventory,
  (select count(*) from public.events) as events,
  (select count(*) from public.hiram_records) as hiram,
  (select count(*) from public.expenses) as expenses,
  (select count(*) from public.orders) as orders,
  (select count(*) from public.order_items) as order_items;
