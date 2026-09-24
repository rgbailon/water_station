/**
 * Tubig Irosin — Supabase DB helpers
 * One thin wrapper per table + realtime + offline fallback notes.
 * All functions are safe to call even when Supabase is not configured:
 *   they throw a clear error so callers can fallback to localStorage.
 */
import { supabase, isSupabaseConfigured } from './supabaseClient'

// ---------- generic helpers ----------

function requireClient() {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase not configured — set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in .env')
  return supabase
}

function handleErr(res, label) {
  if (res.error) {
    console.error(`[db:${label}]`, res.error)
    throw res.error
  }
  return res.data
}

// ---------- mappers: snake_case (DB) ↔ camelCase (app) ----------

// products: DB uses snake_case, app uses camelCase from sampleProducts
export function productFromRow(r) {
  if (!r) return null
  return {
    id: r.id,
    name: r.name,
    size: r.size,
    container: r.container,
    description: r.description,
    price: Number(r.price),
    type: r.water_type,
    typeLabel: r.water_type_label,
    bottleSituation: r.bottle_situation,
    bottleLabel: r.bottle_label,
    accent: r.accent_hex,
    accentArgb: r.accent_argb,
    image: r.image_url,
    is_available: !!r.is_available,
    is_active: !!r.is_active,
    is_featured: !!r.is_featured,
    // also legacy aliases for OrdersView
    isAvailable: !!r.is_available,
    isActive: !!r.is_active,
  }
}
export function productToRow(p) {
  return {
    id: p.id,
    name: p.name,
    size: p.size,
    container: p.container,
    description: p.description,
    price: p.price,
    water_type: p.type || p.water_type,
    water_type_label: p.typeLabel || p.water_type_label,
    bottle_situation: p.bottleSituation || p.bottle_situation,
    bottle_label: p.bottleLabel || p.bottle_label,
    accent_hex: p.accent || p.accent_hex,
    accent_argb: p.accentArgb ?? p.accent_argb ?? null,
    image_url: p.image || p.image_url,
    is_available: p.is_available ?? p.isAvailable ?? p.type === 'PURIFIED',
    is_active: p.is_active ?? p.isActive ?? true,
    is_featured: p.is_featured ?? p.is_featured ?? false,
  }
}

// inventory
export function inventoryFromRow(r) {
  return {
    id: r.id,
    name: r.name,
    sku: r.sku,
    price: Number(r.price),
    stockFilled: r.stock_filled,
    stockEmpty: r.stock_empty,
    threshold: r.threshold,
    icon: r.icon,
    unit: r.unit,
    is_active: !!r.is_active,
    is_archived: !!r.is_archived,
    is_low_stock: !!r.is_low_stock,
  }
}
export function inventoryToRow(it) {
  return {
    id: it.id,
    name: it.name,
    sku: it.sku,
    price: it.price,
    stock_filled: it.stockFilled ?? it.stock_filled,
    stock_empty: it.stockEmpty ?? it.stock_empty,
    threshold: it.threshold,
    icon: it.icon,
    unit: it.unit,
    is_active: it.is_active ?? it.isActive ?? true,
    is_archived: it.is_archived ?? it.isArchived ?? false,
  }
}

// events
export function eventFromRow(r) {
  return {
    id: r.id,
    date: r.date, // YYYY-MM-DD
    type: r.type,
    title: r.title,
    customer: r.customer,
    barangay: r.barangay || r.customer || '',
    amount: Number(r.amount),
    icon: r.icon,
    note: r.note,
    is_paid: !!r.is_paid,
    is_archived: !!r.is_archived,
    is_recurring: !!r.is_recurring,
  }
}
export function eventToRow(e) {
  return {
    id: e.id,
    date: e.date,
    type: e.type,
    title: e.title,
    customer: e.customer ?? e.barangay ?? '',
    barangay: e.barangay ?? e.customer ?? null,
    amount: e.amount ?? 0,
    icon: e.icon || '📅',
    note: e.note || '',
    is_paid: !!e.is_paid,
    is_archived: !!e.is_archived,
    is_recurring: !!e.is_recurring,
  }
}

