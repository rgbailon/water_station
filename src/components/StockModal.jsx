import { useState, useEffect } from 'react'

const ICON_OPTIONS = ['💧','🧴','🥤','💦','🧊','🔵','⚙️','🏷️','📦','🧼','🫧','🔧']

export default function StockModal({ isOpen, onClose, items, initialItem, onSave }) {
  const [mode, setMode] = useState(initialItem ? 'existing' : 'existing')
  const [selectedId, setSelectedId] = useState(initialItem?.id ? String(initialItem.id) : '')
  const [action, setAction] = useState('add') // add | set
  const [qtyFilled, setQtyFilled] = useState('')
  const [qtyEmpty, setQtyEmpty] = useState('')
  const [price, setPrice] = useState('')
  const [note, setNote] = useState('')

  // new item fields
  const [newName, setNewName] = useState('')
  const [newSku, setNewSku] = useState('')
  const [newThreshold, setNewThreshold] = useState('')
  const [newIcon, setNewIcon] = useState('📦')
  const [newFilled, setNewFilled] = useState('')
  const [newEmpty, setNewEmpty] = useState('')
  const [newPrice, setNewPrice] = useState('')
  const [newUnit, setNewUnit] = useState('pcs')

  useEffect(() => {
    if (!isOpen) return
    if (initialItem) {
      setMode('existing')
      setSelectedId(String(initialItem.id))
      setAction('add')
      setQtyFilled('')
      setQtyEmpty('')
      setPrice(initialItem.price || '')
      setNote('')
    } else {
      setSelectedId(items[0] ? String(items[0].id) : '')
      setQtyFilled('')
      setQtyEmpty('')
      setPrice('')
      setNote('')
    }
    setNewName('')
    setNewSku('')
    setNewThreshold('')
    setNewFilled('')
    setNewEmpty('')
    setNewPrice('')
    setNewIcon('📦')
    setNewUnit('pcs')
  }, [isOpen, initialItem, items])

  if (!isOpen) return null

  const selectedItem = items.find(i => String(i.id) === String(selectedId))

  const handleSaveExisting = () => {
    if (!selectedItem) return alert('Select an item')
    const addF = Number(qtyFilled) || 0
    const addE = Number(qtyEmpty) || 0
    if (action === 'add' && addF === 0 && addE === 0) return alert('Enter at least one quantity to add')
    if (action === 'set' && qtyFilled === '' && qtyEmpty === '') return alert('Enter a quantity to set')
    // price override if provided
    const finalPrice = price !== '' ? Number(price) : selectedItem.price

    const updated = { ...selectedItem }
    if (action === 'add') {
      updated.stockFilled = selectedItem.stockFilled + addF
      updated.stockEmpty = selectedItem.stockEmpty + addE
    } else {
      if (qtyFilled !== '') updated.stockFilled = Number(qtyFilled)
      if (qtyEmpty !== '') updated.stockEmpty = Number(qtyEmpty)
    }
    if (price !== '') updated.price = finalPrice
    if (addF < 0 || addE < 0) {
      // allow negative add? only if set, but prevent negative stock
    }
    if (updated.stockFilled < 0 || updated.stockEmpty < 0) return alert('Stock cannot be negative')

    onSave(updated, null, { type: action, filled: addF, empty: addE, note })
  }

  const handleSaveNew = () => {
    if (!newName.trim()) return alert('Product name is required')
    if (!newSku.trim()) return alert('SKU is required')
    const filled = Number(newFilled) || 0
    const empty = Number(newEmpty) || 0
    const threshold = Number(newThreshold) || 0
    const p = Number(newPrice) || 0
    if (filled < 0 || empty < 0) return alert('Stock cannot be negative')
    const newItem = {
      id: Math.max(0, ...items.map(i=>Number(i.id)||0)) + 1,
      name: newName.trim(),
      sku: newSku.trim().toUpperCase(),
      price: p,
      stockFilled: filled,
      stockEmpty: empty,
      threshold: threshold,
      icon: newIcon,
      unit: newUnit,
      is_active: true,
      is_archived: false,
      is_low_stock: filled <= threshold,
    }
    onSave(null, newItem, { note })
  }

  const isNew = mode === 'new'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e=>e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>📦 {initialItem ? `Manage Stock • ${initialItem.name}` : 'Add Stock / New Product'}</h3>
            <p>{isNew ? 'Create a new inventory item' : 'Update filled & empty counts • Saved locally'}</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs" style={{ paddingBottom: 12, borderBottom: '1px solid var(--slate-200)' }}>
          <button className={`tab ${!isNew ? 'active' : ''}`} onClick={()=>setMode('existing')}>📦 Existing Item</button>
          <button className={`tab ${isNew ? 'active' : ''}`} onClick={()=>setMode('new')}>✨ New Product</button>
        </div>

        <div className="modal-body">
          {!isNew ? (
            <>
              <div className="field">
                <label>Select Item *</label>
                <select value={selectedId} onChange={e=>setSelectedId(e.target.value)}>
                  {items.map(it => (
                    <option key={it.id} value={it.id}>{it.icon} {it.name} — {it.sku} (Filled: {it.stockFilled}, Empty: {it.stockEmpty})</option>
                  ))}
                </select>
              </div>

              {selectedItem && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, background:'var(--slate-50)', border:'1px solid var(--slate-200)', borderRadius:12, padding:'12px' }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:28 }}>{selectedItem.icon}</div>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--slate-900)' }}>{selectedItem.name}</div>
                    <div style={{ fontSize:11, color:'var(--slate-500)' }}>{selectedItem.sku}</div>
                  </div>
                  <div style={{ textAlign:'center', borderLeft:'1px solid var(--slate-200)', borderRight:'1px solid var(--slate-200)', padding:'0 8px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Current</div>
                    <div style={{ marginTop:6, display:'flex', gap:8, justifyContent:'center' }}>
                      <span style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:8, padding:'6px 10px', fontWeight:800 }}>{selectedItem.stockFilled}<span style={{ fontWeight:600, fontSize:11, color:'var(--slate-500)' }}> filled</span></span>
                      <span style={{ background:'white', border:'1px solid var(--slate-200)', borderRadius:8, padding:'6px 10px', fontWeight:800 }}>{selectedItem.stockEmpty}<span style={{ fontWeight:600, fontSize:11, color:'var(--slate-500)' }}> empty</span></span>
                    </div>
                    <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:6 }}>Min: {selectedItem.threshold} • {selectedItem.unit}</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:'var(--slate-500)', letterSpacing:'.06em', textTransform:'uppercase' }}>Status</div>
                    <div style={{ marginTop:6 }}>
                      {selectedItem.stockFilled <= selectedItem.threshold ? <span className="pill red">Low Stock</span> : selectedItem.stockFilled <= selectedItem.threshold*2 ? <span className="pill amber">Watch</span> : <span className="pill green">Healthy</span>}
                    </div>
                    <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:6 }}>{selectedItem.price>0?`₱${selectedItem.price} / unit`: 'No sale price'}</div>
                  </div>
                </div>
              )}

              <div className="grid-2">
                <div className="field">
                  <label>Action</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <button className={`btn-soft ${action==='add' ? 'primary':''}`} style={{ flex:1 }} onClick={()=>setAction('add')}>➕ Add to stock</button>
                    <button className={`btn-soft ${action==='set' ? 'primary':''}`} style={{ flex:1 }} onClick={()=>setAction('set')}>✎ Set absolute</button>
                  </div>
                  <div style={{ fontSize:11, color:'var(--slate-500)', marginTop:4 }}>
                    {action==='add' ? 'Will add to current counts (use negative to deduct).' : 'Will replace current counts exactly.'}
                  </div>
                </div>
                <div className="field">
                  <label>Price per unit (₱) <span style={{ fontWeight:400, color:'var(--slate-400)' }}>(optional override)</span></label>
                  <input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder={selectedItem?String(selectedItem.price):'0'} />
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>{action==='add' ? 'Add Filled Qty' : 'Set Filled Qty'}</label>
                  <input type="number" value={qtyFilled} onChange={e=>setQtyFilled(e.target.value)} placeholder={action==='add'?'e.g., 10':'e.g., 42'} />
                </div>
                <div className="field">
                  <label>{action==='add' ? 'Add Empty Qty' : 'Set Empty Qty'}</label>
                  <input type="number" value={qtyEmpty} onChange={e=>setQtyEmpty(e.target.value)} placeholder={action==='add'?'e.g., 5':'e.g., 18'} />
                </div>
              </div>

              <div className="field">
                <label>Note / Reason <span style={{ fontWeight:400, color:'var(--slate-400)' }}>(optional)</span></label>
                <input value={note} onChange={e=>setNote(e.target.value)} placeholder="e.g., Delivery from supplier, breakage, audit correction..." />
              </div>

              {selectedItem && (qtyFilled!=='' || qtyEmpty!=='') && (
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'10px 12px', fontSize:12, color:'#065f46' }}>
                  <b>Preview:</b> Filled {selectedItem.stockFilled} → <b>{action==='add' ? selectedItem.stockFilled + (Number(qtyFilled)||0) : qtyFilled!=='' ? Number(qtyFilled) : selectedItem.stockFilled}</b> &nbsp;|&nbsp; Empty {selectedItem.stockEmpty} → <b>{action==='add' ? selectedItem.stockEmpty + (Number(qtyEmpty)||0) : qtyEmpty!=='' ? Number(qtyEmpty) : selectedItem.stockEmpty}</b>
                  {price!=='' && <span> &nbsp;|&nbsp; Price → <b>₱{Number(price).toLocaleString('en-PH')}</b></span>}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid-2">
                <div className="field">
                  <label>Product Name *</label>
                  <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="e.g., 5-Gal Round (Refill)" />
                </div>
                <div className="field">
                  <label>SKU *</label>
                  <input value={newSku} onChange={e=>setNewSku(e.target.value)} placeholder="e.g., GAL-RND-5" style={{ textTransform:'uppercase' }} />
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>Icon</label>
                  <select value={newIcon} onChange={e=>setNewIcon(e.target.value)}>
                    {ICON_OPTIONS.map(ic=> <option key={ic} value={ic}>{ic} {ic}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Unit</label>
                  <select value={newUnit} onChange={e=>setNewUnit(e.target.value)}>
                    <option value="gals">gals</option>
                    <option value="cases">cases</option>
                    <option value="pcs">pcs</option>
                    <option value="sets">sets</option>
                    <option value="bottles">bottles</option>
                  </select>
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>Price per unit (₱)</label>
                  <input type="number" value={newPrice} onChange={e=>setNewPrice(e.target.value)} placeholder="0" />
                </div>
                <div className="field">
                  <label>Low-stock Threshold</label>
                  <input type="number" value={newThreshold} onChange={e=>setNewThreshold(e.target.value)} placeholder="e.g., 10" />
                </div>
              </div>

              <div className="grid-2">
                <div className="field">
                  <label>Initial Filled</label>
                  <input type="number" value={newFilled} onChange={e=>setNewFilled(e.target.value)} placeholder="0" />
                </div>
                <div className="field">
                  <label>Initial Empty</label>
                  <input type="number" value={newEmpty} onChange={e=>setNewEmpty(e.target.value)} placeholder="0" />
                </div>
              </div>

              <div className="field">
                <label>Note</label>
                <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional: supplier, batch..." />
              </div>

              <div style={{ background:'var(--blue-50)', border:'1px solid #dbeafe', borderRadius:10, padding:'10px 12px', fontSize:12, color:'var(--slate-700)' }}>
                ✨ New item will appear in inventory and dashboard stock chart. You can edit it later via Adjust.
              </div>
            </>
          )}
        </div>

        <div className="modal-foot">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={isNew ? handleSaveNew : handleSaveExisting}>
            {isNew ? 'Create Product' : initialItem ? 'Update Stock' : 'Save Stock'}
          </button>
        </div>
      </div>
    </div>
  )
}
