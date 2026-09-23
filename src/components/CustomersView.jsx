import { useState, useMemo, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { peso } from '../utils/dateUtils'
import { getOrderDisplayTotal } from '../data/ordersData'

const OVERRIDES_KEY = 'customer_overrides'
const CUSTOM_KEY = 'custom_customers'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (raw) {
      const parsed = JSON.parse(raw)
      return parsed ?? fallback
    }
  } catch {}
  return fallback
}

const norm = (s) => String(s || '').trim().toLowerCase()
const custKey = (name, phone) => `${norm(name)}|${norm(phone)}`

function parseBarangay(address) {
  const a = String(address || '').trim()
  if (!a) return '—'
  // "Brgy. Monbon, Irosin - Purok 3" → "Brgy. Monbon" | "Brgy. Patag - Hall" → "Brgy. Patag"
  const first = a.split(',')[0].trim()
  return first.split('-')[0].trim() || '—'
}

function fmtDate(ts) {
  if (!ts) return '—'
  try {
    return new Date(ts).toLocaleDateString('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric', year: 'numeric' })
  } catch { return '—' }
}

const emptyForm = { mode: 'add', key: null, id: null, name: '', phone: '', barangay: '', address: '', notes: '' }

export default function CustomersView({ orders = [] }) {
  const [search, setSearch] = useState('')
  const [barangayFilter, setBarangayFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('recent')
  const [form, setForm] = useState(null)
  const [overrides, setOverrides] = useState(() => loadJSON(OVERRIDES_KEY, {}))
  const [custom, setCustom] = useState(() => loadJSON(CUSTOM_KEY, []))

  useEffect(() => { try { localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides)) } catch {} }, [overrides])
  useEffect(() => { try { localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom)) } catch {} }, [custom])

  // ---- Derive customers from real orders (canceled excluded) ----
  const derived = useMemo(() => {
    const map = new Map()
    for (const o of (orders || [])) {
      if (o.isCanceled || o.is_canceled) continue
      const name = (o.customerName || '').trim() || 'Walk-in'
      const phone = (o.phone || '').trim()
      const key = custKey(name, phone)
      let c = map.get(key)
      if (!c) {
        c = { key, name, phone, address: '', orders: 0, spent: 0, borrowed: 0, unpaid: 0, lastOrder: 0 }
        map.set(key, c)
      }
      c.orders += 1
      const total = Number(getOrderDisplayTotal(o)) || 0
      c.spent += total
      c.borrowed += (o.borrowedCount ?? o.borrowed_count ?? 0)
      const pay = String(o.payment_status ?? o.paymentStatus ?? '').toUpperCase()
      if (pay !== 'PAID') c.unpaid += total
      const ts = new Date(o.date).getTime()
      if (!Number.isNaN(ts) && (!c.lastOrder || ts > c.lastOrder)) {
        c.lastOrder = ts
        c.name = name
        if (phone) c.phone = phone
        if ((o.address || '').trim()) c.address = o.address.trim()
      }
    }
    return [...map.values()]
  }, [orders])

  // ---- Merge manual edits (precise location) over order-derived details ----
  const customers = useMemo(() => {
    const rows = derived.map(d => {
      const ov = overrides[d.key]
      return {
        ...d,
        displayName: ov?.name?.trim() || d.name,
        displayPhone: ov?.phone ?? d.phone,
        barangay: ov?.barangay?.trim() || parseBarangay(d.address),
        precise: ov?.address?.trim() || d.address || '—',
        rawAddress: d.address,
        notes: ov?.notes || '',
        edited: Boolean(ov),
        manual: false,
      }
    })
    for (const m of (custom || [])) {
      rows.push({
        key: `custom:${m.id}`,
        id: m.id,
        name: m.name,
        displayName: m.name,
        phone: m.phone || '',
        displayPhone: m.phone || '',
        address: m.address || '',
        rawAddress: m.address || '',
        barangay: (m.barangay || '').trim() || '—',
        precise: (m.address || '').trim() || '—',
        notes: m.notes || '',
        orders: 0, spent: 0, borrowed: 0, unpaid: 0, lastOrder: 0,
        edited: true,
        manual: true,
      })
    }
    return rows
  }, [derived, overrides, custom])

  const barangays = useMemo(() => {
    const set = new Set(customers.map(c => c.barangay).filter(b => b && b !== '—'))
    return ['ALL', ...Array.from(set).sort()]
  }, [customers])

  const filtered = useMemo(() => {
    const rows = customers.filter(c => {
      if (barangayFilter !== 'ALL' && c.barangay !== barangayFilter) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const hay = `${c.displayName} ${c.displayPhone} ${c.barangay} ${c.precise} ${c.notes}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
    const by = {
      recent: (a, b) => b.lastOrder - a.lastOrder,
      orders: (a, b) => b.orders - a.orders || b.spent - a.spent,
      spent: (a, b) => b.spent - a.spent,
      name: (a, b) => a.displayName.localeCompare(b.displayName),
    }[sortBy] || ((a, b) => b.lastOrder - a.lastOrder)
    return [...rows].sort(by)
  }, [customers, barangayFilter, search, sortBy])

  const totals = useMemo(() => ({
    count: customers.length,
    withPhone: customers.filter(c => (c.displayPhone || '').trim()).length,
    withLocation: customers.filter(c => c.precise && c.precise !== '—').length,
    borrowed: customers.filter(c => c.borrowed > 0).length,
  }), [customers])

  // ---- Add / edit form (single modal, portal so it centers on screen) ----
  const openAdd = () => setForm({ ...emptyForm, mode: 'add' })
  const openEdit = (c) => setForm({
    mode: 'edit',
    key: c.key,
    id: c.manual ? c.id : null,
    name: c.displayName,
    phone: c.displayPhone || '',
    barangay: c.barangay === '—' ? '' : c.barangay,
    address: c.manual ? (c.rawAddress || '') : (overrides[c.key]?.address ?? c.rawAddress ?? ''),
    notes: c.notes || '',
  })

  const saveForm = () => {
    if (!form) return
    if (!form.name.trim()) { alert('Customer name is required'); return }
    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      barangay: form.barangay.trim(),
      address: form.address.trim(),
      notes: form.notes.trim(),
    }
    if (form.mode === 'add') {
      const id = `c${Date.now()}`
      setCustom(prev => [...(prev || []), { id, ...payload, createdAt: Date.now() }])
    } else if (form.id) {
      setCustom(prev => (prev || []).map(m => String(m.id) === String(form.id) ? { ...m, ...payload } : m))
    } else {
      setOverrides(prev => ({ ...prev, [form.key]: { ...payload, updatedAt: Date.now() } }))
    }
    setForm(null)
  }

  const resetOverride = (c) => {
    if (c.manual) {
      if (!confirm(`Delete ${c.displayName} from the directory?`)) return
      setCustom(prev => (prev || []).filter(m => String(m.id) !== String(c.id)))
    } else {
      setOverrides(prev => {
        const next = { ...prev }
        delete next[c.key]
        return next
      })
    }
  }

  return (
    <div>
      <div className="section-head">
        <div>
          <h2>👥 Customers</h2>
          <p>Directory from real orders • Edit for location • <span className="pill slate" style={{ fontSize: 11 }}>{totals.count} customers</span> <span className="pill blue" style={{ fontSize: 11 }}>{totals.withLocation} with location</span> <span className="pill amber" style={{ fontSize: 11 }}>{totals.borrowed} borrowed</span></p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Customer</button>
        </div>
      </div>

      <div style={{ margin: '0 18px', background: 'var(--slate-50)', border: '1px solid var(--slate-200)', borderRadius: 12, padding: 12, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1 1 200px', minWidth: 180, position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, barangay, landmark..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid var(--slate-200)', fontSize: 13, background: 'var(--white)', color: 'var(--slate-700)' }}
          />
          <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--slate-400)', fontSize: 14 }}>⌕</span>
        </div>
        <select value={barangayFilter} onChange={e => setBarangayFilter(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          {barangays.map(b => <option key={b} value={b}>{b === 'ALL' ? 'All barangays' : b}</option>)}
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '8px 10px', borderRadius: 9, border: '1px solid var(--slate-200)', fontSize: 12, fontWeight: 700, background: 'var(--white)', color: 'var(--slate-700)' }}>
          <option value="recent">Recent first</option>
          <option value="orders">Most orders</option>
          <option value="spent">Highest spent</option>
          <option value="name">Name A–Z</option>
        </select>
        <span style={{ fontSize: 12, color: 'var(--slate-500)', fontWeight: 600 }}>{filtered.length} of {customers.length}</span>
        {(search || barangayFilter !== 'ALL') && <button className="btn-xs" onClick={() => { setSearch(''); setBarangayFilter('ALL') }}>Clear</button>}
      </div>

      <div className="table-wrap" style={{ paddingTop: 12 }}>
        <table className="table customers-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Barangay</th>
              <th style={{ minWidth: 200 }}>Location</th>
              <th style={{ textAlign: 'center' }}>Orders</th>
              <th style={{ textAlign: 'right' }}>Spent</th>
              <th style={{ textAlign: 'center' }}>Borrowed</th>
              <th>Last order</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: 24, color: 'var(--slate-500)' }}>
                {customers.length === 0 ? 'No customers yet — they appear here automatically from orders, or add one manually.' : 'No customers match your search.'}
              </td></tr>
            ) : filtered.map(c => (
              <tr key={c.key}>
                <td>
                  <div style={{ fontWeight: 700, color: 'var(--slate-900)' }}>
                    {c.displayName}
                    {c.edited && <span className="pill blue" style={{ marginLeft: 6, fontSize: 10 }}>Edited</span>}
                    {c.manual && <span className="pill slate" style={{ marginLeft: 6, fontSize: 10 }}>Manual</span>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--slate-600)' }}>{c.displayPhone || '—'}</div>
                  {c.notes && <div style={{ fontSize: 11, color: 'var(--slate-500)', marginTop: 2 }}>📝 {c.notes}</div>}
                </td>
                <td><span className="pill slate" style={{ fontSize: 11 }}>{c.barangay}</span></td>
                <td style={{ fontSize: 12, color: 'var(--slate-600)', lineHeight: 1.4 }}>{c.precise}</td>
                <td style={{ textAlign: 'center', fontWeight: 700 }}>{c.orders}</td>
                <td style={{ textAlign: 'right', fontWeight: 800, color: 'var(--slate-900)' }}>{peso(c.spent)}</td>
                <td style={{ textAlign: 'center' }}>
                  {c.borrowed > 0
                    ? <span className="pill amber" style={{ fontSize: 11, fontWeight: 800 }}>🤝 {c.borrowed}</span>
                    : <span style={{ color: 'var(--slate-400)', fontSize: 12 }}>—</span>}
                  {c.unpaid > 0 && <div style={{ fontSize: 10, color: '#92400e', fontWeight: 700, marginTop: 2 }}>{peso(c.unpaid)} unpaid</div>}
                </td>
                <td style={{ fontSize: 12, color: 'var(--slate-500)' }}>{fmtDate(c.lastOrder)}</td>
                <td>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button className="btn-xs" onClick={() => openEdit(c)}>✎ Edit</button>
                    {c.edited && <button className="btn-xs" onClick={() => resetOverride(c)} title={c.manual ? 'Delete this manual entry' : 'Revert to order details'}>{c.manual ? 'Delete' : 'Reset'}</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ margin: '0 18px 18px', background: '#f8fafc', border: '1px solid var(--slate-200)', borderRadius: 12, padding: '12px 14px', fontSize: 12.5, color: 'var(--slate-600)', lineHeight: 1.5, display: 'flex', gap: 10 }}>
        <span>💡</span>
        <span><b>Tip:</b> Customers appear automatically from orders. Click <b>✎ Edit</b> to correct names and save a location (barangay + street / purok / landmark) for deliveries. Edits are saved on this device and never change past order records.</span>
      </div>

      {form && createPortal((
        <div className="modal-overlay" onClick={() => setForm(null)}>
          <div className="modal modal-wide" onClick={e => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h3>{form.mode === 'add' ? 'Add Customer' : `Edit Customer`}</h3>
                <p>{form.mode === 'add' ? 'Manual entry — for walk-ins not yet in orders' : 'Update details & location — saved on this device'}</p>
              </div>
              <button className="btn-close" onClick={() => setForm(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="field">
                  <label>Name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g., Juan Dela Cruz" />
                </div>
                <div className="field">
                  <label>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="e.g., 0912 345 6789" />
                </div>
              </div>
              <div className="field">
                <label>Barangay</label>
                <input
                  value={form.barangay}
                  onChange={e => setForm(f => ({ ...f, barangay: e.target.value }))}
                  placeholder="e.g., Brgy. Monbon"
                  list="customer-barangays"
                />
                <datalist id="customer-barangays">
                  {barangays.filter(b => b !== 'ALL').map(b => <option key={b} value={b} />)}
                </datalist>
              </div>
              <div className="field">
                <label>Location (street / purok / landmark)</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="e.g., Purok 3 near chapel, green gate" />
              </div>
              <div className="field">
                <label>Notes</label>
                <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g., Deliver before 10am" />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setForm(null)}>Cancel</button>
              <button className="btn-save" onClick={saveForm}>{form.mode === 'add' ? 'Save Customer' : 'Update'}</button>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  )
}
