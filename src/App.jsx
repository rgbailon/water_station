import { useState, useMemo } from 'react'
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
import { initialEvents } from './data/mockData'
import { addMonths, subMonths, formatMonthYear, formatISO, formatPHLong, parseDate, getEventsForDate, peso } from './utils/dateUtils'

export default function App() {
  const [theme, toggleTheme] = useTheme()
  const [activeTab, setActiveTab] = useState('calendar')
  const [currentDate, setCurrentDate] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => new Date())
  const [events, setEvents] = useState(initialEvents)
  const [modalDate, setModalDate] = useState(null)
  const [editingEvent, setEditingEvent] = useState(null)
  const [filters, setFilters] = useState({ sale: true, delivery: true, expense: true, hiram: true, maintenance: true })
  const [toast, setToast] = useState(null)
  const [printDate, setPrintDate] = useState(null)

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

  const stats = {
    filled: 78,
    empty: 27,
    hiram: 13,
    lows: 2,
    todaySales: peso(dayEvents.filter(e=>e.type==='sale'||e.type==='delivery').reduce((s,e)=>s+e.amount,0)),
    monthSales: peso(monthEvents.filter(e=>e.type==='sale'||e.type==='delivery').reduce((s,e)=>s+e.amount,0)),
  }

  const handlePrint = () => {
    // Always print the currently selected calendar date so it matches the accurate date for the day (Asia/Manila)
    setPrintDate(new Date(selectedDate))
  }

  return (
    <>
      <Header onExport={() => setModalDate(selectedDate)} onPrint={handlePrint} printDateLabel={selectedDate.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })} theme={theme} onToggleTheme={toggleTheme} />

      <div className="app-shell">
        <Sidebar active={activeTab} onChange={setActiveTab} stats={stats} />

        <main className="main-card">
          {activeTab === 'calendar' && (
            <>
              {/* Stats */}
              <div className="stats-grid">
                <div className="stat-card blue">
                  <div className="stat-top"><span className="stat-label">Today&apos;s Sales</span><span className="stat-icon">💧</span></div>
                  <div className="stat-value">{stats.todaySales}</div>
                  <div className="stat-trend trend-up">↗ +12% vs yesterday</div>
                </div>
                <div className="stat-card green">
                  <div className="stat-top"><span className="stat-label">Month Sales ({formatMonthYear(currentDate)})</span><span className="stat-icon">📦</span></div>
                  <div className="stat-value">{stats.monthSales}</div>
                  <div className="stat-trend trend-up">↗ {monthEvents.length} entries</div>
                </div>
                <div className="stat-card amber">
                  <div className="stat-top"><span className="stat-label">Hiram Outstanding</span><span className="stat-icon">🤝</span></div>
                  <div className="stat-value">13 gals</div>
                  <div className="stat-trend" style={{ color:'#d97706' }}>3 customers</div>
                </div>
                <div className="stat-card red">
                  <div className="stat-top"><span className="stat-label">Expenses (Month)</span><span className="stat-icon">💸</span></div>
                  <div className="stat-value">₱6,300</div>
                  <div className="stat-trend trend-down">↘ Fuel + electric</div>
                </div>
              </div>

              {/* Calendar Toolbar */}
              <div className="calendar-toolbar">
                <div className="cal-left">
                  <button className="btn-cal-nav" onClick={()=>setCurrentDate(d=>subMonths(d,1))}>‹</button>
                  <div className="cal-month">{formatMonthYear(currentDate)}</div>
                  <button className="btn-cal-nav" onClick={()=>setCurrentDate(d=>addMonths(d,1))}>›</button>
                  <button className="btn-today" onClick={()=>{const t=new Date(); setCurrentDate(t); setSelectedDate(t)}}>Today</button>
                </div>
                <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                  <button className="btn-today" onClick={()=>setModalDate(selectedDate)} style={{ background:'var(--blue-600)', color:'white', borderColor:'var(--blue-600)' }}>+ Add on {selectedDate.getDate()}</button>
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
                    <button className="btn btn-ghost" style={{ background:'white', color:'var(--slate-700)', border:'1px solid var(--slate-200)', padding:'9px 14px', fontSize:'13px' }} onClick={handlePrint} title="Print paper sheet for this date">🖨 Print Sheet for this date</button>
                    <button className="btn btn-primary" style={{ background:'var(--slate-900)', color:'white', padding:'9px 14px', fontSize:'13px' }} onClick={()=>{ setEditingEvent(null); setModalDate(selectedDate)}}>+ Add Entry</button>
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

          {activeTab==='inventory' && <InventoryView />}
          {activeTab==='hiram' && <HiramView />}
          {activeTab==='expenses' && <ExpensesView />}
          {activeTab==='reports' && <ReportsView />}
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

      {toast && <div className="toast">✅ {toast}</div>}

      <footer style={{ textAlign:'center', padding:'18px 20px 28px', fontSize:'12.5px', color:'var(--slate-400)' }}>
        Tubig Irosin • Irosin, Sorsogon • Built with React + Vite • Styles in <code style={{ background:'var(--white)', padding:'2px 6px', borderRadius:6, border:'1px solid var(--slate-200)', color:'var(--slate-700)' }}>src/styles/*.css</code> • Logic in <code style={{ background:'var(--white)', padding:'2px 6px', borderRadius:6, border:'1px solid var(--slate-200)', color:'var(--slate-700)' }}>src/components/*.jsx & src/utils/dateUtils.js</code> • DB: IndexedDB (to be implemented)
      </footer>
    </>
  )
}