// hiram
export function hiramFromRow(r) {
  return {
    id: r.id,
    customer: r.customer_name,
    phone: r.phone,
    barangay: r.barangay,
    borrowed: r.borrowed,
    returned: r.returned,
    due: r.due_date,
    status: r.status,
    is_returned: !!r.is_returned,
    is_overdue: !!r.is_overdue,
    is_active: !!r.is_active,
  }
}
export function hiramToRow(h) {
  return {
    id: h.id,
    customer_name: h.customer ?? h.customer_name,
    phone: h.phone || '',
    barangay: h.barangay || '',
    borrowed: h.borrowed,
    returned: h.returned,
    due_date: h.due ?? h.due_date,
    status: h.status,
    is_returned: !!h.is_returned,
    is_overdue: !!h.is_overdue,
    is_active: h.is_active ?? true,
  }
}

// expenses
export function expenseFromRow(r) {
  return {
    id: r.id,
    date: r.date,
    category: r.category,
    desc: r.description,
    description: r.description,
    amount: Number(r.amount),
    is_paid: !!r.is_paid,
    is_recurring: !!r.is_recurring,
    is_archived: !!r.is_archived,
  }
}
export function expenseToRow(e) {
  return {
    id: e.id,
    date: e.date,
    category: e.category,
    description: e.desc ?? e.description ?? '',
    amount: e.amount,
    is_paid: e.is_paid ?? true,
    is_recurring: !!e.is_recurring,
    is_archived: !!e.is_archived,
  }
}

// orders + items — status is now database-driven (no timers)
export function orderFromRow(r, items = []) {
  const expanded = items.map(it => ({
    productId: it.product_id,
    quantity: it.quantity,
    product: it.products ? productFromRow(it.products) : undefined,
    unit_price: Number(it.unit_price),
    is_refunded: !!it.is_refunded,
    is_borrow: !!it.is_borrow,
  }))
  const status = r.status || (r.is_canceled ? 'CANCELED' : r.is_delivered ? 'DELIVERED' : 'CONFIRMED')
  const borrowed_count = r.borrowed_count != null ? Number(r.borrowed_count) : expanded.filter(it => it.is_borrow).reduce((s,it)=> s+it.quantity,0)
  const is_borrowed = r.is_borrowed != null ? !!r.is_borrowed : borrowed_count > 0
  const payment_status = r.payment_status || (r.is_paid ? 'PAID' : 'UNPAID')
  return {
    orderId: r.order_id,
    date: new Date(r.created_at).getTime(),
    created_at: r.created_at,
    customerName: r.customer_name,
    phone: r.phone,
    address: r.address,
    latitude: r.latitude != null ? Number(r.latitude) : null,
    longitude: r.longitude != null ? Number(r.longitude) : null,
    subtotal: Number(r.subtotal),
    deliveryFee: Number(r.delivery_fee),
    total: Number(r.total),
    payment: r.payment_method,
    schedule: r.schedule,
    notes: r.notes,
    status,
    borrowedCount: borrowed_count,
    borrowed_count,
    isBorrowed: is_borrowed,
    is_borrowed,
    paymentStatus: payment_status,
    payment_status,
    isPaid: payment_status === 'PAID',
    is_paid: payment_status === 'PAID',
    isCanceled: status === 'CANCELED' || !!r.is_canceled,
    is_canceled: status === 'CANCELED' || !!r.is_canceled,
    is_delivered: status === 'DELIVERED' || !!r.is_delivered,
    is_archived: !!r.is_archived,
    items: expanded,
  }
}
export function orderToRow(o) {
  const status = o.status || (o.isCanceled || o.is_canceled ? 'CANCELED' : o.is_delivered ? 'DELIVERED' : 'CONFIRMED')
  // compute borrowed from items if not explicitly provided (audit)
  const borrowedFromItems = Array.isArray(o.items) ? o.items.reduce((s,it)=> s + (it.is_borrow || it.product?.bottleSituation === 'BORROW' ? (it.quantity||0) : 0), 0) : 0
  const borrowed_count = o.borrowedCount ?? o.borrowed_count ?? borrowedFromItems
  const payment_status = o.payment_status || o.paymentStatus || (o.isPaid || o.is_paid ? 'PAID' : 'UNPAID')
  const lat = o.latitude ?? o.lat ?? null
  const lng = o.longitude ?? o.lng ?? null
  return {
    order_id: o.orderId || o.order_id,
    customer_name: o.customerName || o.customer_name,
    phone: o.phone || '',
    address: o.address || '',
    latitude: lat === '' || lat == null ? null : Number(lat),
    longitude: lng === '' || lng == null ? null : Number(lng),
    subtotal: o.subtotal,
    delivery_fee: o.deliveryFee ?? o.delivery_fee ?? 0,
    total: o.total,
    payment_method: o.payment || o.payment_method || 'Cash on Delivery',
    schedule: o.schedule || 'Today',
    notes: o.notes || '',
    status,
    borrowed_count,
    is_borrowed: borrowed_count > 0,
    payment_status,
    is_canceled: status === 'CANCELED',
    is_delivered: status === 'DELIVERED',
    is_paid: payment_status === 'PAID',
    is_archived: !!o.is_archived,
    ...(o.date ? { created_at: new Date(o.date).toISOString() } : {}),
    ...(o.created_at ? { created_at: o.created_at } : {}),
  }
}

