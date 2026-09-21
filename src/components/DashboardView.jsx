import { peso, formatISO, formatMonthYear, manilaISODate } from '../utils/dateUtils'
import { exportDashboardExcel } from '../utils/export'
import {
  getOrderStatus,
  getPaymentStatus,
  getOrderTime,
  barangayFromAddress,
  formatOrderDateShort,
} from '../data/ordersData'

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

function Donut({ sale, delivery, saleLabel = 'Walk-in Sale', deliveryLabel = 'Delivery', saleColor = '#1a7bb8', deliveryColor = '#10b981', insight = null }) {
  const total = (Number(sale) || 0) + (Number(delivery) || 0)
  const hasData = total > 0
  const salePct = hasData ? (sale / total) * 100 : 0
  const deliveryPct = hasData ? 100 - salePct : 0
  const r = 54
  const c = 2*Math.PI*r
  const saleDash = (salePct/100)*c
  const delDash = c - saleDash
  return (
    <div style={{ display:'flex', gap:18, alignItems:'center' }}>
      <svg width="132" height="132" viewBox="0 0 132 132">
        <circle cx="66" cy="66" r={r} fill="none" stroke="var(--slate-100)" strokeWidth="16" />
        {hasData && <circle cx="66" cy="66" r={r} fill="none" stroke={saleColor} strokeWidth="16" strokeDasharray={`${saleDash} ${c}`} strokeDashoffset="25" strokeLinecap="round" transform="rotate(-90 66 66)" />}
        {hasData && deliveryPct > 0 && <circle cx="66" cy="66" r={r} fill="none" stroke={deliveryColor} strokeWidth="16" strokeDasharray={`${delDash} ${c}`} strokeDashoffset={`${c - delDash + 25}`} strokeLinecap="round" transform="rotate(-90 66 66)" />}
        <text x="66" y="60" textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--slate-900)">{peso(total)}</text>
        <text x="66" y="76" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--slate-500)">TOTAL</text>
      </svg>
      <div style={{ display:'grid', gap:10, flex:1 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px 12px' }}>
          <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:600, color:'var(--slate-700)' }}><span style={{ width:10, height:10, borderRadius:4, background:saleColor, display:'inline-block' }}></span> {saleLabel}</span>
          <span style={{ fontWeight:800, fontSize:13, color:saleColor }}>{peso(sale)} <span style={{ fontWeight:600, color:'var(--slate-500)', fontSize:11 }}>({salePct.toFixed(0)}%)</span></span>
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px 12px' }}>
          <span style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, fontWeight:600, color:'var(--slate-700)' }}><span style={{ width:10, height:10, borderRadius:4, background:deliveryColor, display:'inline-block' }}></span> {deliveryLabel}</span>
          <span style={{ fontWeight:800, fontSize:13, color:deliveryColor }}>{peso(delivery)} <span style={{ fontWeight:600, color:'var(--slate-500)', fontSize:11 }}>({deliveryPct.toFixed(0)}%)</span></span>
        </div>
        <div style={{ fontSize:11, color:'var(--slate-500)', background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:8, padding:'8px 10px' }}>
          <b style={{ color:'#065f46' }}>Insight:</b> {insight || (sale >= delivery ? 'Walk-in drives majority — keep front stock ready.' : 'Deliveries lead — fuel cost watch on Monbon route.')}
        </div>
      </div>
    </div>
  )
}

