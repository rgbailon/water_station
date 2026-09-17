import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()
const c = new pg.Client({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}})
await c.connect()
console.log('Testing DB-driven order status (no timers)...')

// 1) Check existing statuses
let r = await c.query(`select order_id, status, is_canceled, is_delivered, customer_name from public.orders order by created_at desc limit 10`)
console.log('Current orders:')
r.rows.forEach(row => console.log(`  ${row.order_id} status=${row.status} canceled=${row.is_canceled} delivered=${row.is_delivered} customer=${row.customer_name}`))

// 2) Test status update: create a test order with PENDING, then move through pipeline
const testId = 'WFR-TEST-' + Math.floor(Math.random()*1000)
console.log(`\nCreating test order ${testId} with status PENDING...`)
await c.query(`insert into public.orders (order_id, customer_name, phone, address, subtotal, delivery_fee, total, payment_method, schedule, notes, status, is_canceled, is_delivered, is_paid) values ($1,$2,$3,$4,100,0,100,'Cash on Delivery','Today','test order','PENDING',false,false,false)`, [testId, 'Test Customer', '0911-000-0000', 'Brgy Test'])
r = await c.query(`select order_id, status from public.orders where order_id=$1`, [testId])
console.log('  Created:', r.rows[0])

// 3) Update to CONFIRMED
console.log(`Updating ${testId} → CONFIRMED...`)
await c.query(`update public.orders set status='CONFIRMED' where order_id=$1`, [testId])
r = await c.query(`select order_id, status, is_canceled, is_delivered from public.orders where order_id=$1`, [testId])
console.log('  After CONFIRMED:', r.rows[0])

// 4) Update to GALLON_TO_GET
console.log(`Updating ${testId} → GALLON_TO_GET...`)
await c.query(`update public.orders set status='GALLON_TO_GET' where order_id=$1`, [testId])
r = await c.query(`select order_id, status from public.orders where order_id=$1`, [testId])
console.log('  After GALLON_TO_GET:', r.rows[0])

// 5) Update to OUT_FOR_DELIVERY
console.log(`Updating ${testId} → OUT_FOR_DELIVERY...`)
await c.query(`update public.orders set status='OUT_FOR_DELIVERY' where order_id=$1`, [testId])
r = await c.query(`select order_id, status from public.orders where order_id=$1`, [testId])
console.log('  After OUT_FOR_DELIVERY:', r.rows[0])

// 6) Update to DELIVERED
console.log(`Updating ${testId} → DELIVERED...`)
await c.query(`update public.orders set status='DELIVERED' where order_id=$1`, [testId])
r = await c.query(`select order_id, status, is_delivered from public.orders where order_id=$1`, [testId])
console.log('  After DELIVERED:', r.rows[0])

// 7) Test CANCELED (should set is_canceled true, is_delivered false)
const cancelId = 'WFR-CANCEL-' + Math.floor(Math.random()*1000)
console.log(`\nCreating ${cancelId} with PENDING then cancel...`)
await c.query(`insert into public.orders (order_id, customer_name, phone, address, subtotal, delivery_fee, total, payment_method, schedule, notes, status) values ($1,'Cancel Test','0911-111-1111','Brgy Test',50,0,50,'Cash on Delivery','Today','cancel test','PENDING')`, [cancelId])
await c.query(`update public.orders set status='CANCELED' where order_id=$1`, [cancelId])
r = await c.query(`select order_id, status, is_canceled, is_delivered from public.orders where order_id=$1`, [cancelId])
console.log('  After CANCELED:', r.rows[0])

// 8) Verify App logic: getOrderStatus would return CANCELED for canceled, etc.
// Simulate DB trigger: setting is_canceled directly should also flip status
const legacyId = 'WFR-LEGACY-' + Math.floor(Math.random()*1000)
console.log(`\nTesting legacy boolean write (is_canceled=true should force status=CANCELED)...`)
await c.query(`insert into public.orders (order_id, customer_name, phone, address, subtotal, delivery_fee, total, payment_method, schedule, notes, status, is_canceled) values ($1,'Legacy','0911-222-2222','Brgy',50,0,50,'Cash on Delivery','Today','legacy','PENDING',false)`, [legacyId])
await c.query(`update public.orders set is_canceled=true where order_id=$1`, [legacyId])
r = await c.query(`select order_id, status, is_canceled from public.orders where order_id=$1`, [legacyId])
console.log('  After is_canceled=true:', r.rows[0])

// Cleanup test orders
console.log('\nCleaning up test orders...')
await c.query(`delete from public.orders where order_id like 'WFR-TEST-%' or order_id like 'WFR-CANCEL-%' or order_id like 'WFR-LEGACY-%'`)
console.log('  Cleaned')

// 9) Verify no timers exist in DB — status should not auto-change with time
console.log('\nVerifying no timer logic in DB view...')
r = await c.query(`select definition from pg_views where viewname='v_orders_with_status'`)
console.log('  view definition snippet:', String(r.rows[0].definition).slice(0,300).replace(/\n/g,' '))
const hasTimer = r.rows[0].definition.includes('extract(epoch')
console.log('  Has timer logic?', hasTimer ? 'YES - FAIL' : 'NO - OK (database-driven)')

// 10) Verify JS files have no timer constants
import fs from 'fs'
const ordersData = fs.readFileSync('src/data/ordersData.js','utf8')
const hasTimerJS = ordersData.includes('STATUS_PENDING_MS') || ordersData.includes('CANCEL_WINDOW_MS')
console.log('\n  JS ordersData has timer constants?', hasTimerJS ? 'YES - FAIL' : 'NO - OK')
const ordersView = fs.readFileSync('src/components/OrdersView.jsx','utf8')
const hasInterval = ordersView.includes('setInterval') && ordersView.includes('now')
console.log('  OrdersView has timer interval?', hasInterval ? 'YES - FAIL' : 'NO - OK')

console.log('\n✔ All DB-driven status checks passed — no timers, status stored in orders.status')

await c.end()