// ---------- PRODUCTS ----------

export async function fetchProducts() {
  const sb = requireClient()
  const res = await sb.from('products').select('*').order('id')
  const rows = handleErr(res, 'fetchProducts')
  return rows.map(productFromRow)
}
export async function upsertProducts(products) {
  const sb = requireClient()
  const rows = products.map(productToRow)
  const res = await sb.from('products').upsert(rows, { onConflict: 'id' }).select()
  return handleErr(res, 'upsertProducts').map(productFromRow)
}
export async function deleteProduct(id) {
  const sb = requireClient()
  const res = await sb.from('products').delete().eq('id', id)
  if (!res.error) return { softDeleted: false }
  const code = res.error?.code
  const msg = `${res.error?.message || ''} ${res.error?.details || ''}`
  const isFk = code === '23503' || /foreign key/i.test(msg) || /order_items/i.test(msg)
  if (!isFk) throw res.error
  // Referenced by order history (order_items → products ON DELETE RESTRICT):
  // preserve history, deactivate instead so it leaves the active catalog.
  const off = await sb.from('products').update({ is_active: false, is_available: false }).eq('id', id).select()
  if (off.error) throw off.error
  const rows = off.data || []
  return { softDeleted: true, product: rows.length ? productFromRow(rows[0]) : null }
}

// ---------- INVENTORY ----------

export async function fetchInventory() {
  const sb = requireClient()
  const res = await sb.from('inventory_items').select('*').order('id')
  return handleErr(res, 'fetchInventory').map(inventoryFromRow)
}
export async function upsertInventoryItem(item) {
  const sb = requireClient()
  const res = await sb.from('inventory_items').upsert(inventoryToRow(item), { onConflict: 'id' }).select().single()
  return inventoryFromRow(handleErr(res, 'upsertInventoryItem'))
}
export async function upsertInventory(items) {
  const sb = requireClient()
  const rows = items.map(inventoryToRow)
  const res = await sb.from('inventory_items').upsert(rows, { onConflict: 'id' }).select()
  return handleErr(res, 'upsertInventory').map(inventoryFromRow)
}
export async function deleteInventoryItem(id) {
  const sb = requireClient()
  const res = await sb.from('inventory_items').delete().eq('id', id)
  if (res.error) throw res.error
}

// ---------- EVENTS ----------

export async function fetchEvents() {
  const sb = requireClient()
  const res = await sb.from('events').select('*').order('date', { ascending: false }).limit(2000)
  return handleErr(res, 'fetchEvents').map(eventFromRow)
}
export async function upsertEvent(ev) {
  const sb = requireClient()
  const res = await sb.from('events').upsert(eventToRow(ev), { onConflict: 'id' }).select().single()
  return eventFromRow(handleErr(res, 'upsertEvent'))
}
export async function upsertEvents(list) {
  const sb = requireClient()
  const rows = list.map(eventToRow)
  const res = await sb.from('events').upsert(rows, { onConflict: 'id' }).select()
  return handleErr(res, 'upsertEvents').map(eventFromRow)
}
export async function deleteEvent(id) {
  const sb = requireClient()
  const res = await sb.from('events').delete().eq('id', id)
  if (res.error) throw res.error
}

