import { useState, useEffect } from 'react'
import { formatISO } from '../utils/dateUtils'

const tabs = [
  { id: 'sale', label: 'Sale / Refill', icon: '💧' },
  { id: 'delivery', label: 'Delivery', icon: '🛵' },
  { id: 'expense', label: 'Expense', icon: '💸' },
  { id: 'hiram', label: 'Hiram', icon: '🤝' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
]

const BARANGAY_OPTIONS = [
  'Bagsangan','Batang','Bolos','Buenavista','Bulawan','Carriedo','Casini','Cawayan','Cogon','Gabao','Gulang-Gulang','Gumapia','Liang','Macawayan','Mapaso','Monbon','Patag','Salvacion','San Agustin','San Isidro','San Juan','San Julian','San Pedro','Tabon-Tabon','Tinampo','Tongdol','Umabay Exterior','Umabay Interior',
  'Other / Walk-in'
]

function normalizeBarangay(val) {
  if (!val) return ''
  const cleaned = val.replace(/^Brgy\.?\s*/i, '').trim()
  const found = BARANGAY_OPTIONS.find(b => b.toLowerCase() === cleaned.toLowerCase())
  return found || ''
}

export default function EventModal({ date, eventToEdit, onClose, onSave, onDelete }) {
  const [type, setType] = useState(eventToEdit?.type || 'sale')
  const [customerName, setCustomerName] = useState(eventToEdit?.title || '')
  const [barangay, setBarangay] = useState(() => normalizeBarangay(eventToEdit?.customer || ''))
  const [amount, setAmount] = useState(eventToEdit?.amount || '')
  const [note, setNote] = useState(eventToEdit?.note || '')

  useEffect(() => {
    if (eventToEdit) {
      setType(eventToEdit.type)
      setCustomerName(eventToEdit.title || '')
      setBarangay(normalizeBarangay(eventToEdit.customer || ''))
      // if customer was not a barangay, keep raw value as note fallback? Keep barangay as is if not found, try to preserve
      if (eventToEdit.customer && !normalizeBarangay(eventToEdit.customer)) {
        // keep raw if it looks like a name with barangay hint; try to set to Other
        setBarangay(eventToEdit.customer.includes('Brgy') ? normalizeBarangay(eventToEdit.customer) : '')
      }
      setAmount(eventToEdit.amount || '')
      setNote(eventToEdit.note || '')
    }
  }, [eventToEdit])

  const handleSave = () => {
    if (!customerName.trim()) return alert('Customer name is required')
    if (!barangay) return alert('Please select a barangay')
    const payload = {
      id: eventToEdit?.id || `e${Date.now()}`,
      date: formatISO(date),
      type,
      title: customerName.trim(),
      customer: barangay,
      amount: Number(amount) || 0,
      note,
      icon: tabs.find(t=>t.id===type)?.icon || '📅'
    }
    onSave(payload, !!eventToEdit)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{eventToEdit ? 'Edit Entry' : 'Add Entry'} • {date.toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month:'long', day:'numeric', year:'numeric'})}</h3>
            <p>Irosin Water Station • Stored locally (offline)</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-tabs">
          {tabs.map(t => (
            <button key={t.id} className={`tab ${type===t.id?'active':''}`} onClick={()=>setType(t.id)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div className="modal-body">
          <div className="grid-2">
            <div className="field">
              <label>Customer Name *</label>
              <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder={type==='sale'?'e.g., Juan Dela Cruz':type==='expense'?'e.g., Supplier / Store':'e.g., Kap. Reyes'} />
            </div>
            <div className="field">
              <label>Barangay *</label>
              <select value={barangay} onChange={e=>setBarangay(e.target.value)}>
                <option value="">Select barangay</option>
                {BARANGAY_OPTIONS.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid-2">
            <div className="field">
              <label>Amount (₱)</label>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" />
            </div>
            <div className="field">
              <label>Notes</label>
              <input value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional: qty, 15 gals, walk-in, due date..." />
            </div>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--slate-500)', background: 'var(--slate-50)', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--slate-200)' }}>
            💡 This will appear on the calendar as <b style={{ color: 'var(--slate-700)' }}>{tabs.find(t=>t.id===type)?.label}</b> for <b>{barangay || '—'}</b>. All data stays on this device — you can implement IndexedDB later without changing the UI.
          </div>
        </div>

        <div className="modal-foot">
          {eventToEdit && <button className="btn-cancel" style={{ marginRight:'auto', color:'#dc2626', borderColor:'#fecaca' }} onClick={()=>onDelete(eventToEdit.id)}>Delete</button>}
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>{eventToEdit ? 'Update' : 'Save Entry'}</button>
        </div>
      </div>
    </div>
  )
}
