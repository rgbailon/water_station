import { useState, useMemo, useEffect } from 'react'
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
import { initialEvents, inventoryItems as initialInventory, hiramRecords } from './data/mockData'
import { defaultSampleOrders, ORDER_STORE_SPEC } from './data/ordersData'
import DashboardView from './components/DashboardView'
import OrdersView from './components/OrdersView'
import ProductsView from './components/ProductsView'
import { addMonths, subMonths, formatMonthYear, formatISO, parseDate, getEventsForDate, peso } from './utils/dateUtils'

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [events, setEvents] = useState(initialEvents)
  const [inventory, setInventory] = useState(initialInventory)
  const [modalDate, setModalDate] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [filters, setFilters] = useState({ sale: true, delivery: true, expense: true, hiram: true, maintenance: true })
  const [toast, setToast] = useState(null)
  const [printDate, setPrintDate] = useState(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem('sidebarCollapsed')
      if (stored !== null) return stored === 'true'
    } catch {}
    // default collapsed on small screens for wider workspace
    try { return window.innerWidth <= 980 } catch { return false }
  })
  const [orders, setOrders] = useState(() => {
    try {
      const raw = localStorage.getItem(ORDER_STORE_SPEC.key)
      if (raw) {
        const parsed = JSON.parse(raw)
        // revive: ensure product object present for old saves that only had productId
        // We stored full expanded items; if product missing, attach from data would be done in view
        if (Array.isArray(parsed) && parsed.length) return parsed
      }
    } catch {}
    return defaultSampleOrders
  })

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  const monthEvents = useMemo(() => events.filter(e => e.date.startsWith(formatISO(currentDate).slice(0,7))), [events, currentDate])
  const selectedISO = formatISO(selectedDate)
  const dayEvents = getEventsForDate(events, selectedISO).filter(e => filters[e.type])

  const handleSave = (payload, isEdit) => {
    if (isEdit) setEvents(prev => prev.map(p => p.id === payload.id ? payload : p))
    else setEvents(prev => [...prev, payload])
    setModalDate(null); setEditingEvent(null)
    showToast(isEdit ? 'Updated successfully • Saved locally' : 'Added to calendar • Saved locally')
  }
  const handleDelete = (id) => {
    setEvents(prev => prev.filter(p => p.id !== id))
    setModalDate(null); setEditingEvent(null)
    showToast('Deleted • Saved locally')
  }

  const toggleFilter = (key) => setFilters(s => ({ ...s, [key]: !s[key] }))

  const stats = useMemo(() => {
    const totalFilled = inventory.reduce((s, it) => s + it.stockFilled, 0)
    const totalEmpty = inventory.reduce((s, it) => s + it.stockEmpty, 0)
    const lows = inventory.filter(it => it.stockFilled <= it.threshold).length
    const hiramOutstanding = hiramRecords.filter(r=>r.status!=='returned').reduce((s,r)=> s + (r.borrowed - r.returned), 0)
    return {
      filled: totalFilled,
      empty: totalEmpty,
      hiram: hiramOutstanding,
      lows,
      todaySales: peso(dayEvents.filter(e=>e.type==='sale'||e.type==='delivery').reduce((s,e)=>s+e.amount,0)),
      monthSales: peso(monthEvents.filter(e=>e.type==='sale'||e.type==='delivery').reduce((s,e)=>s+e.amount,0)),
    }
  }, [inventory, dayEvents, monthEvents])

  const handlePrint = () => {
    // Always print the currently selected calendar date so it matches the accurate date for the day (Asia/Manila)
    setPrintDate(new Date(selectedDate))
  }

  const handleInventoryUpdate = (updater) => {
    setInventory(prev => typeof updater === 'function' ? updater(prev) : updater)
    showToast('Inventory updated • Saved locally')
  }

  // save orders on this device
  const handleOrdersUpdate = (updater) => {
    setOrders(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try { localStorage.setItem(ORDER_STORE_SPEC.key, JSON.stringify(next)) } catch {}
      return next
    })
  }

  const toggleSidebar = () => {
    setSidebarCollapsed(v => {
      const next = !v
      try { localStorage.setItem('sidebarCollapsed', String(next)) } catch {}
      return next
    })
  }

  // close mobile drawer on Escape or when navigating
  const handleNavChange = (id) => {
    setActiveTab(id)
    if (window.innerWidth <= 980 && !sidebarCollapsed) {
      setSidebarCollapsed(true)
      try { localStorage.setItem('sidebarCollapsed', 'true') } catch {}
    }
  }

  // Escape to close drawer on mobile + handle resize persistence
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

  // lock body scroll when mobile drawer is open
  useEffect(() => {
    if (!sidebarCollapsed && window.innerWidth <= 980) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [sidebarCollapsed])

  return (
    <>
      <Header onPrint={handlePrint} printDateLabel={selectedDate.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })} theme={theme} onToggleTheme={toggleTheme} events={events} inventory={inventory} />

      <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Sidebar active={activeTab} onChange={handleNavChange} stats={stats} collapsed={sidebarCollapsed} onToggleCollapse={toggleSidebar} />

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
              {/* Calendar Toolbar — sales KPIs now live in Dashboard */}
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
                onAddClick={(d)=>{ setSelectedDate(d); setEditingEvent(null); setModalDate(d)}}
                onEventClick={(ev)=>{ setEditingEvent(ev); setModalDate(parseDate(ev.date))}}
                filters={filters}
              />

              {/* Day Detail */}
              <div className="day-detail">
                <div className="day-detail-head">
                  <div>
                    <h3>📅 {selectedDate.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', weekday:'long', month:'long', day:'numeric', year:'numeric'})}</h3>
                    <p>{dayEvents.length} entries • {peso(dayEvents.reduce((s,e)=>s+(e.type==='sale'||e.type==='delivery'?e.amount:0),0))} sales total</p>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-day-ghost" onClick={handlePrint} title="Print paper sheet for this date">🖨 Print Sheet for this date</button>
                    <button className="btn btn-day-primary" onClick={()=>{ setEditingEvent(null); setModalDate(selectedDate)}}><span className="plus">+</span> Add Entry</button>
                  </div>
                </div>

                {dayEvents.length===0 ? (
                  <div className="empty-day">
                    <div style={{ fontSize:28, marginBottom:6 }}>🗓️</div>
                    No entries for this day.<br />Click <b>+ Add Entry</b> or click any calendar cell to create a sale, delivery, or expense.
                  </div>
                ) : (
                  <div className="day-events-list">
                    {dayEvents.map(ev=> (
                      <div key={ev.id} className={`day-event-card ${ev.type}`}>
                        <div className="icon">{ev.icon}</div>
                        <div style={{ flex:1 }}>
                          <h4>{ev.title}</h4>
                          <p>{ev.customer || '—'} {ev.note?`• ${ev.note}`:''}</p>
                          <div className="actions">
                            <button className="btn-xs" onClick={()=>{ setEditingEvent(ev); setModalDate(parseDate(ev.date))}}>Edit</button>
                            <button className="btn-xs danger" onClick={()=>handleDelete(ev.id)}>Delete</button>
                          </div>
                        </div>
                        <span className="amt">{ev.amount>0? peso(ev.amount): '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab==='orders' && <OrdersView orders={orders} onUpdateOrders={handleOrdersUpdate} showToast={showToast} />}
          {activeTab==='products' && <ProductsView />}
          {activeTab==='inventory' && <InventoryView inventory={inventory} onUpdate={handleInventoryUpdate} />}
          {activeTab==='hiram' && <HiramView />}
          {activeTab==='expenses' && <ExpensesView />}
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

      {/* Mobile drawer backdrop — visible only on small screens via CSS */}
      <div
        className={`sidebar-backdrop ${!sidebarCollapsed ? 'visible' : ''}`}
        onClick={toggleSidebar}
        aria-hidden="true"
      />

      {/* Floating button to reopen sidebar on mobile when hidden */}
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
        Tubig Irosin • Irosin, Sorsogon • All data is saved securely on this device • Works offline
      </footer>
    </>
  )
}