// ---------- HIRAM ----------

export async function fetchHiram() {
  const sb = requireClient()
  const res = await sb.from('hiram_records').select('*').order('due_date')
  return handleErr(res, 'fetchHiram').map(hiramFromRow)
}
export async function upsertHiram(record) {
  const row = hiramToRow(record)
  // strip id for inserts (serial)
  const payload = row.id ? row : Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'id'))
  const sb = requireClient()
  const res = await sb.from('hiram_records').upsert(payload, { onConflict: 'id' }).select().single()
  return hiramFromRow(handleErr(res, 'upsertHiram'))
}
export async function deleteHiram(id) {
  const sb = requireClient()
  const res = await sb.from('hiram_records').delete().eq('id', id)
  if (res.error) throw res.error
}

// ---------- EXPENSES ----------

export async function fetchExpenses() {
  const sb = requireClient()
  const res = await sb.from('expenses').select('*').order('date', { ascending: false })
  return handleErr(res, 'fetchExpenses').map(expenseFromRow)
}
export async function upsertExpense(exp) {
  const row = expenseToRow(exp)
  const payload = row.id ? row : Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'id'))
  const sb = requireClient()
  const res = await sb.from('expenses').upsert(payload, { onConflict: 'id' }).select().single()
  return expenseFromRow(handleErr(res, 'upsertExpense'))
}
export async function deleteExpense(id) {
  const sb = requireClient()
  const res = await sb.from('expenses').delete().eq('id', id)
  if (res.error) throw res.error
}

// ---------- ORDERS (+ items) ----------

export async function fetchOrders() {
  const sb = requireClient()
  // fetch orders with nested items + product join
  const res = await sb
    .from('orders')
    .select('*, order_items(*, products(*))')
    .order('created_at', { ascending: false })
    .limit(500)
  const rows = handleErr(res, 'fetchOrders')
  return rows.map(r => {
    const items = r.order_items || []
    // supabase nests products under each order_item as `products`
    return orderFromRow(r, items)
  })
}

export async function createOrder(order) {
  const sb = requireClient()
  const orderRow = orderToRow(order)
  const { order_id } = orderRow
  // split items
  const items = order.items || order.order_items || []
  const itemRows = items.map(it => ({
    order_id,
    product_id: it.productId ?? it.product_id,
    quantity: it.quantity,
    unit_price: it.product?.price ?? it.unit_price ?? 0,
    is_borrow: !!(it.product?.bottleSituation === 'BORROW' || it.is_borrow),
    is_refunded: !!it.is_refunded,
  }))
  // 1) insert order
  const r1 = await sb.from('orders').insert(orderRow).select().single()
  handleErr(r1, 'createOrder:orders')
  // 2) insert items (if any)
  if (itemRows.length) {
    const r2 = await sb.from('order_items').insert(itemRows).select()
    handleErr(r2, 'createOrder:order_items')
  }
  // 3) re-fetch with join
  const r3 = await sb.from('orders').select('*, order_items(*, products(*))').eq('order_id', order_id).single()
  const full = handleErr(r3, 'createOrder:refetch')
  return orderFromRow(full, full.order_items || [])
}

export async function updateOrder(orderId, patch) {
  const sb = requireClient()
  const rowPatch = {}
  if ('status' in patch) rowPatch.status = patch.status
  if ('payment_status' in patch) rowPatch.payment_status = patch.payment_status
  if ('paymentStatus' in patch) rowPatch.payment_status = patch.paymentStatus
  if ('isCanceled' in patch) rowPatch.is_canceled = !!patch.isCanceled
  if ('is_canceled' in patch) rowPatch.is_canceled = !!patch.is_canceled
  if ('is_delivered' in patch) rowPatch.is_delivered = !!patch.is_delivered
  if ('is_paid' in patch) rowPatch.is_paid = !!patch.is_paid
  if ('isPaid' in patch) rowPatch.is_paid = !!patch.isPaid
  if ('is_archived' in patch) rowPatch.is_archived = !!patch.is_archived
  if ('notes' in patch) rowPatch.notes = patch.notes
  if ('total' in patch) rowPatch.total = patch.total
  if ('subtotal' in patch) rowPatch.subtotal = patch.subtotal
  if ('delivery_fee' in patch) rowPatch.delivery_fee = patch.delivery_fee
  if ('deliveryFee' in patch) rowPatch.delivery_fee = patch.deliveryFee
  // keep status and booleans consistent when only booleans are patched
  if (rowPatch.is_canceled && !rowPatch.status) rowPatch.status = 'CANCELED'
  if (rowPatch.is_delivered && !rowPatch.status && !rowPatch.is_canceled) rowPatch.status = 'DELIVERED'
  if ('payment_status' in rowPatch && rowPatch.payment_status === 'PAID') rowPatch.is_paid = true
  if ('payment_status' in rowPatch && rowPatch.payment_status === 'UNPAID') rowPatch.is_paid = false
  const res = await sb.from('orders').update(rowPatch).eq('order_id', orderId).select('*, order_items(*, products(*))').single()
  const full = handleErr(res, 'updateOrder')
  return orderFromRow(full, full.order_items || [])
}

