import { peso, formatISO, formatMonthYear } from '../utils/dateUtils'
import { expensesList, hiramRecords } from '../data/mockData'
import { exportDashboardExcel } from '../utils/export'

// --- mini charts ---

function SparkLine({ data, height = 140 }) {
  const max = Math.max(1, ...data.map(d => d.value))
  const min = Math.min(0, ...data.map(d => d.value))
  const range = max - min || 1
  const width = 1000
  const pad = 12
  const step = (width - pad*2) / Math.max(1, data.length - 1)

  const points = data.map((d, i) => {
    const x = pad + i*step
    const y = height - pad - ((d.value - min) / range) * (height - pad*2)
    return `${x},${y}`
  }).join(' ')

  const areaPoints = `${pad},${height-pad} ` + points + ` ${pad + (data.length-1)*step},${height-pad}`

  return (
    <div style={{ width:'100%', overflow:'hidden' }}>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{ display:'block' }}>
        <defs>
          <linearGradient id="sgFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2ea2e6" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2ea2e6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[0,1,2,3].map(i => {
          const y = pad + (i/3)*(height-pad*2)
          return <line key={i} x1={pad} x2={width-pad} y1={y} y2={y} stroke="var(--slate-200)" strokeWidth="1" strokeDasharray="4 6" />
        })}
        {/* area */}
        <polygon points={areaPoints} fill="url(#sgFill)" stroke="none" />
        {/* line */}
        <polyline points={points} fill="none" stroke="#1a7bb8" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {/* dots */}
        {data.map((d,i) => {
          const x = pad + i*step
          const y = height - pad - ((d.value - min)/range)*(height-pad*2)
          const isPeak = d.value === max
          return <circle key={i} cx={x} cy={y} r={isPeak ? 6 : 4} fill={isPeak ? '#0e4a7a' : 'white'} stroke="#1a7bb8" strokeWidth="2.5" />
        })}
      </svg>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, fontWeight:600, color:'var(--slate-400)', marginTop:4, padding:'0 6px' }}>
        {data.map(d => <span key={d.label} style={{ flex:1, textAlign:'center' }}>{d.label}</span>)}
      </div>
    </div>
  )
}

