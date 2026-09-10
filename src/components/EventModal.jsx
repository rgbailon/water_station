import { useState, useEffect } from 'react'
import { formatISO } from '../utils/dateUtils'

const tabs = [
  { id: 'sale', label: 'Sale / Refill', icon: '💧' },
  { id: 'delivery', label: 'Delivery', icon: '🛵' },
  { id: 'expense', label: 'Expense', icon: '💸' },
  { id: 'hiram', label: 'Hiram', icon: '🤝' },
  { id: 'maintenance', label: 'Maintenance', icon: '🔧' },
]

export default function EventModal({ date, eventToEdit, onClose, onSave, onDelete }) {
  const [type, setType] = useState(eventToEdit?.type || 'sale')
  const [title, setTitle] = useState(eventToEdit?.title || '')
  const [customer, setCustomer] = useState(eventToEdit?.customer || '')
  const [amount, setAmount] = useState(eventToEdit?.amount || '')
  const [note, setNote] = useState(eventToEdit?.note || '')

  useEffect(() => {
    if (eventToEdit) {
      setType(eventToEdit.type); setTitle(eventToEdit.title); setCustomer(eventToEdit.customer); setAmount(eventToEdit.amount); setNote(eventToEdit.note)
    }
  }, [eventToEdit])

  const handleSave = () => {
    if (!title.trim()) return alert('Title is required')
    const payload = {
      id: eventToEdit?.id || `e${Date.now()}`,
      date: formatISO(date),
      type, title, customer, amount: Number(amount) || 0, note, icon: tabs.find(t=>t.id===type)?.icon || '📅'
    }
    onSave(payload, !!eventToEdit)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
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
          <div className="field">
            <label>Title *</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={type==='sale'?'e.g., Refill - 15 gals':type==='expense'?'e.g., Fuel - Tricycle':'e.g., Delivery - Brgy. Monbon'} />
          </div>
          <div className="grid-2">
            <div className="field">
              <label>Customer / Barangay</label>
              <input value={customer} onChange={e=>setCustomer(e.target.value)} placeholder="e.g., Brgy. Patag, Juan Dela Cruz" />
            </div>
            <div className="field">
              <label>Amount (₱)</label>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="0" />
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Optional: Walk-in, due date, etc." />
          </div>
          <div style={{ fontSize: '12px', color: 'var(--slate-500)', background: 'var(--slate-50)', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--slate-200)' }}>
            💡 This will appear on the calendar as <b style={{ color: 'var(--slate-700)' }}>{tabs.find(t=>t.id===type)?.label}</b>. All data stays on this device — you can implement IndexedDB later without changing the UI.
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