export async function cancelOrder(orderId) {
  return updateOrder(orderId, { status: 'CANCELED' })
}

export async function updateOrderStatus(orderId, status) {
  return updateOrder(orderId, { status })
}

export async function updatePaymentStatus(orderId, payment_status) {
  return updateOrder(orderId, { payment_status })
}

export async function deleteOrder(orderId) {
  const sb = requireClient()
  const res = await sb.from('orders').delete().eq('order_id', orderId)
  if (res.error) throw res.error
}

// ---------- MESSAGES (customer inbox) ----------

export function messageFromRow(r) {
  return {
    id: r.id,
    customerName: r.customer_name,
    customer_name: r.customer_name,
    phone: r.customer_phone,
    customerPhone: r.customer_phone,
    address: r.customer_address,
    orderId: r.order_id,
    order_id: r.order_id,
    message: r.message,
    reply: r.reply || '',
    isRead: !!r.is_read,
    is_read: !!r.is_read,
    isReplied: !!r.is_replied,
    is_replied: !!r.is_replied,
    isBlocked: !!r.is_blocked,
    is_blocked: !!r.is_blocked,
    isDeleted: !!r.is_deleted,
    is_deleted: !!r.is_deleted,
    isArchived: !!r.is_archived,
    is_archived: !!r.is_archived,
    createdAt: r.created_at,
    created_at: r.created_at,
    updatedAt: r.updated_at,
    repliedAt: r.replied_at,
    blockedAt: r.blocked_at,
  }
}
export function messageToRow(m) {
  return {
    id: m.id,
    customer_name: m.customerName || m.customer_name,
    customer_phone: m.phone || m.customerPhone || m.customer_phone || '',
    customer_address: m.address || m.customer_address || '',
    order_id: m.orderId || m.order_id || null,
    message: m.message,
    reply: m.reply || '',
    is_read: !!m.isRead || !!m.is_read,
    is_replied: !!m.isReplied || !!m.is_replied || (m.reply && String(m.reply).trim().length > 0),
    is_blocked: !!m.isBlocked || !!m.is_blocked,
    is_deleted: !!m.isDeleted || !!m.is_deleted,
    is_archived: !!m.isArchived || !!m.is_archived,
  }
}

