import { useState, useMemo, useEffect, useRef } from 'react'
import useTheme from './hooks/useTheme'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import CalendarGrid from './components/CalendarGrid'
import EventModal from './components/EventModal'
import InventoryView from './components/InventoryView'
import HiramView from './components/HiramView'
import ExpensesView from './components/ExpensesView'
import ReportsView from './components/ReportsView'
import DailyPrintSheet from './components/DailyPrintSheet'
import { initialEvents, inventoryItems as initialInventory, hiramRecords as initialHiram, expensesList as initialExpenses } from './data/mockData'
import { defaultSampleOrders, ORDER_STORE_SPEC, sampleProducts, recomputeOrderTotals, getOrderStatus, resolveStatusForOrder, autoMoveNotice, normalizeStatusId } from './data/ordersData'
import DashboardView from './components/DashboardView'
import OrdersView from './components/OrdersView'
import MessagesView from './components/MessagesView'
import ProductsView from './components/ProductsView'
import { addMonths, subMonths, formatMonthYear, formatISO, parseDate, getEventsForDate, peso } from './utils/dateUtils'
import { isSupabaseConfigured, getSupabaseConfig } from './lib/supabaseClient'
import * as DB from './lib/db'
import { playNewOrderSound, primeSoundOnGesture, isSoundEnabled, toggleSoundEnabled } from './utils/sound'

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [events, setEvents] = useState(initialEvents)
  const [inventory, setInventory] = useState(initialInventory)
  const [hiramRecords, setHiramRecords] = useState(initialHiram)
  const [expenses, setExpenses] = useState(initialExpenses)
  const [products, setProducts] = useState(sampleProducts)
  const [messages, setMessages] = useState([])
  const [modalDate, setModalDate] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [filters, setFilters] = useState({ sale: true, delivery: true, expense: true, hiram: true, maintenance: true })
  const [toast, setToast] = useState(null)
  const [printDate, setPrintDate] = useState(null)
  const [dbStatus, setDbStatus] = useState(() => {
    const cfg = getSupabaseConfig()
    if (!cfg.configured) return { mode: 'offline', label: 'Offline — local storage', color: '#64748b' }
    return { mode: 'connecting', label: 'Connecting to Supabase…', color: '#d97706' }
  })
  const [syncing, setSyncing] = useState(false)
  const hasSynced = useRef(false)

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('sidebarCollapsed')
      if (stored !== null) return stored === 'true'
    } catch {}
    try { return window.innerWidth <= 980 } catch { return false }
  })
  const [orders, setOrders] = useState(() => {
    try {
      const raw = localStorage.getItem(ORDER_STORE_SPEC.key)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed) && parsed.length) return parsed
      }
    } catch {}
    return defaultSampleOrders
  })
  // sound for PENDING new orders — live realtime
  const recentOrderIds = useRef(new Set())
  const ordersRef = useRef(orders)
  const chimedPendingRef = useRef(new Set())
  const prevPendingIdsRef = useRef(new Set())
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled())
  useEffect(() => { ordersRef.current = orders }, [orders])
  const maybeChimeForPending = (ids) => {
    const fresh = (ids || []).filter(id => !chimedPendingRef.current.has(id))
    ids.forEach(id => chimedPendingRef.current.add(id))
    const toPlay = fresh.filter(id => !recentOrderIds.current.has(id))
    if (toPlay.length) { try { playNewOrderSound() } catch {} return true }
    return false
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2400)
  }
  useEffect(() => { primeSoundOnGesture() }, [])

  // ---- Supabase initial load + realtime ----
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      const offline = { mode: 'offline', label: 'Offline — saved on this device', color: '#64748b', detail: 'Set VITE_SUPABASE_URL / ANON_KEY in .env to sync' }
      setDbStatus(offline)
      console.log('[Supabase]', offline.label, offline.detail, 'Pooler ap-northeast-1:6543 • RLS open (anon) — offline')
      return
    }
    let cancelled = false
    setSyncing(true)
    const cfg = getSupabaseConfig()
    console.log('[Supabase] Connecting — pooler', 'ap-northeast-1:6543', cfg.url, 'RLS open (anon)')
    // Parallel fetches; each falls back silently
    Promise.allSettled([
      DB.fetchProducts().catch(() => null),
      DB.fetchInventory().catch(() => null),
      DB.fetchEvents().catch(() => null),
      DB.fetchHiram().catch(() => null),
      DB.fetchExpenses().catch(() => null),
      DB.fetchOrders().catch(() => null),
      DB.fetchMessages().catch(() => null),
    ]).then(results => {
      if (cancelled) return
      const [prodR, invR, evR, hiramR, expR, ordR, msgR] = results
      let ok = 0, fail = 0
      if (prodR.status === 'fulfilled' && Array.isArray(prodR.value) && prodR.value.length) { setProducts(prodR.value); ok++ } else fail++
      if (invR.status === 'fulfilled' && Array.isArray(invR.value) && invR.value.length) { setInventory(invR.value); ok++ } else fail++
      if (evR.status === 'fulfilled' && Array.isArray(evR.value) && evR.value.length) { setEvents(evR.value); ok++ } else fail++
      if (hiramR.status === 'fulfilled' && Array.isArray(hiramR.value) && hiramR.value.length) { setHiramRecords(hiramR.value); ok++ } else fail++
      if (expR.status === 'fulfilled' && Array.isArray(expR.value) && expR.value.length) { setExpenses(expR.value); ok++ } else fail++
      if (ordR.status === 'fulfilled' && Array.isArray(ordR.value) && ordR.value.length) {
        setOrders(ordR.value)
        try { localStorage.setItem(ORDER_STORE_SPEC.key, JSON.stringify(ordR.value)) } catch {}
        ok++
      } else fail++
      if (msgR.status === 'fulfilled' && Array.isArray(msgR.value)) { setMessages(msgR.value); ok++ } else fail++

      hasSynced.current = true
      let nextStatus
      if (ok > 0 && fail === 0) {
        nextStatus = { mode: 'online', label: 'Connected — Supabase (pooler)', color: '#059669', detail: `ap-northeast-1 • ${cfg.url}` }
        showToast(`Connected to Supabase — ${ok} tables synced`)
      } else if (ok > 0) {
        nextStatus = { mode: 'partial', label: `Supabase — ${ok} tables synced, ${fail} offline`, color: '#d97706', detail: 'Some tables still use local data. Run schema.sql if missing.' }
      } else {
        nextStatus = { mode: 'online-empty', label: 'Supabase connected — empty DB, using local seed', color: '#1a7bb8', detail: 'Run supabase/seed.sql to populate initial data' }
      }
      setDbStatus(nextStatus)
      console.log('[Supabase]', nextStatus.label, nextStatus.detail, '| Pooler ap-northeast-1:6543 • RLS open (anon) •', ok, 'ok', fail, 'fail', cfg.url)
    }).finally(() => { if (!cancelled) setSyncing(false) })

    // realtime (best-effort)
    const unsubs = []
    try {
      unsubs.push(DB.subscribeTable('events', payload => {
        if (payload.eventType === 'INSERT') setEvents(prev => [...prev.filter(e => e.id !== payload.new.id), DB.eventFromRow(payload.new)])
        if (payload.eventType === 'UPDATE') setEvents(prev => prev.map(e => e.id === payload.new.id ? DB.eventFromRow(payload.new) : e))
        if (payload.eventType === 'DELETE') setEvents(prev => prev.filter(e => e.id !== payload.old.id))
      }))
      unsubs.push(DB.subscribeTable('inventory_items', payload => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') setInventory(prev => {
          const row = DB.inventoryFromRow(payload.new)
          const idx = prev.findIndex(p => p.id === row.id)
          if (idx >= 0) return prev.map((p,i)=> i===idx? row: p)
          return [...prev, row]
        })
        if (payload.eventType === 'DELETE') setInventory(prev => prev.filter(p => p.id !== payload.old.id))
      }))
      unsubs.push(DB.subscribeTable('orders', payload => {
        const isPendingInsert = payload?.eventType === 'INSERT' && String(payload.new?.status).toUpperCase() === 'PENDING'
        const isPendingUpdate = payload?.eventType === 'UPDATE' && String(payload.new?.status).toUpperCase() === 'PENDING' && String(payload.old?.status).toUpperCase() !== 'PENDING'
        if ((isPendingInsert || isPendingUpdate) && hasSynced.current) {
          const nid = payload.new?.order_id
          if (nid && maybeChimeForPending([nid])) showToast(`🔔 New order ${nid} — ${payload.new?.customer_name || ''} • PENDING`)
        }
        DB.fetchOrders().then(rows => {
          if (rows?.length) {
            if (hasSynced.current) {
              const prevIds = new Set((ordersRef.current || []).map(o => o.orderId))
              const newOnes = rows.filter(r => !prevIds.has(r.orderId))
              const newPending = newOnes.filter(o => getOrderStatus(o).id === 'PENDING').map(o=>o.orderId)
              if (newPending.length && maybeChimeForPending(newPending)) {
                newPending.forEach(id => { const o = rows.find(r=>r.orderId===id); showToast(`🔔 New order ${id} — ${o?.customerName || ''} • PENDING`) })
              }
            }
            setOrders(rows)
            try { localStorage.setItem(ORDER_STORE_SPEC.key, JSON.stringify(rows)) } catch {}
          }
        }).catch(()=>{})
      }))
      unsubs.push(DB.subscribeTable('messages', payload => {
        if (payload.eventType === 'INSERT') setMessages(prev => [DB.messageFromRow(payload.new), ...prev.filter(m => String(m.id) !== String(payload.new.id))])
        if (payload.eventType === 'UPDATE') setMessages(prev => prev.map(m => String(m.id) === String(payload.new.id) ? DB.messageFromRow(payload.new) : m))
        if (payload.eventType === 'DELETE') setMessages(prev => prev.filter(m => String(m.id) !== String(payload.old.id)))
      }))
      unsubs.push(DB.subscribeTable('expenses', payload => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') setExpenses(prev => {
          const row = payload.new
          const idx = prev.findIndex(e => String(e.id) === String(row.id))
          const mapped = { id: row.id, date: row.date, category: row.category, desc: row.description, description: row.description, amount: row.amount, is_paid: row.is_paid, is_recurring: row.is_recurring, is_archived: row.is_archived }
          if (idx >= 0) return prev.map((e, i) => i === idx ? mapped : e)
          return [...prev, mapped]
        })
        if (payload.eventType === 'DELETE') setExpenses(prev => prev.filter(e => String(e.id) !== String(payload.old.id)))
      }))
      unsubs.push(DB.subscribeTable('products', () => {
        DB.fetchProducts().then(rows => { if (rows?.length) setProducts(rows) }).catch(()=>{})
      }))
      unsubs.push(DB.subscribeTable('hiram_records', () => {
        DB.fetchHiram().then(rows => { if (rows?.length) setHiramRecords(rows) }).catch(()=>{})
      }))
    } catch {}
    return () => { cancelled = true; unsubs.forEach(fn => { try{ fn() }catch{} }) }
  }, [])

  // ---- Auto-update: polling + focus refresh (online) / cross-tab sync (offline) ----
  // Keeps badges and all views live without manual refresh. Silent — no toasts.
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      // Offline: another tab on this device may change orders — pick it up live
      const onStorage = (e) => {
        if (e.key === ORDER_STORE_SPEC.key && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue)
            if (Array.isArray(parsed) && parsed.length) setOrders(parsed)
          } catch {}
        }
      }
      window.addEventListener('storage', onStorage)
      return () => window.removeEventListener('storage', onStorage)
    }
    let stopped = false
    let fetching = false
    let lastFocusFetch = 0
    const refreshAll = async () => {
      if (stopped || fetching) return
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return
      fetching = true
      try {
        const results = await Promise.allSettled([
          DB.fetchProducts().catch(() => null),
          DB.fetchInventory().catch(() => null),
          DB.fetchEvents().catch(() => null),
          DB.fetchHiram().catch(() => null),
          DB.fetchExpenses().catch(() => null),
          DB.fetchOrders().catch(() => null),
          DB.fetchMessages().catch(() => null),
        ])
        if (stopped) return
        const [prodR, invR, evR, hiramR, expR, ordR, msgR] = results
        if (prodR.status === 'fulfilled' && Array.isArray(prodR.value) && prodR.value.length) setProducts(prodR.value)
        if (invR.status === 'fulfilled' && Array.isArray(invR.value) && invR.value.length) setInventory(invR.value)
        if (evR.status === 'fulfilled' && Array.isArray(evR.value) && evR.value.length) setEvents(evR.value)
        if (hiramR.status === 'fulfilled' && Array.isArray(hiramR.value) && hiramR.value.length) setHiramRecords(hiramR.value)
        if (expR.status === 'fulfilled' && Array.isArray(expR.value) && expR.value.length) setExpenses(expR.value)
        if (ordR.status === 'fulfilled' && Array.isArray(ordR.value) && ordR.value.length) {
          setOrders(ordR.value)
          try { localStorage.setItem(ORDER_STORE_SPEC.key, JSON.stringify(ordR.value)) } catch {}
        }
        if (msgR.status === 'fulfilled' && Array.isArray(msgR.value)) setMessages(msgR.value)
      } catch {} finally { fetching = false }
    }
    const timer = setInterval(refreshAll, 45000)
    const onFocus = () => {
      const now = Date.now()
      if (now - lastFocusFetch < 5000) return
      lastFocusFetch = now
      refreshAll()
    }
    window.addEventListener('focus', onFocus)
    return () => { stopped = true; clearInterval(timer); window.removeEventListener('focus', onFocus) }
  }, [])

  // console-only status (UI banner removed per user request)
  useEffect(() => {
    console.log('[Supabase status]', dbStatus.label, dbStatus.detail || '', '| Pooler ap-northeast-1:6543 • RLS open (anon)', isSupabaseConfigured() ? getSupabaseConfig().url : 'offline')
  }, [dbStatus])
  useEffect(() => {
    if (syncing) console.log('[Supabase] Syncing…')
  }, [syncing])
  // watch PENDING count as extra safety (if realtime missed)
  useEffect(() => {
    const curIds = new Set(orders.filter(o => getOrderStatus(o).id === 'PENDING').map(o => o.orderId))
    if (!hasSynced.current) { prevPendingIdsRef.current = curIds; curIds.forEach(id=>chimedPendingRef.current.add(id)); return }
    const newPending = [...curIds].filter(id => !prevPendingIdsRef.current.has(id))
    if (newPending.length && maybeChimeForPending(newPending)) showToast(`🔔 ${newPending.length} new pending — ${newPending.join(', ')}`)
    prevPendingIdsRef.current = curIds
  }, [orders])

  // ---- Notification bubbles: counts of items needing attention per tab ----
  // Only rendered when count > 0 (Sidebar hides zero badges)
  const navBadges = useMemo(() => ({
    orders: orders.filter(o => getOrderStatus(o).id === 'PENDING').length,
    messages: messages.filter(m => !m.is_read && !m.is_deleted && !m.is_blocked).length,
    inventory: inventory.filter(it => (it.stockFilled ?? it.stock_filled ?? 0) <= (it.threshold ?? 0) && !(it.is_archived ?? it.isArchived)).length,
    borrowed: orders.filter(o => (o.borrowedCount ?? o.borrowed_count ?? 0) > 0).length,
    expenses: expenses.filter(e => e.is_paid === false && !e.is_archived).length,
  }), [orders, messages, inventory, expenses])

  const monthEvents = useMemo(() => events.filter(e => e.date.startsWith(formatISO(currentDate).slice(0,7))), [events, currentDate])
  const selectedISO = formatISO(selectedDate)
  const dayEvents = getEventsForDate(events, selectedISO).filter(e => filters[e.type])

  const handleSave = async (payload, isEdit) => {
    // ensure booleans present (is_paid false for hiram/maintenance, etc.)
    const enriched = {
      ...payload,
      is_paid: payload.is_paid ?? (payload.type === 'sale' || payload.type === 'delivery'),
      is_archived: payload.is_archived ?? false,
      is_recurring: payload.is_recurring ?? payload.type === 'maintenance',
    }
    if (isEdit) setEvents(prev => prev.map(p => p.id === enriched.id ? enriched : p))
    else setEvents(prev => [...prev, enriched])
    setModalDate(null); setEditingEvent(null)
    if (isSupabaseConfigured()) {
      setSyncing(true)
      try { await DB.upsertEvent(enriched); showToast(isEdit ? 'Updated • Synced to Supabase' : 'Added • Synced to Supabase') }
      catch (e) { console.warn('[events] sync failed', e); showToast(isEdit ? 'Updated • Saved locally (sync failed)' : 'Added • Saved locally (sync failed)') }
      finally { setSyncing(false) }
    } else {
      showToast(isEdit ? 'Updated successfully • Saved locally' : 'Added to calendar • Saved locally')
    }
  }
  const handleDelete = async (id) => {
    setEvents(prev => prev.filter(p => p.id !== id))
    setModalDate(null); setEditingEvent(null)
    if (isSupabaseConfigured()) {
      try { await DB.deleteEvent(id); showToast('Deleted • Synced to Supabase') }
      catch (e) { console.warn('[events] delete failed', e); showToast('Deleted • Saved locally') }
    } else {
      showToast('Deleted • Saved locally')
    }
  }

  const toggleFilter = (key) => setFilters(s => ({ ...s, [key]: !s[key] }))

  const stats = useMemo(() => {
    const totalFilled = inventory.reduce((s, it) => s + it.stockFilled, 0)
    const totalEmpty = inventory.reduce((s, it) => s + it.stockEmpty, 0)
    const lows = inventory.filter(it => it.stockFilled <= it.threshold).length
    const hiramOutstanding = orders.filter(o => (o.borrowedCount ?? o.borrowed_count ?? 0) > 0).reduce((s, o) => s + (o.borrowedCount ?? o.borrowed_count ?? 0), 0)
    return {
      filled: totalFilled,
      empty: totalEmpty,
      hiram: hiramOutstanding,
      lows,
      todaySales: peso(dayEvents.filter(e=>e.type==='sale'||e.type==='delivery').reduce((s,e)=>s+e.amount,0)),
      monthSales: peso(monthEvents.filter(e=>e.type==='sale'||e.type==='delivery').reduce((s,e)=>s+e.amount,0)),
    }
  }, [inventory, dayEvents, monthEvents, orders])

  const handlePrint = () => {
    setPrintDate(new Date(selectedDate))
  }

  const handleInventoryUpdate = async (updater) => {
    const prev = inventory
    const next = typeof updater === 'function' ? updater(prev) : updater
    setInventory(next)
    if (isSupabaseConfigured()) {
      // find diff: items that changed or were added
      const changed = next.filter(n => {
        const old = prev.find(p => p.id === n.id)
        return !old || JSON.stringify(old) !== JSON.stringify(n)
      })
      if (changed.length) {
        setSyncing(true)
        try {
          await DB.upsertInventory(changed)
          showToast(`Inventory updated • Synced ${changed.length} item(s) to Supabase`)
        } catch (e) { console.warn('[inventory] sync failed', e); showToast('Inventory updated • Saved locally (sync failed)') }
        finally { setSyncing(false) }
      } else showToast('Inventory updated • Saved locally')
    } else {
      showToast('Inventory updated • Saved locally')
    }
  }

  // save orders on this device (+ Supabase when configured)
  const handleOrdersUpdate = async (updater) => {
    // capture next synchronously
    let nextOrders = orders
    setOrders(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      nextOrders = next
      try { localStorage.setItem(ORDER_STORE_SPEC.key, JSON.stringify(next)) } catch {}
      return next
    })
    // if Supabase configured, diff and sync
    if (isSupabaseConfigured()) {
      // Detect cancels / new orders by comparing ids
      // For simplicity, handle cancel via DB.cancelOrder, new via DB.createOrder
      // The caller (OrdersView) already mutates locally; we try to sync the diff after a tick
      setTimeout(async () => {
        try {
          // Find orders that are new (not in previous fetch) or canceled
          // Use DB.fetchOrders to get remote, then reconcile
          const remote = await DB.fetchOrders().catch(()=> null)
          if (!remote) return
          // Find local orders not in remote -> create
          const remoteIds = new Set(remote.map(r => r.orderId))
          const toCreate = nextOrders.filter(o => !remoteIds.has(o.orderId))
          for (const o of toCreate) {
            try { await DB.createOrder(o) } catch (e) { console.warn('[orders] create failed', o.orderId, e?.message) }
          }
          // Find canceled diff
          const toCancel = nextOrders.filter(o => o.isCanceled || o.is_canceled)
          for (const o of toCancel) {
            const rem = remote.find(r => r.orderId === o.orderId)
            if (rem && !rem.isCanceled && !rem.is_canceled) {
              try { await DB.cancelOrder(o.orderId) } catch (e) { console.warn('[orders] cancel failed', e?.message) }
            }
          }
        } catch (e) { console.warn('[orders] sync diff failed', e) }
      }, 300)
    }
  }

  // dedicated handler used by OrdersView when user clicks Cancel (immediate DB write — status driven)
  const handleOrderCancel = async (orderId) => {
    setOrders(prev => {
      const next = prev.map(o => o.orderId === orderId ? { ...o, status: 'CANCELED', isCanceled: true, is_canceled: true } : o)
      try { localStorage.setItem(ORDER_STORE_SPEC.key, JSON.stringify(next)) } catch {}
      return next
    })
    if (isSupabaseConfigured()) {
      setSyncing(true)
      try { await DB.cancelOrder(orderId); showToast(`Order ${orderId} canceled • Synced`) }
      catch (e) { console.warn('[orders] cancelOrder failed', e); showToast(`Order ${orderId} canceled • Saved locally`) }
      finally { setSyncing(false) }
    } else showToast(`Order ${orderId} canceled`)
  }

  const handleOrderStatusUpdate = async (orderId, newStatus) => {
    const order = orders.find(o => o.orderId === orderId)
    let finalStatus = normalizeStatusId(newStatus)
    if (order) {
      const resolved = resolveStatusForOrder(order, newStatus)
      if (resolved !== finalStatus) {
        finalStatus = resolved
        const notice = autoMoveNotice(resolved)
        showToast(notice || `Auto-moved → ${resolved}`)
      } else {
        finalStatus = resolved
      }
    }
    setOrders(prev => {
      const next = prev.map(o => o.orderId === orderId ? { ...o, status: finalStatus, isCanceled: finalStatus === 'CANCELED', is_canceled: finalStatus === 'CANCELED', is_delivered: finalStatus === 'DELIVERED' } : o)
      try { localStorage.setItem(ORDER_STORE_SPEC.key, JSON.stringify(next)) } catch {}
      return next
    })
    if (isSupabaseConfigured()) {
      setSyncing(true)
      try { await DB.updateOrderStatus(orderId, finalStatus); showToast(`Order ${orderId} → ${finalStatus} • Synced`) }
      catch (e) { console.warn('[orders] updateOrderStatus failed', e); showToast(`Order ${orderId} → ${finalStatus} • Saved locally`) }
      finally { setSyncing(false) }
    } else showToast(`Order ${orderId} → ${finalStatus}`)
  }

  const handlePaymentStatusUpdate = async (orderId, newPaymentStatus) => {
    const order = orders.find(o => o.orderId === orderId)
    const recalc = order ? recomputeOrderTotals(order, newPaymentStatus) : null
    setOrders(prev => {
      const next = prev.map(o => {
        if (o.orderId !== orderId) return o
        const base = { ...o, payment_status: newPaymentStatus, paymentStatus: newPaymentStatus, is_paid: newPaymentStatus === 'PAID', isPaid: newPaymentStatus === 'PAID' }
        if (recalc) {
          base.subtotal = recalc.subtotal
          base.deliveryFee = recalc.deliveryFee
          base.delivery_fee = recalc.deliveryFee
          base.total = recalc.total
        }
        return base
      })
      try { localStorage.setItem(ORDER_STORE_SPEC.key, JSON.stringify(next)) } catch {}
      return next
    })
    if (isSupabaseConfigured()) {
      setSyncing(true)
      try {
        if (recalc) {
          await DB.updateOrder(orderId, { payment_status: newPaymentStatus, subtotal: recalc.subtotal, delivery_fee: recalc.deliveryFee, total: recalc.total })
        } else {
          await DB.updatePaymentStatus(orderId, newPaymentStatus)
        }
        showToast(`Order ${orderId} payment → ${newPaymentStatus} • Synced${recalc ? ` • ${recalc.total}` : ''}`)
      }
      catch (e) { console.warn('[orders] updatePaymentStatus failed', e); showToast(`Order ${orderId} payment → ${newPaymentStatus} • Saved locally`) }
      finally { setSyncing(false) }
    } else showToast(`Order ${orderId} payment → ${newPaymentStatus}${recalc ? ` • ${recalc.total}` : ''}`)
  }

  const handleOrderCreate = async (newOrder) => {
    let id = newOrder.orderId
    while (orders.some(o => o.orderId === id)) id = `WFR-${Math.floor(1000 + Math.random() * 9000)}`
    const order = { ...newOrder, orderId: id, status: newOrder.status || 'PENDING', payment_status: newOrder.payment_status || 'UNPAID' }
    if (String(order.status).toUpperCase() === 'PENDING') {
      recentOrderIds.current.add(id); chimedPendingRef.current.add(id)
      setTimeout(()=>recentOrderIds.current.delete(id),15000)
      try { playNewOrderSound() } catch {}
    }
    setOrders(prev => {
      const next = [order, ...prev]
      try { localStorage.setItem(ORDER_STORE_SPEC.key, JSON.stringify(next)) } catch {}
      return next
    })
    showToast(`Order ${id} placed — total ${peso(order.total)}`)
    if (isSupabaseConfigured()) {
      setSyncing(true)
      try { await DB.createOrder(order); showToast(`Order ${id} • Synced to Supabase`) }
      catch (e) { console.warn('[orders] createOrder failed', e); showToast(`Order ${id} • Saved locally (sync failed: ${e?.message || e})`) }
      finally { setSyncing(false) }
    }
    return order
  }

  const handleExpenseSave = async (payload, isEdit) => {
    if (isEdit) setExpenses(prev => prev.map(e => String(e.id) === String(payload.id) ? { ...e, ...payload } : e))
    else setExpenses(prev => [...prev, { ...payload, id: payload.id ?? Date.now() }])
    if (isSupabaseConfigured()) {
      setSyncing(true)
      try { await DB.upsertExpense(payload); showToast(isEdit ? 'Expense updated • Synced' : 'Expense added • Synced') }
      catch (e) { console.warn('[expenses] sync failed', e); showToast(isEdit ? 'Updated locally (sync failed)' : 'Added locally (sync failed)') }
      finally { setSyncing(false) }
    } else showToast(isEdit ? 'Expense updated locally' : 'Expense added locally')
  }
  const handleExpenseDelete = async (id) => {
    setExpenses(prev => prev.filter(e => String(e.id) !== String(id)))
    if (isSupabaseConfigured()) {
      setSyncing(true)
      try { await DB.deleteExpense(id); showToast('Expense deleted • Synced') }
      catch (e) { console.warn('[expenses] delete failed', e); showToast('Deleted locally (sync failed)') }
      finally { setSyncing(false) }
    } else showToast('Expense deleted locally')
  }

  const handleMessageReply = async (id, reply) => {
    setMessages(prev => prev.map(m => String(m.id) === String(id) ? { ...m, reply, is_replied: true, isReplied: true, is_read: true, isRead: true } : m))
    if (isSupabaseConfigured()) {
      setSyncing(true)
      try { const updated = await DB.replyToMessage(id, reply); setMessages(prev => prev.map(m => String(m.id) === String(updated.id) ? updated : m)); showToast('Reply sent • Synced to Supabase') }
      catch (e) { console.warn('[messages] reply failed', e); showToast('Reply failed • Saved locally') }
      finally { setSyncing(false) }
    } else showToast('Reply saved locally')
  }
  const handleMessageBlock = async (id, blocked) => {
    setMessages(prev => prev.map(m => String(m.id) === String(id) ? { ...m, is_blocked: blocked, isBlocked: blocked } : m))
    if (isSupabaseConfigured()) {
      setSyncing(true)
      try { const updated = await DB.blockMessage(id, blocked); setMessages(prev => prev.map(m => String(m.id) === String(updated.id) ? updated : m)); showToast(blocked ? 'Customer blocked • Synced' : 'Customer unblocked • Synced') }
      catch (e) { console.warn('[messages] block failed', e); showToast('Block failed • Saved locally') }
      finally { setSyncing(false) }
    } else showToast(blocked ? 'Blocked locally' : 'Unblocked locally')
  }
  const handleMessageDelete = async (id, hard = false) => {
    if (!hard) setMessages(prev => prev.map(m => String(m.id) === String(id) ? { ...m, is_deleted: true, isDeleted: true } : m))
    else setMessages(prev => prev.filter(m => String(m.id) !== String(id)))
    if (isSupabaseConfigured()) {
      setSyncing(true)
      try { 
        if (hard) await DB.deleteMessage(id, true)
        else await DB.deleteMessage(id, false)
        if (hard) showToast('Message deleted forever • Synced')
        else showToast('Message deleted • Synced')
      }
      catch (e) { console.warn('[messages] delete failed', e); showToast('Delete failed') }
      finally { setSyncing(false) }
    } else showToast(hard ? 'Deleted forever locally' : 'Deleted locally')
  }
  const handleMessageRestore = async (id) => {
    setMessages(prev => prev.map(m => String(m.id) === String(id) ? { ...m, is_deleted: false, isDeleted: false } : m))
    if (isSupabaseConfigured()) {
      setSyncing(true)
      try { const updated = await DB.restoreMessage(id); setMessages(prev => prev.map(m => String(m.id) === String(updated.id) ? updated : m)); showToast('Message restored • Synced') }
      catch (e) { console.warn('[messages] restore failed', e) }
      finally { setSyncing(false) }
    } else showToast('Restored locally')
  }
  const handleMessageRead = async (id, isRead) => {
    setMessages(prev => prev.map(m => String(m.id) === String(id) ? { ...m, is_read: isRead, isRead: isRead } : m))
    if (isSupabaseConfigured()) {
      try { await DB.markMessageRead(id, isRead) } catch {}
    }
  }
  const handleToggleSound = () => {
    const next = toggleSoundEnabled()
    setSoundOn(next)
    showToast(next ? '🔔 Sound ON' : '🔕 Sound OFF')
    if (next) try { playNewOrderSound() } catch {}
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(v => {
      const next = !v
      try { localStorage.setItem('sidebarCollapsed', String(next)) } catch {}
      return next
    })
  }

  const handleNavChange = (id) => {
    setActiveTab(id)
    if (window.innerWidth <= 980 && !sidebarCollapsed) {
      setSidebarCollapsed(true)
      try { localStorage.setItem('sidebarCollapsed', 'true') } catch {}
    }
  }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && !sidebarCollapsed && window.innerWidth <= 980) {
        setSidebarCollapsed(true)
        try { localStorage.setItem('sidebarCollapsed', 'true') } catch {}
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sidebarCollapsed])

  useEffect(() => {
    if (!sidebarCollapsed && window.innerWidth <= 980) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [sidebarCollapsed])

  return (
    <>
      <Header onPrint={handlePrint} printDateLabel={selectedDate.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })} theme={theme} onToggleTheme={toggleTheme} events={events} inventory={inventory} dbStatus={dbStatus} syncing={syncing} soundOn={soundOn} onToggleSound={handleToggleSound} />

      <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar active={activeTab} onChange={handleNavChange} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} badges={navBadges} />

        <main className="main-card">
          {activeTab === 'dashboard' && (
            <DashboardView
              events={events}
              inventory={inventory}
              currentDate={currentDate}
              onAddEntry={() => { setEditingEvent(null); setModalDate(selectedDate) }}
            />
          )}

          {activeTab === 'calendar' && (
            <>
              <div className="calendar-toolbar">
                <div className="cal-left">
                  <button className="btn-cal-nav" onClick={()=>setCurrentDate(d=>subMonths(d,1))}>‹</button>
                  <div className="cal-month">{formatMonthYear(currentDate)}</div>
                  <button className="btn-cal-nav" onClick={()=>setCurrentDate(d=>addMonths(d,1))}>›</button>
                  <button className="btn-today" onClick={()=>{const t=new Date(); setCurrentDate(t); setSelectedDate(t)}}>Today</button>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <div className="cal-filters">
                    {[
                      {k:'sale', l:'Sale'}, {k:'delivery', l:'Delivery'}, {k:'expense', l:'Expense'}, {k:'hiram', l:'Hiram'}, {k:'maintenance', l:'Maint.'}
                    ].map(f=> (
                      <button key={f.k} data-type={f.k} className={`filter-pill ${filters[f.k]?'active':''}`} onClick={()=>toggleFilter(f.k)}>
                        <span className="dot"></span> {f.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <CalendarGrid
                currentDate={currentDate}
                events={events}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onAddClick={() => {}}
                onEventClick={() => {}}
                filters={filters}
              />
            </>
          )}

          {activeTab==='orders' && <OrdersView orders={orders} onUpdateOrders={handleOrdersUpdate} onCancelOrder={handleOrderCancel} onCreateOrder={handleOrderCreate} onUpdateStatus={handleOrderStatusUpdate} onUpdatePaymentStatus={handlePaymentStatusUpdate} showToast={showToast} dbStatus={dbStatus} />}
          {activeTab==='messages' && <MessagesView messages={messages} onReply={handleMessageReply} onBlock={handleMessageBlock} onDelete={handleMessageDelete} onRestore={handleMessageRestore} onMarkRead={handleMessageRead} onHardDelete={(id)=>handleMessageDelete(id,true)} showToast={showToast} />}
          {activeTab==='products' && <ProductsView products={products} />}
          {activeTab==='inventory' && <InventoryView inventory={inventory} onUpdate={handleInventoryUpdate} dbStatus={dbStatus} />}
          {activeTab==='borrowed' && <HiramView orders={orders} />}
          {activeTab==='expenses' && <ExpensesView expenses={expenses} onUpdateExpenses={setExpenses} onSaveExpense={handleExpenseSave} onDeleteExpense={handleExpenseDelete} />}
          {activeTab==='reports' && <ReportsView events={events} inventory={inventory} />}
        </main>
      </div>

      {modalDate && (
        <EventModal
          date={modalDate}
          eventToEdit={editingEvent}
          onClose={()=>{ setModalDate(null); setEditingEvent(null)}}
          onSave={handleSave}
          onDelete={handleDelete}
        />
      )}

      {printDate && (
        <DailyPrintSheet date={printDate} events={getEventsForDate(events, formatISO(printDate))} onClose={() => setPrintDate(null)} />
      )}

      <div
        className={`sidebar-backdrop ${!sidebarCollapsed ? 'visible' : ''}`}
        onClick={toggleSidebar}
        aria-hidden="true"
      />

      {sidebarCollapsed && (
        <button
          className="sidebar-reopen-fab visible"
          onClick={toggleSidebar}
          aria-label="Show navigation"
          title="Show navigation"
        >
          ☰
        </button>
      )}

      {toast && <div className="toast">✅ {toast}</div>}

      <footer style={{ textAlign:'center', padding:'18px 20px 28px', fontSize:'12.5px', color:'var(--slate-400)' }}>
        Tubig Irosin • Irosin, Sorsogon • {isSupabaseConfigured() ? 'Synced to Supabase (pooler ap-northeast-1:6543) • Offline fallback active' : 'All data is saved securely on this device • Works offline'} • Project ddzlawodgqziuoanudbb
      </footer>
    </>
  )
}
