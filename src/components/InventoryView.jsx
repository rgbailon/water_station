import { inventoryItems } from '../data/mockData'
import { peso } from '../utils/dateUtils'

export default function InventoryView() {
  return (
    <div>
      <div className="section-head">
        <div>
          <h2>📦 Inventory & Supplies</h2>
          <p>Track filled/empty gallons, bottles, caps & filters • Low stock highlighted in red</p>
        </div>
        <button className="btn btn-primary" style={{ background: 'var(--blue-600)', color: 'white' }} onClick={()=>alert('Add Stock modal - connect to DB later')}>+ Add Stock</button>
      </div>
      <div className="inventory-grid">
        {inventoryItems.map(item => {
          const total = item.stockFilled + item.stockEmpty
          const pct = total === 0 ? 0 : Math.round((item.stockFilled / Math.max(total, item.threshold*3)) * 100)
          const isLow = item.stockFilled <= item.threshold
          return (
            <div key={item.id} className="inv-card">
              <div className="inv-top">
                <div className="inv-icon">{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <h3>{item.name}</h3>
                  <p>{item.sku} • {peso(item.price)} {item.price>0?'/ unit':''}</p>
                </div>
                {isLow && <span className="pill red">Low</span>}
              </div>
              <div className="inv-stats">
                <div className={`inv-stat ${isLow?'low':''}`}><b>{item.stockFilled}</b><span>Filled</span></div>
                <div className="inv-stat"><b>{item.stockEmpty}</b><span>Empty</span></div>
              </div>
              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'11px', color:'var(--slate-500)', marginBottom:6, fontWeight:600 }}>
                  <span>Stock level</span><span>{item.threshold} min</span>
                </div>
                <div className="progress"><div className={isLow?'crit':pct<50?'warn':'ok'} style={{ width: `${Math.min(100, pct)}%` }}></div></div>
              </div>
              <div className="inv-actions">
                <button className="btn-soft" onClick={()=>alert('Adjust stock - DB later')}>Adjust</button>
                <button className="btn-soft primary">Restock</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