export default function DashboardView({ events, inventory, currentDate, onAddEntry, orders = [], expenses = [] }) {
  // ---- Source of truth: live orders (revenue) + live expense ledger (costs) ----
  // Canceled orders never count toward sales, collection or hiram.
  const manilaToday = manilaISODate(Date.now())
  const manilaYesterday = manilaISODate(Date.now() - 86400000)
  const liveOrders = (orders || []).filter(o => getOrderStatus(o).id !== 'CANCELED')
  const canceledCount = (orders || []).length - liveOrders.length
  // The stored `total` column is the amount — summed as-is, never recomputed.
  const orderTotal = (o) => { const t = Number(o?.total); return Number.isFinite(t) ? t : 0 }
  const orderDay = (o) => manilaISODate(getOrderTime(o))
  // Orders whose date can't be parsed are counted separately and flagged in the UI —
  // never silently dropped into the wrong month.
  const undatedOrders = liveOrders.filter(o => !Number.isFinite(getOrderTime(o)))
  const datedOrders = liveOrders.filter(o => Number.isFinite(getOrderTime(o)))

  let monthKey = formatISO(currentDate).slice(0,7)
  let monthOrders = datedOrders.filter(o => orderDay(o).startsWith(monthKey))
  let effectiveDate = currentDate
  // fallback to latest order month when the viewed month has no orders yet
  if (monthOrders.length === 0 && datedOrders.length > 0) {
    const latest = [...datedOrders].sort((a,b)=> getOrderTime(b) - getOrderTime(a))[0]
    monthKey = orderDay(latest).slice(0,7)
    monthOrders = datedOrders.filter(o => orderDay(o).startsWith(monthKey))
    effectiveDate = new Date(`${monthKey}-01T00:00:00`)
  }

  const monthLabel = formatMonthYear(effectiveDate)
  const monthShort = (() => { try { return effectiveDate.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short' }) } catch { return monthLabel.split(' ')[0] } })()

  // today / yesterday (Manila calendar days) — PAID only: paid products are sales
  const todayOrders = liveOrders.filter(o => orderDay(o) === manilaToday)
  const paidTodayOrders = todayOrders.filter(o => getPaymentStatus(o).id === 'PAID')
  const todaySales = paidTodayOrders.reduce((s,o)=>s+orderTotal(o),0)
  const yesterdaySales = liveOrders.filter(o => orderDay(o) === manilaYesterday && getPaymentStatus(o).id === 'PAID').reduce((s,o)=>s+orderTotal(o),0)
  const trend = yesterdaySales > 0
    ? Math.round(((todaySales - yesterdaySales)/yesterdaySales)*100)
    : (todaySales > 0 ? null : 0) // null = first sales, no baseline — never fake "+0%"
  const trendText = trend === null
    ? '★ first sales — no baseline'
    : (trend === 0 && todaySales === 0 ? '— no sales yet' : `${trend >= 0 ? `↗ +${trend}%` : `↘ ${trend}%`} vs yesterday`)

  // month revenue — business rule: PAID products are sales.
  // Hiram / borrowed bottles follow the same rule: paid = sale, unpaid = receivable.
  const paidMonthOrders = monthOrders.filter(o => getPaymentStatus(o).id === 'PAID')
  const monthSales = paidMonthOrders.reduce((s,o)=>s+orderTotal(o),0)
  const monthGross = monthOrders.reduce((s,o)=>s+orderTotal(o),0)
  const paidRevenue = monthSales
  const unpaidRevenue = monthGross - monthSales
  const paidCount = paidMonthOrders.length

  // month expenses from the live ledger — same month scope, skip archived
  const monthExpenses = (expenses || []).filter(e => !e.is_archived && String(e.date || '').startsWith(monthKey))
  const expenseTotal = monthExpenses.reduce((s,e)=>s+(Number(e.amount) || 0),0)
  const net = monthSales - expenseTotal

  // elapsed days — a partial month must not be averaged over its full length
  const daysInMonth = new Date(effectiveDate.getFullYear(), effectiveDate.getMonth()+1, 0).getDate()
  const isCurrentMonth = monthKey === manilaToday.slice(0,7)
  const elapsedDays = isCurrentMonth ? Math.max(1, Number(manilaToday.slice(8,10))) : daysInMonth

  // daily trend for the viewed month (paid sales only)
  const daily = Array.from({ length: daysInMonth }, (_,i)=>{
    const day = String(i+1).padStart(2,'0')
    const iso = `${monthKey}-${day}`
    const v = paidMonthOrders.filter(o => orderDay(o) === iso).reduce((s,o)=>s+orderTotal(o),0)
    return { label: String(i+1), iso, value: v }
  })

  // last 14 days window for sparkline to keep chart readable
  const last14 = daily.slice(Math.max(0, daily.length-14))

  // barangay aggregation from delivery addresses (paid sales only)
  const barangayMap = {}
  paidMonthOrders.forEach(o=>{
    const k = barangayFromAddress(o.address)
    barangayMap[k] = (barangayMap[k]||0) + orderTotal(o)
  })
  const barangayRowsRaw = Object.entries(barangayMap).map(([label,value])=>({label, value})).sort((a,b)=>b.value-a.value).slice(0,5)
  const barangayColors = ['var(--blue-600)','var(--teal)','var(--cyan)','var(--green)','var(--amber)']
  const barangayRows = barangayRowsRaw.map((r,i)=>({...r, color: barangayColors[i%barangayColors.length]}))
  const bMax = Math.max(1, ...barangayRows.map(r=>r.value))

  // expense breakdown by real ledger category
  const expGroups = {}
  monthExpenses.forEach(e=>{
    const cat = String(e.category || 'Other').trim() || 'Other'
    expGroups[cat] = (expGroups[cat]||0) + (Number(e.amount) || 0)
  })
  const expenseRows = Object.entries(expGroups).map(([label,value])=>({label,value,color:'#ef4444'})).sort((a,b)=>b.value-a.value).slice(0,5)
  const expMax = Math.max(1, ...expenseRows.map(r=>r.value))
  const topExpense = expenseRows[0]?.label || null

  // inventory (null-safe for DB rows)
  const filledOf = (it) => it.stockFilled ?? it.stock_filled ?? 0
  const emptyOf = (it) => it.stockEmpty ?? it.stock_empty ?? 0
  const lowItems = inventory.filter(it=>filledOf(it) <= (it.threshold ?? 0))
  const totalFilled = inventory.reduce((s,it)=>s+filledOf(it),0)
  const totalEmpty = inventory.reduce((s,it)=>s+emptyOf(it),0)

  // recent transactions — latest orders, newest first
  const recent = [...(orders || [])].sort((a,b)=> (getOrderTime(b) || -1) - (getOrderTime(a) || -1)).slice(0,6)

  // hiram audited from live orders (borrowed gallons still out)
  const borrowedOrders = liveOrders.filter(o => (o.borrowedCount ?? o.borrowed_count ?? 0) > 0)
  const hiramOutstanding = borrowedOrders.reduce((s,o)=>s+(o.borrowedCount ?? o.borrowed_count ?? 0),0)

  console.log('[Dashboard]', {
    monthKey, monthLabel,
    ordersTotal: (orders || []).length,
    live: liveOrders.length,
    canceled: canceledCount,
    undated: undatedOrders.length,
    monthOrders: monthOrders.length,
    paid: paidCount,
    sales: monthSales,
    expensesLedger: (expenses || []).length,
    monthExpenses: monthExpenses.length,
    sampleDay: (orders || [])[0] ? orderDay((orders || [])[0]) : '(none)',
  })

  return (
    <div className="dashboard">
      <div className="section-head" style={{ borderTop:'none' }}>
        <div>
          <h2>📊 Dashboard • {monthLabel}</h2>
          <p>Sales (paid only), collection & stock — live from orders, expenses & stock • Canceled orders excluded</p>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--slate-500)', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:999, padding:'6px 12px' }}>
            <span style={{ width:8, height:8, borderRadius:999, background:'#22c55e', display:'inline-block' }}></span> {monthOrders.length} orders • {inventory.length} SKUs{canceledCount > 0 ? ` • ${canceledCount} canceled` : ''}
          </div>
          {undatedOrders.length > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'#92400e', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:999, padding:'6px 12px' }}>
              ⚠ {undatedOrders.length} order{undatedOrders.length > 1 ? 's have' : ' has'} no usable date — excluded from month math
            </div>
          )}
          <button className="btn btn-ghost" style={{ background:'white', color:'var(--slate-700)', border:'1px solid var(--slate-200)', padding:'9px 14px', fontSize:'13px', fontWeight:600 }} onClick={()=> exportDashboardExcel({ events, inventory, currentDate, orders, expenses })} title="Download spreadsheet">⬇ Download</button>
        </div>
      </div>

      {/* KPI grid — transferred Sales UI */}
      <div className="stats-grid" style={{ paddingTop: 0 }}>
        <div className="stat-card blue">
          <div className="stat-top"><span className="stat-label">Today&apos;s Sales</span><span className="stat-icon">💧</span></div>
          <div className="stat-value">{peso(todaySales)}</div>
          <div className={`stat-trend ${trend === null || trend >= 0 ? 'trend-up':'trend-down'}`}>{trendText} • {paidTodayOrders.length} paid</div>
        </div>
        <div className="stat-card green">
          <div className="stat-top"><span className="stat-label">Month Sales ({monthLabel})</span><span className="stat-icon">📦</span></div>
          <div className="stat-value">{peso(monthSales)}</div>
          <div className="stat-trend trend-up">{monthOrders.length} orders • {paidCount} paid</div>
        </div>
        <div className="stat-card amber">
          <div className="stat-top"><span className="stat-label">Hiram Outstanding</span><span className="stat-icon">🤝</span></div>
          <div className="stat-value">{hiramOutstanding} gals</div>
          <div className="stat-trend" style={{ color:'#d97706' }}>{borrowedOrders.length} orders • {lowItems.length ? `${lowItems.length} low stock` : 'stock ok'}</div>
        </div>
        <div className="stat-card red">
          <div className="stat-top"><span className="stat-label">Expenses (Month)</span><span className="stat-icon">💸</span></div>
          <div className="stat-value">{peso(expenseTotal)}</div>
          <div className={`stat-trend ${net>=0?'trend-up':'trend-down'}`}>{net>=0 ? `Net ${peso(net)} profit` : `Net ${peso(net)} • watch costs`} • {topExpense ? `Top: ${topExpense}` : 'No expenses yet'}</div>
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
              <div style={{ fontWeight:800, color:'var(--slate-900)', fontSize:14 }}>{(() => { const p = [...daily].sort((a,b)=>b.value-a.value)[0]; return (p && p.value > 0) ? `${monthShort} ${p.label} • ${peso(p.value)}` : '—' })()}</div>
            </div>
            <div style={{ background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Avg / day ({elapsedDays}d elapsed)</div>
              <div style={{ fontWeight:800, color:'var(--slate-900)', fontSize:14 }}>{peso(Math.round(monthSales / Math.max(1,elapsedDays)))}</div>
            </div>
            <div style={{ background: net>=0 ? '#f0fdf4':'#fef2f2', border:`1px solid ${net>=0 ? '#bbf7d0':'#fecaca'}`, borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Month Net</div>
              <div style={{ fontWeight:800, color: net>=0 ? '#065f46':'#991b1b', fontSize:14 }}>{peso(net)}</div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>Collection — Paid vs Receivable</h3>
          <Donut
            sale={paidRevenue}
            delivery={unpaidRevenue}
            saleLabel="Collected (Paid)"
            deliveryLabel="Receivable (Unpaid)"
            saleColor="#059669"
            deliveryColor="#d97706"
            insight={monthOrders.length === 0 ? 'No orders this month yet.' : (unpaidRevenue > paidRevenue ? `Receivables lead (${peso(unpaidRevenue)} unpaid) — follow up ${monthOrders.length - paidCount} unpaid orders.` : `Collection healthy — ${paidCount} of ${monthOrders.length} orders paid.`)}
          />
          <div style={{ marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            <div style={{ background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Total Orders</div>
              <div style={{ fontWeight:800, fontSize:16, color:'var(--slate-900)' }}>{monthOrders.length}</div>
            </div>
            <div style={{ background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px 12px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Avg Ticket (paid)</div>
              <div style={{ fontWeight:800, fontSize:16, color:'var(--slate-900)' }}>{peso(Math.round(monthSales / Math.max(1, paidCount)))}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="chart-card">
          <h3>Revenue by Barangay</h3>
          {barangayRows.length===0 ? <div className="empty" style={{ padding:20 }}>No sales yet for {monthLabel}</div> : <BarHorizontal rows={barangayRows} max={bMax} />}
          <div style={{ marginTop:14, padding:'12px', background:'var(--blue-50)', border:'1px solid #dbeafe', borderRadius:10, fontSize:'13px', color:'var(--slate-700)' }}>
            <b>Insight:</b> {barangayRows[0] && monthSales > 0 ? `${barangayRows[0].label} drives ${Math.round((barangayRows[0].value/monthSales)*100)}% of revenue` : 'Add orders to see barangay breakdown'} — prioritize deliveries there. Avg expense {monthOrders.length > 0 ? peso(Math.round(expenseTotal/monthOrders.length)) : '—'} per order.
          </div>
        </div>
        <div className="chart-card">
          <h3>Expense Breakdown</h3>
          {expenseRows.length===0 ? <div className="empty" style={{ padding:20 }}>No expenses recorded</div> : <BarHorizontal rows={expenseRows.map(r=>({ ...r, color:'#ef4444' }))} max={expMax} />}
          <div style={{ marginTop:14, padding:'12px', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, fontSize:'13px', color:'#7f1d1d' }}>
            <b>Watch:</b> Expenses are {monthSales > 0 ? Math.round((expenseTotal/monthSales)*100) : 0}% of sales. {expenseTotal > monthSales*0.6 && monthSales > 0 ? 'High cost month — review fuel & maintenance.' : 'Cost ratio healthy.'}
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
              const filled = filledOf(it)
              const empty = emptyOf(it)
              const denom = filled + empty
              const pct = denom === 0 ? 0 : Math.round((filled / denom)*100)
              const isLow = filled <= (it.threshold ?? 0)
              return (
                <div key={it.id} className="dash-inv-row" style={{ display:'flex', gap:10, alignItems:'center' }}>
                  <div className="dash-icon" style={{ width:36, height:36, borderRadius:9, display:'grid', placeItems:'center', background:'var(--slate-100)', border:'1px solid var(--slate-200)', fontSize:16, filter:'grayscale(100%)', transition:'filter 0.2s ease, background 0.2s ease, border-color 0.2s ease' }}>{it.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, fontWeight:700 }}>
                      <span style={{ color:'var(--slate-900)' }}>{it.name}</span>
                      <span style={{ color: isLow ? '#dc2626':'var(--slate-500)' }}>{filled} <span style={{ fontWeight:500 }}>filled{empty > 0 ? ` • ${empty} empty` : ''}</span></span>
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
            {recent.length === 0 && <div className="empty" style={{ padding:20 }}>No orders yet</div>}
            {recent.map(o=> {
              const st = getOrderStatus(o)
              const canceled = st.id === 'CANCELED'
              return (
                <div key={o.orderId} className="dash-recent-row" style={{ display:'flex', gap:10, alignItems:'center', padding:'10px 12px', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10 }}>
                  <span className="dash-recent-icon" style={{ width:32, height:32, borderRadius:8, display:'grid', placeItems:'center', background:'white', border:'1px solid var(--slate-200)', fontSize:14, filter:'grayscale(100%)', transition:'filter 0.2s ease, background 0.2s ease' }}>{canceled ? '✕' : '🧾'}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12.5, fontWeight:700, color:'var(--slate-900)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{o.orderId} • {o.customerName}</div>
                    <div style={{ fontSize:11, color:'var(--slate-500)' }}>{formatOrderDateShort(o.date)} • {st.label} • {getPaymentStatus(o).label}</div>
                  </div>
                  <span style={{ fontWeight:800, color: canceled?'#dc2626':'var(--slate-900)', fontSize:12 }}>{peso(orderTotal(o))}</span>
                </div>
              )
            })}
          </div>
          <div style={{ marginTop:10, display:'flex', gap:8 }}>
            <div style={{ flex:1, background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Hiram Outstanding</div>
              <div style={{ fontWeight:800, color:'#92400e' }}>{hiramOutstanding} gals • {borrowedOrders.length} orders</div>
            </div>
            <div style={{ flex:1, background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10, padding:'10px', textAlign:'center' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Low Stock</div>
              <div style={{ fontWeight:800, color: lowItems.length?'#dc2626':'#059669' }}>{lowItems.length} items</div>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-card" style={{ margin:'0 18px 18px' }}>
        <h3>{monthLabel} Summary</h3>
        <div style={{ display:'grid', gap:10, gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))' }}>
          {[
            { k:'Total Sales', v: peso(monthSales), c:'var(--blue-600)' },
            { k:'Collected (Paid)', v: peso(paidRevenue), c:'var(--green)' },
            { k:'Receivable (Unpaid)', v: peso(unpaidRevenue), c:'#d97706' },
            { k:'Total Expenses', v: peso(expenseTotal), c:'var(--red)' },
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
