import { peso } from '../utils/dateUtils'

export default function ReportsView() {
  const bars = [
    { label: 'Monbon', value: 3850, max: 4000, color: 'var(--blue-600)' },
    { label: 'Patag', value: 2100, max: 4000, color: 'var(--teal)' },
    { label: 'San Isidro', value: 1850, max: 4000, color: 'var(--cyan)' },
    { label: 'Bagsangan', value: 1450, max: 4000, color: 'var(--green)' },
    { label: 'Gulang', value: 980, max: 4000, color: 'var(--amber)' },
  ]
  return (
    <div>
      <div className="section-head">
        <div>
          <h2>📊 Reports & Analytics</h2>
          <p>September 2026 • Export ready for printing • Data from calendar events</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-xs" style={{ padding:'9px 14px', fontSize:'13px' }}>🖨 Print</button>
          <button className="btn btn-primary" style={{ background:'var(--slate-900)', color:'white' }}>⬇ Export Excel</button>
        </div>
      </div>
      <div className="reports-grid">
        <div className="chart-card">
          <h3>Revenue by Barangay</h3>
          {bars.map(b=> (
            <div key={b.label} className="bar-row">
              <span className="bar-label">{b.label}</span>
              <div className="bar-track"><div className="bar-fill" style={{ width:`${(b.value/b.max)*100}%`, background:b.color }}></div></div>
              <span className="bar-value">{peso(b.value)}</span>
            </div>
          ))}
          <div style={{ marginTop:14, padding:'12px', background:'var(--blue-50)', border:'1px solid #dbeafe', borderRadius:10, fontSize:'13px', color:'var(--slate-700)' }}>
            <b>Insight:</b> Monbon drives 38% of revenue — prioritize deliveries there. Fuel cost Sep: ₱1,350 vs revenue ₱8,230 (16% cost).
          </div>
        </div>
        <div className="list-card">
          <h3>September Summary</h3>
          <div style={{ display:'grid', gap:10 }}>
            {[
              { k:'Total Refills', v:'142 gals', c:'var(--blue-600)' },
              { k:'Total Sales', v:'₱4,260', c:'var(--green)' },
              { k:'Total Deliveries', v:'₱3,090', c:'var(--teal)' },
              { k:'Total Expenses', v:'₱6,300', c:'var(--red)' },
              { k:'Net (Sales - Expenses)', v:'₱1,050', c:'var(--amber)' },
              { k:'Hiram Outstanding', v:'13 gals', c:'#92400e' },
            ].map(row=> (
              <div key={row.k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:10 }}>
                <span style={{ fontSize:'13px', fontWeight:600, color:'var(--slate-500)' }}>{row.k}</span>
                <span style={{ fontWeight:800, color:row.c }}>{row.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