function BarHorizontal({ rows, max }) {
  return (
    <div style={{ display:'grid', gap:10 }}>
      {rows.map(r => (
        <div key={r.label} className="bar-row">
          <span className="bar-label" style={{ width:96 }}>{r.label}</span>
          <div className="bar-track"><div className="bar-fill" style={{ width:`${Math.round((r.value / max)*100)}%`, background: r.color }}></div></div>
          <span className="bar-value" style={{ width:74 }}>{peso(r.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Donut({ sale, delivery }) {
  const total = sale + delivery || 1
  const salePct = (sale/total)*100
  const deliveryPct = 100 - salePct
  const r = 54
  const c = 2*Math.PI*r
  const saleDash = (salePct/100)*c
  const delDash = c - saleDash
  return (
    <div style={{ display:'flex', gap:18, alignItems:'center' }}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--slate-100)" strokeWidth="16" />
        <circle cx="66" cy="66" r={r} fill="none" stroke="#1a7bb8" strokeWidth="16" strokeDasharray={`${saleDash} ${c}`} strokeDashoffset="25" strokeLinecap="round" transform="rotate(-90 66 66)" />
        <circle cx="66" cy="66" r={r} fill="none" stroke="#10b981" strokeWidth="16" strokeDasharray={`${delDash} ${c}`} strokeDashoffset={`${c - delDash + 25}`} strokeLinecap="round" transform="rotate(-90 66 66)" />
        <text x="66" y="60" textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--slate-900)">{peso(total)}</text>
        <text x="66" y="76" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--slate-500)">TOTAL</text>
      </svg>
      <div style={{ display:'grid', gap:10, flex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px 12px' }}>
          <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:600, color:'var(--slate-700)' }}><span style={{ width:10, height:10, borderRadius:4, background:'#1a7bb8', display:'inline-block' }}></span> Walk-in Sale</span>
          <span style={{ fontWeight:800, fontSize:13, color:'#1a7bb8' }}>{peso(sale)} <span style={{ fontWeight:600, color:'var(--slate-500)', fontSize:11 }}>({salePct.toFixed(0)}%)</span></span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px 12px' }}>
          <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:600, color:'var(--slate-700)' }}><span style={{ width:10, height:10, borderRadius:4, background:'#10b981', display:'inline-block' }}></span> Delivery</span>
          <span style={{ fontWeight:800, fontSize:13, color:'#065f46' }}>{peso(delivery)} <span style={{ fontWeight:600, color:'var(--slate-500)', fontSize:11 }}>({deliveryPct.toFixed(0)}%)</span></span>
        </div>
        <div style={{ fontSize:11, color:'var(--slate-500)', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'8px 10px' }}>
          <b style={{ color:'#065f46' }}>Insight:</b> {sale > delivery ? 'Walk-in drives majority — keep front stock ready.' : 'Deliveries lead — fuel cost watch on Monbon route.'}
        </div>
      </div>
    </div>
  )
}

export default function DashboardView({ events, inventory, currentDate, onAddEntry }) {
  let monthKey = formatISO(currentDate).slice(0,7)
  let monthEvents = events.filter(e => e.date.startsWith(monthKey))
  let effectiveDate = currentDate
  // fallback to latest event month if current month empty (demo data is Sep 2026)
  if (monthEvents.length === 0 && events.length > 0) {
    const latest = [...events].sort((a,b)=> b.date.localeCompare(a.date))[0]
    monthKey = latest.date.slice(0,7)
    monthEvents = events.filter(e => e.date.startsWith(monthKey))
    effectiveDate = new Date(latest.date + 'T00:00:00')
  }
  const todayISO = formatISO(new Date())
  const dayEvents = events.filter(e => e.date === todayISO)
  const monthLabel = formatMonthYear(effectiveDate)

  // sales totals
  const isSaleLike = e => e.type === 'sale' || e.type === 'delivery'
  const todaySales = dayEvents.filter(isSaleLike).reduce((s,e)=>s+e.amount,0)
  const yesterdayISO = (()=>{ const d=new Date(); d.setDate(d.getDate()-1); return formatISO(d)})()
  const yesterdaySales = events.filter(e=>e.date===yesterdayISO && isSaleLike(e)).reduce((s,e)=>s+e.amount,0)
  const trend = yesterdaySales===0 ? 0 : Math.round(((todaySales - yesterdaySales)/yesterdaySales)*100)
  const monthSales = monthEvents.filter(isSaleLike).reduce((s,e)=>s+e.amount,0)
  const monthExpenses = monthEvents.filter(e=>e.type==='expense').reduce((s,e)=>s+e.amount,0)
  // fallback to expensesList if no expense events for month
  const expenseTotalFallback = expensesList.reduce((s,e)=>s+e.amount,0)
  const displayExpense = monthExpenses || expenseTotalFallback
  const net = monthSales - displayExpense

  const saleTotal = monthEvents.filter(e=>e.type==='sale').reduce((s,e)=>s+e.amount,0)
  const deliveryTotal = monthEvents.filter(e=>e.type==='delivery').reduce((s,e)=>s+e.amount,0)

  // daily trend for current month (1..30)
  const daysInMonth = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth()+1, 0).getDate()
  const daily = Array.from({ length: daysInMonth }, (_,i)=>{
    const day = String(i+1).padStart(2,'0')
    const iso = `${monthKey}-${day}`
    const v = events.filter(e=>e.date===iso && isSaleLike(e)).reduce((s,e)=>s+e.amount,0)
    return { label: String(i+1), iso, value: v }
  })

  // last 14 days window for sparkline to keep chart readable
  const last14 = daily.slice(Math.max(0, daily.length-14))

  // barangay aggregation
  const barangayMap = {}
  monthEvents.filter(isSaleLike).forEach(e=>{
    const k = (e.customer || 'Other').replace(/^Brgy\.?\s*/i,'').trim() || 'Other'
    barangayMap[k] = (barangayMap[k]||0)+ e.amount
  })
  const barangayRowsRaw = Object.entries(barangayMap).map(([label,value])=>({label, value})).sort((a,b)=>b.value-a.value).slice(0,5)
  const barangayColors = ['var(--blue-600)','var(--teal)','var(--cyan)','var(--green)','var(--amber)']
  const barangayRows = barangayRowsRaw.map((r,i)=>({...r, color: barangayColors[i%barangayColors.length]}))
  const bMax = Math.max(1, ...barangayRows.map(r=>r.value), 4000)

  // expense breakdown from events
  const expMap = {}
  monthEvents.filter(e=>e.type==='expense').forEach(e=>{
    // try to categorize by first part before ' -' or before ' '
    const raw = e.title || 'Other'
    const cat = raw.split(' -')[0].split(' ')[0].trim() || raw.slice(0,12)
    expMap[cat] = (expMap[cat]||0)+e.amount
  })
  // fallback if no events expense categories, use expensesList
  let expenseRows = Object.entries(expMap).map(([label,value])=>({label,value,color:'#ef4444'})).sort((a,b)=>b.value-a.value).slice(0,5)
  if (expenseRows.length===0) {
    const m={}
    expensesList.forEach(e=>{ m[e.category]=(m[e.category]||0)+e.amount })
    expenseRows = Object.entries(m).map(([label,value])=>({label,value,color:'#ef4444'})).sort((a,b)=>b.value-a.value)
  }
  const expMax = Math.max(1, ...expenseRows.map(r=>r.value))

  // inventory
  const lowItems = inventory.filter(it=>it.stockFilled <= it.threshold)
  const totalFilled = inventory.reduce((s,it)=>s+it.stockFilled,0)
  const totalEmpty = inventory.reduce((s,it)=>s+it.stockEmpty,0)

  // recent transactions
  const recent = [...events].sort((a,b)=> b.date.localeCompare(a.date) || (b.id||'').localeCompare(a.id||'')).slice(0,6)

  const hiramOutstanding = hiramRecords.filter(r=>r.status!=='returned').reduce((s,r)=>s+(r.borrowed - r.returned),0)
  const hiramCount = hiramRecords.filter(r=>r.status!=='returned').length

  return (
    <div className="dashboard">
      <div className="section-head" style={{ borderTop:'none' }}>
        <div>
          <h2>📊 Dashboard • {monthLabel}</h2>
          <p>Sales, deliveries & stock — live from calendar events • Auto-updates when you add entries</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--slate-500)', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:999, padding:'6px 12px' }}>
            <span style={{ width:8, height:8, borderRadius:999, background:'#22c55e', display:'inline-block' }}></span> {monthEvents.length} events • {inventory.length} SKUs
          </div>
          <button className="btn btn-ghost" style={{ background:'white', color:'var(--slate-700)', border:'1px solid var(--slate-200)', padding:'9px 14px', fontSize:'13px', fontWeight:600 }} onClick={()=> exportDashboardExcel({ events, inventory, currentDate })} title="Download spreadsheet">⬇ Download</button>
          <button className="btn btn-primary" style={{ background:'var(--blue-600)', color:'white' }} onClick={()=>onAddEntry && onAddEntry()}><span className="plus">+</span> New Entry</button>
        </div>
      </div>

      {/* KPI grid — transferred Sales UI */}
      <div className="stats-grid" style={{ paddingTop: 0 }}>
        <div className="stat-card blue">
          <div className="stat-top"><span className="stat-label">Today&apos;s Sales</span><span className="stat-icon">💧</span></div>
          <div className="stat-value">{peso(todaySales)}</div>
          <div className={`stat-trend ${trend>=0 ? 'trend-up':'trend-down'}`}>{trend>=0 ? `↗ +${trend}%` : `↘ ${trend}%`} vs yesterday • {dayEvents.filter(isSaleLike).length} orders</div>
        </div>
        <div className="stat-card green">
          <div className="stat-top"><span className="stat-label">Month Sales ({monthLabel})</span><span className="stat-icon">📦</span></div>
          <div className="stat-value">{peso(monthSales)}</div>
          <div className="stat-trend trend-up">↗ {monthEvents.filter(isSaleLike).length} sales • {monthEvents.length} total entries</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-top"><span className="stat-label">Hiram Outstanding</span><span className="stat-icon">🤝</span></div>
          <div className="stat-value">{hiramOutstanding} gals</div>
          <div className="stat-trend" style={{ color:'#d97706' }}>{hiramCount} customers • {lowItems.length ? `${lowItems.length} low stock` : 'stock ok'}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-top"><span className="stat-label">Expenses (Month)</span><span className="stat-icon">💸</span></div>
          <div className="stat-value">{peso(displayExpense)}</div>
          <div className={`stat-trend ${net>=0?'trend-up':'trend-down'}`}>{net>=0 ? `Net ${peso(net)} profit` : `Net ${peso(net)} • watch costs`} • Fuel + electric</div>
        </div>
      </div>

      {/* Main charts */}
      <div className="dash-grid">
        <div className="chart-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
            <h3 style={{ margin:0 }}>Daily Sales Trend — {monthLabel}</h3>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.06em', textTransform:'uppercase', color:'var(--slate-400)', background:'var(--slate-100)', padding:'4px 8px', borderRadius:999 }}>Last 14 days</span>
          </div>
          <SparkLine data={last14} />
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:8, marginTop:12 }}>
            <div style={{ background:'var(--blue-50)', border:'1px solid #dbeafe', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Peak Day</div>
              <div style={{ fontWeight:800, color:'var(--slate-900)', fontSize:14 }}>{(() => { const p = [...daily].sort((a,b)=>b.value-a.value)[0]; return p ? `${monthLabel.split(' ')[0]} ${p.label} • ${peso(p.value)}` : '—' })()}</div>
            </div>
            <div style={{ background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Avg / day</div>
              <div style={{ fontWeight:800, color:'var(--slate-900)', fontSize:14 }}>{peso(Math.round(monthSales / Math.max(1,daysInMonth)))}</div>
            </div>
            <div style={{ background: net>=0 ? '#f0fdf4':'#fef2f2', border:`1px solid ${net>=0 ? '#bbf7d0':'#fecaca'}`, borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Month Net</div>
              <div style={{ fontWeight:800, color: net>=0 ? '#065f46':'#991b1b', fontSize:14 }}>{peso(net)}</div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>Sales by Type</h3>
          <Donut sale={saleTotal} delivery={deliveryTotal} />
          <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Total Orders</div>
              <div style={{ fontWeight:800, fontSize:16, color:'var(--slate-900)' }}>{monthEvents.filter(isSaleLike).length}</div>
            </div>
            <div style={{ background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Avg Ticket</div>
              <div style={{ fontWeight:800, fontSize:16, color:'var(--slate-900)' }}>{peso(Math.round(monthSales / Math.max(1, monthEvents.filter(isSaleLike).length)))}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="chart-card">
          <h3>Revenue by Barangay</h3>
          {barangayRows.length===0 ? <div className="empty" style={{ padding:20 }}>No sales yet for {monthLabel}</div> : <BarHorizontal rows={barangayRows} max={bMax} />}
          <div style={{ marginTop:14, padding:'12px', background:'var(--blue-50)', border:'1px solid #dbeafe', borderRadius:10, fontSize:'13px', color:'var(--slate-700)' }}>
            <b>Insight:</b> {barangayRows[0] ? `${barangayRows[0].label} drives ${Math.round((barangayRows[0].value/monthSales)*100)}% of revenue` : 'Add sales to see barangay breakdown'} — prioritize deliveries there. Avg expense {peso(Math.round(displayExpense/monthEvents.filter(isSaleLike).length||0))} per order.
          </div>
        </div>
        <div className="chart-card">
          <h3>Expense Breakdown</h3>
          {expenseRows.length===0 ? <div className="empty" style={{ padding:20 }}>No expenses recorded</div> : <BarHorizontal rows={expenseRows.map(r=>({ ...r, color:'#ef4444' }))} max={expMax} />}
          <div style={{ marginTop:14, padding:'12px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, fontSize:'13px', color:'#7f1d1d' }}>
            <b>Watch:</b> Expenses are {monthSales ? Math.round((displayExpense/monthSales)*100) : 0}% of sales. {displayExpense>monthSales*0.6 ? 'High cost month — review fuel & maintenance.' : 'Cost ratio healthy.'}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="dash-grid">
        <div className="chart-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <h3 style={{ margin:0 }}>Stock Levels</h3>
            <span style={{ fontSize:11, fontWeight:700, color: lowItems.length? '#dc2626':'#059669', background: lowItems.length ? '#fee2e2':'#dcfce7', border:`1px solid ${lowItems.length?'#fecaca':'#a7f3d0'}`, padding:'4px 8px', borderRadius:999 }}>{lowItems.length ? `${lowItems.length} low` : 'All good'} • {totalFilled} filled • {totalEmpty} empty</span>
          </div>
          <div style={{ display:'grid', gap:10 }}>
            {inventory.slice(0,6).map(it=>{
              const total = it.stockFilled + it.stockEmpty + it.threshold
              const pct = total===0?0: Math.round((it.stockFilled / Math.max(total, it.threshold*3))*100)
              const isLow = it.stockFilled <= it.threshold
              return (
                <div key={it.id} className="dash-inv-row" style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div className="dash-icon" style={{ width:36, height:36, borderRadius:9, display:'grid', placeItems:'center', background:'var(--slate-100)', border:'1px solid var(--slate-200)', fontSize:16, filter:'grayscale(100%)', transition:'filter 0.2s ease, background 0.2s ease, border-color 0.2s ease' }}>{it.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700 }}>
                      <span style={{ color:'var(--slate-900)' }}>{it.name}</span>
                      <span style={{ color: isLow ? '#dc2626':'var(--slate-500)' }}>{it.stockFilled} <span style={{ fontWeight:500 }}>filled</span></span>
                    </div>
                    <div className="progress" style={{ marginTop:4 }}><div className={isLow?'crit':pct<50?'warn':'ok'} style={{ width:`${Math.min(100,pct)}%` }}></div></div>
                  </div>
                  {isLow && <span className="pill red" style={{ fontSize:10 }}>Low</span>}
                </div>
              )
            })}
          </div>
          {inventory.length>6 && <div style={{ marginTop:10, fontSize:11, color:'var(--slate-500)', textAlign:'center' }}>+ {inventory.length-6} more in Inventory →</div>}
        </div>

        <div className="list-card">
          <h3>Recent Transactions</h3>
          <div style={{ display:'grid', gap:8 }}>
            {recent.map(ev=> (
              <div key={ev.id} className="dash-recent-row" style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10 }}>
                <span className="dash-recent-icon" style={{ width:32, height:32, borderRadius:8, display:'grid', placeItems:'center', background:'white', border:'1px solid var(--slate-200)', fontSize:14, filter:'grayscale(100%)', transition:'filter 0.2s ease, background 0.2s ease' }}>{ev.icon}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12.5, fontWeight:700, color:'var(--slate-900)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ev.title}</div>
                  <div style={{ fontSize:11, color:'var(--slate-500)' }}>{ev.date} • {ev.customer || '—'} {ev.note?`• ${ev.note.slice(0,22)}` : ''}</div>
                </div>
                <span style={{ fontWeight:800, color: ev.type==='expense'?'#dc2626':'var(--slate-900)', fontSize:12 }}>{ev.amount?peso(ev.amount):'—'}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop:10, display:'flex', gap:8 }}>
            <div style={{ flex:1, background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Hiram Due</div>
              <div style={{ fontWeight:800, color:'#92400e' }}>{hiramRecords.filter(r=>r.status==='overdue').length} overdue</div>
            </div>
            <div style={{ flex:1, background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Low Stock</div>
              <div style={{ fontWeight:800, color: lowItems.length?'#dc2626':'#059669' }}>{lowItems.length} items</div>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ margin:'0 18px 18px' }}>
        <h3>September Summary</h3>
        <div style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {[
            { k:'Total Sales', v: peso(saleTotal), c:'var(--blue-600)' },
            { k:'Total Deliveries', v: peso(deliveryTotal), c:'var(--teal)' },
            { k:'Total Expenses', v: peso(displayExpense), c:'var(--red)' },
            { k:'Net (Sales - Expenses)', v: peso(net), c: net>=0? 'var(--green)' : 'var(--red)' },
            { k:'Hiram Outstanding', v:`${hiramOutstanding} gals`, c:'#92400e' },
            { k:'Inventory SKUs', v:`${inventory.length} items`, c:'var(--slate-900)' },
          ].map(row=> (
            <div key={row.k} style={{ display:'flex', flexDirection:'column', gap:4, padding:'12px', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, textAlign:'center' }}>
              <span style={{ fontSize:'11px', fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>{row.k}</span>
              <span style={{ fontWeight:800, color:row.c, fontSize:16 }}>{row.v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
