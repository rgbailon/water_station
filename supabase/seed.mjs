#!/usr/bin/env node
// Seed via Supabase JS (uses VITE_SUPABASE_* or SUPABASE_*). Fallback to pg if no keys.
// Usage: node supabase/seed.mjs
import dotenv from 'dotenv'
import { existsSync } from 'fs'
if (existsSync('.env')) dotenv.config()

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://ddzlawodgqziuoanudbb.supabase.co'
const anon = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY

if (!anon || anon.includes('REPLACE_WITH')) {
  console.log('No anon key in .env — falling back to pg SQL file. Run:')
  console.log('  psql "$DATABASE_URL" -f supabase/schema.sql')
  console.log('  psql "$DATABASE_URL" -f supabase/seed.sql')
  process.exit(0)
}

import { createClient } from '@supabase/supabase-js'
const sb = createClient(url, anon)

import { sampleProducts } from '../src/data/ordersData.js'
import { inventoryItems, initialEvents, hiramRecords, expensesList } from '../src/data/mockData.js'

// Lazy import sample orders generation (needs DOM? keep minimal)
import { generateSampleOrders } from '../src/data/ordersData.js'

async function seed() {
  console.log('Seeding via Supabase JS →', url)

  // Products
  const prodRows = sampleProducts.map(p => ({
    id: p.id, name: p.name, size: p.size, container: p.container, description: p.description,
    price: p.price, water_type: p.type, water_type_label: p.typeLabel, bottle_situation: p.bottleSituation,
    bottle_label: p.bottleLabel, accent_hex: p.accent, accent_argb: p.accentArgb, image_url: p.image,
    is_available: p.type === 'PURIFIED', is_active: true, is_featured: p.id === 1,
  }))
  let r = await sb.from('products').upsert(prodRows, { onConflict: 'id' })
  console.log(' products:', r.error ? r.error.message : `${prodRows.length} upserted`)

  // Inventory
  const invRows = inventoryItems.map(it => ({
    id: it.id, name: it.name, sku: it.sku, price: it.price, stock_filled: it.stockFilled,
    stock_empty: it.stockEmpty, threshold: it.threshold, icon: it.icon, unit: it.unit, is_active: true, is_archived: false,
  }))
  r = await sb.from('inventory_items').upsert(invRows, { onConflict: 'id' })
  console.log(' inventory:', r.error ? r.error.message : `${invRows.length} upserted`)

  // Events
  const evRows = initialEvents.map(e => ({
    id: e.id, date: e.date, type: e.type, title: e.title, customer: e.customer || '', barangay: e.customer || null,
    amount: e.amount, icon: e.icon, note: e.note || '', is_paid: e.type !== 'hiram' && e.type !== 'maintenance', is_archived: false, is_recurring: e.type==='maintenance',
  }))
  r = await sb.from('events').upsert(evRows, { onConflict: 'id' })
  console.log(' events:', r.error ? r.error.message : `${evRows.length} upserted`)

  // Hiram
  for (const h of hiramRecords) {
    const payload = { customer_name: h.customer, phone: h.phone, barangay: h.barangay, borrowed: h.borrowed, returned: h.returned, due_date: h.due, status: h.status, is_active: true }
    if (h.id) payload.id = h.id
    const rr = await sb.from('hiram_records').upsert(payload, { onConflict: 'id' }).select().single()
    if (rr.error) console.log(' hiram err', rr.error.message)
  }
  console.log(' hiram: done')

  // Expenses
  for (const e of expensesList) {
    const payload = { date: e.date, category: e.category, description: e.desc, amount: e.amount, is_paid: true, is_recurring: false, is_archived: false }
    if (e.id) payload.id = e.id
    const rr = await sb.from('expenses').upsert(payload, { onConflict: 'id' }).select().single()
    if (rr.error) console.log(' expense err', rr.error.message)
  }
  console.log(' expenses: done')

  // Orders
  const orders = generateSampleOrders()
  for (const o of orders) {
    const orderRow = {
      order_id: o.orderId, created_at: new Date(o.date).toISOString(), customer_name: o.customerName, phone: o.phone, address: o.address,
      subtotal: o.subtotal, delivery_fee: o.deliveryFee, total: o.total, payment_method: o.payment, schedule: o.schedule, notes: o.notes || '',
      is_canceled: !!o.isCanceled, is_delivered: o.orderId==='WFR-1234'||o.orderId==='WFR-8761'||o.orderId==='WFR-9153', is_paid: o.orderId==='WFR-1234'||o.orderId==='WFR-8761'||o.orderId==='WFR-9153', is_archived:false,
    }
    const rr = await sb.from('orders').upsert(orderRow, { onConflict: 'order_id' }).select().single()
    if (rr.error) { console.log(' order err', o.orderId, rr.error.message); continue }
    const items = o.items.map(it => ({
      order_id: o.orderId, product_id: it.productId, quantity: it.quantity, unit_price: it.product.price, is_borrow: it.product.bottleSituation==='BORROW', is_refunded:false,
    }))
    const ri = await sb.from('order_items').insert(items)
    if (ri.error && !ri.error.message.includes('duplicate')) console.log(' items err', o.orderId, ri.error.message)
  }
  console.log(' orders: done')
  console.log('✔ Seed finished')
}
seed().catch(e => { console.error(e); process.exit(1) })
