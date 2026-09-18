import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()
const c = new pg.Client({connectionString: process.env.DATABASE_URL, ssl:{rejectUnauthorized:false}})
await c.connect()
let r = await c.query("select order_id, status, payment_status, is_paid, total, borrowed_count from public.orders where status='CANCELED' order by order_id")
console.log(r.rows.map(x=> JSON.stringify(x)).join('\n'))
console.log('canceled count', r.rows.length)
let r2 = await c.query("select order_id, payment_status from public.orders where status='CANCELED' and payment_status='PAID'")
console.log('canceled but PAID (should be 0 after fix):', r2.rows.length, r2.rows.map(x=>x.order_id).join(','))
await c.end()
