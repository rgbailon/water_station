import { useState, useEffect } from 'react'

const CATEGORIES = ['Fuel', 'Caps/Seals', 'Electricity', 'Water', 'Maintenance', 'Rent', 'Supplies', 'Salary', 'Other']

function toInputDate(str) {
  if (!str) return new Date().toISOString().slice(0, 10)
  // str is YYYY-MM-DD from DB, keep as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str
  try { return new Date(str).toISOString().slice(0, 10) } catch { return new Date().toISOString().slice(0, 10) }
}

export default function ExpenseModal({ isOpen, onClose, expenseToEdit, onSave, onDelete }) {
  const isEdit = Boolean(expenseToEdit?.id)
  const [date, setDate] = useState(() => toInputDate(expenseToEdit?.date))
  const [category, setCategory] = useState(expenseToEdit?.category || 'Fuel')
  const [customCategory, setCustomCategory] = useState('')
  const [desc, setDesc] = useState(expenseToEdit?.desc || expenseToEdit?.description || '')
  const [amount, setAmount] = useState(expenseToEdit?.amount != null ? String(expenseToEdit.amount) : '')
  const [isPaid, setIsPaid] = useState(expenseToEdit?.is_paid ?? true)
  const [isRecurring, setIsRecurring] = useState(expenseToEdit?.is_recurring ?? false)
  const [isArchived, setIsArchived] = useState(expenseToEdit?.is_archived ?? false)

  const isCustom = category === 'Other' || (category && !CATEGORIES.includes(category))

  useEffect(() => {
    if (!isOpen) return
    if (expenseToEdit) {
      setDate(toInputDate(expenseToEdit.date))
      const cat = expenseToEdit.category || 'Fuel'
      if (CATEGORIES.includes(cat)) {
        setCategory(cat)
        setCustomCategory('')
      } else {
        setCategory('Other')
        setCustomCategory(cat)
      }
      setDesc(expenseToEdit.desc || expenseToEdit.description || '')
      setAmount(expenseToEdit.amount != null ? String(expenseToEdit.amount) : '')
      setIsPaid(expenseToEdit.is_paid ?? true)
      setIsRecurring(expenseToEdit.is_recurring ?? false)
      setIsArchived(expenseToEdit.is_archived ?? false)
    } else {
      setDate(new Date().toISOString().slice(0, 10))
      setCategory('Fuel')
      setCustomCategory('')
      setDesc('')
      setAmount('')
      setIsPaid(true)
      setIsRecurring(false)
      setIsArchived(false)
    }
  }, [isOpen, expenseToEdit])

  if (!isOpen) return null

  const handleSave = () => {
    const finalCategory = category === 'Other' ? customCategory.trim() : category
    if (!date) return alert('Date is required')
    if (!finalCategory) return alert('Category is required')
    if (!desc.trim()) return alert('Description is required')
    const numAmount = Number(amount)
    if (!amount || Number.isNaN(numAmount) || numAmount < 0) return alert('Amount must be a valid number ≥ 0')
    const payload = {
      // keep id for edit, omit for create so DB generates serial
      ...(isEdit ? { id: expenseToEdit.id } : {}),
      date,
      category: finalCategory,
      description: desc.trim(),
      desc: desc.trim(),
      amount: numAmount,
      is_paid: isPaid,
      is_recurring: isRecurring,
      is_archived: isArchived,
    }
    onSave(payload, isEdit)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h3>{isEdit ? 'Edit Expense' : 'Add Expense'} {isEdit ? `• #${expenseToEdit.id}` : ''}</h3>
            <p>{isEdit ? 'Update expense details — syncs to Supabase' : 'Track water, electricity, fuel, caps & maintenance — syncs to Supabase'}</p>
          </div>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="grid-2">
            <div className="field">
              <label>Date *</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
            <div className="field">
              <label>Amount (₱) *</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
            </div>
          </div>

          <div className="field">
            <label>Category *</label>
            <select value={CATEGORIES.includes(category) ? category : 'Other'} onChange={e => {
              const v = e.target.value
              if (v === 'Other') {
                setCategory('Other')
              } else {
                setCategory(v)
                setCustomCategory('')
              }
            }}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {(category === 'Other' || isCustom) && (
              <input
                value={customCategory}
                onChange={e => setCustomCategory(e.target.value)}
                placeholder="Enter custom category"
                style={{ marginTop: 8 }}
              />
            )}
          </div>

          <div className="field">
            <label>Description *</label>
            <input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g., Tricycle delivery - Monbon loop, August electric bill, NAWASA deep well" />
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', padding: '10px 12px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 10 }}>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} /> Paid ✓
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} /> ↻ Recurring
            </label>
            <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <input type="checkbox" checked={isArchived} onChange={e => setIsArchived(e.target.checked)} /> Archived
            </label>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--slate-500)' }}>Booleans → Supabase</span>
          </div>

          <div style={{ fontSize: '12px', color: 'var(--slate-500)', background: 'var(--slate-50)', padding: '10px 12px', borderRadius: 10, border: '1px solid var(--slate-200)' }}>
            {isEdit ? 'This will update the expense in the table and Supabase.' : 'This will appear in the Expenses table and be counted in the total. All fields sync to Supabase when configured.'}
          </div>
        </div>

        <div className="modal-foot">
          {isEdit && <button className="btn-cancel" style={{ marginRight: 'auto', color: '#dc2626', borderColor: '#fecaca' }} onClick={() => onDelete(expenseToEdit.id)}>Delete</button>}
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>{isEdit ? 'Update' : 'Save Expense'}</button>
        </div>
      </div>
    </div>
  )
}