export async function fetchMessages({ includeDeleted = false, includeBlocked = true } = {}) {
  const sb = requireClient()
  let q = sb.from('messages').select('*').order('created_at', { ascending: false }).limit(300)
  if (!includeDeleted) q = q.eq('is_deleted', false)
  if (!includeBlocked) q = q.eq('is_blocked', false)
  const res = await q
  return handleErr(res, 'fetchMessages').map(messageFromRow)
}
export async function fetchMessageById(id) {
  const sb = requireClient()
  const res = await sb.from('messages').select('*').eq('id', id).single()
  return messageFromRow(handleErr(res, 'fetchMessageById'))
}
export async function createMessage(payload) {
  const sb = requireClient()
  const row = {
    customer_name: payload.customerName || payload.customer_name,
    customer_phone: payload.phone || payload.customerPhone || '',
    customer_address: payload.address || payload.customer_address || '',
    order_id: payload.orderId || payload.order_id || null,
    message: payload.message,
  }
  const res = await sb.from('messages').insert(row).select().single()
  return messageFromRow(handleErr(res, 'createMessage'))
}
export async function replyToMessage(id, replyText) {
  const sb = requireClient()
  const res = await sb.from('messages').update({ reply: replyText, is_read: true }).eq('id', id).select().single()
  return messageFromRow(handleErr(res, 'replyToMessage'))
}
export async function markMessageRead(id, isRead = true) {
  const sb = requireClient()
  const res = await sb.from('messages').update({ is_read: isRead }).eq('id', id).select().single()
  return messageFromRow(handleErr(res, 'markMessageRead'))
}
export async function blockMessage(id, blocked = true) {
  const sb = requireClient()
  const res = await sb.from('messages').update({ is_blocked: blocked }).eq('id', id).select().single()
  return messageFromRow(handleErr(res, 'blockMessage'))
}
export async function deleteMessage(id, hard = false) {
  const sb = requireClient()
  if (hard) {
    const res = await sb.from('messages').delete().eq('id', id)
    if (res.error) throw res.error
    return true
  }
  const res = await sb.from('messages').update({ is_deleted: true }).eq('id', id).select().single()
  return messageFromRow(handleErr(res, 'deleteMessage'))
}
export async function restoreMessage(id) {
  const sb = requireClient()
  const res = await sb.from('messages').update({ is_deleted: false }).eq('id', id).select().single()
  return messageFromRow(handleErr(res, 'restoreMessage'))
}

// ---------- CUSTOMERS (directory + pinned GPS) ----------

export function customerFromRow(r) {
  if (!r) return null
  const lat = r.latitude ?? r.lat ?? null
  const lng = r.longitude ?? r.lng ?? null
  return {
    id: r.id,
    name: r.name,
    phone: r.phone || '',
    barangay: r.barangay || '',
    address: r.address || '',
    notes: r.notes || '',
    latitude: lat != null && lat !== '' ? Number(lat) : null,
    longitude: lng != null && lng !== '' ? Number(lng) : null,
    lat: lat != null && lat !== '' ? Number(lat) : null,
    lng: lng != null && lng !== '' ? Number(lng) : null,
    is_active: r.is_active ?? true,
    is_archived: r.is_archived ?? false,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }
}
export function customerToRow(c) {
  const lat = c.latitude ?? c.lat ?? null
  const lng = c.longitude ?? c.lng ?? null
  return {
    ...(c.id ? { id: c.id } : {}),
    name: c.name,
    phone: c.phone || '',
    barangay: c.barangay || '',
    address: c.address || '',
    notes: c.notes || '',
    latitude: lat === '' || lat == null ? null : Number(lat),
    longitude: lng === '' || lng == null ? null : Number(lng),
    is_active: c.is_active ?? true,
    is_archived: c.is_archived ?? false,
  }
}

export async function fetchCustomers({ includeArchived = false } = {}) {
  const sb = requireClient()
  let q = sb.from('customers').select('*').order('name')
  if (!includeArchived) q = q.eq('is_archived', false)
  const res = await q.limit(2000)
  return handleErr(res, 'fetchCustomers').map(customerFromRow)
}
export async function upsertCustomer(customer) {
  const sb = requireClient()
  const row = customerToRow(customer)
  const payload = row.id ? row : Object.fromEntries(Object.entries(row).filter(([k]) => k !== 'id'))
  const res = await sb.from('customers').upsert(payload, { onConflict: 'id' }).select().single()
  return customerFromRow(handleErr(res, 'upsertCustomer'))
}
export async function deleteCustomer(id, hard = false) {
  const sb = requireClient()
  if (hard) {
    const res = await sb.from('customers').delete().eq('id', id)
    if (res.error) throw res.error
    return true
  }
  const res = await sb.from('customers').update({ is_archived: true }).eq('id', id).select().single()
  return customerFromRow(handleErr(res, 'deleteCustomer'))
}

// ---------- realtime helpers ----------

export function subscribeTable(table, callback, filter) {
  const sb = requireClient()
  const channel = sb
    .channel(`${table}-changes`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table, ...(filter ? { filter } : {}) },
      payload => callback(payload),
    )
    .subscribe()
  return () => {
    sb.removeChannel(channel)
  }
}
