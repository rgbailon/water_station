import { useState } from 'react'
import { peso } from '../utils/dateUtils'
import StockModal from './StockModal'
import { exportInventoryExcel } from '../utils/export'

export default function InventoryView({ inventory, onUpdate }) {
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState(null)

  const handleOpenAdd = () => { setEditItem(null); setShowModal(true) }
  const handleOpenEdit = (item) => { setEditItem(item); setShowModal(true) }

  const handleSave = (updated, newItem) => {
    if (newItem) {
      onUpdate(prev => [...prev, newItem])
    } else if (updated) {
      onUpdate(prev => prev.map(p => p.id === updated.id ? updated : p))
    }
    setShowModal(false); setEditItem(null)
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>📦 Inventory & Supplies</h2>
          <p>Track filled/empty gallons, bottles, caps & filters • Low stock highlighted in red</p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn-xs" style={{ padding:'9px 14px', fontSize:'13px' }} onClick={()=> exportInventoryExcel(inventory)} title="Download spreadsheet">⬇ Download</button>
          <button className="btn btn-primary" style={{ background: 'var(--blue-600)', color: 'white' }} onClick={handleOpenAdd}>+ Add Stock</button>
        </div>
      </div>
      <div className="inventory-grid">
        {inventory.map(item => {
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
                <button className="btn-soft" onClick={()=>handleOpenEdit(item)}>Adjust</button>
                <button className="btn-soft primary" onClick={()=>handleOpenEdit(item)}>Restock</button>
              </div>
            </div>
          )
        })}
      </div>

      <StockModal isOpen={showModal} onClose={()=>{ setShowModal(false); setEditItem(null)}} items={inventory} initialItem={editItem} onSave={handleSave} />
    </div>
  )
}
